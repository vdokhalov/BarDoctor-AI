import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  googleConnections,
  reviewSourceEvents,
  venues,
  type Account,
} from "../../db/schema";
import { authenticateRequest, unauthorized, type AuthenticatedAccount } from "./auth";
import { hasPermission } from "./access-control";
import {
  buildGoogleAuthUrl,
  consumeGoogleState,
  decryptGoogleToken,
  encryptGoogleToken,
  exchangeGoogleCode,
  fetchGoogleReviews,
  googleErrorResponse,
  GoogleServiceError,
  isGoogleOAuthConfigured,
  listGoogleLocations,
  refreshGoogleToken,
} from "./google";
import {
  googleOAuthErrorCode,
  googleOAuthSafeDiagnostic,
  normalizeGoogleOAuthError,
  type GoogleOAuthErrorCode,
} from "./google-oauth-error";
import { parseGoogleMapsUrl } from "./google-maps-url";
import { readJsonRequest } from "./http";
import { homeReviewMetrics } from "./review-model";
import {
  loadReviewLayer,
  logReviewLayerEvent,
  upsertReviewRecords,
} from "./review-layer";

type JsonRecord = Record<string, unknown>;
type Connection = typeof googleConnections.$inferSelect;

const PROVIDERS = [
  { id: "google", label: "Google Business", canOAuth: true, canLinkUrl: true },
  { id: "tripadvisor", label: "TripAdvisor", canOAuth: false, canLinkUrl: false },
  { id: "facebook", label: "Facebook", canOAuth: false, canLinkUrl: false },
  { id: "instagram", label: "Instagram", canOAuth: false, canLinkUrl: false },
  { id: "2gis", label: "2ГИС", canOAuth: false, canLinkUrl: false },
  { id: "yandex", label: "Яндекс", canOAuth: false, canLinkUrl: false },
];

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function connectionFor(accountId: number): Promise<Connection | null> {
  const [connection] = await getDb()
    .select()
    .from(googleConnections)
    .where(eq(googleConnections.accountId, accountId))
    .limit(1);
  return connection ?? null;
}

export async function loadHomeReviewSnapshot(account: AuthenticatedAccount) {
  const [connection, layer] = await Promise.all([
    connectionFor(account.id),
    loadReviewLayer(account),
  ]);
  return {
    provider: {
      status: connection?.status ?? "disconnected",
      locationName: connection?.locationName ?? null,
      lastSyncedAt: connection?.lastSyncedAt ?? null,
      lastSyncError: connection?.lastSyncError ?? null,
    },
    metrics: homeReviewMetrics(layer.reviews),
    layerUpdatedAt: layer.updatedAt,
  };
}

async function upsertConnection(
  accountId: number,
  values: Partial<typeof googleConnections.$inferInsert>,
): Promise<void> {
  const existing = await connectionFor(accountId);
  const now = new Date().toISOString();
  if (existing) {
    await getDb()
      .update(googleConnections)
      .set({ ...values, updatedAt: now })
      .where(eq(googleConnections.id, existing.id));
    return;
  }
  await getDb()
    .insert(googleConnections)
    .values({ accountId, ...values, updatedAt: now })
    .onConflictDoNothing({ target: googleConnections.accountId });
}

export async function logReviewSourceEvent(
  accountId: number,
  event: string,
  detail?: string,
): Promise<void> {
  await logReviewLayerEvent(accountId, "google", event, detail);
}

function importedGoogleProvider(account: Account): JsonRecord | null {
  if (!account.reviewSourcesJson) return null;
  try {
    const root = asRecord(JSON.parse(account.reviewSourcesJson));
    const data = asRecord(root?.data);
    const providers = Array.isArray(data?.providers) ? data.providers : [];
    return providers.map(asRecord).find((provider) => provider?.id === "google") ?? null;
  } catch {
    return null;
  }
}

