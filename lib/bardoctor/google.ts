import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../../db";
import { oauthStates } from "../../db/schema";
import {
  getIntegrationValue,
  integrationEncryptionKey,
} from "./integration-secrets";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const LOCATIONS_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_API = "https://mybusiness.googleapis.com/v4";
const SCOPE = "https://www.googleapis.com/auth/business.manage";

export class GoogleServiceError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

type GoogleOperation = "OAuth" | "аккаунты" | "заведения" | "отзывы";

function googleHttpError(operation: GoogleOperation, status: number): GoogleServiceError {
  if (status === 400 && operation === "OAuth") {
    return new GoogleServiceError("Google отклонил Client ID, Client Secret или Callback URL. Проверьте OAuth Client.", 400);
  }
  if (status === 401) return new GoogleServiceError("Доступ Google истёк или был отозван. Подключите Google заново.", 401);
  if (status === 403) return new GoogleServiceError(`Google запретил доступ к данным (${operation}). Проверьте права аккаунта и включённые Google Business API.`, 403);
  if (status === 429) return new GoogleServiceError("Google временно ограничил частоту запросов. Повторите синхронизацию позже.", 429);
  if (status >= 500) return new GoogleServiceError("Google Business Profile временно недоступен. Повторите попытку позже.", 503);
  return new GoogleServiceError(`Google не выполнил запрос (${operation}). Проверьте подключение и повторите попытку.`, 502);
}

async function googleFetch(
  input: string,
  init: RequestInit,
  operation: GoogleOperation,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new GoogleServiceError("Google не ответил вовремя. Повторите попытку.", 504);
    }
    throw new GoogleServiceError(`Не удалось связаться с Google (${operation}). Проверьте сеть и повторите попытку.`, 503);
  }
}

async function credentials(accountId: number): Promise<{ clientId: string; clientSecret: string }> {
  const [clientId, clientSecret] = await Promise.all([
    getIntegrationValue(accountId, "GOOGLE_CLIENT_ID"),
    getIntegrationValue(accountId, "GOOGLE_CLIENT_SECRET"),
  ]);
  if (!clientId || !clientSecret) {
    throw new GoogleServiceError(
      "Google OAuth ещё не настроен. Добавьте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET.",
      503,
    );
  }
  return { clientId, clientSecret };
}

export async function isGoogleOAuthConfigured(accountId: number): Promise<boolean> {
  const [clientId, clientSecret] = await Promise.all([
    getIntegrationValue(accountId, "GOOGLE_CLIENT_ID"),
    getIntegrationValue(accountId, "GOOGLE_CLIENT_SECRET"),
  ]);
  return Boolean(clientId && clientSecret);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function encryptionKey(): Promise<CryptoKey> {
  return integrationEncryptionKey();
}

function tokenAdditionalData(accountId: number): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`bardoctor:${accountId}:google-oauth-token:v1`);
}

export async function encryptGoogleToken(accountId: number, value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: tokenAdditionalData(accountId) },
    await encryptionKey(),
    new TextEncoder().encode(value),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptGoogleToken(accountId: number, value: string): Promise<string> {
  const [version, iv, payload] = value.split(".");
  if (version !== "v1" || !iv || !payload) throw new GoogleServiceError("Сохранённый Google-токен повреждён.");
  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(iv),
        additionalData: tokenAdditionalData(accountId),
      },
      await encryptionKey(),
      base64UrlToBytes(payload),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new GoogleServiceError("Google нужно подключить заново после изменения секретов.", 401);
  }
}

