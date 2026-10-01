import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import type { BrowserContext, Page, Route } from "playwright-core";
import { menuActionReadiness, waitForMenuCloudReady } from "./menu-action-readiness";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

/** Observe the actual component's analytics hook without changing React state. */
export async function menuAnalytics(page: Page) {
  return page.evaluate(() => {
    type Hook = { memoizedState?: unknown; next?: Hook };
    type Fiber = { type?: { name?: string }; return?: Fiber; child?: Fiber; sibling?: Fiber; memoizedState?: Hook; stateNode?: { current?: Fiber } };
    const main = document.querySelector(".bd-assortment-command-v170");
    const key = main && Object.keys(main).find(name => name.startsWith("__reactFiber$"));
    let root: Fiber | undefined = main && key ? (main as unknown as Record<string, Fiber>)[key] : undefined;
    while (root?.return) root = root.return;
    // DOM's attached fiber can be the alternate from the preceding render.
    // Read React's current tree so the assertion observes the committed result.
    const pending: Fiber[] = root?.stateNode?.current ? [root.stateNode.current] : [];
    let fiber: Fiber | undefined;
    while (pending.length) {
      const candidate = pending.pop()!;
      if (candidate.type?.name === "bdAssortmentCommandPageV170") { fiber = candidate; break; }
      if (candidate.child) pending.push(candidate.child);
      if (candidate.sibling) pending.push(candidate.sibling);
    }
    for (let hook = fiber?.memoizedState; hook; hook = hook.next) {
      const value = hook.memoizedState as { summary?: unknown; menuItems?: unknown } | null;
      if (value?.summary && Array.isArray(value.menuItems)) return value;
    }
    return null;
  });
}

type Options = {
  page: Page; context: BrowserContext; getCanonical: () => unknown;
  profile: string; out: string;
};

/** Execute real local overview handlers; gate response delivery, never application state. */
export async function menuChooserAnalyticsRegression({ page, context, getCanonical, profile, out }: Options) {
  const evidence: unknown[] = [];
  const sources = ["Добавить вручную", "Распознать · камера", "Импорт · PDF"];
  const chooser = page.getByRole("dialog", { name: "Источник меню", exact: true });
  const assertSources = async () => {
    for (const source of sources) {
      const option = page.getByRole("button", { name: new RegExp(source) });
      await option.waitFor(); assert.equal(await option.isEnabled(), true);
    }
  };
  for (const [index, selection] of ["success", "error", "success", "manual", "scan", "import"].entries()) {
    const outcome = selection === "error" ? "error" : "success";
    await page.getByRole("tab", { name: "Обзор", exact: true }).click();
    const period = page.getByLabel("Период анализа"); await period.waitFor();
    await page.waitForLoadState("networkidle");
    const before = JSON.stringify(getCanonical());
    const held = deferred(), delivery = deferred(), complete = deferred();
    let expected: unknown = null, periodKey = "";
    const handler = async (route: Route) => {
      const response = await route.fetch();
      assert.equal(response.status(), 200, "real isolated overview handler succeeds before fault injection");
      const body = await response.json(); assert.equal(body.ok, true);
      expected = body.analytics; held.resolve(); await delivery.promise;
      if (outcome === "error") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "QA analytics unavailable" }) });
      else await route.fulfill({ response });
      complete.resolve();
    };
    await context.route("**/api/assortment/overview?**", handler);
    try {
      const current = await period.inputValue();
      periodKey = (await period.locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).find(value => value !== current)!;
      await period.selectOption(periodKey); await held.promise;
      await page.getByRole("tab", { name: "Меню", exact: true }).click(); await waitForMenuCloudReady(page);
      const readyBefore = await menuActionReadiness(page);
      await page.getByRole("button", { name: "Добавить позицию", exact: true }).click(); await assertSources();
      const editor = page.locator(".bd-menu-position-editor-v400");
      if (selection === "manual") {
        await page.getByRole("button", { name: /Добавить вручную/ }).click(); await editor.waitFor();
        await editor.getByLabel("Название", { exact: true }).fill("Unsaved analytics regression " + profile);
      } else if (selection === "scan" || selection === "import") {
        const [file] = await Promise.all([
          page.waitForEvent("filechooser"),
          page.getByRole("button", { name: selection === "scan" ? /Распознать · камера/ : /Импорт · PDF/ }).click(),
        ]);
        // Dismiss the real native picker. Complete adapters/drafts are exercised
        // by the main matrix, including background reads during their reviews.
        await file.setFiles([]);
      }
      await page.screenshot({ path: `${out}/${profile}-analytics-${index}-held.png`, fullPage: true });
      delivery.resolve(); await complete.promise;
      if (outcome === "error") {
        await page.locator('[data-analytics-state="error"]').waitFor();
        await page.getByText("Показаны локальные данные. Серверную аналитику не удалось обновить.", { exact: false }).waitFor();
        assert.equal(await menuAnalytics(page), null);
      } else {
        await page.waitForFunction(() => !document.querySelector("[data-analytics-state]")?.getAttribute("data-analytics-state"));
        assert.deepEqual(await menuAnalytics(page), expected, "successful background analytics are actually applied");
      }
      if (["success", "error"].includes(selection)) await assertSources();
      else {
        await chooser.waitFor({ state: "hidden" });
        if (selection === "manual") {
          assert.equal(await editor.isVisible(), true);
          assert.equal(await editor.getByLabel("Название", { exact: true }).inputValue(), "Unsaved analytics regression " + profile);
          await editor.getByRole("button", { name: "Отмена", exact: true }).filter({ visible: true }).click();
          await editor.waitFor({ state: "hidden" });
        }
        await page.getByRole("button", { name: "Добавить позицию", exact: true }).click(); await assertSources();
      }
      const readyAfter = await menuActionReadiness(page); assert.deepEqual(readyAfter, readyBefore);
      assert.equal(JSON.stringify(getCanonical()), before, "analytics and chooser never mutate canonical data");
      await page.screenshot({ path: `${out}/${profile}-analytics-${index}-delivered.png`, fullPage: true });
      // Explicit dismiss and reopen still work after success and error.
      await chooser.getByRole("button", { name: "Закрыть", exact: true }).click();
      await page.getByRole("button", { name: /Добавить вручную/ }).waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Добавить позицию", exact: true }).click(); await assertSources();
      await chooser.getByRole("button", { name: "Закрыть", exact: true }).click();
      evidence.push({ outcome, selection, period: periodKey, chooserLifecyclePreserved: true, allSourcesAvailableAfterDelivery: true, analyticsApplied: outcome === "success", analyticsErrorVisible: outcome === "error", readyBefore, readyAfter, canonicalUnchanged: true, closeReopen: true });
    } finally { delivery.resolve(); await context.unroute("**/api/assortment/overview?**", handler); }
  }
  writeFileSync(`${out}/${profile}-analytics-state.json`, JSON.stringify(evidence, null, 2));
}

