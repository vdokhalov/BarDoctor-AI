import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("new suppliers uses compact management IA instead of the landing hero", async () => {
  const [route, client, css] = await Promise.all([
    readFile(new URL("app/supplier-alternatives/route.ts", root), "utf8"),
    readFile(new URL("public/supplier-alternatives.js", root), "utf8"),
    readFile(new URL("public/supplier-alternatives.css", root), "utf8"),
  ]);
  assert.doesNotMatch(route, /class="hero"/);
  assert.doesNotMatch(route, /ЗАКУПОЧНАЯ РАЗВЕДКА|Обычно занимает несколько минут/);
  assert.match(route, /snapshot-status/);
  assert.match(client, /По внутренней позиции/);
  assert.match(client, /Сравнить/);
  assert.match(client, /Internal position/);
  assert.match(client, /Supplier product/);
  assert.match(client, /Без предложений/);
  assert.match(client, /Результаты сохраняются автоматически/);
  assert.match(css, /grid-auto-columns: minmax\(92px, 1fr\)/);
  assert.match(css, /calc\(112px \+ env\(safe-area-inset-bottom\)\)/);
});

test("saved offers remain visible while search progress runs and no result cache is authoritative", async () => {
  const client = await readFile(new URL("public/supplier-alternatives.js", root), "utf8");
  assert.match(client, /currentData = \(await api\("POST"/);
  assert.match(client, /render\(\);/);
  assert.match(client, /Показаны последние данные/);
  assert.doesNotMatch(client, /localStorage\.setItem\([^\n]*supplier/i);
  assert.doesNotMatch(client, /sessionStorage\.setItem\([^\n]*supplier/i);
});

test("search, filtering, decision persistence, delete and venue-scoped headers remain wired", async () => {
  const [client, api] = await Promise.all([
    readFile(new URL("public/supplier-alternatives.js", root), "utf8"),
    readFile(new URL("app/api/supplier-alternatives/route.ts", root), "utf8"),
  ]);
  assert.match(client, /Найти товар или поставщика/);
  assert.match(client, /confirmed/);
  assert.match(client, /checking/);
  assert.match(client, /dismissed/);
  assert.match(client, /action: "delete"/);
  assert.match(client, /X-Venue-Id/);
  assert.match(api, /account\.id, STORE_KEY/);
  assert.match(api, /await saveStore\(account\.id, updated\)/);
  assert.match(api, /positionGroups: groupSupplierOffers\(alternatives\)/);
});

test("internal supplier screens return to their parent view before leaving the module", async () => {
  const client = await readFile(new URL("public/supplier-alternatives.js", root), "utf8");
  assert.match(client, /else back\.removeAttribute\("data-bd-back"\)/);
  assert.match(client, /window\.bdHandleEmbeddedBack = handleInternalBack/);
  assert.match(client, /if \(activeView\.name === "offer"\) setView\("comparison"/);
  assert.match(client, /else setView\("positions"\)/);
  assert.match(client, /positionsScrollTop = window\.scrollY/);
  assert.match(client, /name === "positions" && previousView !== "positions" \? positionsScrollTop : 0/);
});
