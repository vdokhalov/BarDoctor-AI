import { venueDate } from "./venue-time";
import { stableSalesValue } from "./sales-events";

export const SALES_ACCOUNTING_KEY = "bd_sales_accounting_v1";
export const MANUAL_REVENUE_SOURCE = "MANUAL_SUMMARY";
export const SALES_IMPORT_REVIEW_KEY = "bd_sales_import_review_v1";
export type SalesMode = "POS" | "MANUAL";
type Row = Record<string, unknown>;
export type SalesAccounting = {
  version: 1; venueId: number;
  shiftChanges?: { id: string; mode: SalesMode; createdAt: string; actorId: number; replacesLegacySchedule?: boolean }[];
  changes: { id: string; mode: SalesMode; effectiveDate: string; createdAt: string; actorId: number }[];
};
export class SalesAccountingError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
const fail = (code: string, message: string): never => { throw new SalesAccountingError(code, message); };
export const accountingRows = (value: unknown): Row[] => {
  if (!Array.isArray(value) || value.some(x => !x || typeof x !== "object" || Array.isArray(x))) {
    return fail("ACCOUNTING_STATE_INVALID", "Данные учёта требуют проверки. Ничего не изменено.");
  }
  return value as Row[];
};
export const accountingDate = (date: unknown): date is string => typeof date === "string"
  && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date))
  && new Date(date).toISOString().slice(0, 10) === date;
export const belongsToVenue = (row: Row, venueId: number) => row.venueId == null || row.venueId === venueId;
export function initialSalesAccounting(venueId: number, now: string, actorId: number): SalesAccounting {
  return { version: 1, venueId, shiftChanges: [{ id: "initial-pos", mode: "POS", createdAt: now, actorId }], changes: [{ id: "initial-pos", mode: "POS", effectiveDate: "1970-01-01", createdAt: now, actorId }] };
}
export function parseSalesAccounting(value: unknown, venueId: number): SalesAccounting | null {
  if (value == null) return null; // Existing venues retain their historical/import workflow.
  const setting = value as SalesAccounting;
  if (setting.version !== 1 || setting.venueId !== venueId || !Array.isArray(setting.changes)
    || setting.changes.some((x, i) => !x || !["POS", "MANUAL"].includes(x.mode) || !accountingDate(x.effectiveDate)
      || !x.id || !Number.isSafeInteger(x.actorId) || !Number.isFinite(Date.parse(x.createdAt))
      || i > 0 && x.effectiveDate <= setting.changes[i - 1].effectiveDate)
    || new Set(setting.changes.map(x => x.id)).size !== setting.changes.length) {
    return fail("ACCOUNTING_STATE_INVALID", "Настройка учёта требует проверки. Ничего не изменено.");
  }
  if (setting.shiftChanges !== undefined && (!Array.isArray(setting.shiftChanges) || !setting.shiftChanges.length
    || setting.shiftChanges.some(x => !x || !x.id || !["POS", "MANUAL"].includes(x.mode) || !Number.isSafeInteger(x.actorId) || !Number.isFinite(Date.parse(x.createdAt)))
    || new Set(setting.shiftChanges.map(x=>x.id)).size !== setting.shiftChanges.length)) fail("ACCOUNTING_STATE_INVALID", "Настройка смен требует проверки.");
  return setting;
}
export function nextSalesMode(setting: SalesAccounting | null, date: string): SalesMode | "LEGACY" {
  return setting?.shiftChanges?.at(-1)?.mode ?? salesModeForDate(setting, date);
}
export const isSalesSession = (row: Row) => row.revenueSource === "sales_events_v1"
  || row.revenueSource === MANUAL_REVENUE_SOURCE && row.manualTotalsVersion === 2 && row.accountingScope === "SHIFT" && row.salesModeSnapshot === "MANUAL" && row.shiftId === row.id;
