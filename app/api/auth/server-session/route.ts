export async function POST(): Promise<Response> {
  return Response.json(
    { ok: false, code: "LEGACY_SESSION_EXCHANGE_REMOVED", error: "Войдите в BarDoctor снова" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
