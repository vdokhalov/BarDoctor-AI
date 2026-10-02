import { purchaseFileVisible } from "./purchase-file-scope";
import { env } from "cloudflare:workers";
import { getD1 } from "../../db";
import { hasPermission, type AuthenticatedAccount } from "./access-control";
import { accountingCurrencyFromRestaurantJson } from "./currency";
import { businessRecord as object, finiteBusinessNumber as number } from "./business-day-rows";
import { resolveCostBasis } from "./cost-basis";
import { resolvePurchaseLineAccountingCost, summarizeInventoryValuation } from "./valuation";
import { stockQuantityEvidence } from "./stock-quantity-evidence";
import { convertStockQuantity, validatePurchaseConversionSnapshot } from "./stock-units";
import { evidenceContentRevision, MAX_EVIDENCE_OFFSET, type EvidenceReference, type EvidenceResolution, type EvidenceDiagnostic, type EvidenceProjection,
  type EvidenceScope, type ContentRevision, type EvidenceRelation } from "./evidence-contracts";
type Row = Record<string, unknown>;
type Context = EvidenceScope & { account: AuthenticatedAccount };
type Node = { record: Row; projection: EvidenceProjection; revisionInput: unknown; relations: EvidenceRelation[]; diagnostics: EvidenceDiagnostic[]; partial: boolean };
const list = (value: unknown): Row[] => Array.isArray(value) ? value.map(object) : [];
const text = (value: unknown) => typeof value === "string" && value.length <= 300 ? value : null;
const scoped = (row: Row, c: Context) => (row.venueId == null || row.venueId === c.venueId) && (row.workspaceId == null || row.workspaceId === c.workspaceId)
  && (row.dataAccountId == null || row.dataAccountId === c.account.id);
const kinds = new Set(["STOCK_QUANTITY", "STOCK_VALUATION", "COST_BASIS", "PURCHASE_DOCUMENT", "SUPPLIER", "WAREHOUSE", "PURCHASE_SOURCE_FILE", "INVENTORY_DOCUMENT", "OPENING_STOCK", "WRITEOFF_DOCUMENT"]);
export const isStockEvidenceKind = (kind: string) => kinds.has(kind);
const reference = (c: Context, kind: EvidenceReference["kind"], id: string, partId?: string): EvidenceReference => ({ contractVersion: 1, kind, id, venueId: c.venueId, workspaceId: c.workspaceId, ...(partId ? { partId } : {}) }) as EvidenceReference;

/** Closed, parameterized JSON selectors return bounded records, not entire
 * purchase/count/file histories. They never choose an account from a reference. */
async function select(c: Context, key: string, path: string, field: string, id: string, limit = 2): Promise<Row[]> {
  const result = await getD1().prepare(`SELECT j.value AS record_json FROM domain_data d,
    json_each(CASE WHEN json_valid(d.data_json) THEN d.data_json ELSE '[]' END, ?) j
    WHERE d.account_id=? AND d.store_key=? AND j.type='object'
      AND json_extract(CASE WHEN j.type='object' THEN j.value ELSE '{}' END, ?) = ? LIMIT ?`)
    .bind(path, c.account.id, key, "$." + field, id, limit).all<{ record_json: string }>();
  return result.results.map(row => JSON.parse(row.record_json) as Row);
}
async function one(c: Context, key: string, id: string, path = "$", field = "id") {
  const records = await select(c, key, path, field, id);
  return records.length === 1 && scoped(records[0], c) ? records[0] : null;
}
const fileIds = (doc: Row) => [...new Set([...(Array.isArray(doc.sourceFileIds) ? doc.sourceFileIds : []), doc.sourceFileId].filter(value => typeof value === "string"))] as string[];
export async function readReceiptAcquisition(c: Context, movement: Row) {
  const document = typeof movement.sourceDocumentId === "string" ? await one(c, "bd_purchase_documents", movement.sourceDocumentId) : null;
  const lines = document ? list(document.items).filter(line => line.id === movement.sourceLineId && scoped(line, c)) : [];
  const line = lines.length === 1 ? lines[0] : null;
  const snapshot = line ? validatePurchaseConversionSnapshot(line.purchaseConversion) : null;
  const captured = validatePurchaseConversionSnapshot(movement.purchaseConversion);
  const money = line && document ? resolvePurchaseLineAccountingCost({document,line,accountingCurrency:accountingCurrencyFromRestaurantJson(c.account.restaurantJson)}) : null;
  const amount = snapshot ? convertStockQuantity(movement.amount, movement.unit, snapshot.canonicalUnit) : null;
  const key = line?.canonicalProductKey ?? line?.purchaseProductKey ?? line?.productKey;
  const matches = document && line && snapshot && captured && key === movement.productKey
    && (snapshot.provenance.venueId == null || snapshot.provenance.venueId === c.venueId)
    && amount != null && Math.abs(amount - snapshot.canonicalQuantity) < 1e-6
    && JSON.stringify(snapshot) === JSON.stringify(captured)
    && document.status === "confirmed" && (money?.known ? Math.abs((number(movement.costAmount) ?? -1) - money.amount) < .011 : movement.costStatus === "UNKNOWN");
  return { complete: Boolean(matches), diagnostic: !snapshot || !captured ? "ACQUISITION_CONVERSION_UNAVAILABLE" as const : "RECORD_NEEDS_REVIEW" as const,
    revisionInput: { document, line } };
}

