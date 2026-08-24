import { inventoryPackageAmount, resolveInventoryProductKey, toInventoryBaseAmount } from "./inventory";
import { auditCanonicalNomenclature, canonicalSupplierMappings } from "./nomenclature-identity";
import { reconcileTechCards, validateTechCardVenueIsolation } from "./tech-card-reconciliation";

type JsonRecord = Record<string, unknown>;
export type DataIntegrityFinding = {
  code: string;
  severity: "high" | "medium" | "low";
  count: number;
  rootCause: string;
  examples: string[];
};
export type DataIntegrityAuditReport = {
  version: "data-integrity-v261";
  mode: "read_only_dry_run";
  venueId: number | null;
  counts: Record<string, number>;
  findings: DataIntegrityFinding[];
  reconciliation: {
    affectedRecords: number;
    highConfidenceAutomatic: number;
    ambiguous: number;
    stockPositionsPotentiallyAffected: number;
    valuationRecordsPotentiallyAffected: number;
    historyRecordsPotentiallyAffected: number;
    writesPerformed: 0;
    rollback: string[];
  };
};

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
function keyOf(value: JsonRecord): string {
  return text(value.purchaseProductKey ?? value.productKey ?? value.key ?? value.nomenclatureItemId);
}
function venueOf(value: JsonRecord): number | null {
  if (value.venueId === null || value.venueId === undefined || value.venueId === "") return null;
  const parsed = Number(value.venueId);
  return Number.isFinite(parsed) ? parsed : null;
}
function sameVenue(value: JsonRecord, venueId?: number): boolean {
  const valueVenue = venueOf(value);
  return !venueId || valueVenue === null || valueVenue === venueId;
}
function activeMovement(value: JsonRecord): boolean {
  return text(value.status, "active", 30) !== "cancelled" && !text(value.reversedAt, "", 50);
}
function packageIdentity(value: unknown): string {
  const source = record(value);
  const label = text(source.label ?? source.packageSize ?? value, "", 120);
  const parsed = inventoryPackageAmount(label, source.unit);
  return parsed.amount > 0 && parsed.unit !== "unknown"
    ? `${parsed.amount}|${parsed.unit}`
    : label.toLocaleLowerCase("ru").replace(/\s+/g, " ");
}
function finding(code: string, severity: DataIntegrityFinding["severity"], values: string[], rootCause: string) {
  return values.length ? { code, severity, count: values.length, rootCause, examples: values.slice(0, 8) } : null;
}

