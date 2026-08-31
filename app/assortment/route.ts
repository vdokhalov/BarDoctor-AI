export function GET(request: Request): Response {
  const url = new URL(request.url);
  url.pathname = "/catalog";
  return Response.redirect(url, 307);
}