async function load(c: Context, ref: EvidenceReference, asOf: string): Promise<Node | null> {
  const relations: EvidenceRelation[] = [], diagnostics: EvidenceDiagnostic[] = ["FRESHNESS_POLICY_UNDEFINED"];
  let partial = false, record: Row | null = null, projection: EvidenceProjection, revisionInput: unknown;
  const missing = (code: EvidenceDiagnostic = "RELATED_EVIDENCE_UNAVAILABLE") => { partial = true; diagnostics.push(code); };
  const add = (kind: EvidenceReference["kind"], id: unknown, partId?: string, type: EvidenceRelation["type"] = "derived_from") => {
    if (typeof id === "string" && id.length <= 200) relations.push({ type, reference: reference(c, kind, id, partId) }); else missing();
  };
  const currency = accountingCurrencyFromRestaurantJson(c.account.restaurantJson);
  if (["STOCK_QUANTITY", "STOCK_VALUATION", "COST_BASIS"].includes(ref.kind)) {
    record = await one(c, "bd_assortment_v1", ref.id, "$.stockBalances", "productKey");
    if (!record) return null;
    const parent = record;
    const warehouseIds = Object.keys(object(parent.warehouseBalances));
    if (warehouseIds.length > 100) return null;
    for (const id of warehouseIds) {
      if (!scoped(object(object(parent.warehouseBalances)[id]), c) || id !== "__venue__" && !await one(c, "bd_warehouses", id)) return null;
    }
    const explicitWarehouse = text(parent.warehouseId ?? parent.warehouseExternalId);
    if (explicitWarehouse && explicitWarehouse !== "__venue__" && !await one(c, "bd_warehouses", explicitWarehouse)) return null;
    if (ref.partId) {
      const warehouse = ref.partId === "__venue__" ? { id: "__venue__" } : await one(c, "bd_warehouses", ref.partId);
      const nestedBalance = object(object(parent.warehouseBalances)[ref.partId]);
      const balance = Object.keys(nestedBalance).length ? nestedBalance : explicitWarehouse === ref.partId ? parent : ref.kind === "COST_BASIS" ? {unit:parent.unit} : {};
      if (!warehouse || !Object.keys(balance).length || !scoped(balance, c)) return null;
      record = { ...parent, ...balance, warehouseId: ref.partId, warehouseBalances: undefined };
    }
    const storedMovements = await select(c, "bd_stock_movements", "$", "productKey", ref.id, 20_001);
    if (storedMovements.length > 20_000) return null;
    const movements = storedMovements.filter(row => scoped(row, c));
    const basis = resolveCostBasis({ venueId: c.venueId, warehouseId: ref.partId ?? text(record.warehouseId), nomenclatureItem: ref.id,
      baseUnit: record.unit as never, accountingCurrency: currency, asOf, receipts: movements });
    if (ref.kind === "COST_BASIS" && !ref.partId && warehouseIds.length) {
      projection = { type: "COST_BASIS", productKey: ref.id, status: "PARTIAL", value: null, known: false, currency, method: basis.method, warehouses: warehouseIds };
      for (const id of warehouseIds) add("COST_BASIS", ref.id, id);
      revisionInput = { balance: parent, currency, movements };
      missing("RELATED_EVIDENCE_UNAVAILABLE");
    } else if (ref.kind === "COST_BASIS") {
      const { asOf: _asOf, ...stableBasis } = basis; void _asOf;
      projection = { type: "COST_BASIS", ...basis, productKey: ref.id, selectedMovementId: basis.movementId ?? null };
      const receipt = movements.find(row => row.id === basis.movementId) ?? null;
      const acquisition = receipt ? await readReceiptAcquisition(c, receipt) : null;
      revisionInput = { productKey: ref.id, unit: record.unit, currency, basis: stableBasis, receipt, acquisition: acquisition?.revisionInput ?? null };
      if (acquisition && !acquisition.complete) missing(acquisition.diagnostic);
      if (basis.movementId) add("WAREHOUSE_MOVEMENT", basis.movementId); else missing("COST_UNKNOWN");
      if (!basis.known) missing("COST_UNKNOWN");
    } else {
      const counts = record.lastInventoryDocumentId ? [await one(c, "bd_inventory_snapshots", String(record.lastInventoryDocumentId))].filter(Boolean) : [];
      const openings = record.openingDocumentId ? [await one(c, "bd_opening_stock_v1", String(record.openingDocumentId))].filter(Boolean) : [];
      const quantity = stockQuantityEvidence({ balance: record, venueId: c.venueId, workspaceId: c.workspaceId, dataAccountId: c.account.id,
        warehouseId: ref.partId, movements, counts, openings });
      if (!quantity.evidenceComplete) { partial = true; diagnostics.push(...quantity.diagnostics as EvidenceDiagnostic[]); }
      if (ref.kind === "STOCK_QUANTITY") {
        projection = { type: "STOCK_QUANTITY", productKey: ref.id, warehouseId: ref.partId ?? record.warehouseId ?? null,
          quantity: quantity.quantity, unit: quantity.unit, status: quantity.status, consistency: quantity.consistency,
          anchor: quantity.anchor, contributorCount: quantity.contributorCount, evidenceComplete: quantity.evidenceComplete };
        if (quantity.anchor) add(quantity.anchor.kind as EvidenceReference["kind"], quantity.anchor.id, typeof quantity.anchor.lineId === "string" ? quantity.anchor.lineId : undefined);
        for (const contributor of quantity.contributors) add("WAREHOUSE_MOVEMENT", contributor.id);
        revisionInput = { balance: record, anchor: counts[0] ?? openings[0] ?? null, contributors: quantity.contributors };
      } else {
        const valuation = summarizeInventoryValuation({ balances: [record], stockMovements: movements, venueId: c.venueId, accountingCurrency: currency, asOf });
        projection = { type: "STOCK_VALUATION", productKey: ref.id, warehouseId: ref.partId ?? record.warehouseId ?? null,
          quantity: quantity.quantity, unit: quantity.unit, currency, value: valuation.complete ? valuation.total : null,
          costStatus: basis.status, valuationStatus: valuation.complete ? valuation.total === 0 ? "KNOWN_ZERO" : "KNOWN" : "UNKNOWN",
          evidenceComplete: quantity.evidenceComplete && valuation.complete, method: valuation.method };
        if (!ref.partId && warehouseIds.length) {
          for (const id of warehouseIds) add("STOCK_VALUATION", ref.id, id);
        } else { add("STOCK_QUANTITY", ref.id, ref.partId); add("COST_BASIS", ref.id, ref.partId); }
        if (!valuation.complete) missing("COST_UNKNOWN");
        revisionInput = { balance: record, currency, lines: valuation.lines, selectedReceipt: movements.find(row => row.id === basis.movementId) ?? null,
          anchor: counts[0] ?? openings[0] ?? null, contributors: quantity.contributors };
      }
    }
    const nom = await one(c, "bd_assortment_v1", ref.id, "$.nomenclature", "productKey");
    if (nom) add("NOMENCLATURE", nom.id, undefined, "current_definition");
    if (ref.partId && ref.partId !== "__venue__") add("WAREHOUSE", ref.partId, undefined, "belongs_to");
  } else if (["PURCHASE_DOCUMENT", "PURCHASE_SOURCE_FILE"].includes(ref.kind)) {
    record = await one(c, "bd_purchase_documents", ref.id); if (!record) return null;
    const parent = record;
    if (ref.kind === "PURCHASE_SOURCE_FILE") {
      if (!ref.partId || !/^[a-zA-Z0-9-]{20,80}$/.test(ref.partId) || !fileIds(parent).includes(ref.partId)) return null;
      const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
      const file = await bucket?.head(`purchases/${c.account.id}/${ref.partId}`); if (!file || !await purchaseFileVisible({venueId:c.venueId,workspaceId:c.workspaceId,dataAccountId:c.account.id},ref.partId,file.customMetadata,ref.id)) return null;
      projection = { type: "PURCHASE_SOURCE_FILE", documentId: ref.id, fileId: ref.partId, sizeBytes: file.size,
        mimeType: file.httpMetadata?.contentType ?? null, contentIdentity: file.etag ?? null, downloadPath: "/api/purchases/files/" + ref.partId + "?documentId=" + encodeURIComponent(ref.id) };
      revisionInput = { document: parent, fileId: ref.partId, size: file.size, etag: file.etag ?? null };
    } else if (ref.partId) {
      const items = list(parent.items).filter(row => row.id === ref.partId);
      if (items.length !== 1 || !scoped(items[0], c)) return null;
      const line = items[0], capturedConversion = validatePurchaseConversionSnapshot(line.purchaseConversion);
      const conversion = capturedConversion && (capturedConversion.provenance.venueId == null || capturedConversion.provenance.venueId === c.venueId) ? capturedConversion : null;
      const accountingCost = resolvePurchaseLineAccountingCost({document:parent,line,accountingCurrency:currency});
      projection = { type: "PURCHASE_LINE", documentId: ref.id, lineId: ref.partId, name: text(line.name), supplierId: parent.supplierId ?? null,
        productKey: line.canonicalProductKey ?? line.purchaseProductKey ?? null, nomenclatureId: line.nomenclatureId ?? null,
        sourceQuantity: conversion?.input.quantity ?? number(line.quantity), sourceUnit: conversion?.input.unit ?? text(line.unit),
        sourceUnitPrice: conversion?.input.price ?? number(line.unitPrice), sourceCurrency: parent.originalCurrency ?? parent.currency,
        package: conversion?.input.packageContent ?? null, conversionProvenance: conversion?.provenance ?? null,
        canonicalQuantity: conversion?.canonicalQuantity ?? null, canonicalUnit: conversion?.canonicalUnit ?? null,
        conversionFactor: conversion?.conversionFactor ?? null, normalizedSourceUnitCost: conversion?.normalizedUnitCost ?? null,
        normalizedAccountingUnitCost: conversion && accountingCost.known ? accountingCost.amount / conversion.canonicalQuantity : null,
        accountingCostStatus: accountingCost.costStatus, accountingCurrency: parent.accountingCurrency ?? currency, effectiveDate: parent.date ?? null, lifecycle: parent.status ?? null };
      revisionInput = { document: parent, line };
      if (!conversion) missing("ACQUISITION_CONVERSION_UNAVAILABLE");
      const receipts = (await select(c, "bd_stock_movements", "$", "sourceDocumentId", ref.id, 20_001)).filter(row => row.sourceLineId === ref.partId && scoped(row, c));
      for (const receipt of receipts.slice(0, 20)) add("WAREHOUSE_MOVEMENT", receipt.id);
      if (!receipts.length || receipts.length > 20) missing();
      const key = line.canonicalProductKey ?? line.purchaseProductKey;
      const nom = typeof key === "string" ? await one(c, "bd_assortment_v1", key, "$.nomenclature", "productKey") : null;
      if (nom) add("NOMENCLATURE", nom.id, undefined, "current_definition"); else missing();
      add("PURCHASE_DOCUMENT", ref.id, undefined, "belongs_to");
    } else {
      projection = { type: "PURCHASE_DOCUMENT", id: ref.id, documentNumber: text(parent.documentNumber), date: text(parent.date), lifecycle: text(parent.status),
        currency: text(parent.currency), accountingCurrency: parent.accountingCurrency ?? currency, total: number(parent.total), lineCount: list(parent.items).length,
        supplierId: text(parent.supplierId), sourceType: text(parent.sourceType ?? parent.source), sourceFileCount: fileIds(parent).length };
      revisionInput = parent;
      for (const line of list(parent.items)) { if (scoped(line, c) && text(line.id)) add("PURCHASE_DOCUMENT", ref.id, text(line.id)!); else missing(); }
    }
    if (ref.kind === "PURCHASE_SOURCE_FILE") add("PURCHASE_DOCUMENT", ref.id, undefined, "belongs_to");
    if (ref.kind !== "PURCHASE_SOURCE_FILE" && parent.supplierId) add("SUPPLIER", parent.supplierId, undefined, "belongs_to"); else if (ref.kind !== "PURCHASE_SOURCE_FILE") missing();
    for (const file of (ref.kind === "PURCHASE_SOURCE_FILE" ? [] : fileIds(parent)).slice(0, 12)) add("PURCHASE_SOURCE_FILE", ref.id, file);
    if (parent.source !== "manual" && parent.sourceType !== "manual" && !fileIds(parent).length) missing("SOURCE_METADATA_MISSING");
  } else {
    const key = ({ SUPPLIER: "bd_suppliers", WAREHOUSE: "bd_warehouses", INVENTORY_DOCUMENT: "bd_inventory_snapshots", OPENING_STOCK: "bd_opening_stock_v1", WRITEOFF_DOCUMENT: "bd_inventory_writeoffs" } as Record<string, string>)[ref.kind];
    record = key ? await one(c, key, ref.id) : null; if (!record) return null;
    let selectedLine: Row | null = null;
    if (ref.partId) { const matches = list(record.items ?? record.rows).filter(row => row.id === ref.partId || row.rowId === ref.partId); if (matches.length !== 1 || !scoped(matches[0], c)) return null; selectedLine = matches[0]; }
    projection = { type: ref.kind as "SUPPLIER" | "WAREHOUSE" | "INVENTORY_DOCUMENT" | "OPENING_STOCK" | "WRITEOFF_DOCUMENT", id: ref.id,
      name: text(record.name), lifecycle: text(record.status), date: text(record.date), currency: text(record.currency),
      line: selectedLine ? { id: selectedLine.id ?? selectedLine.rowId, productKey: text(selectedLine.productKey), quantity: number(selectedLine.quantity), actual: number(selectedLine.actual), unit: text(selectedLine.stockUnit ?? selectedLine.baseUnit ?? selectedLine.unit) } : null,
      itemCount: list(record.items ?? record.rows).length, completedAt: text(record.completedAt), createdAt: text(record.createdAt) };
    revisionInput = record;
  }
  if (!record || !scoped(record, c)) return null;
  return { record, projection, revisionInput, relations, diagnostics, partial };
}

