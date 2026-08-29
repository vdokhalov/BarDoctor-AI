import {
  accountingMoneyFields,
  lockAccountingMoney,
  resolveAccountingMoney,
  roundMoney,
  type AccountingMoney,
} from "./accounting-money";
import type { AccountingCurrency } from "./currency";

export const PURCHASE_STORE_KEY = "bd_purchase_documents";
export const SUPPLIER_STORE_KEY = "bd_suppliers";
export const EXPENSE_STORE_KEY = "bd_finance_expenses";

export const PURCHASE_EXPENSE_CATEGORIES = new Set([
  "products",
  "alcohol",
  "food",
  "consumables",
  "hookah",
  "household",
  "equipment",
  "repairs",
  "marketing",
  "other",
]);

export const PURCHASE_STOCK_CATEGORIES = new Set([
  "products",
  "alcohol",
  "food",
  "consumables",
  "hookah",
  "household",
]);

export const PURCHASE_PACKAGE_PRESETS = [
  "1 шт.", "10 шт.", "12 шт.", "20 шт.", "24 шт.",
  "1 уп.", "1 пачка", "1 коробка", "1 усл.",
  "50 мл", "100 мл", "200 мл", "250 мл", "330 мл", "500 мл", "700 мл", "750 мл",
  "0,25 л", "0,33 л", "0,5 л", "0,7 л", "0,75 л", "0,9 л", "1 л", "1,5 л", "2 л", "5 л", "10 л", "20 л",
  "50 г", "100 г", "200 г", "250 г", "400 г", "500 г", "1 кг", "2 кг", "5 кг", "10 кг", "25 кг",
] as const;

function canonicalPackageSize(value: unknown): string {
  const current = text(value, "", 80);
  return /^(?:1\s*)?шт\.?$/i.test(current) ? "1 шт." : current;
}

export function inferPurchasePackageSize(
  nameValue: unknown,
  packageSizeValue?: unknown,
  unitValue?: unknown,
): string {
  const current = canonicalPackageSize(packageSizeValue || unitValue);
  if (current && current !== "1 шт.") return current;
  const name = text(nameValue, "", 240).toLocaleLowerCase("ru").replace(/ё/g, "е");
  if (/реклам|smm|продвиж|таргет|маркетинг|ремонт|монтаж|установк|настройк|обслуживан|диагност|аренд|коммунал|доставк|перевоз|обучен|консультац|подписк|лицензи|услуг/.test(name)) return "1 усл.";
  if (/молок|кефир|ряженк|айран|питьев.*йогурт/.test(name)) return "1 л";
  if (/мука|сахар|рис|гречк|крупа|соль\b/.test(name)) return "1 кг";
  return current || "1 шт.";
}

export function purchaseUnitForPackage(packageSizeValue: unknown): string {
  const value = text(packageSizeValue, "1 шт.", 80).toLocaleLowerCase("ru");
  if (/мл/.test(value)) return "мл";
  if (/(?:^|\s)л(?:\s|\.|$)|литр/.test(value)) return "л";
  if (/кг/.test(value)) return "кг";
  if (/(?:^|\s)г(?:\s|\.|$)|грамм/.test(value)) return "г";
  if (/усл/.test(value)) return "усл.";
  return "шт.";
}

export type PurchaseDocumentType = "receipt" | "invoice" | "price_list";

export type PurchaseItem = {
  id: string;
  purchaseProductKey?: string;
  nomenclatureId?: string;
  nomenclatureName?: string;
  rawName?: string;
  normalizedRawName?: string;
  name: string;
  brand?: string;
  quantity: number;
  unit: string;
  quantityMode?: "count" | "measure";
  packageSize?: string;
  unitPrice: number;
  lineTotal: number;
  originalLineTotal?: number;
  originalCurrency?: string;
  accountingLineTotal?: number;
  accountingCurrency?: string;
  category: string;
  confidence: number;
  confidenceLevel?: "high" | "medium" | "low";
  mappingSource?: "history" | "exact_alias" | "fuzzy" | "ai" | "manual";
  mappingCandidates?: Array<{ id: string; key: string; name: string; score: number }>;
  requiresReview?: boolean;
};

