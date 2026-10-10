/** Whole-check discount rules and immutable, cent-accurate application snapshots. */
export const POS_DISCOUNT_STORE_KEY = "bd_pos_discounts_v1";
export type PosDiscountActor = { accountId: number; name: string; role: string; jobTitle?: string };
export type PosDiscountKind = "PERCENT" | "FIXED";
export type PosDiscountRule = {
  id: string; venueId: number; name: string; kind: PosDiscountKind; value: number; currency: string; active: boolean; revision: number;
  createdAt: string; updatedAt: string; createdBy: PosDiscountActor; updatedBy: PosDiscountActor;
  operations: { id: string; fingerprint: string; at: string; actor: PosDiscountActor }[];
};
export type PosDiscountTotals = { grossAmount: number; discountAmount: number; netAmount: number; currency: string };
export type PosDiscountAllocation = { lineId: string; grossAmount: number; discountAmount: number; netAmount: number };
export type PosDiscountSnapshot = PosDiscountTotals & {
  ruleId: string; ruleRevision: number; venueId: number; name: string; kind: PosDiscountKind; value: number;
  appliedAt: string; appliedBy: PosDiscountActor; reason: string; lines: PosDiscountAllocation[];
};
export type PosDiscountContext = { venueId: number; currency: string; now: string; actor: PosDiscountActor };
export type PosDiscountRuleCommand = { action: "save"; operationId: string; ruleId: string; expectedRevision: number; rule: { name: string; kind: PosDiscountKind; value: number; active: boolean } };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const id = (value: unknown): value is string => typeof value === "string" && value === value.trim() && value.length > 0 && value.length <= 120;
const instant = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const actor = (value: unknown): value is PosDiscountActor => record(value) && Number.isSafeInteger(value.accountId) && Number(value.accountId) > 0 && typeof value.name === "string" && typeof value.role === "string";
function fail(code: string): never { throw new Error("POS_DISCOUNT_" + code); }
export function canConfigurePosDiscounts(value: { role: string }): boolean { return value.role === "owner" || value.role === "manager"; }
export function canApplyPosDiscounts(value: { role: string }): boolean { return canConfigurePosDiscounts(value) || value.role === "shift_manager"; }
export function posDiscountCents(value: unknown): number {
  if (typeof value !== "number" || value < 0 || !Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100))
    || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) fail("AMOUNT_INVALID");
  return Math.round(value * 100);
}
function ruleValue(kind: unknown, value: unknown): void {
  if (!["PERCENT", "FIXED"].includes(String(kind))) fail("RULE_INVALID");
  const cents = posDiscountCents(value);
  if (kind === "PERCENT" && cents > 10_000) fail("PERCENT_INVALID");
}
function context(c: PosDiscountContext) {
  if (!Number.isSafeInteger(c.venueId) || c.venueId <= 0 || !id(c.currency) || !actor(c.actor) || !instant(c.now)) fail("CONTEXT_INVALID");
}
export function parsePosDiscountRules(value: unknown): PosDiscountRule[] {
  if (value == null) return [];
  if (!Array.isArray(value)) fail("STORE_NEEDS_REVIEW");
  const ids = new Set<string>(), operations = new Set<string>();
  for (const rule of value) {
    if (!record(rule) || !id(rule.id) || ids.has(rule.id) || !Number.isSafeInteger(rule.venueId) || Number(rule.venueId) <= 0
      || !id(rule.name) || !id(rule.currency) || typeof rule.active !== "boolean" || !Number.isSafeInteger(rule.revision) || Number(rule.revision) < 1
      || !instant(rule.createdAt) || !instant(rule.updatedAt) || !actor(rule.createdBy) || !actor(rule.updatedBy)
      || !canConfigurePosDiscounts(rule.createdBy) || !canConfigurePosDiscounts(rule.updatedBy) || !Array.isArray(rule.operations) || !rule.operations.length) fail("STORE_NEEDS_REVIEW");
    ruleValue(rule.kind, rule.value); ids.add(rule.id);
    for (const operation of rule.operations) {
      if (!record(operation) || !id(operation.id) || operations.has(operation.id) || typeof operation.fingerprint !== "string"
        || !instant(operation.at) || !actor(operation.actor) || !canConfigurePosDiscounts(operation.actor)) fail("STORE_NEEDS_REVIEW");
      operations.add(operation.id);
    }
  }
  return value as PosDiscountRule[];
}
export async function planPosDiscountRule(c: PosDiscountContext, values: PosDiscountRule[], command: PosDiscountRuleCommand) {
  context(c);
  if (!canConfigurePosDiscounts(c.actor)) fail("CONFIG_ACCESS_DENIED");
  const rules = parsePosDiscountRules(values);
  if (!record(command) || command.action !== "save" || !id(command.operationId) || !id(command.ruleId)
    || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0 || !record(command.rule)
    || typeof command.rule.name !== "string" || !id(command.rule.name.trim()) || typeof command.rule.active !== "boolean") fail("COMMAND_INVALID");
  ruleValue(command.rule.kind, command.rule.value);
  const normalized = { operationId: command.operationId, ruleId: command.ruleId, expectedRevision: command.expectedRevision,
    name: command.rule.name.trim(), kind: command.rule.kind, value: command.rule.value, active: command.rule.active, currency: c.currency };
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(normalized)));
  const fingerprint = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
  const seen = rules.find(rule => rule.operations.some(operation => operation.id === command.operationId));
  if (seen) {
    if (seen.id !== command.ruleId || seen.venueId !== c.venueId || seen.operations.find(operation => operation.id === command.operationId)!.fingerprint !== fingerprint) fail("IDEMPOTENCY_CONFLICT");
    return { rules, rule: seen, duplicate: true };
  }
  const existing = rules.find(rule => rule.id === command.ruleId);
  if (existing && existing.venueId !== c.venueId) fail("NOT_FOUND");
  if ((existing?.revision ?? 0) !== command.expectedRevision) fail("REVISION_CONFLICT");
  if (existing && existing.currency !== c.currency) fail("CURRENCY_CHANGED");
  const rule: PosDiscountRule = { id: command.ruleId, venueId: c.venueId, name: normalized.name, kind: normalized.kind, value: normalized.value,
    currency: c.currency, active: normalized.active, revision: (existing?.revision ?? 0) + 1,
    createdAt: existing?.createdAt ?? c.now, updatedAt: c.now, createdBy: existing?.createdBy ?? { ...c.actor }, updatedBy: { ...c.actor },
    operations: [...existing?.operations ?? [], { id: command.operationId, fingerprint, at: c.now, actor: { ...c.actor } }] };
  const next = existing ? rules.map(item => item === existing ? rule : item) : [...rules, rule];
  if (new TextEncoder().encode(JSON.stringify(next)).byteLength > 1_000_000) fail("CAPACITY_REQUIRES_REVIEW");
  return { rules: next, rule, duplicate: false };
}

