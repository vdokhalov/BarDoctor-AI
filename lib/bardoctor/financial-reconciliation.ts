// Pure readers of captured financial data. Never consult today's catalogue/prices.
type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(row) : [];
function finite(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string" || typeof value === "string" && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
// Match the inventory ledger's persisted monetary rounding, including half cents.
const money = (value: number) => Math.round(value * 100) / 100;
const currency = (value: unknown) => String(value ?? "").trim().toUpperCase();
// Legacy "primary" records already live inside the current venue's store.
const scope = (value: Row, venueId: number) => value.venueId == null || value.venueId === "primary" || Number(value.venueId) === venueId;
const physical = (value: Row) => value.scope != null || value.internalId != null || value.status === "completed"
  || rows(value.items).some(item => item.valuationKnown != null);
const sameMoney = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100);

export type FinancialSnapshot = { known: boolean; total: number | null; sections: Record<string, number>; reason?: string };
export function financialSnapshot(value: unknown): FinancialSnapshot {
  const source = row(value);
  const fail = (reason: string): FinancialSnapshot => ({ known: false, total: null, sections: {}, reason });
  if (source.status != null && !["completed", "confirmed"].includes(String(source.status))) return fail("INVENTORY_NOT_COMPLETED");
  if (row(source.scope).type != null && row(source.scope).type !== "all") return fail("INVENTORY_SCOPE_INCOMPLETE");
  const total = finite(source.total);
  if (Object.hasOwn(source, "total") && total === null) return fail("INVENTORY_TOTAL_UNKNOWN");
  const sections: Record<string, number> = {};
  if (physical(source)) {
    if (source.status !== "completed" || row(source.scope).type !== "all") return fail("INVENTORY_NOT_COMPLETED");
    const items = rows(source.items);
    if (!items.length) return fail("INVENTORY_ITEMS_MISSING");
    for (const item of items) {
      const actual = finite(item.actual);
      const cost = finite(item.averageUnitCost);
      if (actual === null || actual < 0) return fail("INVENTORY_QUANTITY_UNKNOWN");
      if (actual > 0 && (item.valuationKnown !== true || cost === null || cost < 0 || item.costBasisStatus === "UNKNOWN"
        || item.costBasisStatus === "KNOWN_ZERO" && cost !== 0)) return fail("INVENTORY_COST_UNKNOWN");
      const documentCurrency = currency(source.accountingCurrency ?? source.currency);
      if (actual > 0 && (!documentCurrency || currency(item.currency) !== documentCurrency)) return fail("INVENTORY_CURRENCY_UNKNOWN");
      const section = String(item.sectionName ?? item.section ?? "").trim();
      if (!section) return fail("INVENTORY_SECTION_UNKNOWN");
      const value = source.financialValuationVersion === 1 ? finite(item.actualValue)
        : actual === 0 ? 0 : money(actual * cost!);
      if (value === null || value < 0 || actual === 0 && value !== 0) return fail("INVENTORY_COST_UNKNOWN");
      sections[section] = money((sections[section] ?? 0) + value);
    }
    const captured = money(Object.values(sections).reduce((sum, amount) => sum + amount, 0));
    if (total === null || !sameMoney(captured, total)) return fail("INVENTORY_TOTAL_MISMATCH");
    if (source.sections != null) {
      const persisted = row(source.sections);
      if (Object.keys(persisted).length !== Object.keys(sections).length
        || Object.entries(sections).some(([name, amount]) => finite(persisted[name]) === null || !sameMoney(Number(persisted[name]), amount))) {
        return fail("INVENTORY_SECTION_MISMATCH");
      }
    }
    return { known: true, total: captured, sections };
  }
  const capturedSections = row(source.sections);
  if (!Object.keys(capturedSections).length) return fail("INVENTORY_SECTIONS_MISSING");
  for (const [name, amount] of Object.entries(capturedSections)) {
    const parsed = finite(amount);
    if (parsed === null || parsed < 0) return fail("INVENTORY_COST_UNKNOWN");
    sections[name] = parsed;
  }
  const captured = money(Object.values(sections).reduce((sum, amount) => sum + amount, 0));
  if (total !== null && !sameMoney(captured, total)) return fail("INVENTORY_TOTAL_MISMATCH");
  return { known: true, total: captured, sections };
}

