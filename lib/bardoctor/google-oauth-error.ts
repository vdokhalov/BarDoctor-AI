export type GoogleOAuthErrorCode =
  | "invalid_client"
  | "redirect_uri_mismatch"
  | "access_denied"
  | "invalid_grant"
  | "exchange_failed";

const SAFE_MESSAGES: Record<GoogleOAuthErrorCode, string> = {
  invalid_client: "Google отклонил OAuth Client ID или Client Secret.",
  redirect_uri_mismatch: "Callback URL не совпадает с Authorized redirect URI в Google Cloud.",
  access_denied: "Доступ к Google Business Profile не был предоставлен.",
  invalid_grant: "Google authorization code истёк, уже использован или был отозван.",
  exchange_failed: "Google не завершил обмен authorization code.",
};

export class GoogleOAuthExchangeError extends Error {
  constructor(
    readonly code: GoogleOAuthErrorCode,
    readonly status: number,
  ) {
    super(SAFE_MESSAGES[code]);
  }
}

export function normalizeGoogleOAuthError(
  error: unknown,
  description?: unknown,
): GoogleOAuthErrorCode {
  const code = typeof error === "string" ? error.trim().toLowerCase() : "";
  const safeDescription = typeof description === "string" ? description.toLowerCase() : "";
  if (code === "invalid_client" || code === "unauthorized_client") return "invalid_client";
  if (code === "redirect_uri_mismatch" || safeDescription.includes("redirect_uri")) {
    return "redirect_uri_mismatch";
  }
  if (code === "access_denied") return "access_denied";
  if (code === "invalid_grant") return "invalid_grant";
  return "exchange_failed";
}

export function googleOAuthErrorCode(error: unknown): GoogleOAuthErrorCode {
  return error instanceof GoogleOAuthExchangeError ? error.code : "exchange_failed";
}

export async function googleOAuthExchangeError(response: Response): Promise<GoogleOAuthExchangeError> {
  let payload: { error?: unknown; error_description?: unknown } = {};
  try {
    payload = await response.json() as typeof payload;
  } catch {
    // Google can return a non-JSON proxy error. Do not retain the raw body.
  }
  return new GoogleOAuthExchangeError(
    normalizeGoogleOAuthError(payload.error, payload.error_description),
    response.status,
  );
}
