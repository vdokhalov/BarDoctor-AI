import { normalizeInvoiceText, packageFingerprint } from "./invoice-recognition-v2";
import { inventoryUnitDefinition } from "./inventory";
import { normalizeCanonicalText } from "./nomenclature-identity";
import type { buildAssortmentMigrationPreview } from "./assortment-migration-preview";

type JsonRecord = Record<string, unknown>;
type Preview = ReturnType<typeof buildAssortmentMigrationPreview>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

function text(value: unknown, fallback = "", max = 500): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function keyOf(value: unknown): string {
  const item = record(value);
  return text(item.productKey ?? item.key, "", 300);
}

function unitOf(value: unknown): string {
  const item = record(value);
  return inventoryUnitDefinition(item.baseUnit ?? item.unit)?.baseUnit
    ?? text(item.baseUnit ?? item.unit, "unknown", 20);
}

function packageOf(value: unknown): string {
  const item = record(value);
  return packageFingerprint(`${text(item.name)} ${text(item.packageSize)}`);
}

function compatible(position: Preview["proposal"]["positions"][number], existing: JsonRecord): boolean {
  const existingUnit = unitOf(existing);
  const existingPackage = packageOf(existing);
  return (existingUnit === "unknown" || position.unit === "unknown" || existingUnit === position.unit)
    && (!existingPackage || !position.packageFingerprint || existingPackage === position.packageFingerprint);
}

function stableCanonicalKey(position: Preview["proposal"]["positions"][number]): string {
  const stockKey = position.provenance.find((source) => source.type === "stock_movement")?.productKey;
  return stockKey || `stock:${position.normalizedName}|${position.unit}`;
}

function sourceItemKey(input: {
  venueId: number;
  supplierId?: string;
  supplierName?: string;
  supplierArticle?: string;
  barcode?: string;
  rawName: string;
  unit: string;
}): string {
  const supplier = input.supplierId || normalizeCanonicalText(input.supplierName) || "unknown";
  const identity = input.supplierArticle
    ? `sku:${normalizeCanonicalText(input.supplierArticle)}`
    : input.barcode
      ? `barcode:${normalizeCanonicalText(input.barcode)}`
      : `name:${normalizeCanonicalText(input.rawName)}|${input.unit}`;
  return `${input.venueId}:${supplier}:${identity}`;
}

