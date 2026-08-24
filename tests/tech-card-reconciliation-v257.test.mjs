import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = await readFile(new URL("../public/assortment-command-v170.css", import.meta.url), "utf8");
const response = await readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8");

test("menu and recipe surfaces expose the canonical tech-card states and filters", () => {
  for (const label of [
    "Без техкарты",
    "Требуют проверки",
    "AI-черновики",
    "С техкартой",
    "Проблемы связей",
  ]) {
    assert.ok(bundle.includes(label), `missing UI label: ${label}`);
  }
  assert.ok(bundle.includes("bdAssortmentTechCardLabelV257"));
  assert.ok(bundle.includes("Не связано с номенклатурой"));
  assert.ok(bundle.includes("Себестоимость рассчитана не полностью"));
});

test("item detail exposes source, version, last update, ingredient count and pending draft", () => {
  assert.ok(bundle.includes("bd-tech-card-meta-v257"));
  assert.ok(bundle.includes("Есть отдельный AI-черновик. Утверждённая версия не перезаписана."));
  for (const label of ["Версия", "Источник", "Обновлена", "Ингредиенты"]) {
    assert.ok(bundle.includes(label));
  }
  assert.ok(css.includes(".bd-tech-card-meta-v257"));
  assert.ok(css.includes(".bd-tech-card-pending-v257"));
});

test("AI generation is idempotent and approved edits preserve version history", () => {
  assert.ok(bundle.includes('idempotencyKey:oe.idempotencyKey||"menu-import:"'));
  assert.ok(bundle.includes('X<0&&(ce>=0?p[ce]=Qe:p.push(Qe))'));
  assert.ok(bundle.includes('lifecycleStatus:"superseded"'));
  assert.ok(bundle.includes('version:ce+1'));
  assert.ok(bundle.includes('ownerType:"menu_item"'));
});

test("mobile filters remain horizontally usable and the v257 assets are cache-busted", () => {
  assert.ok(css.includes("overflow-x: auto"));
  assert.ok(css.includes("-webkit-overflow-scrolling: touch"));
  assert.ok(response.includes("20260823-tech-card-reconciliation-v257"));
  assert.match(response, /assortment-command-v170\.css\?v=[^"\n]*20260823-tech-card-reconciliation-v257/);
});