export async function buildGoogleAuthUrl(accountId: number, redirectUri: string): Promise<string> {
  const { clientId } = await credentials(accountId);
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = bytesToBase64Url(stateBytes);
  await getDb().insert(oauthStates).values({
    tokenHash: await sha256(state),
    accountId,
    redirectUri,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function consumeGoogleState(state: string): Promise<{
  accountId: number;
  redirectUri: string;
} | null> {
  const tokenHash = await sha256(state);
  const [record] = await getDb()
    .select()
    .from(oauthStates)
    .where(and(eq(oauthStates.tokenHash, tokenHash), gt(oauthStates.expiresAt, new Date().toISOString())))
    .limit(1);
  if (!record) return null;
  await getDb().delete(oauthStates).where(eq(oauthStates.tokenHash, tokenHash));
  return { accountId: record.accountId, redirectUri: record.redirectUri };
}

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
};

async function tokenRequest(params: URLSearchParams): Promise<GoogleTokens> {
  const response = await googleFetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    signal: AbortSignal.timeout(30_000),
  }, "OAuth");
  if (!response.ok) throw googleHttpError("OAuth", response.status);
  const data = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new GoogleServiceError("Google не вернул access token.", 502);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + Number(data.expires_in ?? 3_600) * 1_000).toISOString(),
  };
}

export async function exchangeGoogleCode(
  accountId: number,
  code: string,
  redirectUri: string,
): Promise<GoogleTokens> {
  const { clientId, clientSecret } = await credentials(accountId);
  return tokenRequest(new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  }));
}

export async function refreshGoogleToken(
  accountId: number,
  refreshToken: string,
): Promise<GoogleTokens> {
  const { clientId, clientSecret } = await credentials(accountId);
  return tokenRequest(new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  }));
}

export type GoogleLocation = { id: string; name: string };

export async function listGoogleLocations(accessToken: string): Promise<GoogleLocation[]> {
  const accountsResponse = await googleFetch(ACCOUNTS_API, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30_000),
  }, "аккаунты");
  if (!accountsResponse.ok) throw googleHttpError("аккаунты", accountsResponse.status);
  const accountsData = await accountsResponse.json() as { accounts?: Array<{ name?: string }> };
  const locations: GoogleLocation[] = [];
  for (const account of accountsData.accounts ?? []) {
    const accountName = account.name;
    const accountId = accountName?.split("/")[1];
    if (!accountName || !accountId) continue;
    const response = await googleFetch(
      `${LOCATIONS_API}/${accountName}/locations?readMask=name,title&pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(30_000) },
      "заведения",
    );
    if (!response.ok) throw googleHttpError("заведения", response.status);
    const data = await response.json() as { locations?: Array<{ name?: string; title?: string }> };
    for (const location of data.locations ?? []) {
      const locationId = location.name?.split("/")[1];
      if (locationId) locations.push({ id: `${accountId}/${locationId}`, name: location.title ?? location.name ?? locationId });
    }
  }
  return locations;
}

const STAR_RATING: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export type GoogleReview = {
  externalId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  rating: number | null;
  text: string;
  date: string;
  ownerReply?: string;
};

export async function fetchGoogleReviews(
  accessToken: string,
  accountId: string,
  locationId: string,
): Promise<GoogleReview[]> {
  const reviews: GoogleReview[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "50" });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await googleFetch(
      `${REVIEWS_API}/accounts/${accountId}/locations/${locationId}/reviews?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(30_000) },
      "отзывы",
    );
    if (!response.ok) throw googleHttpError("отзывы", response.status);
    const data = await response.json() as {
      reviews?: Array<{
        reviewId?: string;
        reviewer?: { displayName?: string; profilePhotoUrl?: string };
        starRating?: string;
        comment?: string;
        createTime?: string;
        reviewReply?: { comment?: string };
      }>;
      nextPageToken?: string;
    };
    for (const review of data.reviews ?? []) {
      if (!review.reviewId) continue;
      reviews.push({
        externalId: review.reviewId,
        authorName: review.reviewer?.displayName,
        authorAvatarUrl: review.reviewer?.profilePhotoUrl,
        rating: review.starRating ? STAR_RATING[review.starRating] ?? null : null,
        text: review.comment ?? "",
        date: review.createTime?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        ownerReply: review.reviewReply?.comment,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return reviews;
}

export function googleErrorResponse(error: unknown): Response {
  const serviceError = error instanceof GoogleServiceError
    ? error
    : new GoogleServiceError("Google-сервис временно недоступен.");
  return Response.json({ success: false, error: serviceError.message }, { status: serviceError.status });
}
