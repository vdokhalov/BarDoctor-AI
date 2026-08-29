import { auditDataIntegrity, type DataIntegrityAuditReport } from "./data-integrity-audit";
import { ASSORTMENT_STORE_KEY, resolveInventoryProductKey, STOCK_MOVEMENT_STORE_KEY } from "./inventory";
import { PURCHASE_STORE_KEY, SUPPLIER_STORE_KEY } from "./purchases";

export const INVENTORY_SNAPSHOT_STORE_KEY = "bd_inventory_snapshots";
export const AUTHORITATIVE_EXPORT_SCHEMA_VERSION = "bardoctor-authoritative-export-v1";
export const AUTHORITATIVE_SOURCE_VERSION = "authoritative-persistence-v1";
export const AUTHORITATIVE_STORE_KEYS = [
  ASSORTMENT_STORE_KEY,
  STOCK_MOVEMENT_STORE_KEY,
  PURCHASE_STORE_KEY,
  INVENTORY_SNAPSHOT_STORE_KEY,
  SUPPLIER_STORE_KEY,
] as const;

export type AuthoritativeStoreKey = (typeof AUTHORITATIVE_STORE_KEYS)[number];
export type AuthoritativeStoreSource = "server_d1" | "legacy_client_candidate" | "missing";
export type AuthoritativeStoreInput = {
  exists: boolean;
  data: unknown;
  updatedAt?: string | null;
  parseError?: boolean;
};
export type PersistenceInvariant = {
  code: string;
  severity: "blocking" | "warning";
  count: number;
  examples: string[];
  rootCause: string;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown, fallback = "", max = 320): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}
function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function productKey(value: unknown): string {
  const item = record(value);
  return text(item.purchaseProductKey ?? item.productKey ?? item.key ?? item.nomenclatureItemId);
}
function venueIdOf(value: unknown): number | null {
  const valueVenue = record(value).venueId;
  if (valueVenue === null || valueVenue === undefined || valueVenue === "") return null;
  const parsed = Number(valueVenue);
  return Number.isFinite(parsed) ? parsed : null;
}
function activeMovement(value: unknown): boolean {
  const movement = record(value);
  return text(movement.status, "active", 30) !== "cancelled" && !text(movement.reversedAt, "", 50);
}
function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as JsonRecord)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, stableValue(item)]));
}
export function stableJson(value: unknown): string { return JSON.stringify(stableValue(value)); }

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const AUTHORITATIVE_ENTITY_SOURCES = Object.freeze({
  canonicalAssortment: ASSORTMENT_STORE_KEY,
  nomenclature: ASSORTMENT_STORE_KEY,
  supplierSourceItems: ASSORTMENT_STORE_KEY,
  supplierMappings: ASSORTMENT_STORE_KEY,
  stockBalances: ASSORTMENT_STORE_KEY,
  costBasis: ASSORTMENT_STORE_KEY,
  techCards: ASSORTMENT_STORE_KEY,
  aliasesAndSupersessions: ASSORTMENT_STORE_KEY,
  stockMovements: STOCK_MOVEMENT_STORE_KEY,
  purchaseDocuments: PURCHASE_STORE_KEY,
  inventorySnapshots: INVENTORY_SNAPSHOT_STORE_KEY,
  suppliers: SUPPLIER_STORE_KEY,
});

function sourceFor(
  key: AuthoritativeStoreKey,
  serverStores: Partial<Record<AuthoritativeStoreKey, AuthoritativeStoreInput>>,
  legacyCandidates: Partial<Record<AuthoritativeStoreKey, unknown>>,
) {
  const server = serverStores[key];
  if (server?.exists) return { source: "server_d1" as const, data: server.data, updatedAt: server.updatedAt ?? null };
  if (Object.prototype.hasOwnProperty.call(legacyCandidates, key)) {
    return { source: "legacy_client_candidate" as const, data: legacyCandidates[key], updatedAt: null };
  }
  return { source: "missing" as const, data: key === ASSORTMENT_STORE_KEY ? {} : [], updatedAt: null };
}