/** Binding verifies the child's own source and permission; a parent never grants access. */
export async function bindStockEvidenceReference(c: Context, ref: EvidenceReference, asOf: string): Promise<(EvidenceReference & { expectedRevision: ContentRevision }) | null> {
  if (!hasPermission(c.account, "inventory.view") || ref.venueId !== c.venueId || ref.workspaceId !== c.workspaceId) return null;
  if (isStockEvidenceKind(ref.kind)) {
    const node = await load(c, ref, asOf); return node ? { ...ref, expectedRevision: await evidenceContentRevision(ref, node.revisionInput) } : null;
  }
  if (ref.kind === "NOMENCLATURE") {
    const record = await one(c, "bd_assortment_v1", ref.id, "$.nomenclature");
    return record ? { ...ref, expectedRevision: await evidenceContentRevision(ref, record) } : null;
  }
  if (ref.kind === "WAREHOUSE_MOVEMENT") {
    const movement = await one(c, "bd_stock_movements", ref.id); if (!movement) return null;
    const salesVisible = hasPermission(c.account, "sales.view");
    const sourceSale = movement.salesBatchId ? await one(c, "bd_sales_events_v1", String(movement.salesBatchId)) : null;
    return { ...ref, expectedRevision: await evidenceContentRevision(ref, { movement, recordBasis: "MOVEMENT_STORE", salesVisible, ...(salesVisible ? { sourceSale } : {}) }) };
  }
  return null;
}

