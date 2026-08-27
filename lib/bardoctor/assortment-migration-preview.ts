import { inventoryUnitDefinition } from "./inventory";
import { fuzzyNomenclatureScore, normalizeInvoiceText, packageFingerprint } from "./invoice-recognition-v2";
import { PURCHASE_STOCK_CATEGORIES } from "./purchases";

type JsonRecord = Record<string, unknown>;

export type MigrationPreviewSource = {
  type: "stock_movement" | "purchase_supplier_line";
  id: string;
  documentId?: string;
  documentNumber?: string;
  supplierId?: string;
  supplierName?: string;
  date?: string;
  rawName: string;
  quantity?: number;
  unit: string;
  packageSize?: string;
  supplierArticle?: string;
  barcode?: string;
  productKey?: string;
};

export type ProposedCanonicalPosition = {
  proposalId: string;
  productKey: string;
  name: string;
  normalizedName: string;
  unit: string;
  packageSize: string;
  packageFingerprint: string;
  aliases: string[];
  supplierArticles: string[];
  barcodes: string[];
  provenance: MigrationPreviewSource[];
  status: "safe" | "review";
  blockers: string[];
};

export type MigrationPositionStatus =
  | "SAFE_AUTO_CREATE"
  | "PROBABLE_DUPLICATE"
  | "AMBIGUOUS"
  | "INSUFFICIENT_DATA";

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

function baseUnit(value: unknown): string {
  return inventoryUnitDefinition(value)?.baseUnit ?? "unknown";
}

function sourceBaseUnit(source: Pick<MigrationPreviewSource, "rawName" | "packageSize" | "unit">): string {
  const fingerprint = packageFingerprint(`${source.rawName} ${source.packageSize ?? ""}`);
  if (fingerprint.startsWith("ml:")) return "ml";
  if (fingerprint.startsWith("g:")) return "g";
  if (fingerprint.startsWith("pcs:")) return "pcs";
  return baseUnit(source.unit);
}

function compatible(left: ProposedCanonicalPosition, right: ProposedCanonicalPosition): boolean {
  if (left.unit !== "unknown" && right.unit !== "unknown" && left.unit !== right.unit) return false;
  return !left.packageFingerprint || !right.packageFingerprint || left.packageFingerprint === right.packageFingerprint;
}

function tokens(value: string): Set<string> {
  return new Set(value.split(" ").filter((token) => token.length > 1));
}

function similarity(left: string, right: string): number {
  if (left === right) return 1;
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / Math.max(a.size, b.size);
}

function serviceLike(name: string): boolean {
  return /(?:^|\s)(?:ремонт|услуг|доставк|аренд|маркетинг|smm|instagram|инстаграм|монтаж|настройк|обслуживан|диагностик)(?:\s|$)/i.test(name);
}

function sourceLine(input: {
  item: JsonRecord;
  document: JsonRecord;
  index: number;
}): MigrationPreviewSource | null {
  const rawName = text(input.item.rawName ?? input.item.name ?? input.item.productName, "", 300);
  if (!rawName) return null;
  return {
    type: "purchase_supplier_line",
    id: text(input.item.id, `${text(input.document.id, "document")}:${input.index + 1}`, 180),
    documentId: text(input.document.id, "", 180) || undefined,
    documentNumber: text(input.document.documentNumber ?? input.document.number, "", 100) || undefined,
    supplierId: text(input.document.supplierId, "", 180) || undefined,
    supplierName: text(input.document.supplierName, "", 240) || undefined,
    date: text(input.document.date, "", 40) || undefined,
    rawName,
    quantity: numeric(input.item.quantity),
    unit: text(input.item.unit, "", 40),
    packageSize: text(input.item.packageSize, "", 120) || undefined,
    supplierArticle: text(input.item.supplierArticle ?? input.item.article ?? input.item.sku, "", 160) || undefined,
    barcode: text(input.item.barcode, "", 160) || undefined,
    productKey: text(input.item.purchaseProductKey ?? input.item.productKey ?? input.item.nomenclatureId, "", 300) || undefined,
  };
}

