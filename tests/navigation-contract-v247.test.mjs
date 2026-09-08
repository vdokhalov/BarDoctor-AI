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

test("new and persisted write-off routes own their fullscreen lifecycle and preserve venue on close", async () => {
  const contract = await loadContract();
  for (const id of ["new", "posted-document", "draft-document"]) {
    const screen = contract.resolve("https://bardoctor.test/warehouse?venue=901&tab=writeoffs&writeoff=" + id);
    assert.equal(screen.type, "fullscreen");
    assert.equal(screen.parent, "/warehouse?venue=901&tab=writeoffs");
    assert.equal(screen.shell, "fullscreen-owned");
    assert.equal(screen.bottomNav, false);
  }
});

test("delayed unsaved-confirmation cleanup cannot reopen a prior write-off or retain scroll locks", async () => {
  const contractSource = await readFile(new URL("../public/navigation-contract-v247.js", import.meta.url), "utf8");
  const transientSource = await readFile(new URL("../public/navigation-transient-v247.js", import.meta.url), "utf8");
  for (const route of ["/warehouse?venue=901&tab=writeoffs&writeoff=new", "/warehouse?venue=901&tab=writeoffs&writeoff=draft"]) {
    let backCalls = 0;
    let pushCalls = 0;
    let restoredFullscreen = 0;
    const frames = [];
    const classes = new Set();
    const classList = { add: (name) => classes.add(name), remove: (name) => classes.delete(name) };
    class Element {
      isConnected = true;
      hidden = false;
      dataset = {};
      getAttribute() { return null; }
      closest() { return null; }
      focus() {}
      contains() { return false; }
      querySelectorAll() { return [close]; }
      querySelector() { return close; }
    }
    const close = new Element();
    close.textContent = "Отмена";
    const confirm = new Element();
    const document = {
      activeElement: close,
      body: { style: { overflow: "" }, classList },
      documentElement: { style: { overflow: "" }, setAttribute() {} },
      querySelectorAll: () => confirm.isConnected ? [confirm] : [],
      addEventListener() {},
    };
    const window = {
      location: new URL("https://bardoctor.test" + route),
      history: {
        state: {},
        pushState(state) { pushCalls++; this.state = state; },
        back() { backCalls++; restoredFullscreen++; },
      },
      getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
      requestAnimationFrame: (callback) => frames.push(callback),
      setTimeout() {},
      addEventListener() {},
    };
    const context = { window, document, URL, URLSearchParams, HTMLElement: Element,
      MutationObserver: class { observe() {} } };
    vm.runInNewContext(contractSource, context);
    vm.runInNewContext(transientSource, context);
    assert.equal(document.body.style.overflow, "hidden", "visible confirmation must remain modal");
    while (frames.length) frames.shift()();
    // The React close callback wins the race before the observer's next frame.
    confirm.isConnected = false;
    window.location = new URL("https://bardoctor.test/warehouse?venue=901&tab=writeoffs");
    window.bdTransientNavigationV247.scan();
    while (frames.length) frames.shift()();
    assert.equal(pushCalls, 0, "URL-owned confirmation must not add a second history owner");
    assert.equal(backCalls, 0, "cleanup must not navigate to the previous document");
    assert.equal(restoredFullscreen, 0);
    assert.equal(document.body.style.overflow, "");
    assert.equal(document.documentElement.style.overflow, "");
    assert.equal(classes.size, 0);
    assert.equal(document.querySelectorAll().length, 0);
  }
});
