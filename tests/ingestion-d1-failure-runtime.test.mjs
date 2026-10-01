import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

// Native isolated workerd D1, real auth/owner SQL/ingestion and framework boundary.
// No production binding, external provider or production-derived menu fixture.
test("early owner D1 faults roll back, fail closed and correlate safely on desktop/mobile", { timeout: 120000 }, async () => {
  const entry = `
    import {POST as register} from './app/api/auth/register/route';
    import {POST as ingestion} from './app/api/menu/ingestion/route';
    import {observeRequest} from './lib/bardoctor/request-observability';
    import {executeAppRouteHandler} from './node_modules/vinext/dist/server/app-route-handler-execution.js';
    const events=[], bodies=[]; let payloadReads=0;
    const readText=Request.prototype.text;
    Request.prototype.text=function(){
      if(new URL(this.url).pathname==='/api/menu/ingestion')payloadReads++;
      return readText.call(this);
    };
    console.info=(line)=>events.push(JSON.parse(line));
    console.error=()=>events.push({unexpectedFrameworkError:true});
    export default {fetch(request){
      const path=new URL(request.url).pathname;
      if(path==='/__test/events'){
        const result={events:events.splice(0),bodies:bodies.splice(0),payloadReads};payloadReads=0;return Response.json(result);
      }
      return observeRequest(request,async()=>{
        const response=await executeAppRouteHandler({request,handlerFn:path==='/api/auth/register'?register:ingestion,
          handler:{dynamic:'force-dynamic'},method:request.method,params:Promise.resolve({}),cleanPathname:path,routePattern:path,
          middlewareContext:{},isProduction:true,isAutoHead:false,consumeDynamicUsage:()=>false,markDynamicUsage:()=>{},
          setHeadersAccessPhase:()=>undefined,getAndClearPendingCookies:()=>[],getDraftModeCookieHeader:()=>undefined,
          clearRequestContext:()=>{},reportRequestError:()=>events.push({unexpectedFrameworkBoundary:true})});
        bodies.push({path,bodyUsed:request.bodyUsed});return response;
      });
    }};`;
  const bundle = await build({ stdin: { contents: entry, loader: "ts", resolveDir: process.cwd() }, tsconfigRaw: {},
    bundle: true, write: false, format: "esm", platform: "neutral", conditions: ["workerd", "worker", "browser"], external: ["cloudflare:workers", "node:*"] });
  let outbound = 0, browser;
  const mf = new Miniflare({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: "2026-05-15",
    compatibilityFlags: ["nodejs_compat"], d1Databases: { DB: "isolated-ingestion-error-contract" },
    outboundService: () => { outbound++; return new Response(null, { status: 502 }); } });
  try {
    const db = await mf.getD1Database("DB"), schema = new DatabaseSync(":memory:");
    try {
      schema.exec("PRAGMA foreign_keys=ON");
      for (const file of readdirSync("drizzle").filter(f => f.endsWith(".sql")).sort()) schema.exec(readFileSync(`drizzle/${file}`, "utf8"));
      const definitions = schema.prepare("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();
      for (let i = 0; i < definitions.length; i += 30) await db.batch(definitions.slice(i, i + 30).map(row => db.prepare(row.sql)));
    } finally { schema.close(); }
    const call = (path, body, headers = {}) => mf.dispatchFetch("http://localhost" + path, { method: "POST",
      headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    const registration = await call("/api/auth/register", { email: "private-owner-canary@local.test", password: "Password-canary-123!", firstName: "Owner" });
    assert.equal(registration.status, 201); const actor = await registration.json();
    const headers = { "x-session-email": actor.email, "x-session-token": actor.token, "x-venue-id": String(actor.activeVenueId),
      cookie: "private-cookie-canary", authorization: "Bearer private-authorization-canary" };
    const send = body => call("/api/menu/ingestion", { venueId: actor.activeVenueId, ...body }, headers);
    const created = await send({ action: "create", source: "IMPORT", draftId: "draft:isolated-d1-contract",
      items: [{ name: "CSV-content-canary Без подраздела", salePrice: 17, currency: "MDL", sectionId: "bar", taxonomyCategoryId: "alcohol", consumptionMode: "NONE", type: "service" }] });
    assert.equal(created.status, 201); let draft = (await created.json()).draft;
    const update = await send({ action: "update", draftId: draft.id, revision: draft.revision,
      rows: draft.rows.map(row => ({ ...row, item: { ...row.item, salePrice: "-1" }, decision: "apply", reviewed: false })) });
    assert.equal(update.status, 200); draft = (await update.json()).draft; assert.equal(draft.revision, 2);
    assert.equal((await send({ action: "validate", draftId: draft.id, revision: draft.revision })).status, 422);
    const correction = { action: "update", venueId: actor.activeVenueId, draftId: draft.id, revision: 2,
      rows: draft.rows.map(row => ({ ...row, item: { ...row.item, salePrice: "17" }, decision: "apply", reviewed: true })) };
    const events = async () => (await mf.dispatchFetch("http://localhost/__test/events")).json();
    const snapshot = async () => ({
      domain: (await db.prepare("SELECT * FROM domain_data WHERE account_id=? ORDER BY store_key").bind(actor.userId).all()).results,
      venue: (await db.prepare("SELECT * FROM venue_memberships WHERE account_id=?").bind(actor.userId).all()).results,
      workspace: (await db.prepare("SELECT * FROM workspace_memberships WHERE account_id=?").bind(actor.userId).all()).results,
      sequences: (await db.prepare("SELECT name,seq FROM sqlite_sequence WHERE name IN ('venue_memberships','workspace_memberships') ORDER BY name").all()).results,
      audit: (await db.prepare("SELECT * FROM audit_log WHERE account_id=?").bind(actor.userId).all()).results,
    });
    const baseline = await snapshot();
    const canaries = [actor.token, actor.email, "Password-canary", "private-cookie-canary", "private-authorization-canary",
      "CSV-content-canary", "Без подраздела", "private-bind-canary", "secret_table", "SELECT ", "INSERT "];
    const assertPrivate = value => { for (const canary of canaries) assert.ok(!JSON.stringify(value).includes(canary), "sensitive canary leaked"); };
    if (process.env.BD_OBSERVABILITY_BROWSER_QA === "1") {
      const require = createRequire(import.meta.url), { chromium } = require("playwright-core");
      const { resolveBrowserExecutable, chromiumArgs } = require("../scripts/browser-runtime.cjs");
      browser = await chromium.launch({ executablePath: await resolveBrowserExecutable(chromium.executablePath()), args: chromiumArgs, headless: true });
    }
    for (const table of ["workspace_memberships", "venue_memberships"]) {
      // Trigger text deliberately contains real LOCAL session and payload canaries.
      // D1 must still expose only the allowed code/classification to our logs.
      const injected = `private-bind-canary ${actor.token} CSV-content-canary SELECT * FROM secret_table`;
      await db.exec(`CREATE TRIGGER qa_owner_fault BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT, '${injected.replaceAll("'", "''")}'); END`);
      for (const width of browser ? [1280, 390] : [0]) {
        await events(); const before = await snapshot();
        let response, context;
        const clientLogs = [], pageErrors = [];
        try {
          if (browser) {
            context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 600, hasTouch: width < 600 });
            const page = await context.newPage();
            page.on("pageerror", e => pageErrors.push(e.message));
            page.on("console", message => { if (message.type() === "info") clientLogs.push(JSON.parse(message.text())); });
            await page.route("**/*", async route => {
              const req = route.request(), url = new URL(req.url()); assert.equal(url.origin, "http://localhost");
              if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Local error contract</title>" });
              const res = await mf.dispatchFetch(req.url(), { method: req.method(), headers: req.headers(), body: req.postDataBuffer() });
              return route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() });
            });
            await page.goto("http://localhost/"); await page.addScriptTag({ content: readFileSync("public/bd-request-observability.js", "utf8") });
            response = await page.evaluate(async ({ headers, correction }) => {
              const res = await fetch("/api/menu/ingestion", { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(correction) });
              return { status: res.status, headers: Object.fromEntries(res.headers), body: await res.json() };
            }, { headers, correction });
          } else {
            const res = await send(correction); response = { status: res.status, headers: Object.fromEntries(res.headers), body: await res.json() };
          }
          assert.equal(response.status, 500); assert.equal(response.body.ok, false); assert.equal(response.body.code, "INFRASTRUCTURE_ERROR");
          assert.match(response.body.requestId, /^[a-f0-9-]{36}$/);
          assert.equal(response.body.requestId, response.headers["x-bd-request-id"]);
          assert.match(response.headers["x-bd-correlation-id"], /^[a-f0-9-]{36}$/);
          assert.doesNotMatch(JSON.stringify(response.body), /D1|SQLITE|constraint|stack|cause/);
          const record = await events(), rows = record.events.filter(e => e.requestId === response.body.requestId);
          assert.ok(!record.events.some(e => e.unexpectedFrameworkError || e.unexpectedFrameworkBoundary));
          const failures = rows.filter(e => e.event === "infrastructure.failure"); assert.equal(failures.length, 1);
          const failure = failures[0]; assert.equal(failure.operation, "d1.batch");
          assert.equal(failure.authenticationStage, "auth.ensure_owner_venue"); assert.equal(failure.ownerReconciliationStage, "owner.membership_batch");
          assert.equal(failure.attempt, 1); assert.equal(failure.casAttempt, 1); assert.equal(failure.casMaxAttempts, 3);
          assert.ok(failure.error.codes.includes("SQLITE_CONSTRAINT_TRIGGER"));
          assert.ok(failure.error.cause.codes.includes("SQLITE_CONSTRAINT_TRIGGER"));
          assert.equal(rows.filter(e => e.event === "await.start" && e.stage === "owner.membership_batch").length, 1, "no ordinary D1 retry");
          assert.ok(rows.some(e => e.event === "error.boundary")); assert.equal(rows.at(-1).status, 500);
          assert.deepEqual(record.bodies, [{ path: "/api/menu/ingestion", bodyUsed: false }], "failure precedes payload processing");
          assert.equal(record.payloadReads, 0, "CAS-cloned request payload is never read during early auth failure");
          assert.deepEqual(await snapshot(), before, "owner batch rollback, draft/canonical/audit unchanged");
          assertPrivate([record, response, clientLogs]); assert.deepEqual(pageErrors, []);
          if (browser) assert.ok(clientLogs.some(e => e.event === "client.request.end" && e.requestId === response.body.requestId && e.correlationId === failure.correlationId && e.status === 500), JSON.stringify({ clientLogs, requestId: response.body.requestId, correlationId: failure.correlationId }));
          console.info(`PASS isolated ${table} fault ${width || "HTTP"}: rollback, correlated safe 500, no retry/leak/write`);
        } finally { await context?.close(); }
      }
      await db.exec("DROP TRIGGER qa_owner_fault");
    }
    await events();
    const healthy = await send(correction); assert.equal(healthy.status, 200); const corrected = (await healthy.json()).draft;
    const healthyEvents = await events();
    assert.equal(healthyEvents.payloadReads, 1, "the body-read observer covers the actual CAS command clone");
    assertPrivate(healthyEvents.events);
    assert.equal(corrected.revision, 3); assert.equal(Number(corrected.rows[0].item.salePrice), 17); assert.equal(corrected.rows[0].reviewed, true);
    const after = await snapshot();
    assert.deepEqual(after.domain.find(r => r.store_key === "bd_assortment_v1"), baseline.domain.find(r => r.store_key === "bd_assortment_v1"));
    assert.deepEqual(after.audit, baseline.audit); assert.equal(after.venue.length, 1); assert.equal(after.workspace.length, 1);
    assert.deepEqual(after.sequences.map((row, i) => row.seq - baseline.sequences[i].seq), [1, 1], "healthy unconditional reconciliation semantics preserved");
    for (const deniedHeaders of [{ ...headers, "x-session-token": "invalid-session" }, { ...headers, "x-venue-id": "999999" }]) {
      const denied = await call("/api/menu/ingestion", correction, deniedHeaders); assert.equal(denied.status, 401);
    }
    assertPrivate((await events()).events); assert.equal(outbound, 0);
    console.info("PASS healthy correction, owner semantics and denied auth; production/external requests: 0");
  } finally { await browser?.close(); await mf.dispose(); }
});