export function monthlySnapshotRows(value: unknown, venueId: number): Row[] {
  return rows(value).filter(item => scope(item, venueId)
    && (item.status == null || ["completed", "confirmed"].includes(String(item.status)))
    && (row(item.scope).type == null || row(item.scope).type === "all"))
    .map(item => {
      const resolved = financialSnapshot(item);
      return { ...item, total: resolved.total, sections: resolved.sections,
        currency: physical(item) ? item.accountingCurrency ?? item.currency : item.currency ?? item.accountingCurrency,
        phase7PhysicalSnapshot: physical(item), phase7SnapshotKnown: resolved.known,
        phase7SnapshotReason: resolved.reason };
    });
}

type CostResult = { known: true; cost: number; batchIds: string[]; documentIds?: string[] }
  | { known: false; cost: null; reason: string };
const record = (v: unknown): Row | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Row : null;
const array = (v: unknown): Row[] | null => Array.isArray(v) && v.every(item => record(item) !== null) ? v as Row[] : null;
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const cents = (v: number) => Math.round(v * 100);
const fail = (reason: string): CostResult => ({ known: false, cost: null, reason });
/** A header FULL/total alone cannot establish a captured cost of all posted lines. */
export function capturedBatchCost(value: unknown, venueId: number, businessDate: string, accountingCurrency: string): CostResult {
  const batch = record(value), expectedCurrency = currency(accountingCurrency);
  if (!batch || !expectedCurrency || !text(batch.id) || Number(batch.venueId) !== venueId
    || batch.businessDate !== businessDate || batch.status !== "POSTED" || batch.costStatus !== "FULL") return fail("BATCH_CAPTURE_MISSING");
  const lines = array(batch.lines), headerCost = finite(batch.totalTheoreticalCost);
  if (!lines?.length || headerCost === null || headerCost < 0) return fail("BATCH_CAPTURE_MISSING");
  if (new Set(lines.map(line => line.id)).size !== lines.length) return fail("DUPLICATE_BATCH_LINE");
  let totalCents = 0;
  for (const line of lines) {
    const snapshot = record(line.recipeSnapshot), lineCost = finite(line.theoreticalCost), quantity = finite(line.quantity);
    if (!text(line.id) || line.salesBatchId !== batch.id || line.processingStatus !== "POSTED"
      || quantity === null || quantity <= 0 || lineCost === null || lineCost < 0 || !snapshot
      || !text(snapshot.recipeId) || !text(snapshot.capturedAt)) return fail("LINE_CAPTURE_MISSING");
    const ingredients = array(snapshot.ingredients);
    if (!ingredients) return fail("INGREDIENT_CAPTURE_MISSING");
    // This is an actual supported canonical case: no stock consumption, zero
    // cost, empty ingredients, and no line currency returned by the writer.
    if (snapshot.consumptionMode === "NONE") {
      if (ingredients.length || lineCost !== 0 || line.currency != null && currency(line.currency) !== expectedCurrency) return fail("NONE_CAPTURE_INVALID");
      continue;
    }
    if (!ingredients.length || currency(line.currency) !== expectedCurrency) return fail("LINE_COST_CURRENCY_UNKNOWN");
    let ingredientTotal = 0;
    for (const ingredient of ingredients) {
      const amount = finite(ingredient.baseQuantityTotal), unitCost = finite(ingredient.unitCost), capturedCost = finite(ingredient.totalCost);
      const costStatus = text(ingredient.costStatus).toUpperCase();
      if (!text(ingredient.productKey) || amount === null || amount <= 0 || unitCost === null || unitCost < 0
        || capturedCost === null || capturedCost < 0 || costStatus === "UNKNOWN"
        || currency(ingredient.currency) !== expectedCurrency) return fail("INGREDIENT_COST_UNKNOWN");
      // Existing domain cost-knowledge allows captured legacy positive values.
      // Legacy zero without an explicit known marker must remain unknown.
      if (capturedCost === 0 && !["KNOWN_ZERO", "KNOWN_VALUE", "KNOWN"].includes(costStatus)) return fail("INGREDIENT_ZERO_UNPROVEN");
      if (costStatus === "KNOWN_ZERO" && capturedCost !== 0) return fail("INGREDIENT_STATUS_CONFLICT");
      if (!sameMoney(amount * unitCost, capturedCost)) return fail("INGREDIENT_COST_MISMATCH");
      ingredientTotal += capturedCost;
    }
    if (!sameMoney(ingredientTotal, lineCost)) return fail("LINE_COST_MISMATCH");
    totalCents += cents(lineCost);
  }
  if (totalCents !== cents(headerCost)) return fail("BATCH_COST_MISMATCH");
  return { known: true, cost: totalCents / 100, batchIds: [text(batch.id)] };
}

