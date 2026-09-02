import { getD1 } from "../../../db";
import { recordException, requestIdFor, withRequestId } from "../../../lib/bardoctor/observability";
import { checkDatabaseReadiness } from "../../../lib/bardoctor/readiness";
import { getBarDoctorReleaseIdentity } from "../../../lib/bardoctor/release-identity";
import { runtimeEnv } from "../../../lib/bardoctor/runtime-env";

export async function GET(request: Request): Promise<Response> {
  const startedAt = performance.now();
  const requestId = requestIdFor(request);
  let readinessError: unknown = null;
  let database: Awaited<ReturnType<typeof checkDatabaseReadiness>>;
  try {
    database = await checkDatabaseReadiness(getD1());
  } catch (error) {
    readinessError = error;
    database = { ok: false, latencyMs: 0, reason: "query_failed" };
  }
  if (!database.ok) {
    recordException({
      requestId,
      endpoint: "/api/healthz",
      category: `readiness_${database.reason}`,
      error: readinessError ?? new Error("Required database dependency is unavailable"),
      startedAt,
    });
  }
  return withRequestId(Response.json({
    status: database.ok ? "ready" : "not_ready",
    checks: {
      runtime: { ok: true },
      database,
      externalServices: { requiredForCoreTraffic: false, status: "degraded_allowed" },
    },
    storage: "sites-d1",
    release: getBarDoctorReleaseIdentity(
      runtimeEnv("BARDOCTOR_ENVIRONMENT") || "unconfigured",
    ),
  }, {
    status: database.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  }), requestId);
}
