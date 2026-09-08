import {
  authenticateIdentityRequest,
  authResult,
  issueSession,
  sessionResponse,
} from "../../../../lib/bardoctor/auth";
import { importLegacyAccount } from "../../../../lib/bardoctor/legacy-import";
import { observedAwait, observedBoundary } from "../../../../lib/bardoctor/request-observability";

export async function POST(request: Request): Promise<Response> {
  try {
    const existingSession = await authenticateIdentityRequest(request);
    const existingToken = request.headers.get("x-session-token");
    if (existingSession && existingToken) {
      return sessionResponse(
        await observedAwait("auth.result", () => authResult(existingSession, existingToken, request)),
        existingToken,
        request,
      );
    }

    const legacyEmail = request.headers.get("x-session-email");
    const legacyToken = request.headers.get("x-session-token");
    if (legacyEmail?.trim() && legacyToken) {
      try {
        const account = await observedAwait("auth.legacy_import", () => importLegacyAccount({
          request,
          email: legacyEmail,
          token: legacyToken,
        }));
        const token = await observedAwait("auth.issue_session", () => issueSession(account));
        return sessionResponse({
          ...(await observedAwait("auth.result", () => authResult(account, token, request))),
          migrated: true,
          migrationSummary: account.migrationSummaryJson
            ? JSON.parse(account.migrationSummaryJson)
            : null,
        }, token, request);
      } catch (error) {
        if (
          !(error instanceof Error)
          || !["LEGACY_AUTH_INVALID", "LEGACY_IDENTITY_MISMATCH"].includes(error.message)
        ) throw error;
      }
    }

    return Response.json(
      { ok: false, needsLogin: true, error: "Войдите один раз, чтобы завершить перенос из Replit" },
      { status: 401 },
    );
  } catch {
    observedBoundary();
    return Response.json(
      { ok: false, error: "Не удалось подготовить локальную сессию" },
      { status: 500 },
    );
  }
}
