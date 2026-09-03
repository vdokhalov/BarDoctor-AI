export type GoogleOAuthErrorCode =
  | "invalid_client"
  | "invalid_client_secret"
  | "redirect_uri_mismatch"
  | "access_denied"
  | "invalid_grant"
  | "profile_unauthorized"
  | "profile_forbidden"
  | "profile_rate_limited"
  | "profile_unavailable"
  | "exchange_failed";

const SAFE_MESSAGES: Record<GoogleOAuthErrorCode, string> = {
  invalid_client: "Google отклонил OAuth Client ID или Client Secret.",
  invalid_client_secret: "Google отклонил OAuth Client Secret.",
  redirect_uri_mismatch: "Callback URL не совпадает с Authorized redirect URI в Google Cloud.",
  access_denied: "Доступ к Google Business Profile не был предоставлен.",
  invalid_grant: "Google authorization code истёк, уже использован или был отозван.",
  profile_unauthorized: "Google-токен истёк или был отозван.",
  profile_forbidden: "Google запретил доступ к Business Profile. Проверьте права аккаунта и включённые API.",
  profile_rate_limited: "Google временно ограничил запросы к Business Profile.",
  profile_unavailable: "Google Business Profile временно недоступен.",
  exchange_failed: "Google не завершил обмен authorization code.",
};

function safeGoogleError(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9_]{1,64}$/.test(normalized) ? normalized : "unknown";
}

export function sanitizeGoogleOAuthDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\b(client_secret|access_token|refresh_token|code)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{80,}\b/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.slice(0, 240) : null;
}

export class GoogleOAuthExchangeError extends Error {
  constructor(
    readonly code: GoogleOAuthErrorCode,
    readonly status: number,
    readonly googleError: string,
    readonly safeDescription: string | null,
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
  if (code === "invalid_client_secret" || (code === "invalid_client" && safeDescription.includes("client secret"))) {
    return "invalid_client_secret";
  }
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
  const description = sanitizeGoogleOAuthDescription(payload.error_description);
  return new GoogleOAuthExchangeError(
    normalizeGoogleOAuthError(payload.error, description),
    response.status,
    safeGoogleError(payload.error),
    description,
  );
}

export function googleOAuthSafeDiagnostic(error: unknown): string {
  if (!(error instanceof GoogleOAuthExchangeError)) {
    return "token_endpoint HTTP unavailable; error=exchange_failed; error_description=unavailable";
  }
  const description = error.safeDescription ?? "unavailable";
  return `token_endpoint HTTP ${error.status}; error=${error.googleError}; error_description=${description}`;
}
