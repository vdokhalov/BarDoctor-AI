export function GET(request: Request): Response {
  return Response.redirect(new URL("/catalog", request.url), 307);
}
