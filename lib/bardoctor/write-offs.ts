import {
  inventoryPackageAmount,
  resolveInventoryProductKey,
  toInventoryBaseAmount,
  type BaseInventoryUnit,
  type StockMovement,
} from "./inventory";

export const WRITE_OFF_STORE_KEY = "bd_inventory_writeoffs";

export const WRITE_OFF_REASONS = [
  { code: "spoilage", label: "Порча" },
  { code: "expired", label: "Истёк срок годности" },
  { code: "breakage", label: "Бой / разбили" },
  { code: "spill", label: "Пролив / просыпали" },
  { code: "preparation_error", label: "Ошибка приготовления" },
  { code: "recipe_development", label: "Проработка техкарты" },
  { code: "tasting", label: "Дегустация" },
  { code: "staff_meal", label: "Питание персонала" },
  { code: "guest_compliment", label: "Комплимент гостю" },
  { code: "loss_shortage", label: "Потеря / недостача" },
  { code: "other", label: "Другое" },
] as const;

export type WriteOffReasonCode = (typeof WRITE_OFF_REASONS)[number]["code"];
export type WriteOffStatus = "draft" | "posted" | "cancelled";
export type WriteOffCostStatus = "full" | "partial" | "unvalued";

export type WriteOffItem = {
  id: string;
  nomenclatureItemId: string;
  productKey: string;
  productName: string;
  quantity: number;
  unit: string;
  packagingVariantId?: string;
  packagingLabel?: string;
  baseQuantity: number;
  baseUnit: BaseInventoryUnit;
  unitCost: number | null;
  totalCost: number | null;
  currency?: string;
  costStatus: "valued" | "unvalued";
  costIssue?: string;
  stockBefore: number;
  stockAfter: number;
};

export type WriteOffDocument = {
  id: string;
  venueId: number;
  number: number;
  date: string;
  location: string;
  reasonCode: WriteOffReasonCode;
  reasonLabel: string;
  comment?: string;
  status: WriteOffStatus;
  items: WriteOffItem[];
  itemCount: number;
  totalCost: number | null;
  costStatus: WriteOffCostStatus;
  unvaluedItemCount: number;
  currency?: string;
  idempotencyKey?: string;
  source: "warehouse" | "shift_close" | "integration";
  shiftId?: string;
  shiftCloseId?: string;
  externalSystem?: string;
  externalId?: string;
  movementIds: string[];
  reversalMovementIds?: string[];
  createdBy: { accountId: number; name: string; role: string };
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
  cancelledAt?: string;
  cancelledBy?: { accountId: number; name: string; role: string };
};

export type WriteOffInputItem = {
  id?: unknown;
  nomenclatureItemId?: unknown;
  productKey?: unknown;
  quantity?: unknown;
  unit?: unknown;
  packagingVariantId?: unknown;
  packagingLabel?: unknown;
};

export type WriteOffDraftInput = {
  id?: unknown;
  number?: unknown;
  date?: unknown;
  location?: unknown;
  reasonCode?: unknown;
  comment?: unknown;
  items?: unknown;
  idempotencyKey?: unknown;
  source?: unknown;
  shiftId?: unknown;
  shiftCloseId?: unknown;
  externalSystem?: unknown;
  externalId?: unknown;
};

export type WriteOffFailureCode =
  | "WRITE_OFF_NOT_FOUND"
  | "WRITE_OFF_READ_ONLY"
  | "WRITE_OFF_INVALID_DATE"
  | "WRITE_OFF_REASON_REQUIRED"
  | "WRITE_OFF_COMMENT_REQUIRED"
  | "WRITE_OFF_ITEMS_REQUIRED"
  | "WRITE_OFF_PRODUCT_NOT_FOUND"
  | "WRITE_OFF_UNIT_INVALID"
  | "WRITE_OFF_PACKAGE_INVALID"
  | "WRITE_OFF_QUANTITY_INVALID"
  | "WRITE_OFF_INSUFFICIENT_STOCK"
  | "WRITE_OFF_VENUE_MISMATCH";

type JsonRecord = Record<string, unknown>;

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

