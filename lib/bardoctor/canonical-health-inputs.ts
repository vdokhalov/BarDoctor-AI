import { bindCanonicalContext } from "./canonical-input-evidence";
import { runtimeEnv } from "./runtime-env";
import { getD1 } from "../../db";
import { hasPermission, isAccessRole, permissionPayload, type AuthenticatedAccount } from "./access-control";
import { canReadDiagnosisSources, canReadVenueSource, VENUE_CONTEXT_SOURCES } from "./venue-context-access";
import { buildVenueAIContextFromSources, type StoredVenueValue } from "./venue-ai-context";
import { buildBusinessIntelligenceFromVenueContext } from "./business-intelligence";
import { buildBusinessHealthSnapshot, businessHealthActionTarget } from "./business-health-snapshot";
import { buildAIDoctorAttention } from "./ai-doctor-attention";
import { rankManagementSignals } from "./business-intelligence";
import { COST_EPISODE_PREFIX, projectManagementCostEpisode } from "./management-cost-signals";
import { createIngredientReconciliationMemo } from "./tech-card-reconciliation";
import { createCurrentCostReader } from "./management-cost-observation";
import type { CostEpisodeV1 } from "./management-cost-contracts";
import { derivedInputBelongs } from "./derived-input-scope";
import { evidenceContentRevision } from "./evidence-contracts";
import { storeSnapshots } from "./store-cas";
import { reviewsForCurrentGoogleLocation } from "./review-sources";
import { buildHealthOperationsInputs, HEALTH_OPERATIONS_KEYS, MAX_HEALTH_ROWS, MAX_HEALTH_SOURCE_BYTES, type HealthSource } from "./health-operations-inputs";
import { observedAwait } from "./request-observability";

type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => Boolean(v && typeof v === "object" && !Array.isArray(v));
export const HEALTH_INPUT_KEYS = [...new Set([...Object.values(VENUE_CONTEXT_SOURCES).flat(), ...HEALTH_OPERATIONS_KEYS, "bd_tasks", "bd_action_tasks", "bd_decisions"])];

/** One SELECT snapshot of existing sources, profile and live scope/permissions.
 * No body inputs, new persistence, history reconstruction or source mutation. */