/** Largest-remainder allocation is exact in integer cents and deterministic by stable line ID. */
export function allocatePosDiscount(lines: { lineId: string; grossAmount: number }[], kind: PosDiscountKind, value: number, currency: string): PosDiscountTotals & { lines: PosDiscountAllocation[] } {
  ruleValue(kind, value);
  if (!id(currency) || !Array.isArray(lines) || !lines.length || lines.length > 100 || lines.some(line => !record(line) || !id(line.lineId))
    || new Set(lines.map(line => line.lineId)).size !== lines.length) fail("LINES_INVALID");
  const weights = lines.map(line => posDiscountCents(line.grossAmount));
  const gross = weights.reduce((sum, cents) => { if (!Number.isSafeInteger(sum + cents)) fail("AMOUNT_INVALID"); return sum + cents; }, 0);
  const discount = kind === "FIXED" ? posDiscountCents(value) : Number((BigInt(gross) * BigInt(posDiscountCents(value)) + BigInt(5000)) / BigInt(10000));
  if (discount > gross) fail("EXCEEDS_GROSS");
  const allocated = weights.map(weight => gross === 0 ? 0 : Number(BigInt(discount) * BigInt(weight) / BigInt(gross)));
  const remainders = weights.map((weight, index) => ({ index, lineId: lines[index].lineId, remainder: gross === 0 ? BigInt(0) : BigInt(discount) * BigInt(weight) % BigInt(gross) }));
  remainders.sort((a, b) => a.remainder === b.remainder ? a.lineId < b.lineId ? -1 : a.lineId > b.lineId ? 1 : 0 : a.remainder > b.remainder ? -1 : 1);
  const leftover = discount - allocated.reduce((sum, cents) => sum + cents, 0);
  for (let i = 0; i < leftover; i++) allocated[remainders[i].index]++;
  return { grossAmount: gross / 100, discountAmount: discount / 100, netAmount: (gross - discount) / 100, currency,
    lines: lines.map((line, index) => ({ lineId: line.lineId, grossAmount: weights[index] / 100, discountAmount: allocated[index] / 100, netAmount: (weights[index] - allocated[index]) / 100 })) };
}
export function capturePosDiscount(c: PosDiscountContext, rules: PosDiscountRule[], ruleId: string, ruleRevision: number, reason: string, lines: { lineId: string; grossAmount: number }[]): PosDiscountSnapshot {
  context(c);
  if (!canApplyPosDiscounts(c.actor)) fail("APPLY_ACCESS_DENIED");
  if (!id(ruleId) || !Number.isSafeInteger(ruleRevision) || ruleRevision < 1 || typeof reason !== "string" || !reason.trim() || reason.length > 500) fail("COMMAND_INVALID");
  const matches = parsePosDiscountRules(rules).filter(rule => rule.id === ruleId && rule.venueId === c.venueId);
  if (matches.length !== 1) fail("NOT_FOUND");
  const rule = matches[0];
  if (rule.revision !== ruleRevision) fail("RULE_CHANGED");
  if (!rule.active) fail("INACTIVE");
  if (rule.currency !== c.currency) fail("CURRENCY_CHANGED");
  return { ruleId: rule.id, ruleRevision: rule.revision, venueId: c.venueId, name: rule.name, kind: rule.kind, value: rule.value,
    appliedAt: c.now, appliedBy: { ...c.actor }, reason: reason.trim(), ...allocatePosDiscount(lines, rule.kind, rule.value, c.currency) };
}
export function validatePosDiscountSnapshot(value: unknown): PosDiscountSnapshot {
  if (!record(value) || !id(value.ruleId) || !Number.isSafeInteger(value.ruleRevision) || Number(value.ruleRevision) < 1
    || !Number.isSafeInteger(value.venueId) || Number(value.venueId) < 1 || !id(value.name) || !id(value.currency)
    || !instant(value.appliedAt) || !actor(value.appliedBy) || !canApplyPosDiscounts(value.appliedBy)
    || typeof value.reason !== "string" || !value.reason.trim() || value.reason.length > 500 || !Array.isArray(value.lines)) fail("SNAPSHOT_INVALID");
  const allocation = allocatePosDiscount(value.lines as PosDiscountAllocation[], value.kind as PosDiscountKind, value.value as number, value.currency);
  for (const key of ["grossAmount", "discountAmount", "netAmount"] as const) if (posDiscountCents(value[key]) !== posDiscountCents(allocation[key])) fail("SNAPSHOT_INVALID");
  for (let index = 0; index < allocation.lines.length; index++) {
    const line = value.lines[index];
    if (!record(line) || posDiscountCents(line.discountAmount) !== posDiscountCents(allocation.lines[index].discountAmount)
      || posDiscountCents(line.netAmount) !== posDiscountCents(allocation.lines[index].netAmount)) fail("SNAPSHOT_INVALID");
  }
  return value as PosDiscountSnapshot;
}
export function posDiscountRuleView(rule: PosDiscountRule) {
  return { id: rule.id, venueId: rule.venueId, name: rule.name, kind: rule.kind, value: rule.value, currency: rule.currency, active: rule.active, revision: rule.revision };
}