function invariant(
  code: string,
  severity: PersistenceInvariant["severity"],
  examples: string[],
  rootCause: string,
): PersistenceInvariant | null {
  return examples.length ? { code, severity, count: examples.length, examples: examples.slice(0, 50), rootCause } : null;
}

function purchaseLines(documents: unknown[]): JsonRecord[] {
  return documents.flatMap((document) => {
    const root = record(document);
    return array(root.items ?? root.lines).map((line) => ({
      ...record(line),
      purchaseDocumentId: text(root.id),
      venueId: record(line).venueId ?? root.venueId,
    }));
  });
}

export async function buildImmutableVenueExport(input: {
  venue: { id: number; name?: string | null; workspaceId?: number | null; dataAccountId?: number | null };
  serverStores: Partial<Record<AuthoritativeStoreKey, AuthoritativeStoreInput>>;
  legacyCandidates?: Partial<Record<AuthoritativeStoreKey, unknown>>;
  exportedAt?: string;
  sourceVersion?: string;
  sourceCommit?: string;
}) {
  const legacyCandidates = input.legacyCandidates ?? {};
  const stores = Object.fromEntries(AUTHORITATIVE_STORE_KEYS.map((key) => [
    key,
    sourceFor(key, input.serverStores, legacyCandidates),
  ])) as Record<AuthoritativeStoreKey, ReturnType<typeof sourceFor>>;
  const assortment = record(stores[ASSORTMENT_STORE_KEY].data);
  const purchases = array(stores[PURCHASE_STORE_KEY].data);
  const movements = array(stores[STOCK_MOVEMENT_STORE_KEY].data);
  const snapshots = array(stores[INVENTORY_SNAPSHOT_STORE_KEY].data);
  const suppliers = array(stores[SUPPLIER_STORE_KEY].data);
  const nomenclature = array(assortment.nomenclature);
  const balances = array(assortment.stockBalances);
  const mappings = array(assortment.supplierProductMappings);
  const recipes = array(assortment.recipes);
  const lines = purchaseLines(purchases);
  const aliases = [
    ...array(assortment.inventoryProductAliases),
    ...array(assortment.canonicalProductAliases),
    ...array(assortment.canonicalSupersessions),
  ];
  const canonicalKeys = new Set(nomenclature.map(productKey).filter(Boolean));
  const balanceKeys = new Set(balances.map(productKey).filter(Boolean));
  const purchaseIds = new Set(purchases.map((value) => text(record(value).id)).filter(Boolean));
  const sourceProblems = AUTHORITATIVE_STORE_KEYS
    .filter((key) => stores[key].source !== "server_d1")
    .map((key) => `${key}:${stores[key].source}`);
  const invalidServerStores = AUTHORITATIVE_STORE_KEYS
    .filter((key) => input.serverStores[key]?.exists && input.serverStores[key]?.parseError)
    .map((key) => key);
  const crossVenue = [...nomenclature, ...balances, ...purchases, ...movements, ...snapshots, ...mappings, ...recipes]
    .filter((value) => venueIdOf(value) !== null && venueIdOf(value) !== input.venue.id)
    .map((value) => text(record(value).id, productKey(value) || "unknown"));
  const unresolvedPurchaseLines = lines.filter((line) => {
    const canonical = productKey(line);
    const source = text(line.sourceItemKey ?? line.supplierItemKey);
    return !canonical && !source && text(line.status) !== "unresolved";
  }).map((line) => `${text(line.purchaseDocumentId, "purchase")}:${text(line.id, "line")}`);
  const invalidMovements = movements.filter((value) => activeMovement(value)).filter((value) => {
    const movement = record(value);
    const sourceDocumentId = text(movement.sourceDocumentId);
    return !productKey(movement) || !balanceKeys.has(resolveInventoryProductKey(assortment, productKey(movement)))
      || (sourceDocumentId && !purchaseIds.has(sourceDocumentId) && text(movement.type) === "receipt");
  }).map((value) => text(record(value).id, productKey(value) || "movement"));
  const invalidSnapshotKeys = snapshots.flatMap((value) => {
    const snapshot = record(value);
    return array(snapshot.items ?? snapshot.lines).filter((line) => {
      const key = productKey(line);
      return key && !balanceKeys.has(resolveInventoryProductKey(assortment, key));
    }).map((line) => `${text(snapshot.id, "snapshot")}:${productKey(line)}`);
  });
  const invalidMappings = mappings.filter((value) => {
    const mapping = record(value);
    const target = resolveInventoryProductKey(assortment, text(mapping.canonicalProductKey));
    return !text(mapping.sourceItemKey) || (!canonicalKeys.has(target) && !balanceKeys.has(target));
  }).map((value) => text(record(value).id, text(record(value).sourceItemKey, "mapping")));
  const stockWithoutCost = balances.filter((value) => {
    const balance = record(value);
    return numeric(balance.current) > 0
      && !(numeric(balance.averageUnitCost) > 0 || numeric(balance.inventoryValue) > 0);
  }).map((value) => productKey(value) || text(record(value).name, "balance"));
  const sourceInvariants = [
    invariant("AUTHORITATIVE_SOURCE_MISSING", "blocking", sourceProblems, "Legacy bootstrap omitted core inventory stores; client cache cannot prove durable server authority."),
    invariant("AUTHORITATIVE_STORE_INVALID_JSON", "blocking", invalidServerStores, "A server-side core store exists but its payload is not valid JSON."),
    invariant("CROSS_VENUE_REFERENCE", "blocking", crossVenue, "A record carries a venue id different from the selected D1 data account boundary."),
    invariant("PURCHASE_LINE_IDENTITY_MISSING", "blocking", unresolvedPurchaseLines, "Purchase line has neither canonical, supplier-source, nor explicit unresolved identity."),
    invariant("MOVEMENT_CHAIN_INVALID", "blocking", invalidMovements, "Movement references a missing balance/product or receipt source document."),
    invariant("SNAPSHOT_KEY_UNRESOLVED", "blocking", invalidSnapshotKeys, "Historical snapshot key cannot be resolved through the additive alias chain."),
    invariant("SUPPLIER_MAPPING_TARGET_INVALID", "blocking", invalidMappings, "Supplier mapping has no stable source identity or live canonical target."),
    invariant("POSITIVE_STOCK_WITHOUT_COST", "warning", stockWithoutCost, "Positive quantity lacks a valid accounting cost basis."),
  ].filter((value): value is PersistenceInvariant => Boolean(value));
  const audit: DataIntegrityAuditReport = auditDataIntegrity({
    assortment,
    purchaseDocuments: purchases,
    stockMovements: movements,
    inventorySnapshots: snapshots,
    venueId: input.venue.id,
  });
  const auditBlocking = audit.findings.filter((item) => item.severity === "high");
  const invariants = [
    ...sourceInvariants,
    ...auditBlocking.map((item) => ({
      code: `AUDIT_${item.code}`,
      severity: "blocking" as const,
      count: item.count,
      examples: item.examples,
      rootCause: item.rootCause,
    })),
  ];
  const counts = {
    stores: AUTHORITATIVE_STORE_KEYS.length,
    serverAuthoritativeStores: AUTHORITATIVE_STORE_KEYS.filter((key) => stores[key].source === "server_d1").length,
    missingStores: AUTHORITATIVE_STORE_KEYS.filter((key) => stores[key].source === "missing").length,
    legacyCandidateStores: AUTHORITATIVE_STORE_KEYS.filter((key) => stores[key].source === "legacy_client_candidate").length,
    canonicalItems: nomenclature.length,
    supplierSourceItems: mappings.length,
    suppliers: suppliers.length,
    purchaseDocuments: purchases.length,
    purchaseLines: lines.length,
    stockMovements: movements.length,
    inventorySnapshots: snapshots.length,
    stockBalances: balances.length,
    techCards: recipes.length,
    aliasesAndSupersessions: aliases.length,
    blockingInvariants: invariants.filter((item) => item.severity === "blocking").reduce((sum, item) => sum + item.count, 0),
    warnings: invariants.filter((item) => item.severity === "warning").reduce((sum, item) => sum + item.count, 0),
  };
  const snapshot = {
    schemaVersion: AUTHORITATIVE_EXPORT_SCHEMA_VERSION,
    sourceVersion: input.sourceVersion ?? AUTHORITATIVE_SOURCE_VERSION,
    sourceCommit: input.sourceCommit ?? null,
    venue: { id: input.venue.id, name: input.venue.name ?? null, workspaceId: input.venue.workspaceId ?? null },
    entitySources: AUTHORITATIVE_ENTITY_SOURCES,
    storeProvenance: Object.fromEntries(AUTHORITATIVE_STORE_KEYS.map((key) => [key, {
      source: stores[key].source,
      updatedAt: stores[key].updatedAt,
      validJson: !input.serverStores[key]?.parseError,
    }])),
    stores: Object.fromEntries(AUTHORITATIVE_STORE_KEYS.map((key) => [key, stores[key].data])),
    counts,
    invariants,
    audit,
  };
  const checksum = await sha256(stableJson(snapshot));
  const complete = counts.serverAuthoritativeStores === AUTHORITATIVE_STORE_KEYS.length
    && counts.blockingInvariants === 0;
  return {
    ...snapshot,
    exportId: `bdx_${checksum.slice(0, 24)}`,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    checksum: { algorithm: "SHA-256", value: checksum, scope: "stable snapshot excluding export timestamp and id" },
    complete,
    reconciliationAllowed: complete,
    dryRun: {
      writesPerformed: 0 as const,
      affectedRecords: audit.reconciliation.affectedRecords,
      highConfidenceAutomatic: audit.reconciliation.highConfidenceAutomatic,
      ambiguous: audit.reconciliation.ambiguous,
      stockPositionsPotentiallyAffected: audit.reconciliation.stockPositionsPotentiallyAffected,
      valuationRecordsPotentiallyAffected: audit.reconciliation.valuationRecordsPotentiallyAffected,
      historyRecordsPotentiallyAffected: audit.reconciliation.historyRecordsPotentiallyAffected,
    },
    rollback: {
      required: true,
      strategy: "Before any separately approved reconciliation, persist this export and an operation id; rollback restores each exact store payload and invalidates that operation id.",
      stores: [...AUTHORITATIVE_STORE_KEYS],
    },
  };
}

export function emptyAuthoritativeVenueStores(venueId: number) {
  return {
    [ASSORTMENT_STORE_KEY]: {
      version: AUTHORITATIVE_SOURCE_VERSION,
      venueId,
      nomenclature: [],
      stockBalances: [],
      supplierProductMappings: [],
      recipes: [],
      inventoryProductAliases: [],
      canonicalProductAliases: [],
      canonicalSupersessions: [],
    },
    [STOCK_MOVEMENT_STORE_KEY]: [],
    [PURCHASE_STORE_KEY]: [],
    [INVENTORY_SNAPSHOT_STORE_KEY]: [],
    [SUPPLIER_STORE_KEY]: [],
  } satisfies Record<AuthoritativeStoreKey, unknown>;
}

export function authoritativeVenueStoreRows(input: {
  dataAccountId: number;
  venueId: number;
  updatedAt: string;
}) {
  return Object.entries(emptyAuthoritativeVenueStores(input.venueId)).map(([storeKey, data]) => ({
    accountId: input.dataAccountId,
    storeKey,
    dataJson: JSON.stringify(data),
    updatedAt: input.updatedAt,
  }));
}
