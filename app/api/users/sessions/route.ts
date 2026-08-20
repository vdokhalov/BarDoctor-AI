import {
  activeSessionsForAccount,
  authenticateIdentityRequest,
  revokeOtherAuthenticatedSessions,
  unauthorized,
} from "../../../../lib/bardoctor/auth";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  const activeSessions = await activeSessionsForAccount(request, account.id);
  if (!activeSessions) return unauthorized();
  return Response.json(
    { ok: true, sessions: activeSessions },
    { headers: noStoreHeaders },
  );
}

export async function DELETE(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  const revoked = await revokeOtherAuthenticatedSessions(request, account.id);
  if (!revoked) return unauthorized();
  const activeSessions = await activeSessionsForAccount(request, account.id);
  return Response.json(
    { ok: true, sessions: activeSessions ?? [] },
    { headers: noStoreHeaders },
  );
}
