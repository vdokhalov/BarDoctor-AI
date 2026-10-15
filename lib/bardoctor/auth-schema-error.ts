export class AuthSchemaUnavailable extends Error {
  readonly code = "AUTH_SCHEMA_UNAVAILABLE";
  constructor(readonly reason: "timeout" | "aborted" | "incompatible_or_unavailable") {
    super("Authentication schema verification unavailable");
    this.name = reason === "timeout" ? "TimeoutError" : reason === "aborted" ? "AbortError" : "Error";
  }
}

export function authSchemaFailureResponse(error: unknown): Response | null {
  if (!(error instanceof AuthSchemaUnavailable)) return null;
  return Response.json({ ok: false, code: error.code,
    error: "Не удалось завершить вход. Попробуйте ещё раз." }, {
    status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" },
  });
}
