import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();

  return Response.json({
    ok: true,
    restaurant: account.restaurantJson ? JSON.parse(account.restaurantJson) : null,
  });
}
