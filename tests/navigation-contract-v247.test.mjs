import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadContract(href = "https://bardoctor.test/home") {
  const source = await readFile(new URL("../public/navigation-contract-v247.js", import.meta.url), "utf8");
  const current = new URL(href);
  const context = {
    URL, URLSearchParams, Set,
    window: { location: { href: current.href, origin: current.origin } },
    document: { documentElement: { setAttribute() {} } },
  };
  vm.runInNewContext(source, context);
  return context.window.bdNavigationContract;
}

test("every registered non-root screen has a canonical exit contract", async () => {
  const contract = await loadContract();
  for (const [path, metadata] of Object.entries(contract.routes)) {
    if (["root", "public", "redirect", "compatibility", "admin-root"].includes(metadata.type)) continue;
    assert.ok(metadata.parent, `${path} must have a canonical parent`);
    assert.ok(contract.isRegistered(`https://bardoctor.test${metadata.parent}`), `${path} parent must be registered`);
  }
});

test("deep links, refreshes and venue-aware query state resolve without browser history", async () => {
  const contract = await loadContract();
  const inventory = contract.resolve("https://bardoctor.test/warehouse?venue=7&tab=counts&inventory=inv-2");
  assert.equal(inventory.type, "fullscreen");
  assert.equal(inventory.parent, "/warehouse?venue=7&tab=counts");
  assert.equal(inventory.headerMode, "owned");
  assert.equal(inventory.bottomNav, false);

  const product = contract.resolve("https://bardoctor.test/warehouse?venue=7&tab=products&q=tonic&product=tonic");
  assert.equal(product.parent, "/warehouse?venue=7&tab=products&q=tonic");
  assert.equal(product.type, "sheet");
  assert.equal(product.headerMode, "underlay");
  assert.equal(contract.isSafeInternal("https://bardoctor.test/warehouse?venue=7&tab=products&q=tonic"), true);
  assert.equal(contract.isSafeInternal("https://bardoctor.test/login?next=%2Fwarehouse"), false);
  assert.equal(contract.isSafeInternal("https://outside.test/warehouse"), false);
});

test("modal, sheet, header and print regressions keep explicit exit paths", async () => {
  const [transient, shellCss, warehouseCss, embeddedCss, bundle, print, route] = await Promise.all([
    readFile(new URL("../public/navigation-transient-v247.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app-shell-v185.css", import.meta.url), "utf8"),
    readFile(new URL("../public/warehouse.css", import.meta.url), "utf8"),
    readFile(new URL("../public/embedded-shell-v269.css", import.meta.url), "utf8"),
    readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/bardoctor/inventory-counts.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/inventory/counts/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(transient, /popstate/);
  assert.match(transient, /Escape/);
  assert.match(transient, /record\.trigger\.focus/);
  assert.match(transient, /document\.body\.style\.overflow = "hidden"/);
  assert.match(shellCss, /fullscreen-owned/);
  assert.match(warehouseCss, /body\.bd-inventory-overlay-open-v246 > bd-app-header/);
  assert.match(warehouseCss, /body\.bd-inventory-overlay-open-v246 nav\[data-bd-bottom-nav\]/);
  assert.match(bundle, /d\.href="\/embedded-shell-v269\.css(?:\?v=20260825-layout-v279)?"/);
  assert.doesNotMatch(bundle, /d\.id="bd-embedded-shell-style";\s*d\.textContent=/);
  assert.match(embeddedCss, /\.bd-canonical-navigation/);
  assert.match(print, /← Назад к инвентаризации/);
  assert.match(print, /Печать \/ PDF/);
  assert.match(route, /Сессия завершена/);
  assert.match(route, /Инвентаризация не найдена/);
  assert.match(route, /Нет доступа/);
});
