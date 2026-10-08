import { resolveAccountingMoney } from "./accounting-money";
import { eligibleRevenueRows, uniqueBusinessRows, scopedBusinessRows, finiteBusinessNumber } from "./business-day-rows";
/** Read model only. Sales facts and the existing Finance projection keep their identities. */
export const OPERATIONAL_REPORT_STORE_KEY = "bd_operational_reports_v1";
export const REVENUE_SOURCES = ["BARDOC_POS", "MANUAL_SUMMARY", "IMPORT", "INTEGRATION"] as const;
export type RevenueSource = typeof REVENUE_SOURCES[number] | "LEGACY_UNKNOWN";
export type RevenueStatus = "PROVISIONAL" | "FINAL" | "UNKNOWN";
type Row = Record<string, unknown>;
export const operationalFields = ["staffing", "payrollBreakdown", "shiftDepartmentSales", "shiftVenueSales", "note", "guests", "writeOffDocumentIds", "writeOffItemCount", "writeOffTotalCost", "incidentIds"] as const;
export function operationalData(value: unknown): Row {
  const row = object(value);
  return Object.fromEntries(operationalFields.filter(key => row[key] !== undefined).map(key => [key, row[key]]));
}
function object(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
function rows(values: unknown[] | undefined): Row[] { return (values ?? []).map(object); }
const money = (value: number) => Math.round(value * 100) / 100;
const native = new Set(["POS_API", "MANUAL_GRID"]);
const imports = new Set(["TEXT_IMPORT", "FILE_IMPORT", "IMAGE_IMPORT", "VOICE_IMPORT"]);
const integrations = new Set(["ONE_C", "LOCAL_CONNECTOR", "OTHER_API"]);
function factSource(source: unknown): RevenueSource {
  return native.has(String(source)) ? "BARDOC_POS" : imports.has(String(source)) ? "IMPORT"
    : integrations.has(String(source)) ? "INTEGRATION" : "LEGACY_UNKNOWN";
}
export type OperationalDayInput = { venueId: number; workspaceId?: number; dataAccountId?: number; businessDate: string; asOf: string; currency?: string | null; revenues: unknown[]; events?: unknown[]; documents?: unknown[]; reports?: unknown[]; writeOffs?: unknown[]; incidents?: unknown[] };
export function operationalDay(input: OperationalDayInput) {
  const belongs = (row: Row) => scopedBusinessRows([row], { venueId: input.venueId, workspaceId: input.workspaceId, dataAccountId: input.dataAccountId }).length > 0;
  const revenues = eligibleRevenueRows(input.revenues, input.venueId, input).filter(row => row.date === input.businessDate);
  const events = uniqueBusinessRows(input.events ?? []).filter(row => belongs(row) && row.venueId === input.venueId && row.businessDate === input.businessDate);
  const posted = events.filter(row => row.status === "POSTED");
  const eventRows = revenues.filter(row => row.revenueSource === "sales_events_v1");
  const cashShifts = eventRows.filter(row => ["open", "closed"].includes(String(row.closingStatus)));
  const open = cashShifts.some(row => row.closingStatus === "open");
  const documents = rows(input.documents).filter(row => belongs(row) && row.date === input.businessDate && row.status === "confirmed");
  const sources = new Set<RevenueSource>();
  for (const event of events) sources.add(factSource(event.source));
  for (const row of revenues) {
    if (row.revenueSource === "sales_events_v1") {
      const facts = events.filter(event => event.revenueRowId === row.id);
      if (facts.length) facts.forEach(event => sources.add(factSource(event.source)));
      else sources.add(Number(row.revenue) === 0 && cashShifts.includes(row) ? "BARDOC_POS" : "LEGACY_UNKNOWN");
    } else if (row.revenueSource === "sales_documents") {
      const facts = documents.filter(doc => Array.isArray(row.salesDocumentIds) && row.salesDocumentIds.includes(doc.id));
      if (facts.length) facts.forEach(doc => sources.add(factSource(doc.sourceSystem)));
      else sources.add("LEGACY_UNKNOWN");
    } else if (row.revenueSource === "MANUAL_SUMMARY" || ["guided-v17", "canonical-writeoff-v272"].includes(String(row.closedVia))) sources.add("MANUAL_SUMMARY");
    else sources.add("LEGACY_UNKNOWN");
  }
  const source: RevenueSource = sources.size === 1 ? [...sources][0] : "LEGACY_UNKNOWN";
  const currencies = new Set([...revenues, ...events].map(row => row.currency).filter(value => value != null));
  const monetaryValue = (row: Row) => input.currency ? resolveAccountingMoney({ value: row, originalAmount: row.revenue, originalCurrency: row.currency ?? input.currency, accountingCurrency: input.currency })?.accountingAmount ?? null : Number(row.revenue);
  const moneyKnown = [...revenues, ...posted].every(row => finiteBusinessNumber(row.revenue) != null && Number.isFinite(monetaryValue(row)) && monetaryValue(row) != null) && (Boolean(input.currency) || currencies.size <= 1);
  const projectedAmount = money(revenues.reduce((sum, row) => sum + (monetaryValue(row) ?? 0), 0));
  const factsAmount = money(posted.reduce((sum, row) => sum + (monetaryValue(row) ?? 0), 0));
  const factBacked = eventRows.length === revenues.length && events.every(row => ["POSTED", "REVERSED"].includes(String(row.status)))
    && (events.length > 0 || projectedAmount === 0 && cashShifts.length > 0);
  const eventIdentityMatches = events.every(event => eventRows.some(row => row.id === event.revenueRowId));
  const consistency = factBacked ? (factsAmount === projectedAmount && eventIdentityMatches ? "MATCH" : "MISMATCH") : "UNVERIFIED";
  const amount = moneyKnown ? factBacked ? factsAmount : projectedAmount : null;
  const receipts = factBacked ? posted.length : revenues.reduce((sum, row) => sum + (Number(row.receipts) || 0), 0);
  const paymentFacts = posted.flatMap(row => rows(Array.isArray(row.payments) ? row.payments : []));
  const payments = [...new Set(paymentFacts.map(row => String(row.method)))].map(method => ({ method, amount: money(paymentFacts.filter(row => row.method === method).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)) }));
  const status: RevenueStatus = open ? "PROVISIONAL" : !moneyKnown ? "UNKNOWN" : factBacked || source === "MANUAL_SUMMARY" || documents.length ? "FINAL" : "UNKNOWN";
  const report = rows(input.reports).find(row => belongs(row) && row.venueId === input.venueId && row.date === input.businessDate)
    ?? revenues.find(row => row.revenueSource !== "sales_events_v1" && ["guided-v17", "canonical-writeoff-v272"].includes(String(row.closedVia)));
  const recorded = report?.closingStatus === "closed" || report?.closedVia === "guided-v17";
  const operationStatus = recorded ? "RECORDED" : "MISSING";
  const writeOffs = rows(input.writeOffs).filter(row => belongs(row) && row.date === input.businessDate && row.status !== "cancelled");
  const incidents = rows(input.incidents).filter(row => belongs(row) && String(row.businessDate ?? row.eventDate ?? row.date).slice(0, 10) === input.businessDate);
  const payroll = object(report?.payrollBreakdown), rawPayroll = payroll.total ?? payroll.totalPayroll;
  const payrollAmount = finiteBusinessNumber(rawPayroll);
  const dayStatus = open ? "OPERATING" : recorded && payrollAmount != null && revenues.length && status === "FINAL" && consistency !== "MISMATCH" ? "COMPLETE" : "AWAITING_OPERATIONAL_DATA";
  return {
    venueId: input.venueId, businessDate: input.businessDate,
    payroll: { amount: payrollAmount, basis: payrollAmount == null ? "MISSING" : recorded ? "RECORDED" : "LEGACY_RECORDED" },
    revenue: { amount, sourceIds: revenues.map(row => row.id).filter(id => id != null), grain: "BUSINESS_DAY", currency: input.currency ?? (currencies.size === 1 ? [...currencies][0] : null), currencyStatus: moneyKnown ? currencies.size ? "KNOWN" : "LEGACY" : "UNKNOWN", source, status, receipts, payments, asOf: input.asOf,
      updatedAt: [...revenues.map(row => String(row.updatedAt ?? row.createdAt ?? "")), ...events.map(row => String(row.acceptedAt ?? ""))].sort().at(-1) || null,
      readOnly: events.length > 0 || documents.length > 0 || revenues.some(row => ["sales_events_v1", "sales_documents"].includes(String(row.revenueSource))), consistency },
    cashShift: cashShifts.length === 1 ? { id: cashShifts[0].id, status: cashShifts[0].closingStatus === "open" ? "OPEN" : "CLOSED", openedAt: cashShifts[0].openedAt ?? cashShifts[0].createdAt ?? null, closedAt: cashShifts[0].closedAt ?? null } : null,
    cashShifts: cashShifts.map(row => ({ id: row.id, status: row.closingStatus === "open" ? "OPEN" : "CLOSED", openedAt: row.openedAt ?? row.createdAt ?? null, closedAt: row.closedAt ?? null })),
    operations: { team: operationStatus, fot: operationStatus, writeOffs: operationStatus, incidents: operationStatus, writeOffCount: writeOffs.length, incidentCount: incidents.length },
    report: report ? operationalData(report) : null, status: dayStatus,
  };
}
export function operationalDays(input: Omit<OperationalDayInput, "businessDate">) {
  const dates = new Set([...rows(input.revenues), ...rows(input.reports), ...rows(input.events), ...rows(input.documents)].filter(row => scopedBusinessRows([row], { venueId: input.venueId, workspaceId: input.workspaceId, dataAccountId: input.dataAccountId }).length > 0).map(row => String(row.businessDate ?? row.date)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)));
  // Scope/deduplicate history once before partitioning. Global first-identity
  // selection must precede grouping to preserve duplicates across dates.
  const partition = (values: Row[], field: (row: Row) => unknown) => {
    const byDate = new Map<unknown, Row[]>();
    for (const row of values) {
      const date = field(row), group = byDate.get(date);
      if (group) group.push(row); else byDate.set(date, [row]);
    }
    return byDate;
  };
  const revenues = partition(eligibleRevenueRows(input.revenues, input.venueId, input), row => row.date);
  const events = partition(uniqueBusinessRows(input.events ?? []), row => row.businessDate);
  const reports = partition(rows(input.reports), row => row.date);
  const documents = partition(rows(input.documents), row => row.date);
  const writeOffs = partition(rows(input.writeOffs), row => row.date);
  const incidents = partition(rows(input.incidents), row => String(row.businessDate ?? row.eventDate ?? row.date).slice(0, 10));
  return [...dates].sort().reverse().map(businessDate => operationalDay({ ...input, businessDate,
    revenues: revenues.get(businessDate) ?? [], events: events.get(businessDate) ?? [],
    reports: reports.get(businessDate) ?? [], documents: documents.get(businessDate) ?? [],
    writeOffs: writeOffs.get(businessDate) ?? [], incidents: incidents.get(businessDate) ?? [],
  }));
}
