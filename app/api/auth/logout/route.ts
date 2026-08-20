import {
  authenticateIdentityRequest,
  clearSessionCookie,
  revokeAuthenticatedSession,
  unauthorized,
} from "../../../../lib/bardoctor/auth";

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  await revokeAuthenticatedSession(request, account.id);
  return Response.json(
    { ok: true },
    { headers: { "cache-control": "no-store", "set-cookie": clearSessionCookie(request) } },
  );
}