export function buildKolnAssortmentReconciliation(input: {
  venueId: number;
  existingAssortment: unknown;
  preview: Preview;
  operationId: string;
  now: string;
}) {
  const root = structuredClone(record(input.existingAssortment));
  const nomenclature = array(root.nomenclature).map((value) => record(value));
  const balances = array(root.stockBalances).map((value) => record(value));
  const mappings = array(root.supplierProductMappings).map((value) => record(value));
  const aliases = array(root.inventoryProductAliases).map((value) => record(value));
  const existingReview = array(root.migrationReviewQueue).map((value) => record(value));
  const existingKeys = new Map<string, JsonRecord>(nomenclature
    .map((item) => [keyOf(item), item] as const).filter(([key]) => Boolean(key)));
  const balanceKeys = new Set(balances.map(keyOf).filter(Boolean));
  const aliasByFrom = new Map<string, JsonRecord>(aliases
    .map((alias) => [text(alias.from, "", 300), alias] as const).filter(([from]) => Boolean(from)));
  const mappingBySource = new Map<string, JsonRecord>(mappings
    .map((mapping) => [text(mapping.sourceItemKey, "", 500), mapping] as const).filter(([key]) => Boolean(key)));
  const reviewById = new Map<string, JsonRecord>(existingReview
    .map((item) => [text(item.id), item] as const).filter(([id]) => Boolean(id)));
  const targets = new Map<string, string>();
  let createdPositions = 0;
  let linkedExistingPositions = 0;
  let createdBalanceShells = 0;
  let createdAliases = 0;
  let createdSupplierMappings = 0;

  const addReview = (position: Preview["proposal"]["positions"][number], blockers = position.blockers) => {
    const id = `koln-canonical-review:${position.proposalId}`;
    reviewById.set(id, {
      id,
      venueId: input.venueId,
      proposalId: position.proposalId,
      proposedCanonicalName: position.name,
      normalizedName: position.normalizedName,
      unit: position.unit,
      packageSize: position.packageSize,
      aliases: position.aliases,
      supplierArticles: position.supplierArticles,
      barcodes: position.barcodes,
      blockers,
      migrationStatus: position.migrationStatus,
      provenance: position.provenance,
      status: "open",
      operationId: input.operationId,
      updatedAt: input.now,
    });
  };

  for (const position of input.preview.proposal.positions) {
    if (position.migrationStatus !== "SAFE_AUTO_CREATE") {
      addReview(position);
      continue;
    }
    const requestedKey = stableCanonicalKey(position);
    let target = existingKeys.get(requestedKey);
    if (!target) {
      const sameIdentity = nomenclature.filter((item) =>
        normalizeInvoiceText(text(item.name ?? item.productName)) === position.normalizedName
        && compatible(position, item)
      );
      if (sameIdentity.length > 1) {
        addReview(position, ["MULTIPLE_EXISTING_CANONICAL_TARGETS"]);
        continue;
      }
      target = sameIdentity[0];
    }
    const canonicalKey = target ? keyOf(target) : requestedKey;
    if (!target) {
      const packageOptions = [...new Map(position.provenance
        .filter((source) => Boolean(source.packageSize))
        .map((source) => [source.packageSize ?? "", {
          packageSize: source.packageSize,
          baseUnit: position.unit,
          supplierId: source.supplierId ?? null,
          supplierName: source.supplierName ?? "",
          source: "purchase_history",
        }] as const)).values()];
      target = {
        id: `canonical:${canonicalKey}`,
        key: canonicalKey,
        productKey: canonicalKey,
        venueId: input.venueId,
        name: position.name,
        normalizedName: position.normalizedName,
        unit: position.unit,
        baseUnit: position.unit,
        packageSize: position.packageSize,
        packageOptions,
        aliases: position.aliases,
        supplierArticles: position.supplierArticles,
        barcodes: position.barcodes,
        active: true,
        status: "active",
        source: "controlled_server_migration",
        migrationOperationId: input.operationId,
        createdAt: input.now,
        updatedAt: input.now,
      };
      nomenclature.push(target);
      existingKeys.set(canonicalKey, target);
      createdPositions += 1;
    } else {
      linkedExistingPositions += 1;
    }
    targets.set(position.proposalId, canonicalKey);

    for (const source of position.provenance.filter((item) => item.type === "stock_movement")) {
      const externalKey = text(source.productKey, "", 300);
      if (externalKey && externalKey !== canonicalKey && !aliasByFrom.has(externalKey)) {
        const alias = { from: externalKey, to: canonicalKey, reason: "koln-canonical-migration", operationId: input.operationId, updatedAt: input.now };
        aliases.push(alias);
        aliasByFrom.set(externalKey, alias);
        createdAliases += 1;
      }
    }
    const hasStockEvidence = position.provenance.some((source) => source.type === "stock_movement");
    if (hasStockEvidence && !balanceKeys.has(canonicalKey)) {
      balances.push({
        id: `balance:${canonicalKey}`,
        key: canonicalKey,
        productKey: canonicalKey,
        venueId: input.venueId,
        name: position.name,
        unit: position.unit,
        baseUnit: position.unit,
        packageSize: position.packageSize,
        current: 0,
        safety: 0,
        onOrder: 0,
        quantityStatus: "not_reconstructed",
        source: "controlled_server_migration_identity_shell",
        migrationOperationId: input.operationId,
        updatedAt: input.now,
      });
      balanceKeys.add(canonicalKey);
      createdBalanceShells += 1;
    }

    for (const source of position.provenance.filter((item) => item.type === "purchase_supplier_line" && (item.supplierId || item.supplierName))) {
      const key = sourceItemKey({
        venueId: input.venueId,
        supplierId: source.supplierId,
        supplierName: source.supplierName,
        supplierArticle: source.supplierArticle,
        barcode: source.barcode,
        rawName: source.rawName,
        unit: position.unit,
      });
      const current = mappingBySource.get(key);
      if (current && text(current.canonicalProductKey, "", 300) !== canonicalKey) {
        addReview(position, ["EXISTING_SUPPLIER_MAPPING_CONFLICT"]);
        continue;
      }
      const documentIds = [...new Set([
        ...array(current?.purchaseDocumentIds).map((value) => text(value, "", 180)),
        source.documentId ?? "",
      ].filter(Boolean))];
      const lineIds = [...new Set([
        ...array(current?.purchaseLineIds).map((value) => text(value, "", 180)),
        source.id,
      ].filter(Boolean))];
      const mapping = {
        ...current,
        id: text(current?.id, `supplier-item:${key}`, 500),
        venueId: input.venueId,
        supplierId: source.supplierId ?? null,
        supplierName: source.supplierName ?? "Поставщик",
        sourceItemKey: key,
        sourceName: source.rawName,
        normalizedSourceName: normalizeCanonicalText(source.rawName),
        supplierSku: source.supplierArticle ?? null,
        barcode: source.barcode ?? null,
        purchaseUnit: position.unit,
        packageSize: source.packageSize ?? position.packageSize,
        canonicalProductKey: canonicalKey,
        status: "auto",
        confidence: 1,
        firstSeenAt: text(current?.firstSeenAt, source.date ?? input.now, 50),
        lastSeenAt: source.date ?? input.now,
        purchaseDocumentIds: documentIds,
        purchaseLineIds: lineIds,
        lastPrice: current?.lastPrice ?? null,
        currency: current?.currency ?? null,
        migrationOperationId: input.operationId,
      };
      if (!current) createdSupplierMappings += 1;
      mappingBySource.set(key, mapping);
    }
  }

  const history = array(root.migrationHistory).map((value) => record(value));
  if (!history.some((entry) => entry.operationId === input.operationId)) {
    history.push({
      operationId: input.operationId,
      type: "koln_canonical_assortment_reconciliation",
      createdPositions,
      linkedExistingPositions,
      createdBalanceShells,
      createdAliases,
      createdSupplierMappings,
      reviewQueue: reviewById.size,
      appliedAt: input.now,
    });
  }
  const assortment = {
    ...root,
    venueId: input.venueId,
    nomenclature,
    stockBalances: balances,
    supplierProductMappings: [...mappingBySource.values()],
    inventoryProductAliases: aliases,
    recipes: array(root.recipes),
    menuItems: array(root.menuItems),
    canonicalProductAliases: array(root.canonicalProductAliases),
    canonicalSupersessions: array(root.canonicalSupersessions),
    migrationReviewQueue: [...reviewById.values()],
    migrationHistory: history,
    updatedAt: input.now,
  };
  return {
    assortment,
    summary: {
      existingCanonicalPositions: array(root.nomenclature).length,
      createdPositions,
      linkedExistingPositions,
      createdBalanceShells,
      createdAliases,
      createdSupplierMappings,
      reviewQueue: reviewById.size,
      preservedMenuItems: array(root.menuItems).length,
      preservedRecipes: array(root.recipes).length,
      targets: targets.size,
    },
  };
}
