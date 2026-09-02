export function GET(): Response {
  return Response.json({ status: "ok", storage: "sites-d1" });
}