function rounded(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function money(value: number): number {
  return rounded(value, 2);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function reason(value: unknown): (typeof WRITE_OFF_REASONS)[number] | null {
  const code = text(value, "", 40);
  return WRITE_OFF_REASONS.find((item) => item.code === code) ?? null;
}

function document(value: unknown, fallbackVenueId?: number): WriteOffDocument | null {
  const item = record(value);
  const id = text(item.id, "", 100);
  const venueId = number(item.venueId) || fallbackVenueId || 0;
  if (!id || !venueId || !Array.isArray(item.items)) return null;
  const status = text(item.status, "draft", 30);
  return {
    ...item,
    venueId,
    status: status === "confirmed" ? "posted" : status,
    source: (["warehouse", "shift_close", "integration"] as const).includes(item.source as "warehouse" | "shift_close" | "integration")
      ? item.source as "warehouse" | "shift_close" | "integration"
      : "warehouse",
    movementIds: array(item.movementIds).map((value) => text(value, "", 100)).filter(Boolean),
  } as unknown as WriteOffDocument;
}

function assortmentParts(value: unknown) {
  const root = { ...record(value) };
  const balances = array(root.stockBalances).map((item) => ({ ...record(item) }));
  root.stockBalances = balances;
  return { root, balances };
}

function productKey(value: JsonRecord): string {
  return text(value.productKey ?? value.key ?? value.nomenclatureItemId, "", 300);
}

function balanceAverageCost(value: JsonRecord): number | null {
  if (value.costNeedsReview === true) return null;
  const stored = number(value.averageUnitCost);
  if (stored > 0) return stored;
  const current = number(value.current);
  const total = number(value.inventoryValue);
  return current > 0 && total > 0 ? total / current : null;
}

function packageLabels(balance: JsonRecord): string[] {
  const values = [
    ...array(balance.packageOptions).map((value) => text(record(value).label ?? value, "", 120)),
    text(balance.displayPackageSize, "", 120),
    text(balance.purchasePackageSize, "", 120),
    balance.multiplePackageSizes === true ? "" : text(balance.packageSize, "", 120),
  ].filter(Boolean);
  return [...new Set(values)];
}

function lineBaseQuantity(line: JsonRecord, balance: JsonRecord):
  | { ok: true; amount: number; unit: BaseInventoryUnit; packagingLabel?: string }
  | { ok: false; code: WriteOffFailureCode; error: string } {
  const quantity = (typeof line.quantity === "number" || typeof line.quantity === "string")
    && !(typeof line.quantity === "string" && !line.quantity.trim())
    ? number(line.quantity, Number.NaN)
    : Number.NaN;
  const name = text(balance.name, "Товар");
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000_000_000) {
    return { ok: false, code: "WRITE_OFF_QUANTITY_INVALID", error: `Укажите количество для «${name}»` };
  }
  const packagingLabel = text(line.packagingLabel, "", 120);
  if (packagingLabel) {
    if (!packageLabels(balance).includes(packagingLabel)) {
      return { ok: false, code: "WRITE_OFF_PACKAGE_INVALID", error: `Фасовка «${packagingLabel}» недоступна для «${name}»` };
    }
    const parsed = inventoryPackageAmount(packagingLabel, balance.unit);
    if (parsed.amount <= 0 || parsed.unit === "unknown") {
      return { ok: false, code: "WRITE_OFF_PACKAGE_INVALID", error: `Для фасовки «${packagingLabel}» не задан коэффициент пересчёта` };
    }
    return { ok: true, amount: rounded(quantity * parsed.amount), unit: parsed.unit, packagingLabel };
  }
  const parsed = toInventoryBaseAmount(quantity, line.unit);
  if (parsed.amount <= 0 || parsed.unit === "unknown") {
    return { ok: false, code: "WRITE_OFF_UNIT_INVALID", error: `Единица списания для «${name}» не поддерживается` };
  }
  return { ok: true, amount: rounded(parsed.amount), unit: parsed.unit };
}

export function nextWriteOffNumber(values: unknown[], venueId: number): number {
  return values.reduce<number>((max, value) => {
    const item = record(value);
    if (number(item.venueId) !== venueId) return max;
    const current = number(item.number);
    return Number.isInteger(current) && current > max ? current : max;
  }, 0) + 1;
}

export function writeOffDisplayNumber(value: unknown): string {
  const item = record(value);
  const numeric = number(item.number);
  return Number.isInteger(numeric) && numeric > 0 ? `WO-${text(item.date, "0000").slice(0, 4)}-${String(numeric).padStart(4, "0")}` : `WO-${text(item.id, "legacy").slice(-8)}`;
}

export function writeOffDocuments(values: unknown[], venueId: number): WriteOffDocument[] {
  return values.map((value) => document(value, venueId)).filter((value): value is WriteOffDocument => Boolean(value && value.venueId === venueId));
}

export function saveWriteOffDraft(input: {
  documents: unknown[];
  assortment: unknown;
  venueId: number;
  draft: WriteOffDraftInput;
  actor: { accountId: number; name: string; role: string };
  now?: string;
}): { ok: true; document: WriteOffDocument; documents: WriteOffDocument[] } | { ok: false; code: WriteOffFailureCode; error: string } {
  const now = input.now ?? new Date().toISOString();
  const existingDocuments = writeOffDocuments(input.documents, input.venueId);
  const requestedId = text(input.draft.id, "", 100);
  const existing = requestedId ? existingDocuments.find((item) => item.id === requestedId) : undefined;
  if (existing && existing.status !== "draft") return { ok: false, code: "WRITE_OFF_READ_ONLY", error: "Проведённое или отменённое списание нельзя редактировать" };
  const date = text(input.draft.date, now.slice(0, 10), 10);
  if (!validDate(date)) return { ok: false, code: "WRITE_OFF_INVALID_DATE", error: "Укажите корректную дату списания" };
  const selectedReason = reason(input.draft.reasonCode);
  if (!selectedReason) return { ok: false, code: "WRITE_OFF_REASON_REQUIRED", error: "Выберите причину списания" };
  const comment = text(input.draft.comment, "", 1_000);
  if (selectedReason.code === "other" && !comment) return { ok: false, code: "WRITE_OFF_COMMENT_REQUIRED", error: "Для причины «Другое» добавьте комментарий" };
  const parts = assortmentParts(input.assortment);
  const byKey = new Map(parts.balances.map((balance) => [productKey(balance), balance]));
  const items: WriteOffItem[] = [];
  for (const [index, raw] of array(input.draft.items).entries()) {
    const line = record(raw);
    const requestedKey = text(line.nomenclatureItemId ?? line.productKey, "", 300);
    const resolvedKey = resolveInventoryProductKey(parts.root, requestedKey) || requestedKey;
    const balance = byKey.get(resolvedKey);
    if (!balance || (number(balance.venueId) > 0 && number(balance.venueId) !== input.venueId)) {
      return { ok: false, code: "WRITE_OFF_PRODUCT_NOT_FOUND", error: `Позиция ${index + 1} не найдена в номенклатуре текущего заведения` };
    }
    const converted = lineBaseQuantity(line, balance);
    if (!converted.ok) return converted;
    const balanceUnit = text(balance.unit, "unknown", 20) as BaseInventoryUnit;
    if (converted.unit !== balanceUnit) return { ok: false, code: "WRITE_OFF_UNIT_INVALID", error: `Единица «${text(balance.name, "Товар") }» не совпадает со складской` };
    const current = number(balance.current);
    const averageCost = balanceAverageCost(balance);
    const knownCost = averageCost !== null && averageCost > 0 && Boolean(text(balance.currency, "", 12));
    const totalCost = knownCost ? money(converted.amount * averageCost) : null;
    items.push({
      id: text(line.id, crypto.randomUUID(), 100),
      nomenclatureItemId: resolvedKey,
      productKey: resolvedKey,
      productName: text(balance.name, `Позиция ${index + 1}`),
      quantity: number(line.quantity),
      unit: text(line.unit, balanceUnit, 40),
      packagingVariantId: text(line.packagingVariantId, "", 120) || undefined,
      packagingLabel: converted.packagingLabel,
      baseQuantity: converted.amount,
      baseUnit: converted.unit,
      unitCost: knownCost ? rounded(averageCost, 6) : null,
      totalCost,
      currency: knownCost ? text(balance.currency, "", 12).toUpperCase() : undefined,
      costStatus: knownCost ? "valued" : "unvalued",
      costIssue: knownCost ? undefined : text(balance.costReviewReason, "missing_cost_basis", 80),
      stockBefore: current,
      stockAfter: rounded(current - converted.amount),
    });
  }
  const unvaluedItemCount = items.filter((item) => item.costStatus === "unvalued").length;
  const valuedTotal = money(items.reduce((sum, item) => sum + (item.totalCost ?? 0), 0));
  const currencies = [...new Set(items.map((item) => item.currency).filter(Boolean))];
  const costStatus: WriteOffCostStatus = !items.length || unvaluedItemCount === items.length ? "unvalued" : unvaluedItemCount ? "partial" : "full";
  const next: WriteOffDocument = {
    id: existing?.id ?? (requestedId || crypto.randomUUID()),
    venueId: input.venueId,
    number: existing?.number ?? nextWriteOffNumber(existingDocuments, input.venueId),
    date,
    location: text(input.draft.location, "Основной склад", 120),
    reasonCode: selectedReason.code,
    reasonLabel: selectedReason.label,
    comment: comment || undefined,
    status: "draft",
    items,
    itemCount: items.length,
    totalCost: costStatus === "unvalued" ? null : valuedTotal,
    costStatus,
    unvaluedItemCount,
    currency: currencies.length === 1 ? currencies[0] : undefined,
    idempotencyKey: text(input.draft.idempotencyKey, existing?.idempotencyKey ?? "", 240) || undefined,
    source: (["warehouse", "shift_close", "integration"] as const).includes(text(input.draft.source, existing?.source ?? "warehouse", 30) as "warehouse" | "shift_close" | "integration")
      ? text(input.draft.source, existing?.source ?? "warehouse", 30) as "warehouse" | "shift_close" | "integration"
      : "warehouse",
    shiftId: text(input.draft.shiftId, existing?.shiftId ?? "", 140) || undefined,
    shiftCloseId: text(input.draft.shiftCloseId, existing?.shiftCloseId ?? "", 140) || undefined,
    externalSystem: text(input.draft.externalSystem, existing?.externalSystem ?? "", 120) || undefined,
    externalId: text(input.draft.externalId, existing?.externalId ?? "", 180) || undefined,
    movementIds: [],
    createdBy: existing?.createdBy ?? input.actor,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const nextDocuments = existingDocuments.filter((item) => item.id !== next.id);
  nextDocuments.unshift(next);
  return { ok: true, document: next, documents: nextDocuments };
}

export function writeOffExpenseFor(document: WriteOffDocument, previous?: JsonRecord): JsonRecord | null {
  if (document.totalCost === null || document.totalCost <= 0) return null;
  return {
    ...previous,
    id: `writeoff:${document.id}`,
    venueId: document.venueId,
    date: document.date,
    accountingMonth: document.date.slice(0, 7),
    category: "writeoff",
    amount: document.totalCost,
    area: document.location,
    description: `${document.reasonLabel} · ${document.itemCount} поз.`,
    source: "write_off_document",
    sourceDocumentId: document.id,
    shiftId: document.shiftId,
    entryPoint: document.source,
    currency: document.currency,
    status: document.status === "cancelled" ? "voided" : "posted",
    reversedAt: document.status === "cancelled" ? document.cancelledAt : undefined,
    unvaluedItemCount: document.unvaluedItemCount,
    createdAt: text(previous?.createdAt, document.createdAt, 40),
    updatedAt: document.updatedAt,
    createdByAccountId: document.createdBy.accountId,
  };
}

export function syncWriteOffExpense(expenses: unknown[], document: WriteOffDocument): unknown[] {
  const values = expenses.map(record);
  const id = `writeoff:${document.id}`;
  const index = values.findIndex((item) => text(item.id, "", 140) === id
    || text(item.sourceDocumentId, "", 100) === document.id && item.source === "write_off_document");
  const next = writeOffExpenseFor(document, index >= 0 ? values[index] : undefined);
  if (!next) return values;
  if (index >= 0) values[index] = next;
  else values.unshift(next);
  return values;
}

export function postWriteOffDocument(input: {
  documents: unknown[];
  assortment: unknown;
  stockMovements: unknown[];
  venueId: number;
  draft: WriteOffDraftInput;
  actor: { accountId: number; name: string; role: string };
  allowNegativeStock: boolean;
  now?: string;
}):
  | { ok: true; idempotent: boolean; document: WriteOffDocument; documents: WriteOffDocument[]; assortment: JsonRecord; stockMovements: StockMovement[]; warnings: string[] }
  | { ok: false; code: WriteOffFailureCode; error: string } {
  const currentDocuments = writeOffDocuments(input.documents, input.venueId);
  const requestedId = text(input.draft.id, "", 100);
  const idempotencyKey = text(input.draft.idempotencyKey, "", 240);
  const alreadyPosted = currentDocuments.find((item) => item.status === "posted" && (item.id === requestedId || Boolean(idempotencyKey && item.idempotencyKey === idempotencyKey)));
  if (alreadyPosted) return { ok: true, idempotent: true, document: alreadyPosted, documents: currentDocuments, assortment: record(input.assortment), stockMovements: array(input.stockMovements) as StockMovement[], warnings: [] };
  const saved = saveWriteOffDraft({ documents: currentDocuments, assortment: input.assortment, venueId: input.venueId, draft: input.draft, actor: input.actor, now: input.now });
  if (!saved.ok) return saved;
  if (!saved.document.items.length) return { ok: false, code: "WRITE_OFF_ITEMS_REQUIRED", error: "Добавьте хотя бы одну позицию" };
  const now = input.now ?? new Date().toISOString();
  const parts = assortmentParts(input.assortment);
  const byKey = new Map(parts.balances.map((balance) => [productKey(balance), balance]));
  const warnings: string[] = [];
  for (const item of saved.document.items) {
    const balance = byKey.get(item.productKey);
    if (!balance) return { ok: false, code: "WRITE_OFF_PRODUCT_NOT_FOUND", error: `Позиция «${item.productName}» больше не найдена на складе` };
    const current = number(balance.current);
    if (!input.allowNegativeStock && current + 0.0001 < item.baseQuantity) {
      return { ok: false, code: "WRITE_OFF_INSUFFICIENT_STOCK", error: `Недостаточно остатка для «${item.productName}»: доступно ${current}, требуется ${item.baseQuantity}` };
    }
    if (current + 0.0001 < item.baseQuantity) warnings.push(`«${item.productName}» уйдёт в отрицательный остаток`);
  }
  const movementIds: string[] = [];
  const movements: StockMovement[] = [];
  const postedItems = saved.document.items.map((item) => {
    const balance = byKey.get(item.productKey)!;
    const current = number(balance.current);
    const nextCurrent = rounded(current - item.baseQuantity);
    const movementId = crypto.randomUUID();
    movementIds.push(movementId);
    balance.current = nextCurrent;
    if (item.totalCost !== null) balance.inventoryValue = money(Math.max(0, number(balance.inventoryValue) - item.totalCost));
    else balance.costNeedsReview = true;
    balance.lastWriteOffAt = saved.document.date;
    balance.updatedAt = now;
    movements.push({
      id: movementId,
      venueId: input.venueId,
      type: "writeoff",
      date: saved.document.date,
      productKey: item.productKey,
      productName: item.productName,
      amount: -item.baseQuantity,
      unit: item.baseUnit,
      costAmount: item.totalCost === null ? undefined : -item.totalCost,
      currency: item.currency,
      sourceDocumentId: saved.document.id,
      sourceLineId: item.id,
      createdAt: now,
      status: "active",
    });
    return { ...item, stockBefore: current, stockAfter: nextCurrent };
  });
  parts.root.updatedAt = now;
  const posted: WriteOffDocument = { ...saved.document, status: "posted", items: postedItems, movementIds, postedAt: now, updatedAt: now };
  const documents = saved.documents.map((item) => item.id === posted.id ? posted : item);
  return { ok: true, idempotent: false, document: posted, documents, assortment: parts.root, stockMovements: [...movements, ...(array(input.stockMovements) as StockMovement[])].slice(0, 20_000), warnings };
}

export function deleteWriteOffDraft(input: { documents: unknown[]; venueId: number; id: string }):
  | { ok: true; deleted: boolean; documents: WriteOffDocument[]; document?: WriteOffDocument }
  | { ok: false; code: WriteOffFailureCode; error: string } {
  const documents = writeOffDocuments(input.documents, input.venueId);
  const existing = documents.find((item) => item.id === input.id);
  if (!existing) return { ok: true, deleted: false, documents };
  if (existing.status !== "draft" || existing.movementIds.length) return { ok: false, code: "WRITE_OFF_READ_ONLY", error: "Проведённое списание нельзя удалить" };
  return { ok: true, deleted: true, document: existing, documents: documents.filter((item) => item.id !== input.id) };
}

export function cancelPostedWriteOff(input: {
  documents: unknown[];
  assortment: unknown;
  stockMovements: unknown[];
  venueId: number;
  id: string;
  actor: { accountId: number; name: string; role: string };
  now?: string;
}):
  | { ok: true; idempotent: boolean; document: WriteOffDocument; documents: WriteOffDocument[]; assortment: JsonRecord; stockMovements: StockMovement[] }
  | { ok: false; code: WriteOffFailureCode; error: string } {
  const documents = writeOffDocuments(input.documents, input.venueId);
  const existing = documents.find((item) => item.id === input.id);
  if (!existing) return { ok: false, code: "WRITE_OFF_NOT_FOUND", error: "Списание не найдено" };
  if (existing.status === "cancelled") return { ok: true, idempotent: true, document: existing, documents, assortment: record(input.assortment), stockMovements: array(input.stockMovements) as StockMovement[] };
  if (existing.status !== "posted") return { ok: false, code: "WRITE_OFF_READ_ONLY", error: "Отменить проведение можно только у проведённого списания" };
  const now = input.now ?? new Date().toISOString();
  const parts = assortmentParts(input.assortment);
  const byKey = new Map(parts.balances.map((balance) => [productKey(balance), balance]));
  const reversals: StockMovement[] = [];
  for (const item of existing.items) {
    const balance = byKey.get(item.productKey);
    if (!balance) return { ok: false, code: "WRITE_OFF_PRODUCT_NOT_FOUND", error: `Нельзя отменить: «${item.productName}» отсутствует в номенклатуре` };
    const current = number(balance.current);
    const nextCurrent = rounded(current + item.baseQuantity);
    const currentValue = Math.max(0, number(balance.inventoryValue));
    balance.current = nextCurrent;
    if (item.totalCost !== null) {
      const nextValue = money(currentValue + item.totalCost);
      balance.inventoryValue = nextValue;
      balance.averageUnitCost = nextCurrent > 0 ? rounded(nextValue / nextCurrent, 6) : number(balance.averageUnitCost);
    } else balance.costNeedsReview = true;
    balance.lastWriteOffReversalAt = now;
    balance.updatedAt = now;
    reversals.push({
      id: crypto.randomUUID(), venueId: input.venueId, type: "return", date: now.slice(0, 10), productKey: item.productKey,
      productName: item.productName, amount: item.baseQuantity, unit: item.baseUnit,
      costAmount: item.totalCost ?? undefined, currency: item.currency,
      sourceDocumentId: existing.id, sourceLineId: `reversal:${item.id}`, createdAt: now, status: "active",
    });
  }
  parts.root.updatedAt = now;
  const cancelled: WriteOffDocument = {
    ...existing, status: "cancelled", cancelledAt: now, cancelledBy: input.actor,
    reversalMovementIds: reversals.map((item) => item.id), updatedAt: now,
  };
  return {
    ok: true, idempotent: false, document: cancelled,
    documents: documents.map((item) => item.id === existing.id ? cancelled : item),
    assortment: parts.root,
    stockMovements: [...reversals, ...(array(input.stockMovements) as StockMovement[])].slice(0, 20_000),
  };
}
