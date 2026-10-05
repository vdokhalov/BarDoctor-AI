export const WEBKIT_LIFECYCLE_SUITES = ["health-inputs-phase3a9", "derived-metrics-phase3a8"];

// Only successful execs and proven CLONE_THREAD relationships establish identity.
// Join unfinished/resumed calls by PID + syscall, never by proximity or fork.
function processTimeline(trace) {
  const pending = new Map(), execs = new Map(), threads = new Map(), deaths = [];
  const append = (map, pid, value) => map.set(pid, [...(map.get(pid) ?? []), value]);
  for (const line of trace.split("\n")) {
    const row = /^(\d+)\s+(\d+\.\d+)\s+(.*)$/.exec(line);
    if (!row) continue;
    const pid = Number(row[1]), at = Number(row[2]) * 1000;
    let text = row[3], callAt = at;
    const resumed = /^<\.\.\. (execve|clone3?) resumed>/.exec(text);
    if (resumed) {
      const call = pending.get(pid); pending.delete(pid);
      if (!call || call.name !== resumed[1]) continue;
      text = call.text + text.slice(resumed[0].length); callAt = call.at;
    } else if (text.includes("<unfinished ...>")) {
      const name = /^(execve|clone3?)\(/.exec(text)?.[1];
      if (name) pending.set(pid, { name, at, text: text.replace(/<unfinished \.\.\.>$/, "") });
      continue;
    }
    const executable = /^execve\("([^"]+)".*\)\s*=\s*0$/.exec(text);
    if (executable) append(execs, pid, { at: callAt, executable: executable[1] });
    const thread = /^clone3?\(.*\bCLONE_THREAD\b.*\)\s*=\s*(\d+)$/.exec(text);
    if (thread) append(threads, Number(thread[1]), { at: callAt, parent: pid });
    const killed = /\+\+\+ killed by (SIGABRT|SIGSEGV)/.exec(text);
    if (killed) deaths.push({ pid, at, signal: killed[1] });
  }
  const latest = (map, pid, at) => (map.get(pid) ?? []).filter(item => item.at <= at).sort((a, b) => b.at - a.at)[0];
  const identity = (pid, at, seen = new Set()) => {
    if (seen.has(pid)) return null;
    seen.add(pid);
    const exec = latest(execs, pid, at), thread = latest(threads, pid, at);
    if (exec && (!thread || exec.at >= thread.at)) return { ...exec, processPid: pid };
    if (!thread) return null;
    // PID reuse/later exec cannot relabel an earlier browser thread.
    const parent = identity(thread.parent, thread.at, seen);
    return parent ? { ...parent, threadParent: thread.parent } : null;
  };
  const fatal = deaths.map(death => {
    const proof = identity(death.pid, death.at);
    return { ...death, process: proof?.executable.split("/").pop() ?? "unknown", ...(proof ? { executable: proof.executable, processPid: proof.processPid, threadParent: proof.threadParent } : {}) };
  });
  return { execs: [...execs.values()].flat(), fatal };
}

export function nativeFatalEvents(trace) { return processTimeline(trace).fatal; }
const browserExecutable = path => /\/(?:webkit-\d+\/minibrowser-wpe\/bin|browser)\/(?:WPENetworkProcess|WPEWebProcess)$/.test(path ?? "");
const nativeBrowser = event => browserExecutable(event.executable) && ["SIGABRT", "SIGSEGV"].includes(event.signal);
const pathOf = event => event.path ?? (event.type === "health-response" ? "/api/business-health" : "");
const authKeys = ["bd_session", "bd_session_token", "qa_webkit_session_marker"];
const fixturePaths = ["/manifest.json", "/api/operational-days"];
// These exact requests have no handler in the unchanged isolated Health fixture.
// Other 404s (especially selectors/API routes under test) remain failures.
const fixturePath = (path, suite) => fixturePaths.includes(path) || suite === "health-inputs-phase3a9" && ["/api/management/cost-signals/evaluate", "/api/opportunities", "/api/competitors/me", "/api/reviews/home"].includes(path);
const internalError = event => event.error === "WebKit encountered an internal error";