async function ensureImportedConnection(account: Account): Promise<Connection | null> {
  const existing = await connectionFor(account.id);
  if (existing) return existing;
  const imported = importedGoogleProvider(account);
  const importedStatus = stringValue(imported?.status);
  if (!imported || !importedStatus || importedStatus === "disconnected") return null;

  const linkedUrl = stringValue(imported.linkedUrl);
  await upsertConnection(account.id, {
    status: linkedUrl ? "url_linked" : "error",
    linkedUrl,
    placeId: stringValue(imported.placeId),
    cid: stringValue(imported.cid),
    lat: stringValue(imported.lat),
    lng: stringValue(imported.lng),
    locationName: stringValue(imported.locationName),
    lastSyncedAt: stringValue(imported.lastSyncedAt),
    lastSyncError: "Подключите Google заново, чтобы безопасно перенести доступ без копирования OAuth-токенов из Replit.",
    autoSyncEnabled: imported.autoSyncEnabled !== false,
  });
  await logReviewSourceEvent(account.id, "migration_requires_reconnect", "Статус перенесён из Replit; OAuth-токены намеренно не копировались.");
  return connectionFor(account.id);
}

async function historyFor(accountId: number) {
  const rows = await getDb()
    .select()
    .from(reviewSourceEvents)
    .where(and(eq(reviewSourceEvents.accountId, accountId), eq(reviewSourceEvents.source, "google")))
    .orderBy(desc(reviewSourceEvents.createdAt))
    .limit(10);
  return rows.map((row) => ({ event: row.event, detail: row.detail, at: row.createdAt }));
}

function autoSyncDue(connection: Connection): boolean {
  if (connection.status !== "connected" || !connection.autoSyncEnabled) return false;
  if (!connection.lastSyncedAt && !connection.lastSyncError) return true;

  const lastAttempt = connection.lastSyncError
    ? connection.updatedAt
    : connection.lastSyncedAt;
  const retryAfter = connection.lastSyncError
    ? 60 * 60 * 1_000
    : 6 * 60 * 60 * 1_000;
  const timestamp = lastAttempt ? new Date(lastAttempt).getTime() : 0;
  return !Number.isFinite(timestamp) || Date.now() - timestamp >= retryAfter;
}

export async function reviewSourcesStatus(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "reviews.view")) {
    return Response.json(
      { success: false, code: "ACCESS_DENIED", error: "Отзывы вам недоступны" },
      { status: 403 },
    );
  }
  try {
    let connection = await ensureImportedConnection(account);
    if (connection && autoSyncDue(connection)) {
      await syncGoogleReviews(account.id);
      connection = await connectionFor(account.id);
    }
    const history = await historyFor(account.id);
    const googleConfigured = await isGoogleOAuthConfigured(account.id);
    const providers = PROVIDERS.map((provider) => {
      if (provider.id !== "google") {
        return { ...provider, status: "disconnected", configured: false, history: [] };
      }
      if (!connection) {
        return {
          ...provider,
          status: "disconnected",
          configured: googleConfigured,
          history,
        };
      }
      return {
        ...provider,
        status: connection.status,
        configured: googleConfigured,
        locationName: connection.locationName,
        linkedUrl: connection.linkedUrl,
        placeId: connection.placeId,
        cid: connection.cid,
        lat: connection.lat,
        lng: connection.lng,
        lastSyncedAt: connection.lastSyncedAt,
        lastSyncError: connection.lastSyncError,
        autoSyncEnabled: connection.autoSyncEnabled,
        pendingLocations: connection.status === "pending_location" && connection.pendingLocationsJson
          ? JSON.parse(connection.pendingLocationsJson)
          : undefined,
        history,
      };
    });
    const reviewLayer = await loadReviewLayer(account);
    return Response.json({
      success: true,
      data: {
        providers,
        reviewLayer: {
          summary: reviewLayer.summary,
          updatedAt: reviewLayer.updatedAt,
        },
      },
    });
  } catch {
    return Response.json({ success: false, error: "Не удалось загрузить источники отзывов." }, { status: 500 });
  }
}

async function mergeReviews(accountId: number, incoming: Awaited<ReturnType<typeof fetchGoogleReviews>>) {
  const [venue] = await getDb()
    .select({ id: venues.id })
    .from(venues)
    .where(eq(venues.dataAccountId, accountId))
    .limit(1);
  if (!venue) throw new Error("Источник отзывов не привязан к заведению.");
  return upsertReviewRecords({
    tenant: {
      accountId,
      venueId: venue.id,
      actorAccountId: null,
      actorName: "Google Business Profile",
      actorRole: "integration",
    },
    records: incoming.map((review) => ({
      source: "google",
      externalId: review.externalId,
      authorName: review.authorName,
      authorAvatarUrl: review.authorAvatarUrl,
      rating: review.rating,
      text: review.text,
      publishedAt: review.date,
      ownerReply: review.ownerReply,
      sourceMetadata: { provider: "google_business_profile" },
    })),
    method: "sync",
    fallbackSource: "google",
    reason: "Синхронизация Google Business Profile",
  });
}

