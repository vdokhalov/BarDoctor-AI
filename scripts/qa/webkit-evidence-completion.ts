import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import type { BrowserContext, Page, Request as BrowserRequest } from "playwright-core";

/** Diagnostic only: isolated fixture SELECTs, browser observations and one explicitly
 * labelled post-failure read. No recovery, auth injection, context/page creation or
 * business writes. This collector cannot change the required release classifier. */
export function canonicalSnapshot(sqlite: DatabaseSync) {
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const hashes = Object.fromEntries(tables.map(({ name }) => {
    const rows = sqlite.prepare(`SELECT * FROM "${String(name).replaceAll('"', '""')}"`).all();
    const sorted = rows.map(row => JSON.stringify(row)).sort();
    return [String(name), { count: rows.length, sha256: createHash("sha256").update(JSON.stringify(sorted)).digest("hex") }];
  }));
  const domain = sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key,id").all();
  const accounts = sqlite.prepare("SELECT id,restaurant_json,updated_at,created_at FROM accounts ORDER BY id").all();
  const audit = sqlite.prepare("SELECT * FROM audit_log ORDER BY id").all();
  return { hashes, domain, accounts, audit,
    canonicalSha256: createHash("sha256").update(JSON.stringify({domain, accounts, venues: hashes.venues})).digest("hex"),
    auditSha256: hashes.audit_log.sha256 };
}

export function safeHeaders(headers: Headers) {
  return { names: [...headers.keys()].sort(),
    auth: { email: Boolean(headers.get("X-Session-Email")), token: Boolean(headers.get("X-Session-Token")),
      cookie: (headers.get("Cookie") ?? "").includes("bd_server_session=") },
    venue: headers.get("X-Venue-Id"), contentType: headers.get("Content-Type") };
}

