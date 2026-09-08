import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";
import { runInNewContext } from "node:vm";

const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = await readFile(new URL("../public/catalog.css", import.meta.url), "utf8");

test("compiled tech-card consistency patch remains valid", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
});

test("ingredient selector keeps canonical matching and uses the complete structured catalogue", () => {
  for (const marker of [
    "bd-tech-card-consistency-v299",
    "bd-tech-card-search-ux-v375",
    "Поиск по всей номенклатуре",
    "Поиск по всему справочнику",
    "Все разделы",
    "Все категории",
    "Все подкатегории",
  ]) assert.ok(bundle.includes(marker), marker);
  assert.ok(!bundle.includes("const P=bdCatRankProductsV258(e,t,s),c=s?P:P.slice(0,20)"));
});

test("approval waits for persistence and refreshes from authoritative cache", async () => {
  const start = bundle.indexOf("Ne=async(w,R,");
  const end = bundle.indexOf(",Ee=async", start);
  assert.ok(start >= 0 && end > start);
  for (const synced of [true, false]) {
    const original = { recipes: [{ id: "recipe", quantity: 8 }] };
    const authoritative = { recipes: [{ id: "recipe", quantity: 10 }] };
    let resolveSave;
    const pending = new Promise((resolve) => { resolveSave = resolve; });
    const notifications = [];
    const context = { E: original, bdCatalogStoreKey: "catalog", bdCatState: (v) => v,
      Gc: () => ({}), _: () => {}, qr: () => pending, xr: () => authoritative,
      Kse: () => {}, lz: () => {}, jm: () => {}, a: (v) => notifications.push(v),
    };
    const save = runInNewContext(`(${bundle.slice(start + 3, end)})`, context);
    let completed = false;
    const result = save("Saved", { recipes: [] }, true).then((v) => { completed = true; return v; });
    await Promise.resolve();
    assert.equal(completed, false);
    assert.equal(notifications.length, 0);
    resolveSave(synced);
    const saved = await result;
    assert.equal(saved.synced, synced);
    assert.equal(saved.state, synced ? authoritative : original);
    assert.equal(notifications[0].variant, synced ? "success" : "error");
  }
  assert.ok(bundle.includes("Подтвердите связь и единицу каждого ингредиента."));
  assert.ok(bundle.includes('await s({...l,menuItemId:e.id,ownerId:e.id,ownerType:"menu_item",venueId:Number(bdRecipeVenueId)||l.venueId,status:p?"confirmed":"draft"'));
});

test("recipe creation requires an explicit menu-item choice and opens the shared editor atomically", () => {
  assert.ok(bundle.includes('title:"Выберите позицию меню"'));
  assert.ok(!bundle.includes('w&&z(E.menuItems.find(R=>R.id===w.id)||null)'));
  assert.ok(bundle.includes('onRecipe:()=>{const w=E.menuItems.find(R=>R.id===ge.id);w&&(M(null),U(null),q(null),z(w))}'));
});

test("selector controls remain usable on mobile", () => {
  for (const marker of [".bd-ingredient-selector-v299", ".bd-tech-card-taxonomy-v375", "@media(max-width:640px)", "grid-template-columns:1fr", "position:sticky"]) {
    assert.ok(css.includes(marker), marker);
  }
});
