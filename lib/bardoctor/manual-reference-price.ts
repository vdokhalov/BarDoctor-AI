/** Manual catalogue estimates are metadata, never confirmed receipt cost. */
export function manualReferencePrice(value: unknown, currency: string | null | undefined, capturedAt: string) {
  if (value === undefined || value === null || value === "") return { ok: true as const, fields: {} };
  if ((typeof value !== "number" && typeof value !== "string") || !String(value).trim()) {
    return { ok: false as const, error: "Укажите корректную справочную цену или оставьте поле пустым." };
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e12 || !currency) {
    return { ok: false as const, error: "Справочная цена требует неотрицательного значения и валюты заведения." };
  }
  return { ok: true as const, fields: { manualReferencePrice: { amount, currency, capturedAt, source: "manual_catalogue" as const } } };
}