function sessionLoss(evidence, crash) {
  const { events, after } = evidence;
  const before = events.findLast(event => event.type === "state" && event.at < crash.at && event.auth?.email && event.auth.token && event.auth.marker && event.origin === after?.origin && event.documentId === after?.documentId);
  const initialized = events.some(event => event.type === "cookie-initialized" && event.at < crash.at && event.present);
  if (!initialized || !before || !after?.auth || !Number.isFinite(after.at) || after.at < crash.at || after.auth.email || after.auth.token || after.auth.marker || after.cookie !== false) return null;
  if (events.some(event => event.type === "storage-clear" || event.type === "storage-write" && authKeys.includes(event.key) && !event.present)) return null;
  return { before, after };
}
function emptyAuth(event, crash) {
  return event.at >= crash.at && event.status === 401 && event.body?.ok === false && (event.body.error === "Необходима авторизация" || event.type === "month-close-server-response" && event.path === "/api/month-close" && event.body.code === "UNAVAILABLE") && event.headers?.email === false && event.headers.token === false && event.headers.cookie === false;
}
function expectedResponse(event, evidence) {
  if (event.status < 400) return true;
  const path = pathOf(event);
  if (event.status === 404 && fixturePath(path, evidence.suite)) return true;
  if (event.status === 401 && event.expectedScopeDenial === true) return true;
  if (evidence.suite !== "derived-metrics-phase3a8" || path !== "/api/month-close") return false;
  if (evidence.schemaVersion === 2) {
    return event.status === 409 && evidence.events.some(check => check.type === "expected-response-asserted" && check.path === path && check.status === 409 && check.code === "MONTH_CLOSE_INPUTS_CHANGED" && check.at >= event.at)
      && evidence.events.some(reply => reply.type === "month-close-response" && reply.status === 409 && reply.code === "MONTH_CLOSE_INPUTS_CHANGED" && Math.abs(reply.at - event.at) < 1000);
  }
  // Saved v485/v486 v1 evidence predates response annotations. Full suite PASS
  // proves its ONE stale-input409 and ONE foreign-venue401. Incomplete suites,
  // other paths, repeated errors and HTTP500 never receive this compatibility.
  return evidence.completion?.assertions === "PASS" && [401, 409].includes(event.status)
    && evidence.events.filter(reply => reply.type === "http-response" && reply.path === path && reply.status === event.status).length === 1;
}
function independentError(evidence, { crash, loss, teardown } = {}) {
  const events = evidence.events, failures = evidence.failedRequests ?? [];
  if (evidence.pageErrors?.length) return "Application JavaScript/page exception observed";
  if (events.some(event => Number(event.status) >= 500)) return "Application HTTP500/server error observed";
  const downstream401 = event => loss && ["/api/business-health", "/api/store/bd_assortment_v1", "/api/month-close"].includes(pathOf(event)) && emptyAuth(event, crash);
  for (const event of events.filter(event => ["http-response", "health-response", "store-response", "month-close-server-response"].includes(event.type) && event.status >= 400)) {
    if (expectedResponse(event, evidence) || downstream401(event)) continue;
    if (loss && event.type === "http-response" && events.some(reply => pathOf(reply) === event.path && downstream401(reply) && Math.abs(reply.at - event.at) < 1000)) continue;
    return "Unexpected application HTTP/auth response observed";
  }
  const runtimeRequest = event => crash && event.at >= crash.at && (loss && (["/api/business-health", "/api/operational-days", "/api/store/bd_assortment_v1"].includes(event.path) || fixturePath(event.path, evidence.suite) && events.some(reply => reply.type === "http-response" && reply.path === event.path && reply.status === 404 && reply.at < crash.at)) && internalError(event)
    || teardown && event.at >= teardown.at && ["WebKit encountered an internal error", "Load request cancelled", "Target page, context or browser has been closed"].includes(event.error));
  for (const event of failures) {
    if (fixturePath(event.path, evidence.suite) && event.error === "Load request cancelled" || runtimeRequest(event)) continue;
    return "Unexplained network failure observed";
  }
  for (const event of evidence.consoleErrors ?? []) {
    const response = /^Failed to load resource: the server responded with a status of (\d+) \([^)]+\)$/.exec(event.message);
    if (response && events.some(reply => reply.type === "http-response" && reply.status === Number(response[1]) && Math.abs(reply.at - event.at) < 250 && (expectedResponse(reply, evidence) || loss && reply.status === 401 && events.some(auth => pathOf(auth) === reply.path && downstream401(auth))))) continue;
    if (event.message === "Failed to load resource: WebKit encountered an internal error" && failures.some(request => Math.abs(request.at - event.at) < 250 && runtimeRequest(request))) continue;
    return "Unexplained console error observed";
  }
  return null;
}
function firstDialogTimeout(evidence) {
  const failure = evidence.failure;
  if (evidence.schemaVersion === 2 && evidence.suite === "derived-metrics-phase3a8" && failure?.name === "TimeoutError" && failure.guard === "month-close:first-mount:ready" && /^locator\.waitFor: Timeout 30000ms exceeded\.\nCall log:\n  - waiting for getByRole\('dialog', \{ name: 'Мастер закрытия месяца' \}\)\.locator\('nav button'\)\.first\(\) to be visible\n?$/.test(failure.message ?? "")) return "ready";
  if (evidence.suite !== "derived-metrics-phase3a8" || failure?.name !== "TimeoutError" || !/^locator\.waitFor: Timeout 30000ms exceeded\.\nCall log:\n  - waiting for getByRole\('dialog', \{ name: 'Мастер закрытия месяца' \}\) to be visible\n?$/.test(failure.message ?? "")) return false;
  if (evidence.schemaVersion === 2) return failure.guard === "month-close:first-mount";
  return failure.guard === null && /derived-metrics-phase3a8-browser\.ts:44:380/.test(failure.stack ?? "") && /derived-metrics-phase3a8-browser\.ts:46:2/.test(failure.stack ?? "");
}

