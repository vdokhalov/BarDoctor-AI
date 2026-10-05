import { readJsonRequest } from "./http";
import { runtimeEnv } from "./runtime-env";
import { getD1 } from "../../db";
import { hasPermission, isAccessRole, permissionPayload } from "./access-control";
import { authenticatedEvidenceContext } from "./evidence-resolver";
import { canReadVenueSource } from "./venue-context-access";
import { runStoreCasBatch, storeSnapshots, withStoreCasRetries } from "./store-cas";
import { canonicalItemId, COST_SOURCE_KEYS, costRevision, observeCurrentCost, parseCostSources, record } from "./management-cost-observation";
import { COST_WHY, type CostEpisodeV1, type CostScope, type CostStateV1 } from "./management-cost-contracts";

export const COST_STATE_PREFIX = "__bd_p4a_cost_state_v1__:";
export const COST_EPISODE_PREFIX = "__bd_p4a_cost_episode_v1__:";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
const fail = (code: string, status: number) => json({ ok: false, code, error: code === "ACCESS_DENIED" ? "Нет доступа к данным себестоимости." : "Не удалось проверить себестоимость. Обновите данные и повторите проверку." }, status);
const encode = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const prefix = (scope: CostScope, kind = "state") => `${kind === "state" ? COST_STATE_PREFIX : COST_EPISODE_PREFIX}${scope.venueId}:`;
const stateKey = (scope: CostScope, id: string) => `${prefix(scope)}${encode(id)}`;
const episodeKey = (scope: CostScope, id: string, generation: number) => `${prefix(scope, "episode")}${encode(id)}:${String(generation).padStart(12, "0")}`;
const parseStored = <T>(value: string | null): T | null => { if (value === null) return null; if (new TextEncoder().encode(value).length > 65536) throw new Error("COST_EPISODE_CAPACITY"); return JSON.parse(value) as T; };
const sameScope = (a: CostScope, b: CostScope) => a?.venueId === b.venueId && a.workspaceId === b.workspaceId && a.dataAccountId === b.dataAccountId;
const boundedJson = (value: unknown) => { const text = JSON.stringify(value); if (new TextEncoder().encode(text).length > 65536) throw new Error("COST_EPISODE_CAPACITY"); return text; };
const boundarySql = `SELECT json_object('role',vm.role,'permissions',vm.permissions_json,'workspace',v.workspace_id,'dataAccount',v.data_account_id) FROM venues v JOIN workspaces w ON w.id=v.workspace_id AND w.status='active' JOIN venue_memberships vm ON vm.venue_id=v.id AND vm.account_id=? AND vm.status='active' JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=vm.account_id AND wm.status='active' WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND vm.id=?`;
type StoredRow = { store_key: string; data_json: string | null; updated_at: string | null };

async function authorized(request: Request) {
  const context = await authenticatedEvidenceContext(request);
  if (!context) return null;
  if (!hasPermission(context.account, "analysis.run") || !hasPermission(context.account, "inventory.view") || !COST_SOURCE_KEYS.every(key => canReadVenueSource(context.account, key))) return null;
  return context;
}

async function snapshot(context: NonNullable<Awaited<ReturnType<typeof authorized>>>, extraKeys: string[]) {
  const database = getD1(), account = context.account;
  const scope: CostScope = { venueId: context.venueId, workspaceId: context.workspaceId, dataAccountId: account.id };
  const args = [account.actorAccountId, scope.venueId, account.id, account.membershipId];
  const keys = [...COST_SOURCE_KEYS, ...extraKeys];
  const result = await database.prepare(`SELECT store_key,CASE WHEN length(CAST(data_json AS BLOB))<=2000000 THEN data_json ELSE 'invalid oversized source' END data_json,updated_at FROM domain_data WHERE account_id=? AND store_key IN (${keys.map(() => "?").join(",")}) UNION ALL SELECT '__profile__',restaurant_json,updated_at FROM accounts WHERE id=? UNION ALL SELECT '__access__',(${boundarySql}),NULL`).bind(account.id, ...keys, account.id, ...args).all<StoredRow>();
  const rows = result.results ?? [], profile = rows.find(row => row.store_key === "__profile__"), boundary = rows.find(row => row.store_key === "__access__");
  if (!profile || !boundary?.data_json) return null;
  const access = record(JSON.parse(boundary.data_json));
  if (!isAccessRole(access.role) || access.workspace !== scope.workspaceId || access.dataAccount !== account.id) return null;
  const live = { ...account, ...permissionPayload(access.role, typeof access.permissions === "string" ? access.permissions : null) };
  if (!hasPermission(live, "analysis.run") || !hasPermission(live, "inventory.view") || !COST_SOURCE_KEYS.every(key => canReadVenueSource(live, key))) return null;
  return { database, scope, profile: profile.data_json, boundary: boundary.data_json, args, snapshots: storeSnapshots(rows as { store_key: string; data_json: string; updated_at: string | null }[], keys) };
}