async function bounded<T>(operation: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try { return await Promise.race([operation, new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Evidence operation did not complete in ${ms}ms; no HTTP outcome inferred`)), ms);
  })]); } finally { clearTimeout(timer!); }
}

export class WebKitEvidenceCompletion {
  private readonly file = process.env.BD_WEBKIT_COMPLETION_JOURNAL!;
  private readonly trace = process.env.BD_WEBKIT_PROCESS_TRACE!;
  private seq = 0;
  private context?: BrowserContext;
  private page?: Page;
  private contextId = randomUUID();
  private pageIds = new WeakMap<Page, string>();
  private pageCount = 0;
  private requests = new WeakMap<Request, string>();
  private browserRequests = new WeakMap<BrowserRequest, string>();
  private nativeLines = new Set<string>();
  private monitor: ReturnType<typeof setInterval>;
  constructor(private sqlite: DatabaseSync) {
    this.record("collector-start", { contextId: this.contextId, fixture: "in-memory QA only", recovery: false });
    this.snapshot("fixture-before-navigation");
    this.monitor = setInterval(() => this.native(), 25);
  }
  record(type: string, data: Record<string, unknown> = {}) {
    appendFileSync(this.file, JSON.stringify({ seq: ++this.seq, at: Date.now(), type, ...data }) + "\n");
  }
  snapshot(label: string) { this.record("database-snapshot", { label, ...canonicalSnapshot(this.sqlite) }); }
  checkpoint(label: string, assertions: Record<string, unknown>) {
    this.record("application-assertions", { label, assertions }); this.snapshot(label);
  }
  native() {
    if (!existsSync(this.trace)) return;
    for (const line of readFileSync(this.trace, "utf8").split("\n")) {
      if (!/^\d+\s+\d+\.\d+\s+/.test(line) || !(/execve\(.*\/(?:WPENetworkProcess|WPEWebProcess)"/.test(line) || /SIGABRT|SIGSEGV/.test(line))) continue;
      if (this.nativeLines.has(line)) continue;
      this.nativeLines.add(line);
      this.record("native-trace", { line });
      if (/--- SIGABRT|--- SIGSEGV|killed by SIGABRT|killed by SIGSEGV/.test(line)) this.snapshot("native-signal-observed");
    }
  }
  apiRequest(request: Request) {
    if (!new URL(request.url).pathname.startsWith("/api/")) return;
    const id = randomUUID(); this.requests.set(request, id);
    this.record("server-request", { id, method: request.method, path: new URL(request.url).pathname, headers: safeHeaders(request.headers) });
    if (["/api/business-health", "/api/month-close"].includes(new URL(request.url).pathname)) this.snapshot(`request:${id}:before`);
  }
  async apiResponse(request: Request, response: Response) {
    const id = this.requests.get(request); if (!id) return;
    let body: unknown;
    if (response.status >= 400) body = await response.clone().text();
    this.record("server-response", { id, path: new URL(request.url).pathname, status: response.status, body });
    if (["/api/business-health", "/api/month-close"].includes(new URL(request.url).pathname)) this.snapshot(`request:${id}:after`);
  }
  private browserRequestId(request: BrowserRequest) {
    if (!this.browserRequests.has(request)) this.browserRequests.set(request, randomUUID());
    return this.browserRequests.get(request)!;
  }
  async attach(context: BrowserContext) {
    this.context = context;
    this.record("context-attached", { contextId: this.contextId });
    await context.exposeBinding("__bdCompletionObserve", ({ page }, data) => {
      this.record("browser-observation", { contextId: this.contextId, pageId: this.pageIds.get(page), ...data });
    });
    await context.addInitScript({ path: "scripts/qa/webkit-completion-observer.js" });
    context.on("page", page => {
      const pageId = randomUUID(); this.pageIds.set(page, pageId); this.pageCount++;
      this.record("page-created", { contextId: this.contextId, pageId, pageCount: this.pageCount });
      page.on("close", () => this.record("page-closed", { contextId: this.contextId, pageId }));
      page.on("pageerror", error => this.record("page-error", { pageId, message: error.message }));
      page.on("request", request => {
        const path = new URL(request.url()).pathname;
        if (!path.startsWith("/api/")) return;
        this.record("browser-request", { id: this.browserRequestId(request), pageId, path, method: request.method(), headers: safeHeaders(new Headers(request.headers())) });
        void request.allHeaders().then(headers => this.record("browser-request-all-headers", { id: this.browserRequestId(request), pageId, path, headers: safeHeaders(new Headers(headers)) })).catch(error => this.record("browser-header-read-error", { id: this.browserRequestId(request), pageId, path, error: String(error) }));
      });
      page.on("requestfailed", request => this.record("browser-request-failed", { id: this.browserRequestId(request), pageId, path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
      page.on("response", response => this.record("browser-response", { id: this.browserRequestId(response.request()), pageId, path: new URL(response.url()).pathname, status: response.status() }));
    });
  }
  bindPage(page: Page) { this.page = page; this.record("original-page-bound", { contextId: this.contextId, pageId: this.pageIds.get(page) }); }
  async cookies(label: string) {
    try { const cookies = await bounded(this.context!.cookies(), 5000);
      this.record("cookies", { label, contextId: this.contextId, pageId: this.page && this.pageIds.get(this.page), cookies: cookies.map(({ name, domain, path, httpOnly, secure, sameSite, expires }) => ({ name, domain, path, httpOnly, secure, sameSite, expires })) });
    } catch (error) { this.record("cookie-read-error", { label, error: String(error) }); }
  }
  async state(label: string) {
    if (!this.page) return;
    try { const state = await bounded(this.page.evaluate(() => ({ origin: location.origin, documentId: (window as unknown as { __bdCompletionDocumentId: string }).__bdCompletionDocumentId,
      auth: { email: Boolean(localStorage.getItem("bd_session")), token: Boolean(localStorage.getItem("bd_session_token")), marker: Boolean(sessionStorage.getItem("qa_webkit_session_marker")) } })), 5000);
      this.record("browser-state", { label, contextId: this.contextId, pageId: this.pageIds.get(this.page), pageCount: this.pageCount, ...state });
    } catch (error) { this.record("state-read-error", { label, error: String(error) }); }
    await this.cookies(label);
  }
  async failed(error: unknown) {
    this.native(); this.record("unchanged-assertion-failure", { error: String(error) });
    this.snapshot("after-original-failure-before-diagnostic-read");
    await this.state("after-original-failure");
    // Observe a read from THE ORIGINAL PAGE with its CURRENT credentials. Do not
    // manufacture missing credentials, force a native crash, restore auth, or retry.
    this.record("diagnostic-read-start", { contextId: this.contextId, pageId: this.page && this.pageIds.get(this.page), pageCount: this.pageCount, path: "/api/business-health" });
    if (this.page) try {
      const result = await bounded(this.page.evaluate(async () => {
        const headers = { "X-Session-Email": localStorage.getItem("bd_session") || "", "X-Session-Token": localStorage.getItem("bd_session_token") || "", "X-Venue-Id": localStorage.getItem("bd_active_venue_id") || "" };
        const auth = { email: Boolean(headers["X-Session-Email"]), token: Boolean(headers["X-Session-Token"]) };
        try { const response = await fetch("/api/business-health", { headers, signal: AbortSignal.timeout(8000) }); return { auth, status: response.status, body: response.status >= 400 ? await response.text() : "<successful response body omitted>" }; }
        catch (error) { return { auth, error: String(error) }; }
      }), 12000);
      this.record("diagnostic-read-result", { result });
    } catch (error) { this.record("diagnostic-read-error", { error: String(error) }); }
    await this.state("after-diagnostic-read"); this.snapshot("after-diagnostic-read");
  }
  close() {
    clearInterval(this.monitor);
    this.native(); this.snapshot("before-fixture-teardown");
    this.record("collector-complete", { contextId: this.contextId, pageCount: this.pageCount });
  }
}