export type PurchaseDocument = {
  id: string;
  internalId?: string;
  externalId?: string;
  externalSystem?: string;
  sourceType?: "manual" | "scan" | "file_import" | "1c" | "iiko" | "poster" | "rkeeper" | "api" | "local_connector";
  venueId?: number;
  externalUpdatedAt?: string;
  syncStatus?: "pending" | "syncing" | "success" | "partial" | "failed";
  documentType: PurchaseDocumentType;
  supplierId?: string;
  supplierExternalId?: string;
  supplierName: string;
  supplierType: "retail" | "wholesale";
  date: string;
  documentNumber?: string;
  warehouseExternalId?: string;
  externalStatus?: string;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  accountingAmount?: number;
  accountingCurrency?: string;
  fxRate?: number;
  fxRateDirection?: "source_to_accounting";
  fxEffectiveDate?: string;
  fxSource?: string;
  fxLockedAt?: string;
  accountingMoneyStatus?: "same_currency" | "converted" | "unresolved";
  paymentMethod: "cash" | "card" | "transfer" | "unknown";
  expenseCategory: string;
  total: number;
  vat?: number;
  items: PurchaseItem[];
  confidence: number;
  warnings: string[];
  sourceFileId?: string;
  sourceFileIds?: string[];
  sourceFileName?: string;
  sourceFileNames?: string[];
  sourceFileType?: string;
  sourceFileTypes?: string[];
  pageCount?: number;
  sourceUrl?: string;
  source: "camera" | "gallery" | "upload" | "manual";
  sourceLabel?: string;
  status?: "draft" | "confirmed" | "cancelled";
  paymentStatus?: "unpaid" | "partial" | "paid" | "not_applicable";
  paidAmount?: number;
  balanceDue?: number;
  paymentIds?: string[];
  overpaidAmount?: number;
  idempotencyKey?: string;
  ledgerVersion?: number;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdByAccountId?: number;
  updatedByAccountId?: number;
  cancelledByAccountId?: number;
};

export type PurchaseExpense = Record<string, unknown> & {
  id: string;
  sourceDocumentId: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function findPurchaseExpense(
  expenses: unknown[],
  documentId: string,
): PurchaseExpense | null {
  const targetId = String(documentId ?? "").trim();
  if (!targetId) return null;
  for (const value of expenses) {
    const expense = record(value);
    if (String(expense.sourceDocumentId ?? "") !== targetId) continue;
    const id = String(expense.id ?? "").trim();
    if (!id) continue;
    return expense as PurchaseExpense;
  }
  return null;
}

export const PURCHASE_LEDGER_VERSION = 2;

export type PurchasePaymentSummary = {
  paymentStatus: "unpaid" | "partial" | "paid" | "not_applicable";
  paidAmount: number;
  balanceDue: number;
  paymentIds: string[];
  overpaidAmount: number;
  accountingCurrency?: string;
  conversionComplete?: boolean;
  unconvertedPaymentIds?: string[];
};

export type SupplierDebtDocument = {
  id: string;
  supplierId: string | null;
  supplierName: string;
  documentNumber: string | null;
  date: string;
  currency: string;
  total: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: "unpaid" | "partial";
};

export type SupplierDebtSupplier = {
  supplierKey: string;
  supplierId: string | null;
  supplierName: string;
  currency: string;
  purchaseAmount: number;
  paidAmount: number;
  balanceDue: number;
  openDocumentCount: number;
  documents: SupplierDebtDocument[];
};

export type SupplierDebtSummary = {
  totalOutstanding: number;
  openDocumentCount: number;
  suppliers: SupplierDebtSupplier[];
};

export type PurchaseLedgerMigration = {
  documents: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  changed: boolean;
  summary: {
    canonicalDocuments: number;
    exactLinkedPayments: number;
    legacyUnlinkedExpenses: number;
  };
};

function money(value: unknown): number {
  return Math.round(Math.max(0, number(value, 0)) * 100) / 100;
}

function stringIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => text(item, "", 100)).filter(Boolean))]
    : [];
}

export function isPurchasePayment(value: unknown, documentId?: string): boolean {
  const payment = record(value);
  const linkedId = text(payment.sourceDocumentId ?? payment.purchaseId, "", 100);
  if (!linkedId || (documentId && linkedId !== documentId)) return false;
  if (payment.status === "voided" || payment.reversedAt) return false;
  return payment.source === "purchase_payment"
    || payment.paymentKind === "supplier_payment"
    || payment.source === "purchase_document";
}

