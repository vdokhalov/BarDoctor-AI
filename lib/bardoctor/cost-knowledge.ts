export type CostKnowledgeStatus = "UNKNOWN" | "KNOWN_ZERO" | "KNOWN";

export function costKnowledge(value: unknown, status?: unknown, needsReview?: unknown): {
  known: boolean;
  value: number;
  status: CostKnowledgeStatus;
} {
  const explicitStatus = String(status ?? "").toUpperCase();
  const parsed = value == null || (typeof value === "string" && !value.trim()) ? Number.NaN : Number(value);
  if (needsReview === true || explicitStatus === "UNKNOWN" || !Number.isFinite(parsed) || parsed < 0) {
    return { known: false, value: 0, status: "UNKNOWN" };
  }
  if (explicitStatus === "KNOWN_ZERO") {
    return parsed === 0
      ? { known: true, value: 0, status: "KNOWN_ZERO" }
      : { known: true, value: parsed, status: "KNOWN" };
  }
  if (explicitStatus === "KNOWN") {
    return { known: true, value: parsed, status: parsed === 0 ? "KNOWN_ZERO" : "KNOWN" };
  }
  // Legacy positive values have usable provenance; legacy zero values do not.
  return parsed > 0
    ? { known: true, value: parsed, status: "KNOWN" }
    : { known: false, value: 0, status: "UNKNOWN" };
}

export function explicitCostStatus(input: Record<string, unknown>): CostKnowledgeStatus {
  const requested = String(input.costStatus ?? "").toUpperCase();
  const values = ["lineTotal", "total", "unitPrice", "price"]
    .filter((key) => Object.prototype.hasOwnProperty.call(input, key))
    .map((key) => input[key])
    .filter((value) => value != null && !(typeof value === "string" && !value.trim()))
    .map(Number)
    .filter(Number.isFinite);
  if (requested === "UNKNOWN") return "UNKNOWN";
  if (!values.length) return "UNKNOWN";
  return values.some((value) => value > 0) ? "KNOWN" : "KNOWN_ZERO";
}
