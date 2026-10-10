import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { GET as teamPage } from "../app/team-access/route";

const require = createRequire(import.meta.url);
const { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const r = await lifecycleRuntime({ access: "./app/api/access/route", members: "./app/api/access/members/[id]/route" });
const owner = await r.register("staff-browser-owner@isolated.test");
const staff = await r.register("staff-browser-member@isolated.test");
// Only the in-memory fixture is changed. No remote server, real code or account is used.
r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,job_title,status,permissions_json) VALUES (?,?,'cashier','waiter','active',?)")
  .run(owner.activeVenueId, staff.userId, JSON.stringify({ deny: ["sales.post"], allow: [] }));
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/team-access") {
      const html = teamPage(new Request("http://127.0.0.1/team-access?embedded=1"));
      res.writeHead(html.status, Object.fromEntries(html.headers)); res.end(await html.text()); return;
    }
    if (url.pathname.startsWith("/api/access")) {
      const parts: Buffer[] = []; for await (const part of req) parts.push(part);
      const body = Buffer.concat(parts);
      const input = new Request(url, { method: req.method, headers: req.headers as Record<string, string>, ...(req.method === "GET" ? {} : { body }) });
      const id = url.pathname.match(/^\/api\/access\/members\/(\d+)$/)?.[1];
      const response = id ? await r.api.members.PATCH(input, { params: Promise.resolve({ id }) })
        : req.method === "POST" ? await r.api.access.POST(input) : await r.api.access.GET(input);
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
    }
    // Isolate this editor's workflow; shell/bootstrap is covered by the POS landing tests.
    if (url.pathname.endsWith(".js") && url.pathname !== "/team-access.js") {
      res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(""); return;
    }
    const path = resolve("public", "." + url.pathname);
    if (!path.startsWith(resolve("public") + "/") || !existsSync(path)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": ({ ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" } as Record<string, string>)[extname(path)] || "application/octet-stream" });
    res.end(readFileSync(path));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Fixture error"); }
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
let browser;
try {
  browser = await chromium.launch({ executablePath: await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: [...chromiumArgs, "--no-proxy-server", "--disable-dev-shm-usage"] });
  mkdirSync("outputs/pos-workspace", { recursive: true });
  for (const profile of [{ name: "desktop", width: 1440, height: 1000 }, { name: "iphone", width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: profile });
    await context.addInitScript(user => {
      localStorage.setItem("bd_session", user.email); localStorage.setItem("bd_session_token", user.token); localStorage.setItem("bd_active_venue_id", String(user.activeVenueId));
    }, owner);
    const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/team-access?embedded=1");
    await page.locator("#access-content").waitFor({ state: "visible" });
    for (const label of ["Кассир", "Официант", "Бариста", "Бармен"]) assert.equal(await page.locator("#invite-role option").filter({ hasText: new RegExp("^" + label + "$") }).count(), 1);
    await page.locator("#invite-role").selectOption("barista"); await page.locator("#create-invite").click();
    await page.locator("#invite-result").waitFor({ state: "visible" });
    assert.match(await page.locator("#invite-expiry").innerText(), /^Бариста\./);
    const persisted = r.sqlite.prepare("SELECT role,job_title FROM venue_invites ORDER BY id DESC LIMIT 1").get();
    assert.equal(persisted?.role, "cashier"); assert.equal(persisted?.job_title, "barista");
    const member = page.locator(".member-row").filter({ hasText: staff.email });
    await member.locator("select").selectOption(profile.name === "desktop" ? "bartender" : "waiter");
    await member.locator(".role-pill").filter({ hasText: profile.name === "desktop" ? "Бармен" : "Официант" }).waitFor();
    const saved = r.sqlite.prepare("SELECT role,job_title,permissions_json FROM venue_memberships WHERE venue_id=? AND account_id=?").get(owner.activeVenueId, staff.userId)!;
    assert.equal(saved.role, "cashier"); assert.deepEqual(JSON.parse(String(saved.permissions_json)).deny, ["sales.post"]);
    await member.getByRole("button", { name: "Настроить права" }).click();
    assert.equal(await page.locator("#permission-list input").count(), 3);
    await page.keyboard.press("Escape"); assert.equal(await page.locator("#permission-sheet").isVisible(), false);
    await page.reload(); await page.locator("#access-content").waitFor({ state: "visible" });
    assert.equal(await member.locator("select").inputValue(), saved.job_title);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no horizontal overflow");
    await page.screenshot({ path: `outputs/pos-workspace/${profile.name}-staff-access.png`, fullPage: true });
    assert.deepEqual(errors, []); await context.close(); console.log(profile.name + " staff access PASS");
  }
} finally { await browser?.close(); await new Promise<void>(resolve => server.close(() => resolve())); r.close(); }