/** Join only explicit captured identities; neither date alone nor current recipes proves coverage. */
export function salesDocumentRowCost(input: { revenue: unknown; documents: unknown; batches: unknown; venueId: number; accountingCurrency: string }): CostResult {
  const revenue = record(input.revenue), documents = array(input.documents), batches = array(input.batches);
  const expectedCurrency = currency(input.accountingCurrency);
  if (!revenue || !documents || !batches || !expectedCurrency || revenue.revenueSource !== "sales_documents") return fail("SALES_DOCUMENT_HISTORY_MISSING");
  if (revenue.venueId != null && Number(revenue.venueId) !== input.venueId) return fail("REVENUE_VENUE_MISMATCH");
  const date = text(revenue.date), revenueAmount = finite(revenue.revenue);
  const documentIds = Array.isArray(revenue.salesDocumentIds) ? revenue.salesDocumentIds : [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || revenueAmount === null || revenueAmount < 0
    || !documentIds.length || documentIds.some(id => !text(id)) || new Set(documentIds).size !== documentIds.length) return fail("SALES_DOCUMENT_IDENTITIES_MISSING");
  // The actual sales-revenue.ts writer does not add row.currency. It is valid
  // to establish currency from ALL explicitly linked document captures instead.
  if (revenue.currency != null && currency(revenue.currency) !== expectedCurrency) return fail("REVENUE_CURRENCY_MISMATCH");
  let revenueCents = 0, costCents = 0;
  const batchIds = new Set<string>();
  for (const id of documentIds) {
    const matching = documents.filter(doc => doc.id === id && (doc.venueId == null || Number(doc.venueId) === input.venueId));
    if (matching.length !== 1) return fail("SALES_DOCUMENT_AMBIGUOUS");
    const doc = matching[0], gross = finite(doc.totalRevenue), batchId = text(doc.salesBatchId);
    if (doc.status !== "confirmed" || doc.date !== date || currency(doc.currency) !== expectedCurrency
      || gross === null || gross < 0 || !batchId) return fail("SALES_DOCUMENT_CAPTURE_MISSING");
    if (batchIds.has(batchId)) return fail("SALES_BATCH_REFERENCED_TWICE");
    const linked = batches.filter(batch => batch.id === batchId && Number(batch.venueId) === input.venueId);
    if (linked.length !== 1) return fail("SALES_BATCH_AMBIGUOUS");
    const resolved = capturedBatchCost(linked[0], input.venueId, date, expectedCurrency);
    if (!resolved.known) return resolved;
    // A reversed batch under a still-confirmed positive revenue document is an
    // inconsistent projection, not grounds to silently drop cost from that row.
    batchIds.add(batchId); revenueCents += cents(gross); costCents += cents(resolved.cost);
  }
  if (revenueCents !== cents(revenueAmount)) return fail("SALES_DOCUMENT_REVENUE_MISMATCH");
  return { known: true, cost: costCents / 100, batchIds: [...batchIds], documentIds: documentIds as string[] };
}