export async function resolveStockEvidence(c: Context, ref: EvidenceReference, limit: number, offset: number, asOf: string): Promise<EvidenceResolution> {
  const fail = (restricted = false): EvidenceResolution => restricted ? { contractVersion: 1, asOf, diagnostics: [], outcome: "restricted", code: "ACCESS_DENIED" } : { contractVersion: 1, asOf, diagnostics: [], outcome: "unavailable", code: "EVIDENCE_UNAVAILABLE" };
  if (ref.venueId !== c.venueId || ref.workspaceId !== c.workspaceId) return fail();
  if (!hasPermission(c.account, "inventory.view")) return fail(true);
  const node = await load(c, ref, asOf); if (!node) return fail();
  const revision = await evidenceContentRevision(ref, node.revisionInput);
  if (ref.expectedRevision && ref.expectedRevision !== revision) return { contractVersion: 1, asOf, diagnostics: ["NO_HISTORICAL_SNAPSHOT"], outcome: "changed", code: "READ_MODEL_CHANGED" };
  if (node.relations.length > MAX_EVIDENCE_OFFSET + limit) {
    node.partial = true; node.diagnostics.push("QUANTITY_HISTORY_BOUNDED");
    if ("evidenceComplete" in node.projection) node.projection.evidenceComplete = false;
  }
  const relations: EvidenceRelation[] = [];
  for (const relation of node.relations.slice(offset, offset + limit)) {
    const bound = await bindStockEvidenceReference(c, relation.reference, asOf);
    if (bound) relations.push({ ...relation, reference: bound }); else { node.partial = true; node.diagnostics.push("RELATED_EVIDENCE_UNAVAILABLE"); }
  }
  const hasNext = offset + limit < node.relations.length, nextOffset = hasNext && offset + limit <= MAX_EVIDENCE_OFFSET ? offset + limit : null;
  if (hasNext || offset) node.diagnostics.push("RELATIONS_PAGINATED");
  if (hasNext && nextOffset == null) { node.partial = true; node.diagnostics.push("QUANTITY_HISTORY_BOUNDED"); }
  const bound = { ...ref, expectedRevision: revision }, timestamp = text(node.record.updatedAt ?? node.record.completedAt ?? node.record.createdAt);
  return { contractVersion: 1, asOf, diagnostics: [...new Set(node.diagnostics)], outcome: node.partial ? "partial" : "resolved", code: node.partial ? "PARTIAL_EVIDENCE" : "RESOLVED", evidence: {
    reference: bound, revision, binding: ref.expectedRevision ? "EXPECTED_REVISION" : "CURRENT_RECORD", projection: node.projection,
    finality: "UNKNOWN", availability: node.partial ? "PARTIAL" : "AVAILABLE", evidenceStatus: "PARTIAL", observedAt: text(node.record.createdAt), updatedAt: timestamp,
    freshness: { basis: timestamp ? "RECORD" : "UNKNOWN", timestamp, assessment: "UNKNOWN" }, relations, page: { limit, offset, nextOffset }, traceTarget: { type: "EVIDENCE_RESOURCE", reference: bound } } };
}
