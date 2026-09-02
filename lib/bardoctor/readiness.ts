export type ReadinessDatabase = {
  prepare(sql: string): { first(): Promise<unknown> };
};

export async function checkDatabaseReadiness(
  database: ReadinessDatabase,
  timeoutMs = 1_500,
): Promise<{ ok: true; latencyMs: number } | { ok: false; latencyMs: number; reason: "query_failed" | "timeout" }> {
  const startedAt = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      database.prepare("SELECT 1 AS ok").first(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("READINESS_TIMEOUT")), timeoutMs);
      }),
    ]);
    const row = result && typeof result === "object" ? result as { ok?: unknown } : null;
    if (Number(row?.ok) !== 1) throw new Error("READINESS_QUERY_FAILED");
    return { ok: true, latencyMs: Math.max(0, Math.round(performance.now() - startedAt)) };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      reason: error instanceof Error && error.message === "READINESS_TIMEOUT" ? "timeout" : "query_failed",
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