async function findState(scope: CostScope, fingerprint: string) {
  const p = prefix(scope);
  const stored = await getD1().prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key>=? AND store_key<? AND json_valid(data_json) AND json_extract(data_json,'$.fingerprint')=? LIMIT 2").bind(scope.dataAccountId, p, p + "\uffff", fingerprint).all<{ data_json: string }>();
  if (stored.results?.length !== 1) return null;
  const state = parseStored<CostStateV1>(stored.results[0].data_json);
  return state && state.version === 1 && sameScope(state.scope, scope) && canonicalItemId(state.menuItemId) ? state : null;
}

export async function projectManagementCostEpisode(episode: CostEpisodeV1, menuItemName?: string) {
  const resolved = episode.condition === "VERIFIED_RESOLVED";
  const missingCost = episode.condition === "ACTIVE" && episode.latest.quality.freshness === "CURRENT_READ" && episode.latest.quality.availability !== "UNAVAILABLE" ? episode.latest.blockingIngredients?.find(ingredient => ingredient.reason === "PRICE_UNKNOWN" && ingredient.productKey && ingredient.nomenclatureItemId && ingredient.unit) : null;
  return { ...episode, ...(menuItemName ? { menuItemName: menuItemName.slice(0, 240) } : {}), why: (resolved ? episode.before : episode.latest).reasonCodes.map(code => COST_WHY[code]), effect: resolved ? "Текущая себестоимость подтверждена по сохранённой техкарте. Историческая стоимость продаж не изменяется." : "Без текущей себестоимости нельзя подтвердить текущую маржу позиции. Историческая стоимость продаж не изменяется.", targets: { health: `/health?venueId=${episode.scope.venueId}&signalId=${encodeURIComponent(episode.signalId)}&section=management`, techCard: `/catalog?venueId=${episode.scope.venueId}&tab=recipes&filter=review&menuItemId=${encodeURIComponent(episode.menuItemId)}&signalId=${encodeURIComponent(episode.signalId)}&returnTo=health`, ...(missingCost ? { purchase: `/suppliers?create=1&costCorrection=1&venueId=${episode.scope.venueId}&signalId=${encodeURIComponent(episode.signalId)}&menuItemId=${encodeURIComponent(episode.menuItemId)}&productKey=${encodeURIComponent(missingCost.productKey!)}&returnTo=health` } : {}) } };
}
const project = projectManagementCostEpisode;

