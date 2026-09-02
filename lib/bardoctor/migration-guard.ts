import { runtimeEnv } from "./runtime-env";

export function migrationOperationsEnabled(): boolean {
  return runtimeEnv("BARDOCTOR_MIGRATION_OPERATIONS_ENABLED") === "true";
}

export function migrationOperationsUnavailable(): Response {
  return Response.json(
    { ok: false, code: "NOT_FOUND" },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export function migrationIntentAccepted(request: Request, expectedIntent: string): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin
      && request.headers.get("x-migration-intent") === expectedIntent;
  } catch {
    return false;
  }
}