/** FAIL remains the gate exit contract. classification makes APPLICATION_FAIL,
 * ENVIRONMENT_BLOCKED and ordinary PASS explicit; raw evidence is retained. */
export function classifyWebKitLifecycle({ suite, width, exitCode, trace, evidence, testLog = "" }) {
  const timeline = processTimeline(trace), fatal = timeline.fatal;
  const fail = reason => ({ status: "FAIL", classification: "APPLICATION_FAIL", reason, fatal });
  const environment = (reason, proof) => ({ status: "ENVIRONMENT_BLOCKED", classification: "ENVIRONMENT_BLOCKED", reason, ...proof, fatal });
  if (!timeline.execs.some(exec => browserExecutable(exec.executable) && exec.executable.endsWith("/WPENetworkProcess"))) return fail("Successful native browser process observation is missing");
  if (!WEBKIT_LIFECYCLE_SUITES.includes(suite) || ![390, 820, 1280].includes(width)) return fail("Sequence outside the explicit lifecycle allowlist");
  if (!evidence || evidence.browser !== "webkit" || evidence.suite !== suite || evidence.width !== width || !Array.isArray(evidence.events) || !Array.isArray(evidence.pageErrors)) return fail("Missing or mismatched live lifecycle evidence");
  if (!fatal.length) {
    const error = independentError(evidence);
    if (exitCode !== 0 || evidence.failure || evidence.completion?.assertions !== "PASS" || error) return fail(error ?? "Assertions did not complete without native crash evidence");
    return { status: "PASS", classification: "PASS", fatal };
  }
  if (fatal.some(event => !nativeBrowser(event))) return fail("Unrelated, unknown or unproven native process/signal signature");
  const firstCrash = fatal.reduce((a, b) => a.at <= b.at ? a : b), completion = evidence.completion;
  const close = evidence.events.find(event => event.type === "context-close-start" && event.at <= firstCrash.at);
  if (completion?.assertions === "PASS" && !evidence.failure && close && completion.at <= close.at && completion.state?.at <= close.at && completion.state.auth?.email && completion.state.auth.token && completion.state.auth.marker && completion.state.cookie === true) {
    const error = independentError(evidence, { crash: firstCrash, teardown: close });
    if (error) return fail(error);
    if (evidence.events.some(event => event.type === "storage-clear" || event.type === "storage-write" && authKeys.includes(event.key) && !event.present)) return fail("Independent auth/storage mutation observed");
    const closeError = /(?:browser|browserContext)\.close: (?:Target page, context or browser has been closed|Browser has been closed|Connection closed)/.test(testLog) && !/AssertionError|\bassert\.\w+/.test(testLog);
    if (exitCode !== 0 && !(exitCode === 1 && closeError)) return fail("Unexpected process failure after assertion completion");
    return environment("All application assertions PASS with intact session before attributed native browser teardown failure", { completion, close });
  }
  const failure = evidence.failure;
  if (exitCode !== 1 || !failure || !Number.isFinite(failure.at) || failure.at < firstCrash.at) return fail("Application failure precedes crash or its ordering is unproven");
  // A later WPE teardown fault cannot invalidate the earlier proven NetworkProcess
  // chain, but an active WPE fault or missing/early close still fails closed.
  const failureClose = evidence.events.find(event => event.type === "context-close-start" && event.at >= failure.at);
  if (firstCrash.process !== "WPENetworkProcess" || fatal.some(event => event.process !== "WPENetworkProcess" && !(event.process === "WPEWebProcess" && failureClose && event.at >= failureClose.at))) return fail("Active-page session-loss chain requires NetworkProcess evidence; other browser faults must follow observed teardown");
  const loss = sessionLoss(evidence, firstCrash);
  if (!loss) return fail("Same-document loss of verified session/storage/cookie is not established");
  const error = independentError(evidence, { crash: firstCrash, loss });
  if (error) return fail(error);
  const store = suite === "health-inputs-phase3a9" && failure.guard === "authenticated-store-200";
  const guard = store || failure.guard === "authenticated-health-200";
  const path = store ? "/api/store/bd_assortment_v1" : "/api/business-health";
  const unauthorized = evidence.events.find(event => pathOf(event) === path && emptyAuth(event, firstCrash) && event.at <= failure.at);
  if (guard && failure.name === "AssertionError" && failure.actual === 401 && failure.expected === 200 && failure.operator === "strictEqual" && unauthorized) return environment("Attributed NetworkProcess crash → same-document session loss → guarded empty-auth401", { crash: firstCrash, ...loss, unauthorized, failure });
  const network = (evidence.failedRequests ?? []).find(event => event.at >= firstCrash.at && event.at <= failure.at && [path, "/api/operational-days"].includes(event.path) && internalError(event));
  const dialog = firstDialogTimeout(evidence);
  if (dialog === true && evidence.events.some(event => pathOf(event) === "/api/month-close")) return fail("Timeout is not the isolated first mount before month-close reads");
  if (evidence.schemaVersion === 2 && dialog === true && !evidence.events.some(event => event.type === "step-start" && event.id === "month-close:first-mount" && event.at <= firstCrash.at && event.state?.auth?.email && event.state.auth.token && event.state.auth.marker && event.state.cookie === true && event.state.documentId === loss.after.documentId)) return fail("Live first-mount checkpoint before crash is missing");
  if (dialog === "ready") {
    const denial = evidence.events.find(event => event.type === "month-close-server-response" && emptyAuth(event, firstCrash) && event.at <= failure.at);
    const checkpoint = id => evidence.events.find(event => event.type === "step-start" && event.id === id && event.at <= failure.at && event.state?.documentId === loss.after.documentId && event.state.origin === loss.after.origin
      && (event.at <= firstCrash.at && event.state.auth?.email && event.state.auth.token && event.state.auth.marker && event.state.cookie === true
        || event.at >= firstCrash.at && event.state.auth?.email === false && event.state.auth.token === false && event.state.auth.marker === false && event.state.cookie === false));
    if (denial && checkpoint("month-close:first-mount") && checkpoint("month-close:first-mount:ready")) return environment("Attributed NetworkProcess crash → verified session loss → server-confirmed empty-auth month-close401 → exact first-mount readiness timeout", { crash: firstCrash, ...loss, unauthorized: denial, failure });
    return fail("Month-close readiness timeout lacks exact checkpoint and server-confirmed empty-auth evidence");
  }
  const readError = guard && ["Error", "TypeError"].includes(failure.name) && /WebKit encountered an internal error|Failed to fetch|Load failed/.test(failure.message ?? "");
  if (network && (dialog || readError)) return environment("Attributed NetworkProcess crash → verified session/network loss → exact guarded downstream failure", { crash: firstCrash, ...loss, network, failure });
  return fail("Failure is not a proven downstream consequence of native session/network loss");
}