/** Pure read-only audit for an exported venue snapshot. */
export function auditDataIntegrity(input: {
  assortment: unknown;
  purchaseDocuments?: unknown[];
  stockMovements?: unknown[];
  inventorySnapshots?: unknown[];
  venueId?: number;
  now?: Date;
}): DataIntegrityAuditReport {
  const assortment = record(input.assortment);
  const nomenclature = array(assortment.nomenclature).map(record);
  const balances = array(assortment.stockBalances).map(record);
  const recipes = array(assortment.recipes).map(record);
  const purchases = (input.purchaseDocuments ?? []).map(record);
  const movements = (input.stockMovements ?? []).map(record);
  const snapshots = (input.inventorySnapshots ?? array(assortment.inventorySnapshots)).map(record);
  const canonicalAudit = auditCanonicalNomenclature({ assortment, purchaseDocuments: purchases, venueId: input.venueId });
  const techResult = reconcileTechCards({ assortment, purchaseDocuments: purchases, venueId: input.venueId, now: input.now ?? new Date(0) });
  const tech = techResult.report;
  const mappings = canonicalSupplierMappings(assortment);
  const canonicalKeys = new Set(nomenclature.filter((item) => sameVenue(item, input.venueId)).map(keyOf).filter(Boolean));
  const balanceKeys = new Set(balances.filter((item) => sameVenue(item, input.venueId)).map(keyOf).filter(Boolean));
  const purchaseIds = new Set(purchases.filter((item) => sameVenue(item, input.venueId)).map((item) => text(item.id, "", 100)).filter(Boolean));
  const activeReceipts = movements.filter((movement) => sameVenue(movement, input.venueId) && activeMovement(movement) && text(movement.type) === "receipt");

  const missingCost = balances.filter((balance) => sameVenue(balance, input.venueId)
    && numeric(balance.current) > 0
    && !(numeric(balance.averageUnitCost) > 0 || numeric(balance.inventoryValue) > 0))
    .map((balance) => keyOf(balance) || text(balance.name));
  const duplicatePackages = nomenclature.flatMap((item) => {
    const identities = array(item.packageOptions).map(packageIdentity).filter(Boolean);
    return identities.length !== new Set(identities).size ? [keyOf(item) || text(item.name)] : [];
  });
  const unitConflicts = balances.flatMap((balance) => {
    const base = toInventoryBaseAmount(1, balance.unit).unit;
    const packageUnits = array(balance.packageOptions).map((value) => inventoryPackageAmount(value, balance.unit).unit)
      .filter((unit) => unit !== "unknown");
    return packageUnits.some((unit) => base !== "unknown" && unit !== base) ? [keyOf(balance) || text(balance.name)] : [];
  });
  const confirmedPurchases = purchases.filter((purchase) => sameVenue(purchase, input.venueId)
    && text(purchase.status) === "confirmed" && text(purchase.documentType) !== "price_list");
  const purchaseWithoutMovement = confirmedPurchases.filter((purchase) =>
    !activeReceipts.some((movement) => text(movement.sourceDocumentId, "", 100) === text(purchase.id, "", 100)))
    .map((purchase) => text(purchase.id, "unknown", 100));
  const orphanMovements = activeReceipts.filter((movement) =>
    !purchaseIds.has(text(movement.sourceDocumentId, "", 100)) || !balanceKeys.has(keyOf(movement)))
    .map((movement) => text(movement.id, "unknown", 100));
  const movementIdentity = new Map<string, number>();
  for (const movement of activeReceipts) {
    const identity = [text(movement.sourceDocumentId), text(movement.sourceLineId), keyOf(movement)].join("|");
    movementIdentity.set(identity, (movementIdentity.get(identity) ?? 0) + 1);
  }
  const duplicateReceipts = [...movementIdentity].filter(([, count]) => count > 1).map(([identity]) => identity);
  const cancelledWithActiveReceipts = purchases.filter((purchase) => sameVenue(purchase, input.venueId)
    && text(purchase.status) === "cancelled"
    && activeReceipts.some((movement) => text(movement.sourceDocumentId) === text(purchase.id)))
    .map((purchase) => text(purchase.id, "unknown", 100));
  const snapshotOrphans = snapshots.flatMap((snapshot) => array(snapshot.items ?? snapshot.lines).map(record)
    .filter((line) => keyOf(line) && !balanceKeys.has(resolveInventoryProductKey(assortment, keyOf(line))))
    .map((line) => `${text(snapshot.id, "snapshot", 100)}:${keyOf(line)}`));
  const crossVenueRecords = [...nomenclature, ...balances, ...recipes, ...purchases, ...movements, ...snapshots]
    .filter((value) => input.venueId && venueOf(value) !== null && venueOf(value) !== input.venueId)
    .map((value) => text(value.id, keyOf(value) || "unknown", 120));
  const crossVenueReferences = validateTechCardVenueIsolation(assortment, input.venueId, purchases)
    .map((issue) => `${issue.code}:${issue.recipeId}${issue.ingredientId ? `:${issue.ingredientId}` : ""}`);
  const highUnlinked = array(record(techResult.assortment).recipes).map(record)
    .flatMap((recipe) => array(recipe.ingredients).map(record))
    .filter((ingredient) => text(ingredient.matchTier) === "high" && !keyOf(ingredient))
    .map((ingredient) => text(ingredient.id, text(ingredient.name, "unknown"), 120));
  const staleMappings = mappings.filter((mapping) => mapping.status === "orphan" || mapping.status === "review"
    || !canonicalKeys.has(mapping.canonicalProductKey)).map((mapping) => mapping.sourceItemKey);
  const staleAliases = array(assortment.canonicalProductAliases).map(record).filter((alias) => {
    const from = text(alias.from); const to = text(alias.to);
    return !from || !to || from === to || !canonicalKeys.has(to);
  }).map((alias) => `${text(alias.from, "?")}→${text(alias.to, "?")}`);

  const findings = [
    finding("CANONICAL_DUPLICATE", "high", Array(numeric(canonicalAudit.suspectedCanonicalDuplicates)).fill("canonical duplicate candidate"), "Canonical identity was derived from mutable invoice labels instead of a stable canonical boundary."),
    finding("SUPPLIER_MAPPING_STALE_OR_ORPHAN", "high", staleMappings, "Supplier mappings lacked one-source-key uniqueness and a live canonical target invariant."),
    finding("TECH_CARD_ORPHAN_OR_AMBIGUOUS", "high", Array(tech.orphan + tech.ambiguous + tech.duplicateCandidates).fill("tech-card relationship"), "Tech cards predate stable owner identity or multiple active versions were retained."),
    finding("HIGH_MATCH_UNLINKED", "medium", highUnlinked, "A high semantic suggestion was stored without a canonical link, often because an approved manual card is protected."),
    finding("UNIT_OR_PACKAGE_CONFLICT", "high", [...unitConflicts, ...duplicatePackages], "Packaging metadata has no normalized uniqueness and unit-compatibility invariant."),
    finding("STOCK_WITHOUT_COST_BASIS", "high", missingCost, "Quantity was accepted while accounting cost was missing, incompatible, or inherited from an unvalued balance."),
    finding("PURCHASE_MOVEMENT_CHAIN_BROKEN", "high", [...purchaseWithoutMovement, ...orphanMovements], "Purchase, movement, and balance stores are persisted independently and can diverge after partial or legacy writes."),
    finding("PURCHASE_REPOST_OR_CANCEL_CONFLICT", "high", [...duplicateReceipts, ...cancelledWithActiveReceipts], "Receipt posting identity and reversal invariants were not uniquely persisted."),
    finding("INVENTORY_SNAPSHOT_ORPHAN", "medium", snapshotOrphans, "Snapshots preserve historical keys while readers do not uniformly resolve canonical aliases."),
    finding("CROSS_VENUE_RECORD_OR_REFERENCE", "high", [...crossVenueRecords, ...crossVenueReferences], "Legacy null/shared venue data and filtered lookups weakened explicit venue boundaries."),
    finding("STALE_OR_SUPERSEDED_ALIAS", "medium", staleAliases, "Canonical supersession aliases are additive but not uniformly validated by historical readers."),
  ].filter((value): value is DataIntegrityFinding => Boolean(value));
  const highConfidenceAutomatic = numeric(canonicalAudit.safeMergeCandidates);
  const ambiguous = numeric(canonicalAudit.ambiguousCandidates) + tech.ambiguous + tech.duplicateCandidates + tech.mediumConfidenceNeedsReview;
  const affectedRecords = findings.reduce((sum, value) => sum + value.count, 0);
  return {
    version: "data-integrity-v261", mode: "read_only_dry_run", venueId: input.venueId ?? null,
    counts: {
      canonicalItems: numeric(canonicalAudit.totalCanonicalItems), supplierItems: mappings.length,
      techCards: tech.totalCards, ingredientLines: tech.ingredientLines,
      highSemanticPreviouslyUnmatched: tech.highIdentityPreviouslyUnmatched,
      highSemanticStillUnlinked: highUnlinked.length,
      stockPositions: balances.filter((item) => sameVenue(item, input.venueId)).length,
      purchases: confirmedPurchases.length, activeReceiptMovements: activeReceipts.length,
      inventorySnapshots: snapshots.filter((item) => sameVenue(item, input.venueId)).length,
      dataQualityIssues: affectedRecords,
    },
    findings,
    reconciliation: {
      affectedRecords, highConfidenceAutomatic, ambiguous,
      stockPositionsPotentiallyAffected: numeric(canonicalAudit.affectedStockPositions),
      valuationRecordsPotentiallyAffected: missingCost.length + numeric(canonicalAudit.affectedStockPositions),
      historyRecordsPotentiallyAffected: purchaseWithoutMovement.length + orphanMovements.length + snapshotOrphans.length,
      writesPerformed: 0,
      rollback: [
        "Export immutable copies of assortment, movements, purchases, snapshots, and supplier mappings.",
        "Apply a versioned batch with an operation id and before/after key map.",
        "Rollback by restoring exported stores and invalidating the batch operation id.",
        "Rebuild analytics and verify quantity and valuation invariants per venue.",
      ],
    },
  };
}