export function historicalPeriodCost(input: {
  venueId: number; monthKey: string; accountingCurrency: string;
  revenues: unknown; events: unknown; movements: unknown;
  documents?: unknown; batches?: unknown;
}) {
  const { venueId, monthKey } = input;
  const expectedCurrency = currency(input.accountingCurrency);
  const revenues = rows(input.revenues).filter(item => scope(item, venueId)
    && String(item.date ?? "").slice(0, 7) === monthKey);
  const events = rows(input.events).filter(item => Number(item.venueId) === venueId
    && String(item.businessDate ?? "").slice(0, 7) === monthKey);
  const movements = rows(input.movements).filter(item => scope(item, venueId)
    && String(item.businessDate ?? item.date ?? "").slice(0, 7) === monthKey && item.type === "inventory_adjustment");
  const reasons: string[] = [];
  if (!/^(?:[A-Z]{3}|PMR_RUB)$/.test(expectedCurrency)) reasons.push("ACCOUNTING_CURRENCY_UNKNOWN");
  const daily: Record<string, { cost: number; adjustment: number }> = {};
  const day = (date: string) => daily[date] ?? (daily[date] = { cost: 0, adjustment: 0 });
  if (new Set(events.map(item => item.id)).size !== events.length
    || new Set(revenues.map(item => item.id)).size !== revenues.length
    || new Set(movements.map(item => item.id)).size !== movements.length) reasons.push("DUPLICATE_FINANCIAL_HISTORY");
  let cost = 0, adjustment = 0;
  const usedBatches = new Set<string>();
  const addCost = (resolved: CostResult, date: string) => {
    if (!resolved.known) { reasons.push(resolved.reason); return; }
    if (resolved.batchIds.some(id => usedBatches.has(id))) { reasons.push("SALES_BATCH_REFERENCED_TWICE"); return; }
    for (const id of resolved.batchIds) usedBatches.add(id);
    cost += resolved.cost;
    day(date).cost += resolved.cost;
  };
  for (const revenue of revenues) {
    const amount = finite(revenue.revenue);
    if (revenue.revenueSource === "sales_documents") {
      addCost(salesDocumentRowCost({ revenue, documents: input.documents, batches: input.batches, venueId,
        accountingCurrency: expectedCurrency }), String(revenue.date));
      continue;
    }
    if (revenue.revenueSource !== "sales_events_v1") {
      if (amount !== 0 || finite(revenue.receipts) !== 0) reasons.push("HISTORICAL_SALES_COST_MISSING");
      continue;
    }
    const linked = events.filter(event => event.revenueRowId === revenue.id);
    const active = linked.filter(event => event.status === "POSTED");
    if (amount === null || currency(revenue.currency) !== expectedCurrency
      || linked.some(event => !["POSTED", "REVERSED"].includes(String(event.status)) || event.businessDate !== revenue.date)
      || active.some(event => finite(event.revenue) === null)
      || !sameMoney(active.reduce((sum, event) => sum + Number(event.revenue), 0), amount)
      || finite(revenue.receipts) !== active.length) reasons.push("SALES_REVENUE_HISTORY_MISMATCH");
    for (const event of active) {
      if (currency(event.currency) !== expectedCurrency) { reasons.push("HISTORICAL_SALES_COST_UNKNOWN"); continue; }
      addCost(capturedBatchCost(event.batch, venueId, String(event.businessDate), expectedCurrency), String(event.businessDate));
    }
  }
  if (events.some(event => !revenues.some(revenue => revenue.id === event.revenueRowId && revenue.revenueSource === "sales_events_v1"))) {
    reasons.push("SALES_REVENUE_HISTORY_MISMATCH");
  }
  for (const movement of movements) {
    if (movement.status === "cancelled" || movement.reversedAt) continue;
    const amount = finite(movement.costAmount);
    if (amount === null || movement.valuationStatus === "unvalued" || movement.costStatus === "UNKNOWN"
      || amount === 0 && !["KNOWN_ZERO", "KNOWN"].includes(String(movement.costStatus))
      || currency(movement.currency) !== expectedCurrency) { reasons.push("INVENTORY_ADJUSTMENT_COST_UNKNOWN"); continue; }
    adjustment += amount;
    day(String(movement.businessDate ?? movement.date)).adjustment += amount;
  }
  return { known: reasons.length === 0, cost: money(cost), adjustment: money(adjustment), daily,
    reasons: [...new Set(reasons)], eventCount: events.length };
}