export async function syncGoogleReviews(accountId: number): Promise<{
  ok: boolean;
  added?: number;
  updated?: number;
  skipped?: number;
  error?: string;
}> {
  const connection = await connectionFor(accountId);
  if (!connection || connection.status !== "connected" || !connection.googleAccountId || !connection.googleLocationId) {
    return { ok: false, error: "Google Business пока не подключён." };
  }
  try {
    if (!connection.accessTokenEncrypted) throw new Error("Нет Google access token — подключите источник заново.");
    let accessToken = await decryptGoogleToken(accountId, connection.accessTokenEncrypted);
    if (!connection.tokenExpiresAt || new Date(connection.tokenExpiresAt).getTime() < Date.now() + 60_000) {
      if (!connection.refreshTokenEncrypted) throw new Error("Нет refresh token — подключите Google заново.");
      const refreshed = await refreshGoogleToken(
        accountId,
        await decryptGoogleToken(accountId, connection.refreshTokenEncrypted),
      );
      accessToken = refreshed.accessToken;
      await upsertConnection(accountId, {
        accessTokenEncrypted: await encryptGoogleToken(accountId, accessToken),
        tokenExpiresAt: refreshed.expiresAt,
      });
    }
    const incoming = await fetchGoogleReviews(accessToken, connection.googleAccountId, connection.googleLocationId);
    const merged = await mergeReviews(accountId, incoming);
    const now = new Date().toISOString();
    await upsertConnection(accountId, { lastSyncedAt: now, lastSyncError: null });
    await logReviewSourceEvent(
      accountId,
      "sync_completed",
      `Создано: ${merged.created}; обновлено: ${merged.updated}; без изменений: ${merged.skipped}.`,
    );
    return { ok: true, added: merged.created, updated: merged.updated, skipped: merged.skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка синхронизации";
    await upsertConnection(accountId, { lastSyncError: message });
    await logReviewSourceEvent(accountId, "sync_failed", message);
    return { ok: false, error: message };
  }
}

export async function syncGoogleReviewsIfDue(accountId: number): Promise<{
  attempted: boolean;
  ok: boolean;
  added?: number;
  updated?: number;
  skipped?: number;
  error?: string;
}> {
  const connection = await connectionFor(accountId);
  if (!connection || !autoSyncDue(connection)) {
    return { attempted: false, ok: true };
  }
  const result = await syncGoogleReviews(accountId);
  return { attempted: true, ...result };
}

function callbackRedirect(request: Request, query: string): Response {
  return Response.redirect(new URL(`/integrations?flow=google&${query}`, request.url), 302);
}

async function recordGoogleOAuthFailure(
  accountId: number,
  code: GoogleOAuthErrorCode,
  diagnostic?: string,
): Promise<void> {
  try {
    await logReviewSourceEvent(
      accountId,
      "oauth_failed",
      diagnostic ? `Google OAuth: ${code}; ${diagnostic}` : `Google OAuth: ${code}`,
    );
  } catch {
    // An audit write must not replace the safe OAuth result shown to the owner.
  }
}

async function recordGoogleTokenExchangeSuccess(accountId: number, status: number): Promise<void> {
  try {
    await logReviewSourceEvent(
      accountId,
      "oauth_token_exchanged",
      `Google OAuth token: HTTP ${status}; grant_type=authorization_code; client_id=present; client_secret=present; code=present; redirect_uri=present`,
    );
  } catch {
    // Diagnostics must not interrupt a successful OAuth flow.
  }
}

function googleProfileErrorCode(error: unknown): GoogleOAuthErrorCode {
  const status = error instanceof GoogleServiceError ? error.upstreamStatus ?? error.status : 0;
  if (status === 401) return "profile_unauthorized";
  if (status === 403) return "profile_forbidden";
  if (status === 429) return "profile_rate_limited";
  return "profile_unavailable";
}

function googleProfileSafeDiagnostic(error: unknown): string {
  if (!(error instanceof GoogleServiceError)) {
    return "business_profile HTTP unavailable; operation=unknown";
  }
  return `business_profile HTTP ${error.upstreamStatus ?? error.status}; operation=${error.operation ?? "unknown"}`;
}

export async function handleGoogleSourceGet(request: Request, action: string): Promise<Response> {
  if (action === "callback") {
    const url = new URL(request.url);
    const googleError = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!state) return callbackRedirect(request, "googleConnect=error&reason=invalid_state");

    const oauthState = await consumeGoogleState(state);
    if (!oauthState) return callbackRedirect(request, "googleConnect=error&reason=invalid_state");
    if (googleError) {
      const reason = normalizeGoogleOAuthError(
        googleError,
        url.searchParams.get("error_description"),
      );
      await recordGoogleOAuthFailure(oauthState.accountId, reason);
      return callbackRedirect(request, `googleConnect=error&reason=${reason}`);
    }
    if (!code) {
      await recordGoogleOAuthFailure(oauthState.accountId, "exchange_failed");
      return callbackRedirect(request, "googleConnect=error&reason=exchange_failed");
    }
    let tokens;
    try {
      tokens = await exchangeGoogleCode(
        oauthState.accountId,
        code,
        oauthState.redirectUri,
      );
      await recordGoogleTokenExchangeSuccess(oauthState.accountId, tokens.tokenEndpointStatus);
    } catch (error) {
      const reason = googleOAuthErrorCode(error);
      await recordGoogleOAuthFailure(
        oauthState.accountId,
        reason,
        googleOAuthSafeDiagnostic(error),
      );
      return callbackRedirect(request, `googleConnect=error&reason=${reason}`);
    }

    let locations;
    try {
      locations = await listGoogleLocations(tokens.accessToken);
    } catch (error) {
      const reason = googleProfileErrorCode(error);
      await recordGoogleOAuthFailure(
        oauthState.accountId,
        reason,
        googleProfileSafeDiagnostic(error),
      );
      return callbackRedirect(request, `googleConnect=error&reason=${reason}`);
    }

    try {
      const existing = await connectionFor(oauthState.accountId);
      const tokenValues = {
        accessTokenEncrypted: await encryptGoogleToken(oauthState.accountId, tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken
          ? await encryptGoogleToken(oauthState.accountId, tokens.refreshToken)
          : existing?.refreshTokenEncrypted ?? null,
        tokenExpiresAt: tokens.expiresAt,
        lastSyncError: null,
      };

      if (locations.length === 0) {
        await upsertConnection(oauthState.accountId, {
          ...tokenValues,
          status: "error",
          lastSyncError: "В аккаунте Google Business Profile не найдено заведений.",
        });
        return callbackRedirect(request, "googleConnect=error&reason=no_locations");
      }
      if (locations.length === 1) {
        const [googleAccountId, googleLocationId] = locations[0]!.id.split("/");
        await upsertConnection(oauthState.accountId, {
          ...tokenValues,
          status: "connected",
          googleAccountId,
          googleLocationId,
          locationName: locations[0]!.name,
          pendingLocationsJson: null,
        });
        await logReviewSourceEvent(oauthState.accountId, "oauth_connected", `Подключено: ${locations[0]!.name}`);
        const firstSync = await syncGoogleReviews(oauthState.accountId);
        return callbackRedirect(request, firstSync.ok ? "googleConnect=success" : "googleConnect=success&sync=error");
      }
      await upsertConnection(oauthState.accountId, {
        ...tokenValues,
        status: "pending_location",
        pendingLocationsJson: JSON.stringify(locations),
      });
      return callbackRedirect(request, "googleConnect=pending");
    } catch {
      await recordGoogleOAuthFailure(oauthState.accountId, "profile_unavailable", "connection_store HTTP unavailable; operation=store_connection");
      return callbackRedirect(request, "googleConnect=error&reason=profile_unavailable");
    }
  }

  if (action !== "connect") {
    return Response.json({ success: false, error: "Неизвестная Google-функция" }, { status: 404 });
  }
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "reviews.manage")) {
    return Response.json(
      { success: false, code: "ACCESS_DENIED", error: "Подключать источники отзывов может владелец или управляющий" },
      { status: 403 },
    );
  }
  try {
    const redirectUri = new URL("/api/reviews/sources/google/callback", request.url).toString();
    return Response.json({ success: true, data: { url: await buildGoogleAuthUrl(account.id, redirectUri) } });
  } catch (error) {
    return googleErrorResponse(error);
  }
}

