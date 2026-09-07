type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function rows(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function identity(value: JsonRecord): string {
  return String(value.key ?? value.productKey ?? value.nomenclatureItemId ?? value.id ?? "").trim();
}

function quantity(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type DirectBalanceMutation = {
  productKey: string;
  before: number;
  after: number;
};

export function directBalanceMutations(beforeValue: unknown, afterValue: unknown): DirectBalanceMutation[] {
  const before = new Map(rows(record(beforeValue).stockBalances).map((row) => [identity(row), row]));
  const after = new Map(rows(record(afterValue).stockBalances).map((row) => [identity(row), row]));
  const keys = new Set([...before.keys(), ...after.keys()]);
  const issues: DirectBalanceMutation[] = [];
  for (const productKey of keys) {
    if (!productKey) continue;
    const previous = quantity(before.get(productKey)?.current);
    const next = quantity(after.get(productKey)?.current);
    if (previous !== next) issues.push({ productKey, before: previous, after: next });
  }
  return issues;
}
