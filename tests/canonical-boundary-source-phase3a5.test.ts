import assert from "node:assert/strict";
import test from "node:test";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";

async function fixture() {
  const r = await lifecycleRuntime({ health: "./app/api/business-health/route", check: "./app/api/recommendations/check/route", doctor: "./lib/bardoctor/ai-handlers", context: "./lib/bardoctor/venue-ai-context", memory: "./lib/bardoctor/ai-doctor-attention", external: "./lib/bardoctor/diagnosis-context", stores: "./app/api/store/route", store: "./app/api/store/[key]/route" }, { now: "2026-10-02T12:00:00.000Z" });
  const owner = await r.register("boundary-owner@isolated.test"), member = await r.register("boundary-member@isolated.test"), foreign = await r.register("boundary-foreign@isolated.test");
  const venueId = owner.activeVenueId;
  const workspaceId = Number(r.sqlite.prepare("SELECT workspace_id id FROM venues WHERE id=?").get(venueId)!.id);
  r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspaceId, member.userId);
  r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'manager')").run(venueId, member.userId);
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Boundary", city: "Test", currency: "MDL", timezone: "Europe/Chisinau" }), owner.userId);
  function put(key: string, data: unknown, id = owner.userId) { r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").run(id, key, JSON.stringify(data), "2026-10-02T09:00:00.000Z"); }
  function permissions(deny: string[]) { r.sqlite.prepare("UPDATE venue_memberships SET permissions_json=?,status='active' WHERE venue_id=? AND account_id=?").run(JSON.stringify({ deny }), venueId, member.userId); }
  function request(path: string, method = "GET", body?: unknown, user = member, selected = venueId) { const req = r.request(user, path, method, body); req.headers.set("X-Venue-Id", String(selected)); return req; }
  async function account(user = member) { const account = await r.api.auth.authenticateRequest(request("/api/auth/bootstrap", "GET", undefined, user)); assert.ok(account); return account; }
  put("bd_finance_expenses", [{ id: "private-expense", amount: 876543, description: "FINANCE-SECRET", date: "2026-10-01" }]);
  put("bd_payroll_entries", [{ id: "private-payroll", amount: 765432, employeeName: "PAYROLL-SECRET", date: "2026-10-01" }]);
  put("bd_employees", [{ id: "private-employee", name: "TEAM-SECRET", salary: 321987 }]);
  put("bd_guest_reviews", [{ id: "private-review", source: "manual", text: "REVIEW-SECRET", rating: 1, date: "2026-10-01" }]);
  put("bd_assortment_v1", { nomenclature: [{ id: "private-item", name: "INVENTORY-SECRET", price: 654321 }], menuItems: [] });
  put("bd_ai_diagnosis_v9", { summary: "FINANCE-SECRET 876543" });
  put("bd_tasks", [{ id: "private-task", title: "TASK-SECRET" }]);
  return { ...r, owner, member, foreign, venueId, workspaceId, put, permissions, request, account };
}

const denySources = ["finance.view", "payroll.view", "reviews.view", "inventory.view", "team.view", "shifts.view", "sales.view", "calendar.view", "reports.view"];

test("owner full access; partial manager context is restricted and invariant under forbidden source mutations", async t => {
  const r = await fixture(); t.after(r.close);
  const context = r.api.context as unknown as typeof import("../lib/bardoctor/venue-ai-context");
  const owner = await context.loadVenueAIContext(await r.account(r.owner), "diagnosis");
  assert.equal((owner.promptData.performanceHistory.period as Record<string, unknown>).expenses, 876543);
  assert.equal(owner.promptData.guestFeedback.total, 1);
  const manager = await context.loadVenueAIContext(await r.account(), "diagnosis");
  assert.deepEqual(manager.promptData, owner.promptData);
  assert.equal((await r.api.health.GET(r.request("/api/business-health", "GET", undefined, r.owner))).status, 200);
  r.permissions(denySources);
  const before = await context.loadVenueAIContext(await r.account(), "diagnosis", { finance: { monthToDate: { revenue: 987654, totalExpenses: 876543 } }, employees: [{ name: "BODY-SECRET" }] });
  for (const id of ["performanceHistory", "team", "guestFeedback", "menuAndRecipes", "purchasesAndInventory", "seasonalityAndEvents"]) {
    const block = before.blocks.find(b => b.id === id)!;
    assert.equal(block.available, false); assert.equal(block.updatedAt, null); assert.deepEqual(block.data, { availability: "RESTRICTED" });
  }
  assert.doesNotMatch(JSON.stringify(before), /SECRET|876543|765432|654321|321987|987654/);
  r.put("bd_finance_expenses", [{ id: "new-secret", amount: 123456789 }]); r.put("bd_guest_reviews", Array.from({ length: 50 }, (_, i) => ({ id: String(i), rating: 1, text: "DIFFERENT-SECRET" })));
  assert.deepEqual(await context.loadVenueAIContext(await r.account(), "diagnosis", { finance: { monthToDate: { revenue: 987654, totalExpenses: 876543 } }, employees: [{ name: "BODY-SECRET" }] }), before);
});