export async function handleGoogleSourcePost(request: Request, action: string): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "reviews.manage")) {
    return Response.json(
      { success: false, code: "ACCESS_DENIED", error: "Изменять источники отзывов может владелец или управляющий" },
      { status: 403 },
    );
  }
  try {
    if (action === "link-url") {
      const jsonRequest = await readJsonRequest<{ url?: unknown }>(request, {
        maxBytes: 64 * 1024,
      });
      if (!jsonRequest.ok) return jsonRequest.response;
      const body = jsonRequest.data;
      const rawUrl = stringValue(body.url);
      if (!rawUrl) return Response.json({ success: false, error: "Вставьте ссылку Google Карт." }, { status: 400 });
      const parsed = await parseGoogleMapsUrl(rawUrl);
      if ("error" in parsed) return Response.json({ success: true, data: { linked: false, error: parsed.error } });
      const existing = await connectionFor(account.id);
      await upsertConnection(account.id, {
        status: existing?.status === "connected" || existing?.status === "pending_location" ? existing.status : "url_linked",
        linkedUrl: parsed.canonicalUrl,
        placeId: parsed.placeId ?? null,
        cid: parsed.cid ?? null,
        lat: parsed.lat ?? null,
        lng: parsed.lng ?? null,
        locationName: existing?.locationName ?? parsed.name ?? null,
      });
      await logReviewSourceEvent(account.id, "url_linked", parsed.name ? `Привязано: ${parsed.name}` : "Ссылка Google Карт сохранена.");
      return Response.json({ success: true, data: { linked: true, name: parsed.name ?? null } });
    }

    if (action === "auto-sync") {
      const parsed = await readJsonRequest<{ enabled?: unknown }>(request, { maxBytes: 16 * 1024 });
      if (!parsed.ok) return parsed.response;
      const body = parsed.data;
      if (typeof body.enabled !== "boolean") return Response.json({ success: false, error: "enabled обязателен" }, { status: 400 });
      if (!await connectionFor(account.id)) return Response.json({ success: false, error: "Google ещё не подключён" }, { status: 400 });
      await upsertConnection(account.id, { autoSyncEnabled: body.enabled });
      await logReviewSourceEvent(account.id, "auto_sync_toggled", body.enabled ? "Автосинхронизация включена." : "Автосинхронизация выключена.");
      return Response.json({ success: true });
    }

    if (action === "select-location") {
      const parsed = await readJsonRequest<{ locationId?: unknown }>(request, {
        maxBytes: 32 * 1024,
      });
      if (!parsed.ok) return parsed.response;
      const body = parsed.data;
      const locationId = stringValue(body.locationId);
      const connection = await connectionFor(account.id);
      if (!locationId || !connection?.pendingLocationsJson) {
        return Response.json({ success: false, error: "Нет ожидающего выбора Google-заведения" }, { status: 400 });
      }
      const locations = JSON.parse(connection.pendingLocationsJson) as Array<{ id?: string; name?: string }>;
      const selected = locations.find((location) => location.id === locationId);
      if (!selected?.id) return Response.json({ success: false, error: "Неизвестное Google-заведение" }, { status: 400 });
      const [googleAccountId, googleLocationId] = selected.id.split("/");
      await upsertConnection(account.id, {
        status: "connected",
        googleAccountId,
        googleLocationId,
        locationName: selected.name ?? selected.id,
        pendingLocationsJson: null,
        lastSyncError: null,
      });
      await logReviewSourceEvent(account.id, "oauth_connected", `Подключено: ${selected.name ?? selected.id}`);
      const firstSync = await syncGoogleReviews(account.id);
      return Response.json({ success: true, data: { locationName: selected.name ?? selected.id, sync: firstSync } });
    }

    if (action === "sync") {
      const result = await syncGoogleReviews(account.id);
      return Response.json({
        success: true,
        data: result.ok
          ? {
              synced: true,
              added: result.added ?? 0,
              updated: result.updated ?? 0,
              skipped: result.skipped ?? 0,
            }
          : { synced: false, error: result.error },
      });
    }

    if (action === "disconnect") {
      await getDb().delete(googleConnections).where(eq(googleConnections.accountId, account.id));
      await logReviewSourceEvent(account.id, "disconnected", "Источник отключён.");
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "Неизвестная Google-функция" }, { status: 404 });
  } catch (error) {
    return googleErrorResponse(error);
  }
}
