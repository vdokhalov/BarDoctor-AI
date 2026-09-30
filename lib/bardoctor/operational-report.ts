import { operationalData, operationalDay } from "./operational-day";
import { closeShiftWithCanonicalWriteOffs, type CanonicalShiftCloseInput } from "./shift-close-write-offs";
import { eventRevenueMutation, stableSalesValue } from "./sales-events";

type Row = Record<string, unknown>;
function row(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
export async function saveOperationalReport(input: {
  current: { revenues: unknown[]; reports: unknown[]; incidents: unknown[]; events: unknown[]; documents: unknown[]; writeOffs: unknown[]; assortment: unknown; stockMovements: unknown[]; expenses: unknown[] };
  request: CanonicalShiftCloseInput & { incidents?: unknown; sectionsVersion?: unknown };
  venueId: number; actor: { accountId: number; name: string; role: string }; allowNegativeStock: boolean; now: string;
}) {
  const revenueInput = row(input.request.revenueRecord), date = String(revenueInput.date ?? "");
  const day = operationalDay({ ...input.current, venueId: input.venueId, businessDate: date, asOf: input.now });
  if (day.revenue.consistency === "MISMATCH") return { ok: false as const, code: "OPERATIONAL_DAY_REVENUE_NEEDS_REVIEW", error: "Продажи и финансовая выручка расходятся. Ничего не изменено; требуется проверка данных." };
  const protectedRevenue = day.revenue.readOnly;
  if (protectedRevenue && input.request.sectionsVersion !== 1) return { ok: false as const, code: "SALES_EVENT_REVENUE_PROTECTED", error: "Выручка поступает из продаж. Откройте обновлённый отчёт для отдельного сохранения операционных данных." };
  const reportId = `operational-report:${input.venueId}:${date}`;
  const previous = input.current.reports.map(row).find(report => report.id === reportId);
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableSalesValue(input.request)));
  const fingerprint = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
  const receipt = (Array.isArray(previous?.saveReceipts) ? previous.saveReceipts : []).map(row).find(saved => saved.id === input.request.shiftCloseId);
  if (receipt && receipt.fingerprint !== fingerprint) return { ok: false as const, code: "SHIFT_CLOSE_IDEMPOTENCY_CONFLICT", error: "Этот запрос уже использован для других данных отчёта" };
  const revenueConflict = protectedRevenue && ["revenue", "receipts", "payments", "zoneRevenue"].some(key => revenueInput[key] !== undefined);
  const sections = { revenue: { status: revenueConflict ? "REJECTED" : protectedRevenue ? "READ_ONLY" : "SAVED", ...(revenueConflict ? { code: "SALES_EVENT_REVENUE_PROTECTED", error: "Выручка и чеки поступают из продаж. Операционные данные сохранены отдельно." } : {}) }, operations: { status: "SAVED" } };
  if (receipt) return { ok: true as const, idempotent: true, shiftId: String(previous?.shiftId ?? reportId), revenueRecord: { ...revenueInput, ...operationalData(previous), operationalSaved: true }, ...input.current, writeOffDocuments: [], warnings: [], sections, operationalReport: previous! };
  const incidentInputs = input.request.incidents === undefined ? [] : input.request.incidents;
  if (!Array.isArray(incidentInputs) || incidentInputs.length > 100 || incidentInputs.some(value => !String(row(value).title ?? "").trim())) return { ok: false as const, code: "SHIFT_INCIDENT_INVALID", error: "Укажите название каждого происшествия" };
  // The existing planner supplies the exact warehouse operation. For fact-backed
  // days its temporary row is an operational report, never a persisted revenue.
  const plan = closeShiftWithCanonicalWriteOffs({ ...input,
    current: { ...input.current, revenues: protectedRevenue ? input.current.reports : input.current.revenues },
    request: { ...input.request, shiftId: protectedRevenue ? reportId : input.request.shiftId,
      revenueRecord: protectedRevenue ? { ...operationalData(revenueInput), date, createdAt: previous?.createdAt } : revenueInput },
  });
  if (!plan.ok) return plan;
  if (!protectedRevenue && eventRevenueMutation(input.current.revenues, plan.revenues)) return { ok: false as const, code: "SALES_EVENT_REVENUE_PROTECTED", error: "Нельзя заменить строку выручки продаж ручным отчётом" };
  const incidentIds = incidentInputs.map((_, index) => `shift-incident:${input.venueId}:${input.request.shiftCloseId}:${index}`);
  const incidents = [...input.current.incidents, ...incidentInputs.map((value, index) => {
    const incident = row(value);
    return { id: incidentIds[index], venueId: input.venueId, businessDate: date, shiftId: plan.shiftId,
      category: String(incident.category ?? "operations"), title: String(incident.title).trim().slice(0, 240), description: String(incident.description ?? "").slice(0, 5000),
      responsibleId: incident.responsibleId, responsible: String(incident.responsible ?? ""), participantIds: Array.isArray(incident.participantIds) ? incident.participantIds : [],
      priority: "medium", status: "open", eventDate: `${date}T12:00:00.000Z`, photos: [], voiceNote: null,
      createdAt: input.now, updatedAt: input.now };
  })];
  const writeOffDocumentIds = [...new Set([...(Array.isArray(previous?.writeOffDocumentIds) ? previous.writeOffDocumentIds : []), ...plan.writeOffDocuments.map(doc => doc.id)])];
  const linkedWriteOffs = plan.writeOffs.filter(doc => writeOffDocumentIds.includes(doc.id));
  const operationalReport = { ...operationalData(plan.revenueRecord), id: reportId, venueId: input.venueId, date,
    accountingMonth: date.slice(0, 7), shiftId: plan.shiftId, shiftCloseId: input.request.shiftCloseId, closingStatus: "closed",
    incidentIds: [...new Set([...(Array.isArray(previous?.incidentIds) ? previous.incidentIds : []), ...incidentIds])],
    writeOffDocumentIds, writeOffItemCount: linkedWriteOffs.reduce((sum, doc) => sum + doc.items.length, 0),
    writeOffTotalCost: linkedWriteOffs.some(doc => doc.totalCost === null) ? null : Math.round(linkedWriteOffs.reduce((sum, doc) => sum + (doc.totalCost ?? 0), 0) * 100) / 100,
    createdAt: previous?.createdAt ?? input.now, updatedAt: input.now,
    saveReceipts: [...(Array.isArray(previous?.saveReceipts) ? previous.saveReceipts : []), { id: input.request.shiftCloseId, fingerprint }],
  };
  return { ...plan, revenues: protectedRevenue ? input.current.revenues : plan.revenues,
    revenueRecord: { ...plan.revenueRecord, ...(protectedRevenue ? { revenue: day.revenue.amount, receipts: day.revenue.receipts } : {}), operationalSaved: true },
    reports: [...input.current.reports.filter(value => row(value).id !== reportId), operationalReport], incidents,
    sections, operationalReport,
  };
}
