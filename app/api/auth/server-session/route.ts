import {
  authResult,
  sessionResponse,
  synchronizeServerSession,
  unauthorized,
} from "../../../../lib/bardoctor/auth";
import {
  authRateLimitedResponse,
  clearSuccessfulAuthLimit,
  consumeAuthRateLimit,
} from "../../../../lib/bardoctor/auth-rate-limit";

export async function POST(request: Request): Promise<Response> {
  const identifier = request.headers.get("x-session-email") ?? "anonymous";
  const rateLimit = await consumeAuthRateLimit(request, "session-exchange", identifier);
  if (!rateLimit.allowed) return authRateLimitedResponse(rateLimit);
  const session = await synchronizeServerSession(request);
  if (!session) return unauthorized();
  await clearSuccessfulAuthLimit(request, "session-exchange", identifier);
  return sessionResponse(
    await authResult(session.account, session.token, request),
    session.token,
    request,
  );
}
