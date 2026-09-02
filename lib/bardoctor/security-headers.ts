const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // The legacy shell still contains static inline startup/print code. unsafe-eval
  // is deliberately excluded; removing unsafe-inline requires extracting that
  // shell code without changing its pixel-stable startup behavior.
  "script-src 'self' 'unsafe-inline' https://cdn.onesignal.com https://api.onesignal.com",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.onesignal.com https://*.onesignal.com wss://*.onesignal.com https://maps.googleapis.com https://places.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com https://chat.openai.com",
].join("; ");

export function securityHeaders(): Record<string, string> {
  return {
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000",
    "X-Content-Type-Options": "nosniff",
  };
}