export function purchasePaymentSummary(
  purchase: unknown,
  expenses: unknown[],
  accountingCurrencyValue?: unknown,
): PurchasePaymentSummary {
  const document = record(purchase);
  if (document.documentType === "price_list") {
    return {
      paymentStatus: "not_applicable",
      paidAmount: 0,
      balanceDue: 0,
      paymentIds: [],
      overpaidAmount: 0,
    };
  }
  const documentId = text(document.id, "", 100);
  const venueId = number(document.venueId, 0);
  const payments = expenses
    .map(record)
    .filter((payment) => {
      if (!isPurchasePayment(payment, documentId)) return false;
      const paymentVenueId = number(payment.venueId, 0);
      return !venueId || !paymentVenueId || paymentVenueId === venueId;
    });
  const accountingCurrency = String(
    accountingCurrencyValue ?? document.accountingCurrency ?? "",
  ).trim().toUpperCase();
  const documentMoney = accountingCurrency
    ? resolveAccountingMoney({ value: document, accountingCurrency })
    : null;
  const total = documentMoney?.accountingAmount ?? money(document.total);
  const resolvedPayments = payments.map((payment) => ({
    payment,
    money: accountingCurrency ? resolveAccountingMoney({ value: payment, accountingCurrency }) : null,
  }));
  const unconvertedPaymentIds = resolvedPayments
    .filter(({ money: resolved }) => accountingCurrency && resolved?.accountingAmount == null)
    .map(({ payment }) => text(payment.id, "", 100))
    .filter(Boolean);
  const paidAmount = roundMoney(resolvedPayments.reduce((sum, entry) =>
    sum + (entry.money?.accountingAmount ?? (accountingCurrency ? 0 : money(entry.payment.amount))), 0));
  const balanceDue = Math.round(Math.max(0, total - paidAmount) * 100) / 100;
  const overpaidAmount = Math.round(Math.max(0, paidAmount - total) * 100) / 100;
  const summary: PurchasePaymentSummary = {
    paymentStatus: paidAmount <= 0
      ? "unpaid"
      : paidAmount + 0.005 >= total
        ? "paid"
        : "partial",
    paidAmount,
    balanceDue,
    paymentIds: payments.map((payment) => text(payment.id, "", 100)).filter(Boolean),
    overpaidAmount,
  };
  if (accountingCurrency) {
    summary.accountingCurrency = accountingCurrency;
    summary.conversionComplete = documentMoney?.accountingAmount != null
      && unconvertedPaymentIds.length === 0;
    summary.unconvertedPaymentIds = unconvertedPaymentIds;
  }
  return summary;
}

export type PurchaseAccountingNormalization = {
  ok: boolean;
  document: PurchaseDocument;
  money: AccountingMoney | null;
  code?: "ACCOUNTING_CURRENCY_REQUIRED" | "PURCHASE_ACCOUNTING_CONVERSION_REQUIRED";
};

/** Locks a purchase's source and accounting money before any financial or stock posting. */
export function normalizePurchaseAccounting(input: {
  document: PurchaseDocument;
  accountingCurrency: AccountingCurrency | null;
  now: string;
}): PurchaseAccountingNormalization {
  if (!input.accountingCurrency) {
    return { ok: false, document: input.document, money: null, code: "ACCOUNTING_CURRENCY_REQUIRED" };
  }
  const moneyValue = lockAccountingMoney({
    value: input.document,
    accountingCurrency: input.accountingCurrency,
    now: input.now,
  });
  if (!moneyValue || moneyValue.accountingAmount == null) {
    return {
      ok: false,
      document: input.document,
      money: moneyValue,
      code: "PURCHASE_ACCOUNTING_CONVERSION_REQUIRED",
    };
  }
  const effectiveRate = moneyValue.status === "same_currency"
    ? 1
    : moneyValue.fxRate
      ?? (moneyValue.originalAmount > 0 ? moneyValue.accountingAmount / moneyValue.originalAmount : 0);
  if (!(effectiveRate > 0)) {
    return {
      ok: false,
      document: input.document,
      money: { ...moneyValue, accountingAmount: null, status: "unresolved", reason: "missing_historical_fx" },
      code: "PURCHASE_ACCOUNTING_CONVERSION_REQUIRED",
    };
  }
  const items = input.document.items.map((item) => ({
    ...item,
    originalLineTotal: roundMoney(item.lineTotal),
    originalCurrency: moneyValue.originalCurrency,
    accountingLineTotal: roundMoney(item.lineTotal * effectiveRate),
    accountingCurrency: moneyValue.accountingCurrency,
  }));
  const lineAccountingTotal = roundMoney(items.reduce((sum, item) => sum + (item.accountingLineTotal ?? 0), 0));
  const canonicalMoney = {
    ...moneyValue,
    // Sum rounded line values for ledger/valuation consistency. The source total remains immutable.
    accountingAmount: lineAccountingTotal || moneyValue.accountingAmount,
  };
  return {
    ok: true,
    money: canonicalMoney,
    document: {
      ...input.document,
      ...accountingMoneyFields(canonicalMoney),
      items,
    } as PurchaseDocument,
  };
}