/** A fresh real background read must preserve editor/draft and validation UI state. */
export async function menuBackgroundReadPreserves({ page, context, getCanonical, profile, out }: Options, stage: string, observe: () => Promise<unknown>) {
  const evidence: unknown[] = [];
  for (const outcome of ["success", "error"]) {
  const before = JSON.stringify(getCanonical()), uiBefore = await observe(), readiness = await menuActionReadiness(page);
  const done = deferred(); let expected: unknown;
  const handler = async (route: Route) => {
    const response = await route.fetch(); assert.equal(response.status(), 200);
    expected = (await response.json()).analytics;
    if (outcome === "error") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "QA analytics unavailable" }) });
    else await route.fulfill({ response });
    done.resolve();
  };
  await context.route("**/api/assortment/overview?**", handler);
  try {
    // The production store notification starts the normal read effect. Its
    // canonical cache is unchanged; no response or application state is mocked.
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("bd:store-updated", { detail: { storeKey: "bd_assortment_v1" } })));
    await done.promise;
    if (outcome === "error") {
      await page.locator('[data-analytics-state="error"]').waitFor(); assert.equal(await menuAnalytics(page), null);
    } else {
      await page.waitForFunction(() => !document.querySelector("[data-analytics-state]")?.getAttribute("data-analytics-state"));
      assert.deepEqual(await menuAnalytics(page), expected);
    }
    assert.deepEqual(await observe(), uiBefore, stage + " state survives background analytics");
    assert.deepEqual(await menuActionReadiness(page), readiness);
    assert.equal(JSON.stringify(getCanonical()), before);
    evidence.push({ outcome, stage, uiBefore, uiAfter: await observe(), readinessUnchanged: true, canonicalUnchanged: true, analyticsApplied: outcome === "success" });
    await page.screenshot({ path: `${out}/${profile}-background-${stage}-${outcome}.png`, fullPage: true });
  } finally { await context.unroute("**/api/assortment/overview?**", handler); }
  }
  writeFileSync(`${out}/${profile}-background-${stage}.json`, JSON.stringify(evidence, null, 2));
}
