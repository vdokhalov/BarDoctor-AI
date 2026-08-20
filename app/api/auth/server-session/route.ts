import {
  authResult,
  sessionResponse,
  synchronizeServerSession,
  unauthorized,
} from "../../../../lib/bardoctor/auth";

export async function POST(request: Request): Promise<Response> {
  const session = await synchronizeServerSession(request);
  if (!session) return unauthorized();
  return sessionResponse(
    await authResult(session.account, session.token, request),
    session.token,
    request,
  );
}
