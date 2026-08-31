import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";

const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = await readFile(new URL("../public/catalog.css", import.meta.url), "utf8");

test("compiled tech-card consistency patch remains valid", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
});

test("ingredient selector keeps canonical matching and uses the complete structured catalogue", () => {
  for (const marker of [
    "bd-tech-card-consistency-v299",
    "bd-tech-card-catalog-picker-v368",
    "Поиск по всей номенклатуре",
    "Все активные складские позиции · по алфавиту",
    "Все разделы",
    "Все категории",
    "Все подкатегории",
  ]) assert.ok(bundle.includes(marker), marker);
  assert.ok(!bundle.includes("const P=bdCatRankProductsV258(e,t,s),c=s?P:P.slice(0,20)"));
});

test("approval waits for persistence and refreshes from authoritative cache", () => {
  assert.ok(bundle.includes("const c=await qr(bdCatalogStoreKey,P),p=bdCatState(xr(bdCatalogStoreKey)||P)"));
  assert.ok(bundle.includes("Подтвердите связь и единицу каждого ингредиента."));
  assert.ok(bundle.includes("await s({...l,ingredients:c,status:p?\"confirmed\":\"draft\""));
});

test("recipe creation requires an explicit menu-item choice and opens the shared editor atomically", () => {
  assert.ok(bundle.includes('title:"Выберите позицию меню"'));
  assert.ok(!bundle.includes('w&&z(E.menuItems.find(R=>R.id===w.id)||null)'));
  assert.ok(bundle.includes('onRecipe:()=>{const w=E.menuItems.find(R=>R.id===ge.id);w&&(M(null),U(null),q(null),z(w))}'));
});

test("selector controls remain usable on mobile", () => {
  for (const marker of [".bd-ingredient-selector-v299", ".bd-tech-card-taxonomy-v368", "@media(max-width:640px)", "grid-template-columns:1fr", "position:sticky"]) {
    assert.ok(css.includes(marker), marker);
  }
});