function newProposal(source: MigrationPreviewSource, productKey?: string): ProposedCanonicalPosition {
  const normalizedName = normalizeInvoiceText(source.rawName);
  const unit = sourceBaseUnit(source);
  const fingerprint = packageFingerprint(`${source.rawName} ${source.packageSize ?? ""}`);
  const key = productKey || `preview:${normalizedName}|${unit}|${fingerprint || "no-package"}`;
  return {
    proposalId: key,
    productKey: key,
    name: source.rawName,
    normalizedName,
    unit,
    packageSize: source.packageSize ?? "",
    packageFingerprint: fingerprint,
    aliases: [source.rawName],
    supplierArticles: source.supplierArticle ? [source.supplierArticle] : [],
    barcodes: source.barcode ? [source.barcode] : [],
    provenance: [source],
    status: "safe",
    blockers: [],
  };
}

function addSource(position: ProposedCanonicalPosition, source: MigrationPreviewSource): void {
  position.provenance.push(source);
  position.aliases = [...new Set([...position.aliases, source.rawName])];
  if (source.supplierArticle) position.supplierArticles = [...new Set([...position.supplierArticles, source.supplierArticle])];
  if (source.barcode) position.barcodes = [...new Set([...position.barcodes, source.barcode])];
  if (!position.packageSize && source.packageSize) position.packageSize = source.packageSize;
}

function markReview(position: ProposedCanonicalPosition, blocker: string): void {
  position.status = "review";
  position.blockers = [...new Set([...position.blockers, blocker])];
}

function migrationStatus(position: ProposedCanonicalPosition): MigrationPositionStatus {
  if (position.blockers.includes("IDENTIFIER_CONFLICT")
    || position.blockers.includes("MULTIPLE_EXISTING_STOCK_TARGETS")
    || position.blockers.includes("SAME_NAME_DIFFERENT_UNIT_OR_PACKAGE")) {
    return "AMBIGUOUS";
  }
  if (position.blockers.includes("PROBABLE_DUPLICATE")) return "PROBABLE_DUPLICATE";
  if (position.blockers.includes("UNKNOWN_UNIT") || position.blockers.includes("NAME_TOO_SHORT_OR_EMPTY")) {
    return "INSUFFICIENT_DATA";
  }
  return "SAFE_AUTO_CREATE";
}