export async function loadCanonicalHealthInputs(account: AuthenticatedAccount, asOf = new Date().toISOString()) {
  const database = getD1();
  const keys = HEALTH_INPUT_KEYS.filter(key => canReadVenueSource(account, key));
  const costPrefix = `${COST_EPISODE_PREFIX}${account.venueId}:`;
  const rows = await database.prepare(`SELECT store_key, CASE WHEN length(data_json)>? THEN NULL ELSE data_json END data_json,updated_at FROM domain_data WHERE account_id=? AND store_key IN (${keys.map(() => "?").join(",") || "NULL"})
    UNION ALL SELECT store_key,data_json,updated_at FROM (SELECT store_key,CASE WHEN length(data_json)>65536 THEN NULL ELSE data_json END data_json,updated_at FROM domain_data WHERE account_id=? AND store_key>=? AND store_key<? AND CASE WHEN json_valid(data_json) THEN json_extract(data_json,'$.condition')='ACTIVE' ELSE 0 END ORDER BY store_key LIMIT 26)
    UNION ALL SELECT '__profile__',restaurant_json,updated_at FROM accounts WHERE id=?
    UNION ALL SELECT '__access__',(SELECT json_object('workspaceId',v.workspace_id,'role',vm.role,'permissions',vm.permissions_json) FROM venues v JOIN workspaces w ON w.id=v.workspace_id AND w.status='active' JOIN venue_memberships vm ON vm.venue_id=v.id AND vm.account_id=? AND vm.status='active' JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=vm.account_id AND wm.status='active' WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND vm.id=?),NULL`)
    .bind(MAX_HEALTH_SOURCE_BYTES, account.id, ...keys, account.id, costPrefix,costPrefix+"\uffff", account.id, account.actorAccountId, account.venueId, account.id, account.membershipId)
    .all<{ store_key: string; data_json: string | null; updated_at: string | null }>();
  const boundaryRow = rows.results.find(row => row.store_key === "__access__"), profileRow = rows.results.find(row => row.store_key === "__profile__");
  if (!boundaryRow?.data_json || !profileRow) return null;
  const boundary = JSON.parse(boundaryRow.data_json) as Row;
  if (!Number.isSafeInteger(boundary.workspaceId) || !isAccessRole(boundary.role)) return null;
  const currentAccount = { ...account, ...permissionPayload(boundary.role, typeof boundary.permissions === "string" ? boundary.permissions : null) };
  if (!hasPermission(currentAccount, "analysis.run") || !canReadDiagnosisSources(currentAccount)) return { restricted: true as const };
  const scope = { venueId: account.venueId, workspaceId: Number(boundary.workspaceId), dataAccountId: account.id };
  const snapshots = storeSnapshots(rows.results.filter(row => row.data_json != null).map(row => ({ ...row, data_json: row.data_json! })), keys);
  const sources: HealthSource[] = [];
  const stores = new Map<string, StoredVenueValue>();
  const revision = (kind: "OPERATIONAL_REPORT" | "REVIEW", key: string, data: unknown) => evidenceContentRevision({ contractVersion: 1, kind, id: key, venueId: scope.venueId, workspaceId: scope.workspaceId }, { dataAccountId: account.id, data });
  for (const key of HEALTH_INPUT_KEYS) {
    const snapshot = snapshots.find(row => row.key === key), present = rows.results.some(row => row.store_key === key);
    const source: HealthSource = { key, state: "UNAVAILABLE", revision: null, updatedAt: snapshot?.updatedAt ?? null, data: null };
    if (!canReadVenueSource(currentAccount, key)) { source.state = "RESTRICTED"; source.updatedAt = null; sources.push(source); continue; }
    source.revision = await revision("OPERATIONAL_REPORT", key, { present, dataJson: snapshot?.dataJson ?? null, updatedAt: source.updatedAt });
    if (snapshot?.dataJson != null) {
      try {
        const raw: unknown = JSON.parse(snapshot.dataJson);
        const arrays = object(raw) ? Object.values(raw).filter(Array.isArray) : [raw];
        const valid = key === "bd_assortment_v1" ? object(raw) && Array.isArray(raw.stockBalances) : Array.isArray(raw) || !HEALTH_OPERATIONS_KEYS.includes(key) && object(raw);
        if (!valid || arrays.some(value => Array.isArray(value) && (value.length > MAX_HEALTH_ROWS || value.some(child => !object(child))))) source.state = "PARTIAL";
        else {
          source.state = derivedInputBelongs(raw, scope) ? "AVAILABLE" : "PARTIAL";
          // Exclude explicit foreign ownership at every level before summaries.
          source.data = Array.isArray(raw) ? raw.filter(value => derivedInputBelongs(value, scope)) : object(raw) ? Object.fromEntries(Object.entries(raw).map(([field, value]) => [field, Array.isArray(value) ? value.filter(child => derivedInputBelongs(child, scope)) : derivedInputBelongs(value, scope) ? value : null])) : null;
          if (key === "bd_guest_reviews" && Array.isArray(source.data)) {
            source.data = await reviewsForCurrentGoogleLocation(account.id, source.data as Row[]);
            source.revision = await revision("REVIEW", key, { sourceRevision: source.revision, selected: source.data });
          }
          stores.set(key, { data: source.data, sourceState: source.state === "AVAILABLE" ? "AVAILABLE" : "PARTIAL", updatedAt: source.updatedAt ?? "" });
        }
      } catch { source.state = "PARTIAL"; }
    } else if (present) source.state = "PARTIAL";
    sources.push(source);
  }
  let profile: Row = {};
  try { const raw: unknown = JSON.parse(profileRow.data_json ?? "{}"); if (object(raw)) profile = raw; } catch { /* unknown profile */ }
  const ingredientMemo = createIngredientReconciliationMemo();
  const context = await observedAwait("health.context", () => buildVenueAIContextFromSources("diagnosis", { ingredientMemo, access: currentAccount, workspaceId: scope.workspaceId, accountProfile: profile, accountUpdatedAt: profileRow.updated_at, stores, now: new Date(asOf) }));
  await observedAwait("health.evidence", () => bindCanonicalContext(context, scope, stores));
  const operations = await observedAwait("health.operations", () => buildHealthOperationsInputs({ sources, ...scope, profile, asOf, currency: context.accountingCurrency }));
  const inputManifest = { contractVersion: 1 as const, scope, sources: sources.map(source => ({ key: source.key, state: source.state, revision: source.revision, updatedAt: source.updatedAt })), profileRevision: await revision("OPERATIONAL_REPORT", "__profile__", profileRow.data_json) };
  const inputRevision = await revision("OPERATIONAL_REPORT", "business-health-inputs", { inputManifest, operations, costEpisodes:rows.results.filter(row=>row.store_key.startsWith(costPrefix)), localDate: operations.counters.unclosedShifts.window });
  const intelligence = buildBusinessIntelligenceFromVenueContext({ venueId: account.venueId, context, canonicalOperations: operations });
  const memoryRows = (key:string) => {
    const source = sources.find(source=>source.key===key);
    return source?.state === "AVAILABLE" && Array.isArray(source.data) ? source.data as Row[] : [];
  };
  const memory = {tasks:memoryRows("bd_tasks"),actionTasks:memoryRows("bd_action_tasks"),decisions:memoryRows("bd_decisions")};
  const costRows = rows.results.filter(row=>row.store_key.startsWith(costPrefix));
  const costCandidates: Row[] = [];
  const readCurrentCost = createCurrentCostReader({scope,snapshots,profileJson:profileRow.data_json,now:asOf}, ingredientMemo);
  if (runtimeEnv("BD_DISABLE_COST_MANAGEMENT_PHASE4A")!=="1" && hasPermission(currentAccount,"inventory.view") && ["bd_assortment_v1","bd_purchase_documents","bd_stock_movements"].every(key=>canReadVenueSource(currentAccount,key))) for (const row of costRows.slice(0,25)) {
    try {
      const episode=JSON.parse(row.data_json ?? "null") as CostEpisodeV1;
      if (episode?.scope.venueId!==scope.venueId || episode.scope.workspaceId!==scope.workspaceId || episode.scope.dataAccountId!==scope.dataAccountId || episode.condition!=="ACTIVE") continue;
      const observed=await readCurrentCost(episode.menuItemId);
      const projected=await projectManagementCostEpisode({...episode,latest:observed.observation},observed.itemName);
      costCandidates.push({managementId:episode.signalId,issueKey:"recipes",affectedEntity:episode.menuItemId,signalClass:"data_quality",managementActionable:true,
        title:observed.observation.status==="UNKNOWN"?`Проверить себестоимость: ${observed.itemName ?? episode.menuItemId}`:`Проверить результат себестоимости: ${observed.itemName ?? episode.menuItemId}`,
        fact:projected.why.join(" ") || "Текущий расчёт доступен; сохранённый результат ещё нужно проверить.",consequence:projected.effect,action:projected.targets.purchase?"Подтвердить закупочную стоимость ингредиента.":"Открыть текущую техкарту и проверить источник себестоимости.",
        successCriterion:"Результат подтверждён существующей серверной проверкой себестоимости.",evidence:[{id:episode.signalId,source:"menu",label:"Текущая себестоимость",fact:projected.effect}],
        target:{path:projected.targets.health,label:"Открыть сигнал себестоимости"}});
    } catch { /* An unreadable episode cannot establish resolved/healthy. */ }
  }
  const exactIssues=operations.issues ?? [];
  const exactKeys=new Set(exactIssues.map(item=>item.issueKey));
  const canonicalCandidates=[...intelligence.prioritySignals.filter(item=>!exactKeys.has(String(item.issueKey))),...exactIssues,...costCandidates];
  const attention=buildAIDoctorAttention({candidates:canonicalCandidates,context,memory,now:new Date(asOf),dataReliabilityPercent:intelligence.dataQuality.percent});
  const provenTargets=new Map([...exactIssues,...costCandidates].map(item=>[String(item.managementId),item.target]));
  const previousActions=intelligence.briefing.todayActions;
  const queue=rankManagementSignals(attention.managementQueue,new Date(asOf)).map<Row>(item=>{
    const issueKey=String(item.issueKey ?? "");
    const taskTab=String(item.taskDeadlineDate??'')&&String(item.taskDeadlineDate)<asOf.slice(0,10)?'overdue':String(item.taskDeadlineDate??'')===asOf.slice(0,10)?'today':'week';
    const target=provenTargets.get(String(item.managementId)) ?? (item.linkedTaskId ? {path:`/tasks?venueId=${scope.venueId}&taskId=${encodeURIComponent(String(item.linkedTaskId))}&tab=${taskTab}&returnTo=health`,label:"Открыть поручения"} : businessHealthActionTarget(issueKey,{caseId:item.caseId}));
    return {...item,target,reason:String(item.managementPriorityReason ?? item.consequence ?? item.fact ?? "Проверить сигнал."),ctaLabel:target ? (target as {label:string}).label : "Проверить основание сигнала"};
  });
  intelligence.managementQueue=queue;
  intelligence.managementTopActions=queue.slice(0,3);
  intelligence.briefing.todayActions=queue.slice(0,3).map(item=>({
    ...item,recommendationId:String(item.recommendationId ?? item.managementId ?? item.issueKey),issueKey:String(item.issueKey),title:String(item.title),reason:String(item.reason),ctaLabel:String(item.ctaLabel),
    deadlineLabel:"Срок действия" as const,deadline:String(item.deadline ?? "Срок не назначен"),metricToCheck:String(item.successCriterion ?? "Проверить текущий источник"),targetOrVerification:String(item.successCriterion ?? "Проверить текущий источник"),
    priority:item.priority as "critical"|"high"|"medium"|"low",responsibleRole:String(item.responsibleRole ?? "управляющий"),fact:String(item.fact ?? ""),factPeriod:String(item.factPeriod ?? asOf.slice(0,10)),action:String(item.action ?? "Проверить источник сигнала"),successCriterion:String(item.successCriterion ?? "Проверить источник сигнала"),verificationPlanId:previousActions.find(action=>action.issueKey===item.issueKey)?.verificationPlanId ?? "",
  }));
  intelligence.briefing.actions=intelligence.briefing.todayActions;
  const first=queue[0];
  if(first) intelligence.briefing.diagnosis={title:String(first.title),summary:String(first.fact ?? first.consequence ?? first.reason),severity:first.priority==="critical"?"critical":first.priority==="high"?"high":"medium",periodLabel:asOf.slice(0,10),baseline:"Текущие источники заведения",fact:String(first.fact ?? first.reason),metrics:[],confidencePercent:context.blocks.length?intelligence.dataQuality.percent:0,confidenceLabel:"Достоверность диагноза"};
  else intelligence.briefing.diagnosis=null;
  const baseSnapshot = buildBusinessHealthSnapshot({ venueId: account.venueId, dataAccountId: account.id, intelligence, context });
  const snapshot = { ...baseSnapshot, snapshotId: `${baseSnapshot.snapshotId}:${inputRevision}`, inputRevision, inputManifest, operationsInputs: operations,
    managementCoverage:{cost:costRows.length>25?"PARTIAL":"CURRENT_EPISODES",tasks:sources.find(source=>source.key==="bd_tasks")?.state ?? "UNAVAILABLE"} };
  // Internal operands for read-only Doctor projections. Public Health remains
  // its existing envelope; callers must not serialize raw sources/snapshots.
  return { restricted: false as const, context, intelligence, snapshot, account: currentAccount, memory, attention,
    sources, sourceSnapshots: snapshots, profileJson: profileRow.data_json, readCurrentCost };
}
