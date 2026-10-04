export const WEBKIT_LIFECYCLE_SUITES = ["health-inputs-phase3a9", "derived-metrics-phase3a8"];

export function nativeFatalEvents(trace) {
  const names = new Map(), events = [];
  for (const line of trace.split("\n")) {
    const row = /^(\d+)\s+(\d+\.\d+)\s+(.*)$/.exec(line);
    if (!row) continue;
    const pid = Number(row[1]), at = Number(row[2]) * 1000, text = row[3];
    const executable = /execve\("([^"]+)"/.exec(text);
    if (executable) names.set(pid, executable[1].split("/").pop());
    const thread = /\bclone(?:3)?\(.*CLONE_THREAD.*\)\s*=\s*(\d+)/.exec(text);
    if (thread && names.has(pid)) names.set(Number(thread[1]), names.get(pid));
    const killed = /\+\+\+ killed by (SIGABRT|SIGSEGV)/.exec(text);
    if (killed) events.push({ pid, at, process: names.get(pid) ?? "unknown", signal: killed[1] });
  }
  return events;
}

/** Fail closed. Two explicitly evidenced signatures only: the proven native
 * session-loss chain, or native process teardown AFTER all unchanged assertions
 * completed. Unknown processes, prior contract failures and missing lifecycle
 * observations always fail; an environment exception is never ordinary PASS. */
export function classifyWebKitLifecycle({ suite, width, exitCode, trace, evidence }) {
  const fatal = nativeFatalEvents(trace);
  const fail = (reason) => ({ status: "FAIL", reason, fatal });
  if (!/execve\("[^"\n]*\/WPENetworkProcess"/.test(trace)) return fail("Native process observation is missing");
  if (exitCode === 0 && fatal.length === 0) return { status: "PASS", fatal };
  if (!WEBKIT_LIFECYCLE_SUITES.includes(suite) || ![390, 820, 1280].includes(width)) return fail("Sequence outside the explicit exception allowlist");
  if (!evidence || evidence.browser !== "webkit" || evidence.suite !== suite || evidence.width !== width) return fail("Missing or mismatched live failure evidence");
  if (exitCode === 0 && fatal.length) {
    const completion = evidence.completion, firstCrash = Math.min(...fatal.map(event => event.at));
    const close = evidence.events.find(event => event.type === "context-close-start" && event.at <= firstCrash);
    if (evidence.failure || completion?.assertions !== "PASS" || !close || completion.at > close.at || completion.state?.at > close.at || !completion.state?.auth?.email || !completion.state.auth.token || !completion.state.auth.marker || !completion.state.cookie) return fail("All assertions and intact session before native context teardown not established");
    if (fatal.some(event => event.process !== "WPENetworkProcess" && !(event.process === "WPEWebProcess" && event.signal === "SIGSEGV"))) return fail("Unproven native process/signal signature");
    if (evidence.pageErrors.length || evidence.events.some(event => event.type === "health-response" && event.status !== 200 && !(event.status === 401 && event.expectedScopeDenial)) || evidence.events.some(event => event.type === "http-response" && event.status >= 500)) return fail("Independent application/API contract error observed");
    if ((evidence.consoleErrors ?? []).some(event => !/Failed to load resource: the server responded with a status of (?:404 \(Not Found\)|401 \(Unauthorized\))/.test(event.message)) || (evidence.failedRequests ?? []).some(event => event.at < close.at && !["/manifest.json", "/api/operational-days"].includes(event.path))) return fail("Unexplained console/network failure before teardown");
    if (evidence.events.some(event => event.type === "storage-write" && ["bd_session", "bd_session_token", "qa_webkit_session_marker"].includes(event.key) && !event.present || event.type === "storage-clear")) return fail("Independent auth/storage mutation observed");
    return { status: "ENVIRONMENT_BLOCKED", reason: "All unchanged application/API/RBAC assertions PASS with intact session; proven native WebKit process fatal signal during context/browser teardown", completion, close, fatal };
  }
  if (exitCode !== 1) return fail("Unexpected test process exit");
  const failure = evidence.failure;
  const storeGuard = suite === "health-inputs-phase3a9" && failure?.guard === "authenticated-store-200";
  if ((!storeGuard && failure?.guard !== "authenticated-health-200") || failure.name !== "AssertionError" || failure.actual !== 401 || failure.expected !== 200 || failure.operator !== "strictEqual") return fail("Not an unchanged allowlisted authenticated read-200 assertion");
  const crash = fatal.find(event => event.process === "WPENetworkProcess" && event.at <= failure.at);
  if (!crash || fatal.some(event => event.process !== "WPENetworkProcess")) return fail("No exclusive proven WPENetworkProcess fatal-signal signature");
  const cookieInitialized = evidence.events.some(event => event.type === "cookie-initialized" && event.at < crash.at && event.present);
  const after = evidence.after;
  const before = evidence.events.findLast(event => event.type === "state" && event.at < crash.at && event.auth.email && event.auth.token && event.auth.marker && event.origin === after?.origin && event.documentId === after?.documentId);
  if (!cookieInitialized || !before || !after || after.at < crash.at || after.auth.email || after.auth.token || after.auth.marker || after.cookie || before.origin !== after.origin || before.documentId !== after.documentId) return fail("Same-document, same-origin loss of previously present auth/storage/cookie not established");
  const unauthorized = evidence.events.find(event => (storeGuard ? event.type === "store-response" && event.path === "/api/store/bd_assortment_v1" : event.type === "health-response") && event.at >= crash.at && event.status === 401 && event.body?.ok === false && event.body?.error === "Необходима авторизация" && !event.headers.email && !event.headers.token && !event.headers.cookie);
  if (!unauthorized) return fail("Post-crash empty-auth allowlisted read request and exact authorization response not established");
  if (evidence.events.some(event => event.type === "storage-write" && ["bd_session", "bd_session_token", "qa_webkit_session_marker"].includes(event.key) && !event.present || event.type === "storage-clear")) return fail("Application/harness storage mutation could explain the loss");
  if (evidence.events.some(event => event.type === "health-response" && event.at < crash.at && event.status !== 200 && !(event.status === 401 && event.expectedScopeDenial))) return fail("Independent Health failure precedes native crash");
  if (evidence.pageErrors.some(event => event.at < crash.at || !/business-health.*(?:failed|access.control)|access.control.*business-health/i.test(event.message))) return fail("Independent browser/application error observed");
  return { status: "ENVIRONMENT_BLOCKED", reason: "Native WPENetworkProcess fatal signal → same-document ephemeral session/cookie loss → exact empty-auth allowlisted read 401", crash, before, after, unauthorized, failure, fatal };
}
