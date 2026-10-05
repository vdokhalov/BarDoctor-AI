import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BrowserContext, Page } from "playwright-core";

/** Passive test-only observations. Values of tokens/cookies are never recorded. */
export function webkitLifecycleEvidence(suite: string, width: number) {
  const events: Record<string, unknown>[] = [], pageErrors: { at: number; message: string }[] = [];
  const consoleErrors: { at: number; message: string }[] = [], failedRequests: { at: number; path: string; error: string | null }[] = [];
  let completion: Record<string, unknown> | undefined, failure: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined;
  function flush() { if (enabled) writeFileSync(process.env.BD_WEBKIT_EVIDENCE!, JSON.stringify({ schemaVersion: 2, suite, width, browser, events, pageErrors, consoleErrors, failedRequests, completion, after, failure }, null, 2)); }
  let deniedVenue: string | undefined;
  let guard: string | null = null;
  let browser: string | undefined;
  const enabled = Boolean(process.env.BD_WEBKIT_EVIDENCE);
  async function state(page: Page, context: BrowserContext) {
    const state = await page.evaluate(() => ({
      origin: location.origin, documentId: (window as unknown as { __bdWebKitDocumentId: string }).__bdWebKitDocumentId,
      auth: { email: Boolean(localStorage.getItem("bd_session")), token: Boolean(localStorage.getItem("bd_session_token")), marker: Boolean(sessionStorage.getItem("qa_webkit_session_marker")) },
    }));
    return { type: "state", at: Date.now(), ...state, cookie: (await context.cookies()).some(cookie => cookie.name === "bd_server_session") };
  }
  return {
    executablePath: enabled ? resolve("scripts/qa/webkit-native-trace.sh") : undefined,
    async attach(context: BrowserContext, base: string, token: string) {
      if (!enabled) return;
      // Match the actual session cookie contract with the already valid isolated QA session.
      browser = context.browser()?.browserType().name();
      await context.addCookies([{ name: "bd_server_session", value: encodeURIComponent(token), url: base, httpOnly: true, sameSite: "Strict" }]);
      events.push({ type: "cookie-initialized", at: Date.now(), present: (await context.cookies()).some(cookie => cookie.name === "bd_server_session") });
      await context.exposeBinding("__bdWebKitObserve", (_source, event) => { events.push({ at: Date.now(), ...event }); });
      // Plain JS avoids transpiler keep-name helpers inside the serialized browser function.
      await context.addInitScript({ path: resolve("scripts/qa/webkit-session-observer.js") });
      context.on("page", page => {
        page.on("pageerror", error => { pageErrors.push({ at: Date.now(), message: error.message }); flush(); });
        page.on("console", message => { if (message.type() === "error") { consoleErrors.push({ at: Date.now(), message: message.text() }); flush(); } });
        page.on("requestfailed", request => { failedRequests.push({ at: Date.now(), path: new URL(request.url()).pathname, error: request.failure()?.errorText ?? null }); flush(); });
        page.on("response", response => events.push({ type: "http-response", at: Date.now(), path: new URL(response.url()).pathname, status: response.status(), expectedScopeDenial: response.status() === 401 && deniedVenue !== undefined && response.request().headers()["x-venue-id"] === deniedVenue }));
      });
    },
    async health(request: Request, response: Response) {
      if (!enabled) return;
      events.push({ type: new URL(request.url).pathname === "/api/business-health" ? "health-response" : new URL(request.url).pathname === "/api/month-close" ? "month-close-server-response" : "store-response", path: new URL(request.url).pathname, at: Date.now(), status: response.status, expectedScopeDenial: response.status === 401 && request.headers.get("X-Venue-Id") === deniedVenue,
        headers: { email: Boolean(request.headers.get("X-Session-Email")), token: Boolean(request.headers.get("X-Session-Token")), cookie: (request.headers.get("Cookie") ?? "").includes("bd_server_session=") },
        ...(response.status === 401 ? { body: await response.clone().json() } : {}) });
    },
    async beginStep(id: string, page: Page, context: BrowserContext) {
      if (!enabled) return;
      guard = id;
      const snapshot = await state(page, context);
      events.push({ type: "step-start", id, at: Date.now(), state: snapshot }); flush();
    },
    endStep() { guard = null; },
    monthCloseResponse(status: number, code: unknown) {
      if (!enabled) return;
      events.push({ type: "month-close-response", at: Date.now(), status, code }); flush();
    },
    assertedResponse(path: string, status: number, code: string) {
      if (!enabled) return;
      events.push({ type: "expected-response-asserted", at: Date.now(), path, status, code }); flush();
    },
    async completed(page: Page, context: BrowserContext) {
      if (!enabled) return;
      // Called only after every unchanged business/API/RBAC/pageerror assertion.
      completion = { at: Date.now(), assertions: "PASS", state: await state(page, context) };
      flush();
    },
    lifecycle(type: "context-close-start" | "context-close-end" | "browser-close-start" | "browser-close-end") {
      if (!enabled) return;
      events.push({ type, at: Date.now() }); flush();
    },
    scopeDenial(venueId: number) { deniedVenue = String(venueId); },
    guard(active: boolean, target: "health" | "store" = "health") { guard = active ? `authenticated-${target}-200` : null; },
    async failure(error: unknown, page: Page, context: BrowserContext) {
      if (!enabled) return;
      const e = error as { name?: string; message?: string; actual?: unknown; expected?: unknown; operator?: string; stack?: string };
      failure = { at: Date.now(), guard, name: e.name, message: e.message, actual: e.actual, expected: e.expected, operator: e.operator, stack: e.stack };
      try { after = await state(page, context); } finally { flush(); }
    },
  };
}
