type RouteContext = { params: Promise<{ path: string[] }> };

async function notFound(_request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  return Response.json(
    {
      ok: false,
      success: false,
      error: `Локальный API /api/${path.join("/")} не найден`,
    },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;
export const HEAD = notFound;