test("analysis.run/tasks.view do not grant underlying sources through Health, Doctor, check or persisted diagnosis bootstrap", async t => {
  const r = await fixture(); t.after(r.close);
  r.permissions(["finance.view"]);
  const health = await r.api.health.GET(r.request("/api/business-health"));
  const doctor = await r.api.doctor.handleDiagnosis(r.request("/api/ai/diagnosis", "POST", { profile: {} }));
  const check = await r.api.check.POST(r.request("/api/recommendations/check", "POST", { recommendations: [{ id: "guessed", metricId: "profit_margin", title: "test" }] }));
  for (const response of [health, doctor, check]) { assert.equal(response.status, 403); const body = await response.json() as { availability: string }; assert.equal(body.availability, "RESTRICTED"); assert.doesNotMatch(JSON.stringify(body), /SECRET|private-|876543|finance.view/); }
  const bootstrap = await r.api.stores.GET(r.request("/api/store"));
  assert.ok(!(await bootstrap.json() as { entries: Record<string, unknown> }).entries.bd_ai_diagnosis_v9);
  const store = r.api.store as unknown as typeof import("../app/api/store/[key]/route");
  assert.equal((await store.GET(r.request("/api/store/bd_ai_diagnosis_v9"), { params: Promise.resolve({ key: "bd_ai_diagnosis_v9" }) })).status, 403);
});

test("memory and external source loaders enforce their own source permissions; tenant and revoked memberships fail closed", async t => {
  const r = await fixture(); t.after(r.close);
  r.permissions([...denySources, "analysis.view", "tasks.view"]);
  const account = await r.account();
  const memory = r.api.memory as unknown as typeof import("../lib/bardoctor/ai-doctor-attention");
  assert.deepEqual(await memory.loadAIDoctorMemory(account), { tasks: [], actionTasks: [], decisions: [] });
  const external = r.api.external as unknown as typeof import("../lib/bardoctor/diagnosis-context");
  const result = await external.loadDiagnosisExternalContext(account);
  assert.equal(result.reviewSync.attempted, false); assert.equal(result.reviews.total, null); assert.equal(result.reviews.availability, "RESTRICTED"); assert.deepEqual(result.confirmedCompetitors, []); assert.doesNotMatch(JSON.stringify(result), /SECRET/);
  for (const selected of [r.foreign.activeVenueId, 999999]) assert.equal((await r.api.health.GET(r.request("/api/business-health", "GET", undefined, r.member, selected))).status, 401);
  r.permissions([]);
  r.sqlite.prepare("UPDATE workspace_memberships SET status='revoked' WHERE workspace_id=? AND account_id=?").run(r.workspaceId, r.member.userId);
  assert.equal((await r.api.health.GET(r.request("/api/business-health"))).status, 401);
  r.sqlite.prepare("UPDATE workspace_memberships SET status='active' WHERE workspace_id=? AND account_id=?").run(r.workspaceId, r.member.userId);
  r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId, r.member.userId);
  assert.equal((await r.api.check.POST(r.request("/api/recommendations/check", "POST", { recommendations: [{}] }))).status, 401);
});

test("persisted Doctor memory remains protected when tasks.view is revoked even with full numeric source rights", async t => {
  const r = await fixture(); t.after(r.close);
  r.permissions(["tasks.view"]);
  assert.equal((await r.api.health.GET(r.request("/api/business-health"))).status, 200);
  assert.equal((await r.api.doctor.handleDiagnosis(r.request("/api/ai/diagnosis", "POST", { profile: {} }))).status, 403);
  const store = r.api.store as unknown as typeof import("../app/api/store/[key]/route");
  assert.equal((await store.GET(r.request("/api/store/bd_ai_diagnosis_v9"), { params: Promise.resolve({ key: "bd_ai_diagnosis_v9" }) })).status, 403);
  const data = await (await r.api.stores.GET(r.request("/api/store"))).json() as { entries: Record<string, unknown> };
  assert.ok(!data.entries.bd_ai_diagnosis_v9);
});