async function transition(context: NonNullable<Awaited<ReturnType<typeof authorized>>>, menuItemId: string, expectedSignal: string | null, trigger: "OWNER_CHECK" | "VIEW_REEVALUATION") {
  const scope: CostScope = { venueId: context.venueId, workspaceId: context.workspaceId, dataAccountId: context.account.id };
  const sk = stateKey(scope, menuItemId);
  // Discover the episode key, then reread state + episode + sources together.
  const preliminary = await getD1().prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").bind(scope.dataAccountId, sk).first<{ data_json: string }>();
  const prior = parseStored<CostStateV1>(preliminary?.data_json ?? null);
  const generation = prior?.generation ?? 0;
  const keys = [sk, episodeKey(scope, menuItemId, Math.max(1, generation)), episodeKey(scope, menuItemId, generation + 1)];
  const read = await snapshot(context, [...new Set(keys)]);
  if (!read) return fail("ACCESS_DENIED", 403);
  const loaded = (key: string) => read.snapshots.find(s => s.key === key)?.dataJson ?? null;
  const state = parseStored<CostStateV1>(loaded(sk));
  // A state advance between discovery and snapshot must retry the entire command.
  if ((state?.generation ?? 0) !== generation) throw new (await import("./store-cas")).StoreWriteConflictError();
  if (state && (!sameScope(state.scope, scope) || state.menuItemId !== menuItemId || state.version !== 1)) return fail("SOURCE_INVALID", 422);
  let episode = state ? parseStored<CostEpisodeV1>(loaded(episodeKey(scope, menuItemId, generation))) : null;
  if (episode && (!sameScope(episode.scope, scope) || episode.menuItemId !== menuItemId || episode.contractVersion !== 1)) return fail("SOURCE_INVALID", 422);
  if (!state && loaded(episodeKey(scope, menuItemId, 1)) !== null || state && (!episode || state.lastEpisodeId !== episode.signalId || state.activeEpisodeId !== (episode.condition === "ACTIVE" ? episode.signalId : null))) return fail("SOURCE_INVALID", 422);
  if (expectedSignal && episode?.signalId !== expectedSignal) return fail("UNAVAILABLE", 404);
  if (expectedSignal && episode?.condition !== "ACTIVE") return json({ ok: true, episode: episode && await project(episode), idempotent: true });
  const now = new Date().toISOString();
  const observed = await observeCurrentCost({ scope, snapshots: read.snapshots, profileJson: read.profile, menuItemId, now });
  const { observation } = observed;
  const fingerprint = await costRevision([scope.workspaceId, scope.venueId, scope.dataAccountId, "active_recipe_cost_unknown", menuItemId]);
  if (episode?.condition !== "ACTIVE") {
    if (!observed.eligible) return json({ ok: true, episode: episode && await project(episode), observation });
    const next = generation + 1;
    episode = { contractVersion: 1, scope, signalId: `cost-v1:${fingerprint}:${next}`, fingerprint, generation: next, ruleId: "active_recipe_cost_unknown", ruleVersion: 1, menuItemId, previousEpisodeId: state?.lastEpisodeId ?? null, detectedAt: now, lastObservedAt: now, category: "DATA_QUALITY", severity: "IMPORTANT", severityBasis: "CURRENT_ITEM_COST_NOT_CALCULABLE", before: observation, latest: observation, condition: "ACTIVE", verificationStatus: "NOT_CHECKED", dispositionReason: null, verificationResult: null };
  } else {
    episode = { ...episode, lastObservedAt: now, latest: observation };
    if (!observed.applicable && observation.quality.availability !== "UNAVAILABLE") { episode.condition = "NOT_APPLICABLE"; episode.dispositionReason = "Позиция удалена, архивирована или больше не требует рецепта."; }
    else if (observation.status !== "UNKNOWN" && observation.quality.availability === "AVAILABLE" && observation.quality.freshness === "CURRENT_READ") {
      episode.condition = "VERIFIED_RESOLVED"; episode.verificationStatus = "VERIFIED";
      episode.verificationResult = { kind: "CURRENT_RECIPE_COST_VERIFICATION", version: 1, verificationId: `${episode.signalId}:resolution:v1`, signalId: episode.signalId, checkedAt: now, before: episode.before, after: observation, result: "COST_CALCULATED", resolutionAuthority: "CANONICAL_SERVER_REREAD", causalClaim: "NONE", trigger, checkedBy: context.account.actorAccountId };
    } else episode.verificationStatus = "CANNOT_VERIFY";
  }
  const nextState: CostStateV1 = { version: 1, scope, menuItemId, fingerprint, generation: episode.generation, activeEpisodeId: episode.condition === "ACTIVE" ? episode.signalId : null, lastEpisodeId: episode.signalId, lastObservationRevision: observation.observationRevision, stateVersion: (state?.stateVersion ?? 0) + 1 };
  const guard = read.database.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) SELECT ?,'__bd_p4a_cost_guard_v1__',NULL,? WHERE NOT(EXISTS(SELECT 1 FROM accounts WHERE id=? AND restaurant_json IS ?) AND (${boundarySql}) IS ?)`).bind(scope.dataAccountId, now, scope.dataAccountId, read.profile, ...read.args, read.boundary);
  const upsert = (key: string, value: unknown) => read.database.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").bind(scope.dataAccountId, key, boundedJson(value), now);
  await runStoreCasBatch(read.database, scope.dataAccountId, read.snapshots, [guard, upsert(sk, nextState), upsert(episodeKey(scope, menuItemId, episode.generation), episode)], now);
  return json({ ok: true, episode: await project(episode, observed.itemName), observation, itemName: observed.itemName });
}

/** Private versioned domain rows; GET never materializes episodes. */
export async function managementCostRequest(request: Request, signalId?: string): Promise<Response> {
  try {
    if (runtimeEnv("BD_DISABLE_COST_MANAGEMENT_PHASE4A") === "1") return fail("FEATURE_DISABLED", 503);
    const context = await authorized(request);
    if (!context) return fail("ACCESS_DENIED", 403);
    const scope: CostScope = { venueId: context.venueId, workspaceId: context.workspaceId, dataAccountId: context.account.id };
    const url = new URL(request.url);
    for (const [key, expected] of Object.entries(scope)) if (url.searchParams.has(key) && Number(url.searchParams.get(key)) !== expected) return fail("UNAVAILABLE", 404);
    const queryKeys = signalId || request.method === "POST" ? ["venueId", "workspaceId", "dataAccountId"] : ["venueId", "workspaceId", "dataAccountId", "state", "menuItemId", "cursor", "limit"];
    if ([...url.searchParams.keys()].some(key => !queryKeys.includes(key) || url.searchParams.getAll(key).length !== 1)) return fail("INVALID_QUERY", 400);
    if (signalId && !/^cost-v1:[a-f0-9]{64}:[1-9]\d{0,11}$/.test(signalId)) return fail("UNAVAILABLE", 404);
    if (signalId) {
      const fingerprint = signalId.split(":")[1], generation = Number(signalId.split(":")[2]);
      const state = await findState(scope, fingerprint);
      if (!state || generation > state.generation) return fail("UNAVAILABLE", 404);
      const read = await snapshot(context, [episodeKey(scope, state.menuItemId, generation)]);
      if (!read) return fail("ACCESS_DENIED", 403);
      const episode = parseStored<CostEpisodeV1>(read.snapshots.find(s => s.key === episodeKey(scope, state.menuItemId, generation))?.dataJson ?? null);
      if (!episode || episode.signalId !== signalId || !sameScope(episode.scope, scope)) return fail("UNAVAILABLE", 404);
      if (request.method === "POST") {
        const parsedBody = await readJsonRequest<Record<string, unknown>>(request.clone() as unknown as Request, { maxBytes: 16 * 1024 });
        if (!parsedBody.ok) { parsedBody.response.headers.set("Cache-Control", "private, no-store"); return parsedBody.response; }
        const body = parsedBody.data;
        if (Object.keys(body).some(key => key !== "trigger") || body.trigger && !["OWNER_CHECK", "VIEW_REEVALUATION", "ACCEPTED_SAVE"].includes(String(body.trigger))) return fail("INVALID_COMMAND", 400);
        if (episode.condition !== "ACTIVE") return json({ ok: true, episode: await project(episode), idempotent: true });
        // An unbound client save label is not evidence of who performed an action.
        return await withStoreCasRetries(request, () => transition(context, state.menuItemId, signalId, body.trigger === "VIEW_REEVALUATION" ? "VIEW_REEVALUATION" : "OWNER_CHECK"));
      }
      const current = await observeCurrentCost({ scope, snapshots: read.snapshots, profileJson: read.profile, menuItemId: state.menuItemId, now: new Date().toISOString() });
      return json({ ok: true, episode: await project(episode), currentObservation: current.observation, itemName: current.itemName, history: { url: `/api/management/cost-signals?menuItemId=${encodeURIComponent(state.menuItemId)}&state=all` } });
    }
    if (request.method === "POST") {
      const parsedBody = await readJsonRequest<Record<string, unknown>>(request.clone() as unknown as Request, { maxBytes: 16 * 1024 });
        if (!parsedBody.ok) { parsedBody.response.headers.set("Cache-Control", "private, no-store"); return parsedBody.response; }
        const body = parsedBody.data;
      if (Object.keys(body).some(key => !["menuItemId", "cursor"].includes(key)) || body.menuItemId != null && !canonicalItemId(body.menuItemId)) return fail("INVALID_COMMAND", 400);
      if (body.menuItemId) return await withStoreCasRetries(request, () => transition(context, String(body.menuItemId), null, "VIEW_REEVALUATION"));
      const read = await snapshot(context, []);
      if (!read) return fail("ACCESS_DENIED", 403);
      const parsed = parseCostSources(read.snapshots, scope);
      if (parsed.reasons.length) return json({ ok: true, coverage: "UNAVAILABLE", reasons: parsed.reasons, items: [], nextCursor: null });
      let cursor: { venueId: number; phase: string; after: string } = { venueId: scope.venueId, phase: "menu", after: "" };
      if (body.cursor) { try { cursor = JSON.parse(String(body.cursor)); } catch { return fail("INVALID_CURSOR", 400); } }
      if (cursor.venueId !== scope.venueId || !["menu", "tracked"].includes(cursor.phase) || typeof cursor.after !== "string") return fail("INVALID_CURSOR", 400);
      const menu = (parsed.assortment.menuItems as unknown[]).map(record);
      if (menu.some(item => !canonicalItemId(item.id)) || new Set(menu.map(item => item.id)).size !== menu.length) return fail("SOURCE_INVALID", 422);
      let ids: string[], more: boolean;
      if (cursor.phase === "menu") { const all = menu.filter(item => item.active !== false && item.consumptionMode === "RECIPE").map(item => String(item.id)).sort().filter(id => id > cursor.after); ids = all.slice(0, 25); more = all.length > 25; }
      else { const p = prefix(scope); const rows = await getD1().prepare("SELECT store_key,data_json FROM domain_data WHERE account_id=? AND store_key>=? AND store_key<? AND store_key>? ORDER BY store_key LIMIT 26").bind(scope.dataAccountId, p, p + "\uffff", cursor.after || p).all<{ store_key: string; data_json: string }>(); const page = rows.results ?? []; ids = page.slice(0, 25).map(row => JSON.parse(row.data_json).menuItemId); more = page.length > 25; }
      const items = [];
      for (const id of ids) { const response = await withStoreCasRetries(request, () => transition(context, id, null, "VIEW_REEVALUATION")); if (!response.ok) return response; const value = await response.json() as { episode: CostEpisodeV1 | null }; if (value.episode) items.push(value.episode); }
      const nextCursor = more ? JSON.stringify({ ...cursor, after: cursor.phase === "menu" ? ids.at(-1) : stateKey(scope, ids.at(-1)!) }) : cursor.phase === "menu" ? JSON.stringify({ venueId: scope.venueId, phase: "tracked", after: "" }) : null;
      return json({ ok: true, scope, items, nextCursor, coverage: "AVAILABLE" });
    }
    const historyItem = url.searchParams.get("menuItemId"), stateFilter = url.searchParams.get("state") ?? "active";
    if (!["active", "verified", "all"].includes(stateFilter) || historyItem !== null && !canonicalItemId(historyItem)) return fail("INVALID_QUERY", 400);
    const p = historyItem ? `${prefix(scope, "episode")}${encode(historyItem)}:` : prefix(scope);
    const limit = Math.min(historyItem ? 50 : 100, Math.max(1, Math.floor(Number(url.searchParams.get("limit"))) || (historyItem ? 20 : 50)));
    const cursor = url.searchParams.get("cursor");
    if (cursor && (!cursor.startsWith(p) || cursor.length > 512)) return fail("INVALID_CURSOR", 400);
    const rows = await getD1().prepare(`SELECT store_key,data_json FROM domain_data WHERE account_id=? AND store_key>=? AND store_key<? ${cursor ? `AND store_key${historyItem ? "<" : ">"}?` : ""} ORDER BY store_key ${historyItem ? "DESC" : "ASC"} LIMIT ?`).bind(scope.dataAccountId, p, p + "\uffff", ...(cursor ? [cursor] : []), limit + 1).all<{ store_key: string; data_json: string }>();
    const page = (rows.results ?? []).slice(0, limit);
    const keys = historyItem ? page.map(row => row.store_key) : page.map(row => { const state = parseStored<CostStateV1>(row.data_json)!; return episodeKey(scope, state.menuItemId, state.generation); });
    const read = await snapshot(context, keys);
    if (!read) return fail("ACCESS_DENIED", 403);
    const items: unknown[] = [];
    for (const key of keys) { const e = parseStored<CostEpisodeV1>(read.snapshots.find(row => row.key === key)?.dataJson ?? null); if (e && sameScope(e.scope, scope) && (stateFilter === "all" || stateFilter === "active" && e.condition === "ACTIVE" || stateFilter === "verified" && e.condition === "VERIFIED_RESOLVED")) items.push(await project(e, String((parseCostSources(read.snapshots, scope).assortment.menuItems as Record<string,unknown>[] | undefined)?.find(item => item.id === e.menuItemId)?.name ?? e.menuItemId))); }
    return json({ ok: true, contractVersion: 1, scope, generatedAt: new Date().toISOString(), items, nextCursor: (rows.results?.length ?? 0) > limit ? page.at(-1)?.store_key : null, coverage: parseCostSources(read.snapshots, scope).reasons.length ? "UNAVAILABLE" : "AVAILABLE" });
  } catch { return fail("CANNOT_VERIFY", 503); }
}