export function reconcileMonthlyReport(input: {
  report: Row; venueId: number; monthKey: string; snapshots: unknown;
  revenues: unknown; events: unknown; movements: unknown;
  documents?: unknown; batches?: unknown;
}): Row {
  const report = input.report;
  const opening = row(report.openingSnapshot), closing = row(report.closingSnapshot);
  const authoritative = opening.phase7PhysicalSnapshot === true || closing.phase7PhysicalSnapshot === true
    || rows(input.revenues).some(item => scope(item, input.venueId) && ["sales_events_v1", "sales_documents"].includes(String(item.revenueSource))
      && String(item.date ?? "").slice(0, 7) === input.monthKey)
    || rows(input.events).some(item => Number(item.venueId) === input.venueId && String(item.businessDate ?? "").slice(0, 7) === input.monthKey);
  if (!authoritative) {
    if (opening.phase7SnapshotKnown === false || closing.phase7SnapshotKnown === false) {
      return { ...report, openingInventory: opening.phase7SnapshotKnown === true ? report.openingInventory : null,
        closingInventory: closing.phase7SnapshotKnown === true ? report.closingInventory : null,
        costOfGoods: null, rawCostOfGoods: null, operatingResult: null, inventoryMismatch: true,
        financialReconciliationKnown: false, financialReconciliationReasons: ["INVENTORY_BOUNDARY_COST_UNKNOWN"] };
    }
    return report;
  }
  const history = historicalPeriodCost({ ...input, accountingCurrency: String(report.accountingCurrency ?? "") });
  const snapshotsKnown = opening.phase7SnapshotKnown === true && closing.phase7SnapshotKnown === true;
  const openingValue = opening.phase7SnapshotKnown === true ? finite(report.openingInventory) : null;
  const closingValue = closing.phase7SnapshotKnown === true ? finite(report.closingInventory) : null;
  const known = history.known && snapshotsKnown && Number(report.unconvertedForeignCurrencyCount ?? 0) === 0;
  const expenses = Number(report.writeoffs ?? 0) + Number(report.payroll ?? 0) + Number(report.otherExpenses ?? 0)
    + Number(report.taxes ?? 0) + Number(report.utilities ?? 0);
  const reasons = [...history.reasons, ...(!snapshotsKnown ? ["INVENTORY_BOUNDARY_COST_UNKNOWN"] : []),
    ...(Number(report.unconvertedForeignCurrencyCount ?? 0) > 0 ? ["FINANCIAL_CURRENCY_UNCONVERTED"] : [])];
  return { ...report, openingInventory: openingValue, closingInventory: closingValue,
    costOfGoods: known ? history.cost : null, rawCostOfGoods: known ? history.cost : null,
    grossProfit: known ? money(Number(report.revenue) - history.cost) : null,
    inventoryAdjustmentNet: history.known ? history.adjustment : null,
    inventoryLoss: history.known ? money(-history.adjustment) : null,
    costBasis: "historical_sales_snapshots", financialReconciliationKnown: known, financialReconciliationReasons: reasons,
    inventoryMismatch: !known,
    operatingResult: known ? money(Number(report.revenue) - history.cost + history.adjustment - expenses) : null,
    inventoryRevaluation: known ? money(closingValue! - openingValue! - Number(report.purchases) + history.cost - history.adjustment + Number(report.writeoffs ?? 0)) : null,
    sections: rows(report.sections).map(section => ({ ...section, cost: null })),
    shiftEstimates: rows(report.shiftEstimates).map(shift => {
      const captured = history.daily[String(shift.date)] ?? { cost: 0, adjustment: 0 };
      return { ...shift, estimatedCost: known ? money(captured.cost) : null,
        estimatedResult: known ? money(Number(shift.revenue) - captured.cost + captured.adjustment - Number(shift.writeoffs ?? 0)
          - Number(shift.payroll ?? 0) - Number(shift.otherExpenses ?? 0) - Number(shift.recurringAllocation ?? 0)) : null };
    }),
  };
}
