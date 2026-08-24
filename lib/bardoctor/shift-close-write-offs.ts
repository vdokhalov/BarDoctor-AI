import { postWriteOffDocument, syncWriteOffExpense, WRITE_OFF_REASONS, type WriteOffDocument } from "./write-offs";

type JsonRecord = Record<string, unknown>;

export type ShiftCloseWriteOffLine = {
  id?: unknown;
  nomenclatureItemId?: unknown;
  productKey?: unknown;
  quantity?: unknown;
  unit?: unknown;
  packagingVariantId?: unknown;
  packagingLabel?: unknown;
  reasonCode?: unknown;
  comment?: unknown;
  location?: unknown;
};

export type CanonicalShiftCloseInput = {
  shiftCloseId?: unknown;
  shiftId?: unknown;
  venueId?: unknown;
  revenueRecord?: unknown;
  writeOffItems?: unknown;
};

type ShiftCloseFailure = {
  ok: false;
  code: string;
  error: string;
};

export type CanonicalShiftCloseResult = {
  ok: true;
  idempotent: boolean;
  shiftId: string;
  shiftCloseId: string;
  revenueRecord: JsonRecord;
  revenues: unknown[];
  writeOffs: WriteOffDocument[];
  writeOffDocuments: WriteOffDocument[];
  assortment: JsonRecord;
  stockMovements: unknown[];
  expenses: unknown[];
  warnings: string[];
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 240): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === "string" ? Number(value.replace(/\s/g, "").replace(",", ".")) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function dateKey(value: unknown): string {
  const valueText = text(value, "", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText)) return "";
  const parsed = new Date(`${valueText}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === valueText ? valueText : "";
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function reasonLabel(code: string): string {
  return WRITE_OFF_REASONS.find((reason) => reason.code === code)?.label ?? "";
}

function grouping(lines: unknown[]): Map<string, ShiftCloseWriteOffLine[]> {
  const result = new Map<string, ShiftCloseWriteOffLine[]>();
  for (const raw of lines) {
    const line = record(raw) as ShiftCloseWriteOffLine;
    const code = text(line.reasonCode, "", 40);
    const location = text(line.location, "Основной склад", 120);
    const key = `${code}\u0000${location}`;
    result.set(key, [...(result.get(key) ?? []), line]);
  }
  return result;
}

/**
 * Builds the complete shift-close mutation in memory. The caller persists the
 * returned stores in one D1 batch, so a failed line cannot partially close a
 * shift or partially decrement stock.
 */
export function closeShiftWithCanonicalWriteOffs(input: {
  current: {
    revenues: unknown[];
    writeOffs: unknown[];
    assortment: unknown;
    stockMovements: unknown[];
    expenses: unknown[];
  };
  request: CanonicalShiftCloseInput;
  venueId: number;
  actor: { accountId: number; name: string; role: string };
  allowNegativeStock: boolean;
  now?: string;
}): CanonicalShiftCloseResult | ShiftCloseFailure {
  const now = input.now ?? new Date().toISOString();
  const shiftCloseId = text(input.request.shiftCloseId, "", 140);
  if (!shiftCloseId) return { ok: false, code: "SHIFT_CLOSE_ID_REQUIRED", error: "Не удалось определить сессию закрытия смены" };
  if (input.request.venueId != null && number(input.request.venueId) !== input.venueId) {
    return { ok: false, code: "SHIFT_VENUE_MISMATCH", error: "Смена относится к другому заведению" };
  }
  const revenueInput = record(input.request.revenueRecord);
  const date = dateKey(revenueInput.date);
  if (!date) return { ok: false, code: "SHIFT_DATE_INVALID", error: "Укажите корректную дату смены" };
  const current = clone(input.current);
  const legacyWriteOffs = current.writeOffs.filter((value) => !Array.isArray(record(value).items));
  const previousRevenue = current.revenues.map(record).find((row) => text(row.shiftCloseId, "", 140) === shiftCloseId);
  const linkedDocuments = current.writeOffs.map(record).filter((row) => text(row.shiftCloseId, "", 140) === shiftCloseId) as unknown as WriteOffDocument[];
  if (previousRevenue && text(previousRevenue.closingStatus, "", 30) === "closed") {
    return {
      ok: true,
      idempotent: true,
      shiftId: text(previousRevenue.id, text(input.request.shiftId, `shift:${shiftCloseId}`, 140), 140),
      shiftCloseId,
      revenueRecord: previousRevenue,
      revenues: current.revenues,
      writeOffs: current.writeOffs as WriteOffDocument[],
      writeOffDocuments: linkedDocuments,
      assortment: record(current.assortment),
      stockMovements: current.stockMovements,
      expenses: current.expenses,
      warnings: [],
    };
  }
  const requestedShiftId = text(input.request.shiftId ?? revenueInput.id, `shift:${shiftCloseId}`, 140);
  const rawLines = array(input.request.writeOffItems);
  for (const [index, raw] of rawLines.entries()) {
    const line = record(raw);
    const code = text(line.reasonCode, "", 40);
    if (!reasonLabel(code)) return { ok: false, code: "WRITE_OFF_REASON_REQUIRED", error: `Выберите причину для позиции ${index + 1}` };
    if (code === "other" && !text(line.comment, "", 1_000)) return { ok: false, code: "WRITE_OFF_COMMENT_REQUIRED", error: `Добавьте комментарий для позиции ${index + 1}` };
    if (!text(line.nomenclatureItemId ?? line.productKey, "", 300)) return { ok: false, code: "WRITE_OFF_PRODUCT_NOT_FOUND", error: `Выберите товар для позиции ${index + 1}` };
  }

  let documents = current.writeOffs;
  let assortment = current.assortment;
  let stockMovements = current.stockMovements;
  let expenses = current.expenses;
  const posted: WriteOffDocument[] = [];
  const warnings: string[] = [];
  let groupIndex = 0;
  for (const [key, lines] of grouping(rawLines)) {
    groupIndex += 1;
    const [reasonCode, location] = key.split("\u0000");
    const comments = lines.map((line) => text(line.comment, "", 1_000)).filter(Boolean);
    const result = postWriteOffDocument({
      documents,
      assortment,
      stockMovements,
      venueId: input.venueId,
      draft: {
        id: `shift-writeoff:${shiftCloseId}:${groupIndex}`,
        date,
        location,
        reasonCode,
        comment: comments.length ? [...new Set(comments)].join("; ") : undefined,
        items: lines,
        source: "shift_close",
        shiftId: requestedShiftId,
        shiftCloseId,
        idempotencyKey: `shift-close:${shiftCloseId}:${reasonCode}:${location}`,
      },
      actor: input.actor,
      allowNegativeStock: input.allowNegativeStock,
      now,
    });
    if (!result.ok) return result;
    documents = [
      ...result.documents,
      ...legacyWriteOffs.filter((legacy) => !result.documents.some((document) => document.id === text(record(legacy).id, "", 100))),
    ];
    assortment = result.assortment;
    stockMovements = result.stockMovements;
    expenses = syncWriteOffExpense(expenses, result.document);
    posted.push(result.document);
    warnings.push(...result.warnings);
  }
  const totalCost = posted.some((document) => document.totalCost === null)
    ? null
    : money(posted.reduce((sum, document) => sum + (document.totalCost ?? 0), 0));
  const revenueRecord: JsonRecord = {
    ...revenueInput,
    id: requestedShiftId,
    venueId: input.venueId,
    date,
    accountingMonth: date.slice(0, 7),
    shiftCloseId,
    closingStatus: "closed",
    closedVia: "canonical-writeoff-v272",
    writeOffDocumentIds: posted.map((document) => document.id),
    writeOffItemCount: rawLines.length,
    writeOffTotalCost: totalCost,
    updatedAt: now,
    createdAt: text(revenueInput.createdAt, now, 40),
  };
  const revenues = current.revenues.map(record);
  const revenueIndex = revenues.findIndex((row) => text(row.id, "", 140) === requestedShiftId || text(row.shiftCloseId, "", 140) === shiftCloseId);
  if (revenueIndex >= 0) revenues[revenueIndex] = revenueRecord;
  else revenues.unshift(revenueRecord);
  return {
    ok: true,
    idempotent: false,
    shiftId: requestedShiftId,
    shiftCloseId,
    revenueRecord,
    revenues,
    writeOffs: documents as WriteOffDocument[],
    writeOffDocuments: posted,
    assortment: record(assortment),
    stockMovements,
    expenses,
    warnings,
  };
}