export function buildAssortmentMigrationPreview(input: {
  venueId: number;
  purchases: unknown;
  stockMovements: unknown;
  suppliers: unknown;
  serverAssortmentExists: boolean;
  sourceStorePresence?: {
    purchases: boolean;
    suppliers: boolean;
    stockMovements: boolean;
    assortment: boolean;
  };
  legacyMenuObservation?: { items: number; source: string } | null;
}) {
  const purchaseDocuments = array(input.purchases).map(record).filter((document) => {
    const venueId = numeric(document.venueId);
    const status = text(document.status, "confirmed", 30);
    return (!venueId || venueId === input.venueId) && status !== "cancelled";
  });
  const supplierRows = array(input.suppliers).map(record);
  const movements = array(input.stockMovements).map(record).filter((movement) => {
    const venueId = numeric(movement.venueId);
    return (!venueId || venueId === input.venueId) && text(movement.status, "active", 30) !== "cancelled";
  });
  const positions = new Map<string, ProposedCanonicalPosition>();
  const stockByName = new Map<string, ProposedCanonicalPosition[]>();
  const excluded: Array<{ source: MigrationPreviewSource; reason: string }> = [];
  const allSupplierLines: MigrationPreviewSource[] = [];

  for (const movement of movements) {
    const productKey = text(movement.productKey ?? movement.nomenclatureItemId, "", 300);
    const productName = text(movement.productName ?? movement.name, "", 300);
    if (!productKey || !productName) continue;
    const source: MigrationPreviewSource = {
      type: "stock_movement",
      id: text(movement.id, `${productKey}:${positions.size + 1}`, 180),
      documentId: text(movement.sourceDocumentId, "", 180) || undefined,
      date: text(movement.date ?? movement.createdAt, "", 40) || undefined,
      rawName: productName,
      quantity: numeric(movement.amount),
      unit: text(movement.unit, "", 40),
      productKey,
    };
    const existing = positions.get(productKey);
    if (existing) addSource(existing, source);
    else positions.set(productKey, newProposal(source, productKey));
  }
  for (const position of positions.values()) {
    const rows = stockByName.get(position.normalizedName) ?? [];
    rows.push(position);
    stockByName.set(position.normalizedName, rows);
  }

  for (const document of purchaseDocuments) {
    const documentCategory = text(document.expenseCategory ?? document.category, "", 50);
    for (const [index, rawItem] of array(document.items).entries()) {
      const item = record(rawItem);
      const source = sourceLine({ item, document, index });
      if (!source) continue;
      allSupplierLines.push(source);
      const itemCategory = text(item.category, documentCategory, 50);
      if (!PURCHASE_STOCK_CATEGORIES.has(itemCategory) || serviceLike(normalizeInvoiceText(source.rawName))) {
        excluded.push({ source, reason: "NON_STOCK_OR_SERVICE_LINE" });
        continue;
      }
      const linked = source.productKey ? positions.get(source.productKey) : undefined;
      if (linked) {
        addSource(linked, source);
        continue;
      }
      const normalizedName = normalizeInvoiceText(source.rawName);
      const sourceUnit = sourceBaseUnit(source);
      const sourcePackage = packageFingerprint(`${source.rawName} ${source.packageSize ?? ""}`);
      const exactStock = (stockByName.get(normalizedName) ?? []).filter((position) =>
        (position.unit === "unknown" || sourceUnit === "unknown" || position.unit === sourceUnit)
        && (!position.packageFingerprint || !sourcePackage || position.packageFingerprint === sourcePackage)
      );
      if (exactStock.length === 1) {
        addSource(exactStock[0], source);
        continue;
      }
      if (exactStock.length > 1) {
        excluded.push({ source, reason: "MULTIPLE_EXISTING_STOCK_TARGETS" });
        exactStock.forEach((position) => markReview(position, "MULTIPLE_EXISTING_STOCK_TARGETS"));
        continue;
      }
      const clusterKey = `preview:${normalizedName}|${sourceUnit}|${sourcePackage || "no-package"}`;
      const existing = positions.get(clusterKey);
      if (existing) addSource(existing, source);
      else positions.set(clusterKey, newProposal(source));
    }
  }

  const proposed = [...positions.values()];
  const variantsByName = new Map<string, ProposedCanonicalPosition[]>();
  for (const position of proposed) {
    const rows = variantsByName.get(position.normalizedName) ?? [];
    rows.push(position);
    variantsByName.set(position.normalizedName, rows);
    if (!position.normalizedName || position.normalizedName.length < 3) markReview(position, "NAME_TOO_SHORT_OR_EMPTY");
    if (position.unit === "unknown") markReview(position, "UNKNOWN_UNIT");
  }
  for (const variants of variantsByName.values()) {
    const signatures = new Set(variants.map((position) => `${position.unit}|${position.packageFingerprint || "no-package"}`));
    if (signatures.size > 1) variants.forEach((position) => markReview(position, "SAME_NAME_DIFFERENT_UNIT_OR_PACKAGE"));
  }

  const probableDuplicates: Array<{
    leftProposalId: string;
    leftName: string;
    rightProposalId: string;
    rightName: string;
    similarity: number;
    packageConflict: boolean;
  }> = [];
  for (let leftIndex = 0; leftIndex < proposed.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < proposed.length; rightIndex += 1) {
      const left = proposed[leftIndex];
      const right = proposed[rightIndex];
      if (left.normalizedName === right.normalizedName) continue;
      const score = Math.max(similarity(left.normalizedName, right.normalizedName), fuzzyNomenclatureScore(left.name, {
        id: right.proposalId,
        key: right.productKey,
        name: right.name,
        unit: right.unit,
        packageSize: right.packageSize,
        aliases: right.aliases,
        supplierArticles: right.supplierArticles,
        barcodes: right.barcodes,
      }));
      if (score < 0.75) continue;
      const packageConflict = !compatible(left, right);
      probableDuplicates.push({
        leftProposalId: left.proposalId,
        leftName: left.name,
        rightProposalId: right.proposalId,
        rightName: right.name,
        similarity: Math.round(score * 1_000) / 1_000,
        packageConflict,
      });
      if (!packageConflict) {
        markReview(left, "PROBABLE_DUPLICATE");
        markReview(right, "PROBABLE_DUPLICATE");
      }
    }
  }

  const identifierOwners = new Map<string, ProposedCanonicalPosition[]>();
  for (const position of proposed) {
    for (const identifier of [...position.supplierArticles.map((value) => `sku:${value}`), ...position.barcodes.map((value) => `barcode:${value}`)]) {
      const owners = identifierOwners.get(identifier) ?? [];
      owners.push(position);
      identifierOwners.set(identifier, owners);
    }
  }
  const identifierConflicts = [...identifierOwners.entries()].filter(([, owners]) => owners.length > 1)
    .map(([identifier, owners]) => ({ identifier, proposalIds: owners.map((owner) => owner.proposalId) }));
  for (const conflict of identifierConflicts) {
    conflict.proposalIds.forEach((id) => {
      const position = positions.get(id);
      if (position) markReview(position, "IDENTIFIER_CONFLICT");
    });
  }

  const exactDuplicateGroups = proposed.filter((position) =>
    position.provenance.filter((source) => source.type === "purchase_supplier_line").length > 1
  ).map((position) => ({
    proposalId: position.proposalId,
    name: position.name,
    supplierLineOccurrences: position.provenance.filter((source) => source.type === "purchase_supplier_line").length,
    suppliers: [...new Set(position.provenance.map((source) => source.supplierName).filter(Boolean))],
  }));
  const safe = proposed.filter((position) => position.status === "safe");
  const review = proposed.filter((position) => position.status === "review");
  const positionStatusCounts = proposed.reduce<Record<MigrationPositionStatus, number>>((counts, position) => {
    counts[migrationStatus(position)] += 1;
    return counts;
  }, {
    SAFE_AUTO_CREATE: 0,
    PROBABLE_DUPLICATE: 0,
    AMBIGUOUS: 0,
    INSUFFICIENT_DATA: 0,
  });
  const uniqueNormalizedProducts = new Set(allSupplierLines
    .map((source) => normalizeInvoiceText(source.rawName)).filter(Boolean));
  const supplierSkuLines = allSupplierLines.filter((line) => Boolean(line.supplierArticle)).length;
  const barcodeLines = allSupplierLines.filter((line) => Boolean(line.barcode)).length;
  const packageLines = allSupplierLines.filter((line) => Boolean(line.packageSize || packageFingerprint(line.rawName))).length;
  const unitLines = allSupplierLines.filter((line) => sourceBaseUnit(line) !== "unknown").length;

  return {
    mode: "controlled_read_only_migration_preview" as const,
    writesPerformed: 0,
    venueId: input.venueId,
    authoritativeSourcePriority: [
      { rank: 1, source: "stock_movement_product_key", reason: "Existing stable stock identity" },
      { rank: 2, source: "supplier_article_or_barcode", reason: "Supplier-scoped durable identifier" },
      { rank: 3, source: "repeated_purchase_identity", reason: "Stable historical supplier line" },
      { rank: 4, source: "menu_or_tech_card_link", reason: "Supporting linkage only; never auto-creates stock identity" },
      { rank: 5, source: "raw_legacy_name", reason: "Weak evidence; requires unit/package corroboration" },
    ],
    sources: {
      purchaseDocuments: purchaseDocuments.length,
      purchaseSupplierLines: allSupplierLines.length,
      uniqueNormalizedSupplierProducts: uniqueNormalizedProducts.size,
      suppliers: supplierRows.length,
      stockMovements: movements.length,
      stockProductKeys: new Set(movements.map((movement) => text(movement.productKey, "", 300)).filter(Boolean)).size,
      authoritativeAssortmentExists: input.serverAssortmentExists,
      authoritativeMenuUsed: false,
      legacyMenuObservation: input.legacyMenuObservation ?? null,
      legacyMenuUsed: false,
      storePresence: input.sourceStorePresence ?? null,
    },
    coverage: {
      units: { linesWithKnownUnit: unitLines, totalLines: allSupplierLines.length },
      packaging: { linesWithPackageEvidence: packageLines, totalLines: allSupplierLines.length },
      supplierSku: { linesWithSupplierArticle: supplierSkuLines, totalLines: allSupplierLines.length },
      barcodes: { linesWithBarcode: barcodeLines, totalLines: allSupplierLines.length },
      unitDistribution: Object.fromEntries([...new Set(allSupplierLines.map(sourceBaseUnit))].sort().map((unit) => [unit, allSupplierLines.filter((line) => sourceBaseUnit(line) === unit).length])),
      packageDistribution: Object.fromEntries([...new Set(allSupplierLines.map((line) => line.packageSize || "not_specified"))].sort().map((packageSize) => [packageSize, allSupplierLines.filter((line) => (line.packageSize || "not_specified") === packageSize).length])),
    },
    proposal: {
      totalPositions: proposed.length,
      safePositions: safe.length,
      reviewPositions: review.length,
      statusCounts: {
        ...positionStatusCounts,
        NOT_A_STOCK_ITEM: excluded.length,
      },
      proposedStore: {
        nomenclature: safe.map((position) => ({
          productKey: position.productKey,
          name: position.name,
          normalizedName: position.normalizedName,
          baseUnit: position.unit,
          packageSize: position.packageSize,
          aliases: position.aliases,
          supplierArticles: position.supplierArticles,
          barcodes: position.barcodes,
          venueId: input.venueId,
          active: true,
          source: "controlled_migration_preview",
        })),
        stockBalances: [],
        supplierProductMappings: [],
        recipes: [],
        menuItems: [],
      },
      positions: proposed.map((position) => ({
        ...position,
        migrationStatus: migrationStatus(position),
      })),
    },
    duplicates: {
      exactGroups: exactDuplicateGroups,
      exactDuplicateSupplierLines: exactDuplicateGroups.reduce((sum, group) => sum + group.supplierLineOccurrences - 1, 0),
      probable: probableDuplicates,
      identifierConflicts,
    },
    excluded: {
      lines: excluded.map((line) => ({ ...line, migrationStatus: "NOT_A_STOCK_ITEM" as const })),
      count: excluded.length,
    },
    impactIfLaterApproved: {
      storesCreated: input.serverAssortmentExists ? 0 : 1,
      canonicalPositionsCreated: input.serverAssortmentExists ? null : safe.length,
      canonicalPositionsProposedBeforeExistingStoreReconciliation: safe.length,
      stockBalancesCreated: 0,
      supplierMappingsCreated: 0,
      existingPurchasesChanged: 0,
      existingStockMovementsChanged: 0,
      existingMenuItemsChanged: 0,
      existingExpensesChanged: 0,
      existingSupplierDebtChanged: 0,
      note: "Preview does not reconstruct balances or history and does not rewrite existing domains.",
    },
    blockers: [
      ...(input.sourceStorePresence && !input.sourceStorePresence.purchases
        ? [{ code: "PURCHASE_SOURCE_STORE_MISSING", count: 1 }] : []),
      ...(input.sourceStorePresence && !input.sourceStorePresence.stockMovements
        ? [{ code: "STOCK_MOVEMENT_SOURCE_STORE_MISSING", count: 1 }] : []),
      ...(input.sourceStorePresence && !input.sourceStorePresence.suppliers
        ? [{ code: "SUPPLIER_SOURCE_STORE_MISSING", count: 1 }] : []),
      ...(!proposed.length && !input.serverAssortmentExists
        ? [{ code: "NO_SERVER_PRODUCT_IDENTITY_ROWS", count: 1 }] : []),
      ...(input.serverAssortmentExists ? [{ code: "EXISTING_ASSORTMENT_REQUIRES_RECONCILIATION", count: 1 }] : []),
      ...(review.length ? [{ code: "CANONICAL_POSITIONS_REQUIRE_REVIEW", count: review.length }] : []),
      ...(identifierConflicts.length ? [{ code: "SUPPLIER_IDENTIFIER_CONFLICT", count: identifierConflicts.length }] : []),
    ],
    limitations: [
      ...(excluded.length ? [{ code: "PURCHASE_LINES_INTENTIONALLY_EXCLUDED", count: excluded.length }] : []),
      { code: "STOCK_BALANCE_RECONSTRUCTION_NOT_INCLUDED", count: 1 },
    ],
    verdict: !proposed.length
      || Boolean(input.sourceStorePresence && (
        !input.sourceStorePresence.purchases
        || !input.sourceStorePresence.stockMovements
        || !input.sourceStorePresence.suppliers
      ))
      || input.serverAssortmentExists || review.length || identifierConflicts.length
      ? "MIGRATION NEEDS REVIEW" as const
      : "SAFE TO MIGRATE" as const,
  };
}
