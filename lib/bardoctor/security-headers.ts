const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // The two static shell blocks and the inert stylesheet-onload expression are
  // pinned by exact SHA-256 values. Any inline change fails closed until its
  // reviewed hash and regression evidence are updated.
  "script-src 'self' 'unsafe-hashes' 'sha256-PYeXSaErC501H9Xp0mV6DGT7X+le9SyJ1TntZjdMYik=' 'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc=' https://cdn.onesignal.com https://api.onesignal.com",
  "style-src 'self' 'sha256-S+fVyI4g7WfW8rHivegg48+6J6DZ3WlbQrtGUiURnKY='",
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