/**
 * A read-only management view over canonical purchases and linked payments.
 * It deliberately creates no settlement entity and never treats an amount-only
 * legacy expense as supplier debt without an explicit purchase relationship.
 */
export function supplierDebtSummary(
  documents: unknown[],
  expenses: unknown[],
  venueId?: number,
  accountingCurrency?: unknown,
): SupplierDebtSummary {
  const grouped = new Map<string, SupplierDebtSupplier>();
  for (const value of documents) {
    const document = record(value);
    const documentVenueId = number(document.venueId, 0);
    if (venueId && documentVenueId && documentVenueId !== venueId) continue;
    if (document.status !== "confirmed" || document.documentType === "price_list") continue;
    const id = text(document.id, "", 100);
    if (!id) continue;
    const summary = purchasePaymentSummary(document, expenses, accountingCurrency);
    const supplierId = text(document.supplierId, "", 100) || null;
    const supplierName = text(document.supplierName, "Поставщик", 180);
    const supplierKey = supplierId || supplierName.toLocaleLowerCase("ru");
    const resolved = accountingCurrency
      ? resolveAccountingMoney({ value: document, accountingCurrency })
      : null;
    if (accountingCurrency && resolved?.accountingAmount == null) continue;
    const total = resolved?.accountingAmount ?? money(document.total);
    const paidAmount = Math.min(total, summary.paidAmount);
    const currency = accountingCurrency
      ? text(accountingCurrency, "", 16).toUpperCase()
      : text(document.currency, "RUB", 12).toUpperCase();
    const debtDocument: SupplierDebtDocument = {
      id,
      supplierId,
      supplierName,
      documentNumber: text(document.documentNumber, "", 100) || null,
      date: text(document.date, "", 10),
      currency,
      total,
      paidAmount,
      balanceDue: summary.balanceDue,
      paymentStatus: summary.paymentStatus === "partial" ? "partial" : "unpaid",
    };
    const current = grouped.get(supplierKey) ?? {
      supplierKey,
      supplierId,
      supplierName,
      currency,
      purchaseAmount: 0,
      paidAmount: 0,
      balanceDue: 0,
      openDocumentCount: 0,
      documents: [],
    };
    current.purchaseAmount = money(current.purchaseAmount + total);
    current.paidAmount = money(current.paidAmount + paidAmount);
    current.balanceDue = money(current.balanceDue + summary.balanceDue);
    if (summary.balanceDue > 0.005) {
      current.openDocumentCount += 1;
      current.documents.push(debtDocument);
    }
    grouped.set(supplierKey, current);
  }

  const suppliers = [...grouped.values()]
    .map((supplier) => ({
      ...supplier,
      documents: supplier.documents.sort((left, right) =>
        right.date.localeCompare(left.date) || right.id.localeCompare(left.id)
      ),
    }))
    .sort((left, right) =>
      right.balanceDue - left.balanceDue
      || left.supplierName.localeCompare(right.supplierName, "ru")
    );
  return {
    totalOutstanding: money(suppliers.reduce((sum, supplier) => sum + supplier.balanceDue, 0)),
    openDocumentCount: suppliers.reduce((sum, supplier) => sum + supplier.openDocumentCount, 0),
    suppliers,
  };
}

export function withPurchasePaymentSummary<T extends Record<string, unknown>>(
  purchase: T,
  expenses: unknown[],
  accountingCurrency?: unknown,
): T & Pur