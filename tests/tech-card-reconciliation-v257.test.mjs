import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const command = bundle.slice(
  bundle.indexOf("function bdAssortmentCommandPageV170"),
  bundle.indexOf("/* bd-assortment-command-v170:end */"),
);
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

test("AI generation is idempotent and approved edits preserve one recipe identity", () => {
  assert.ok(bundle.includes('bdIdempotencyV418=oe.idempotencyKey||"menu-import:"'));
  assert.ok(bundle.includes("idempotencyKey:bdIdempotencyV418"));
  assert.ok(bundle.includes("bdExistingImportV418>=0?p[bdExistingImportV418]=Qe:p.push(Qe)"));
  assert.ok(bundle.includes('inactiveReason:bdActivateImportedRecipeV418?void 0:bdOtherActiveRecipesV418.length?"existing_recipe_requires_review":"menu_consumption_mode"'));
  assert.ok(command.includes('id:X?.id||w.id||crypto.randomUUID()'));
  assert.ok(command.includes('P.recipes.some(p=>p.id===Qe.id)?P.recipes.map'));
  assert.ok(!command.includes('version:ce+1'));
  assert.ok(command.includes('ownerType:"menu_item"'));
});

test("mobile filters remain horizontally usable and the v257 assets are cache-busted", () => {
  assert.ok(css.includes("overflow-x: auto"));
  assert.ok(css.includes("-webkit-overflow-scrolling: touch"));
  assert.ok(response.includes("20260823-tech-card-reconciliation-v257"));
  assert.match(response, /assortment-command-v170\.css\?v=[^"\n]*20260823-tech-card-reconciliation-v257/);
});