export function salesModeForDate(setting: SalesAccounting | null, date: string): SalesMode | "LEGACY" {
  return setting?.changes.filter(x => x.effectiveDate <= date).at(-1)?.mode ?? "LEGACY";
}
export function planSalesMode(input: {
  setting: SalesAccounting | null; venueId: number; actorId: number; role: string; mode: unknown;
  operationId: string; now: string; timezone: string; revenues: Row[]; reports: Row[]; orders: Row[]; acceptLegacySchedule?: boolean;
}) {
  if (input.role !== "owner") fail("ACCESS_DENIED", "Способ учёта меняет владелец заведения.");
  if (!["POS", "MANUAL"].includes(String(input.mode)) || !/^[\w:-]{8,120}$/.test(input.operationId)) fail("ACCOUNTING_COMMAND_INVALID", "Выберите способ учёта и повторите сохранение.");
  const previous = input.setting?.shiftChanges?.find(x=>x.id===input.operationId);
  if (previous) {
    if (previous.mode !== input.mode) fail("ACCOUNTING_IDEMPOTENCY_CONFLICT", "Запрос уже использован для другого режима.");
    return {setting:input.setting!,change:previous,duplicate:true};
  }
  if(input.setting?.changes.some(x=>x.id===input.operationId))fail("ACCOUNTING_IDEMPOTENCY_CONFLICT","Этот запрос относится к прежней настройке по дате. Создайте новое подтверждение.");
  const today=venueDate(input.now,input.timezone);
  const legacyPending=!input.setting?.shiftChanges && input.setting?.changes.some(x=>x.effectiveDate>today);
  if (legacyPending && input.acceptLegacySchedule!==true) fail("ACCOUNTING_LEGACY_CONFIRM_REQUIRED", "Подтвердите замену прежнего перехода по дате настройкой следующей смены.");
  if (input.setting?.shiftChanges && nextSalesMode(input.setting,today)===input.mode) fail("ACCOUNTING_MODE_UNCHANGED", "Этот режим уже выбран для следующей смены.");
  const change={id:input.operationId,mode:input.mode as SalesMode,createdAt:input.now,actorId:input.actorId,...(legacyPending?{replacesLegacySchedule:true}:{})};
  return {setting:{version:1 as const,venueId:input.venueId,changes:input.setting?.changes??[],shiftChanges:[...(input.setting?.shiftChanges??[]),change]},change,duplicate:false};
}
/** Creates a manual cash-session row in the existing revenue store, with no invented zero. */
export function planManualShift(input: {setting:SalesAccounting|null;venueId:number;actorId:number;role:string;currency:string;now:string;timezone:string;
  operationId:string;revenues:Row[];reports:Row[];orders:Row[];closedMonths:Set<string>}) {
  if(input.role!=="owner")fail("ACCESS_DENIED","Ручную смену открывает владелец.");
  if(!/^[\w:-]{8,120}$/.test(input.operationId)||!/^(?:[A-Z]{3}|PMR_RUB)$/.test(input.currency))fail("ACCOUNTING_COMMAND_INVALID","Повторите открытие смены.");
  const id=`manual-shift:${input.venueId}:${input.operationId}`,previous=input.revenues.find(x=>x.id===id&&x.venueId===input.venueId);
  if(previous)return {row:previous,revenues:input.revenues,before:previous,duplicate:true};
  const days=input.reports.filter(x=>belongsToVenue(x,input.venueId)&&x.workdayStatus==="OPEN");
  if(days.length!==1||!Array.isArray(days[0].staffing)||!days[0].staffing.length)fail("WORKDAY_REQUIRED","Сначала откройте рабочий день с командой в разделе «Смены».");
  const date=String(days[0].date);
  if(!accountingDate(date)||date>venueDate(input.now,input.timezone))fail("ACCOUNTING_DATE_INVALID","Проверьте дату рабочего дня.");
  if(input.closedMonths.has(date.slice(0,7)))fail("MONTH_LOCKED","Месяц закрыт.");
  if(!input.setting?.shiftChanges)fail("ACCOUNTING_SHIFT_SETUP_REQUIRED","Подтвердите режим следующей смены в настройках.");
  if([...input.revenues,...input.orders].some(x=>belongsToVenue(x,input.venueId)&&(x.closingStatus==="open"||x.status==="OPEN")))fail("ACCOUNTING_OPEN_PERIOD","Сначала закройте текущую смену и незавершённые заказы.");
  assertSalesSource(input.setting,input.revenues,input.venueId,date,"MANUAL");
  const row:Row={id,shiftId:id,workdayId:days[0].id,venueId:input.venueId,date,accountingMonth:date.slice(0,7),currency:input.currency,timezone:input.timezone,
    shiftName:`Ручная смена ${input.revenues.filter(x=>belongsToVenue(x,input.venueId)&&x.date===date&&isSalesSession(x)).length+1} · ${date}`,accountingScope:"SHIFT",salesModeSnapshot:"MANUAL",modeOperationId:input.setting!.shiftChanges!.at(-1)!.id,
    revenueSource:MANUAL_REVENUE_SOURCE,manualTotalsVersion:2,manualRevision:0,manualRevisions:[],revenue:null,receipts:null,declaredCost:null,payments:[],
    openingOperationId:input.operationId,openedAt:input.now,openedBy:input.actorId,createdAt:input.now,updatedAt:input.now,closingStatus:"open",
    sourceSnapshot:{mode:"MANUAL",scope:"SHIFT",shiftId:id,date,venueId:input.venueId}};
  return {row,revenues:[...input.revenues,row],before:null,duplicate:false};
}
/** Every revenue writer must make this check inside its existing CAS snapshot. */
export function assertSalesSource(setting: SalesAccounting | null, revenues: Row[], venueId: number,
  date: string, source: "POS" | "IMPORT" | "MANUAL", shiftId?: string) {
  if (!accountingDate(date)) fail("ACCOUNTING_DATE_INVALID", "Укажите корректный рабочий день.");
  const sameDay = revenues.filter(x => belongsToVenue(x, venueId) && x.date === date);
  if (source !== "IMPORT" && (setting?.shiftChanges || shiftId && sameDay.some(x=>x.id===shiftId&&x.accountingScope==="SHIFT"))) {
    if(sameDay.some(x=>!isSalesSession(x)))fail("ACCOUNTING_SOURCE_CONFLICT","За день уже есть дневной итог или импорт. Нужна отдельная сверка покрытия.");
    const session=shiftId?sameDay.find(x=>x.id===shiftId):undefined;
    if(shiftId && (!session || (session.salesModeSnapshot??(session.revenueSource==="sales_events_v1"?"POS":null))!==source))fail("ACCOUNTING_SOURCE_CONFLICT","Смена закреплена за другим способом учёта.");
    if(!shiftId && nextSalesMode(setting,date)!==source)fail("ACCOUNTING_SOURCE_CONFLICT","Для следующей смены выбран другой способ учёта.");
    return;
  }
  if(source==="IMPORT" && sameDay.some(x=>x.accountingScope==="SHIFT"))fail("ACCOUNTING_SOURCE_CONFLICT","Дневной импорт пересекается со сменами. Требуется сверка покрытия.");
  // An audited explicit replacement owns this historical day even after a later mode switch.
  const replaced = sameDay.length === 1 && sameDay[0].sourceReplacementVersion === 1
    && sameDay[0].revenueSource === "sales_documents";
  const mode = salesModeForDate(setting, date);
  if (mode !== "LEGACY" && mode !== source && !(replaced && source === "IMPORT")) {
    fail("ACCOUNTING_SOURCE_CONFLICT", "За этот день выбран другой способ учёта. Импорт сохраните для отдельной сверки.");
  }
  const expected = source === "POS" ? "sales_events_v1" : source === "IMPORT" ? "sales_documents" : MANUAL_REVENUE_SOURCE;
  if (sameDay.some(x => x.revenueSource !== expected)) {
    fail("ACCOUNTING_SOURCE_CONFLICT", "За этот день уже учтена выручка из другого источника. Требуется отдельная сверка.");
  }
}
/** Only a full manual daily total can be replaced here: it has never deducted stock. */
export function manualImportReplacement(input: { revenues: Row[]; venueId: number; date: string;
  role: string; request: unknown; stagedDocument: unknown; document: unknown }) {
  const request = input.request as Row | null;
  if (!request) return null;
  if (input.role !== "owner") fail("ACCESS_DENIED", "Замену источника подтверждает владелец.");
  if (!input.stagedDocument || stableSalesValue(input.stagedDocument) !== stableSalesValue(input.document)) fail("IMPORT_REVIEW_CHANGED", "Сохранённый импорт изменился. Откройте сверку заново.");
  const sameDay = input.revenues.filter(x => belongsToVenue(x, input.venueId) && x.date === input.date);
  const previous = sameDay[0];
  if (sameDay.length !== 1 || previous.manualTotalsVersion !== 1 || previous.revenueSource !== MANUAL_REVENUE_SOURCE
    || previous.accountingScope === "SHIFT" || previous.id !== request.revenueId || previous.manualRevision !== request.expectedRevision) {
    fail("IMPORT_REVIEW_CHANGED", "Итоги дня изменились. Откройте сверку заново.");
  }
  if (typeof request.reason !== "string" || !request.reason.trim() || request.reason.length > 500) fail("ACCOUNTING_REASON_REQUIRED", "Укажите причину замены источника.");
  return { previous, revenues: input.revenues.filter(x => x !== previous), reason: (request.reason as string).trim() };
}
const amount = (value: unknown, optional = false): number | null => {
  if (optional && (value == null || value === "")) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1e10
    || Math.abs(value * 100 - Math.round(value * 100)) > .00001) {
    return fail("ACCOUNTING_AMOUNT_INVALID", "Введите неотрицательную сумму с точностью до копеек.");
  }
  return value;
};
export function planManualTotals(input: {
  setting: SalesAccounting | null; venueId: number; currency: string; date: string; now: string; timezone: string;
  role: string; actorId: number; operationId: string; expectedRevision: number; reason?: string;
  cash: unknown; card: unknown; receipts?: unknown; cogs?: unknown; revenues: Row[]; closedMonths: Set<string>; shiftId?: string; reports?: Row[]; orders?: Row[];
}) {
  if (input.role !== "owner") fail("ACCESS_DENIED", "Ручные итоги сохраняет владелец заведения.");
  if (!accountingDate(input.date) || input.date > venueDate(input.now, input.timezone)) fail("ACCOUNTING_DATE_INVALID", "Нельзя вносить итоги будущего дня.");
  if (input.closedMonths.has(input.date.slice(0, 7))) fail("MONTH_LOCKED", "Месяц закрыт. Сначала откройте его для исправления.");
  if (!/^(?:[A-Z]{3}|PMR_RUB)$/.test(input.currency) || !/^[\w:-]{8,120}$/.test(input.operationId)) fail("ACCOUNTING_COMMAND_INVALID", "Проверьте валюту заведения и повторите сохранение.");
  const session=input.shiftId?input.revenues.find(x=>x.id===input.shiftId&&x.venueId===input.venueId&&x.date===input.date):undefined;
  if(input.shiftId&&(!session||!isSalesSession(session)||session.manualTotalsVersion!==2))fail("ACCOUNTING_SHIFT_NOT_FOUND","Выберите ручную смену.");
  if(!input.shiftId && input.setting?.shiftChanges)fail("ACCOUNTING_SHIFT_REQUIRED","Выберите смену. Исторические дневные итоги доступны только для просмотра.");
  if(session && input.reports?.some(x=>belongsToVenue(x,input.venueId)&&(session.workdayId?x.id===session.workdayId:x.date===input.date&&Number(x.workdaySequence||1)===1)&&x.workdayStatus==="CLOSED"))fail("WORKDAY_CLOSED","Рабочий день закрыт. Итоги сохранены без изменений.");
  if(session && input.orders?.some(x=>belongsToVenue(x,input.venueId)&&x.status==="OPEN"))fail("ACCOUNTING_OPEN_PERIOD","Сначала завершите открытые заказы.");
  assertSalesSource(input.setting, input.revenues, input.venueId, input.date, "MANUAL", input.shiftId);
  if (!session && salesModeForDate(input.setting, input.date) !== "MANUAL") fail("ACCOUNTING_MANUAL_NOT_ENABLED", "Для этого дня ручной ввод итогов не включён.");
  const cash = amount(input.cash)!, card = amount(input.card)!, cogs = amount(input.cogs, true);
  const receipts = input.receipts == null || input.receipts === "" ? null : input.receipts;
  if (receipts !== null && (typeof receipts !== "number" || !Number.isSafeInteger(receipts) || receipts < 0)) fail("ACCOUNTING_RECEIPTS_INVALID", "Количество чеков должно быть целым неотрицательным числом.");
  const matches = input.revenues.filter(x => belongsToVenue(x, input.venueId) && x.date === input.date && (!input.shiftId || x.id===input.shiftId));
  if (matches.length > 1) fail("ACCOUNTING_SOURCE_CONFLICT", "За этот день найдено несколько итогов. Нужна отдельная сверка.");
  const previous = matches[0];
  if (previous && previous.manualTotalsVersion !== 1 && previous.manualTotalsVersion !== 2) fail("ACCOUNTING_LEGACY_READ_ONLY", "Исторические итоги сохраняются без изменений.");
  const payload = { cash, card, receipts, cogs };
  const history = previous ? accountingRows(previous.manualRevisions) : [];
  const retry = history.find(x => x.operationId === input.operationId);
  if (retry) {
    if (stableSalesValue(retry.values) !== stableSalesValue(payload)) fail("ACCOUNTING_IDEMPOTENCY_CONFLICT", "Этот запрос уже использован с другими суммами.");
    return { revenues: input.revenues, row: previous!, before: previous!, duplicate: true };
  }
  if (input.expectedRevision !== (previous?.manualRevision ?? 0)) fail("ACCOUNTING_REVISION_CONFLICT", "Итоги изменились на другом устройстве. Обновите данные.");
  if (previous && Number(previous.manualRevision)>0 && (!input.reason?.trim() || input.reason.length > 500)) fail("ACCOUNTING_REASON_REQUIRED", "Укажите причину исправления итогов.");
  const revision = history.length + 1;
  const saved: Row = {
    ...previous, id: previous?.id ?? `manual-totals:${input.venueId}:${input.date}`,
    venueId: input.venueId, date: input.date, accountingMonth: input.date.slice(0, 7), currency: input.currency,
    revenueSource: MANUAL_REVENUE_SOURCE, revenue: Math.round((cash + card) * 100) / 100, receipts,
    payments: [{ method: "CASH", amount: cash }, { method: "CARD_EXTERNAL", amount: card }],
    manualTotalsVersion: session ? 2 : 1, manualRevision: revision, declaredCost: cogs,
    costProvenance: { basis: "OWNER_DECLARED", currency: input.currency, actorId: input.actorId, recordedAt: input.now },
    closingStatus: "closed", closedAt: input.now, createdAt: previous?.createdAt ?? input.now, updatedAt: input.now,
    sourceSnapshot: previous?.sourceSnapshot ?? { mode: "MANUAL", date: input.date, venueId: input.venueId },
    manualRevisions: [...history, { revision, operationId: input.operationId, actorId: input.actorId, recordedAt: input.now, reason: input.reason?.trim() ?? "Первичный ввод", values: payload }],
  };
  return { revenues: previous ? input.revenues.map(x => x === previous ? saved : x) : [...input.revenues, saved],
    row: saved, before: previous ?? null, duplicate: false };
}

/** Generic sync may edit operational fields, but never manufacture or rewrite managed financial facts. */
export function managedRevenueMutation(before: Row[], after: Row[], setting: SalesAccounting | null) {
  const financial = (row: Row) => Object.fromEntries(["id", "venueId", "date", "revenue", "receipts", "currency", "revenueSource", "payments",
    "manualTotalsVersion", "manualRevision", "manualRevisions", "declaredCost", "costProvenance", "sourceSnapshot",
    "salesDocumentIds", "sourceReplacementVersion", "sourceHistory", "accountingScope", "shiftId", "salesModeSnapshot", "modeOperationId", "closingStatus", "openingOperationId"].map(key => [key, row[key]]));
  return before.some(row => ["MANUAL_SUMMARY", "sales_documents"].includes(String(row.revenueSource)) && !after.some(x => stableSalesValue(financial(x)) === stableSalesValue(financial(row))))
    || after.some(row => {
      const old = before.find(x => x.id === row.id);
      return !old || (["MANUAL_SUMMARY", "sales_documents"].includes(String(row.revenueSource)) || salesModeForDate(setting, String(row.date)) !== "LEGACY")
        && (!old || stableSalesValue(financial(old)) !== stableSalesValue(financial(row)));
    });
}
