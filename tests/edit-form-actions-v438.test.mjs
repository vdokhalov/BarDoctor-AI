import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fragmentPath = new URL("../scripts/fragments/menu-consumption-sot-v418.fragment.txt", import.meta.url);
const cssPath = new URL("../public/catalog.css", import.meta.url);
const bundle = readFileSync(bundlePath, "utf8");
const fragment = readFileSync(fragmentPath, "utf8");
const css = readFileSync(cssPath, "utf8");
const recipe = bundle.slice(bundle.indexOf("function bdCatRecipeEditor"), bundle.indexOf("function bdCatImportReview"));
const sha = (value) => createHash("sha256").update(value).digest("hex");

test("v438 patch is idempotent and leaves a syntax-valid production bundle", () => {
  const paths = [bundlePath, fragmentPath, cssPath];
  const before = paths.map((path) => sha(readFileSync(path)));
  const run = spawnSync(process.execPath, ["scripts/patch-edit-form-actions-v438.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(paths.map((path) => sha(readFileSync(path))), before);
  assert.equal(bundle.split('const bdEditFormActionsVersionV438="v438";').length - 1, 1);
  const syntax = spawnSync(process.execPath, ["--check", fileURLToPath(bundlePath)], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test("menu and tech-card editors use one explicit action component", () => {
  assert.match(bundle, /function bdExplicitFormActionsV438\(/);
  assert.match(fragment, /i\.jsx\(bdExplicitFormActionsV438,\{onCancel:bdMenuCloseV435/);
  assert.match(recipe, /i\.jsx\(bdExplicitFormActionsV438,\{onCancel:bdTechCloseV438/);
  assert.match(bundle, /children:"Отмена"/);
  assert.match(bundle, /"aria-busy":n\?"true":void 0/);
  assert.match(bundle, /bd-explicit-form-error-v438",role:"alert"/);
  assert.match(fragment, /if\(bdMenuSavingRefV438\.current\)return!1/);
});

test("tech-card content scrolls independently and actions remain outside it", () => {
  const scroll = recipe.indexOf('className:"bd-catalog-form bd-explicit-form-scroll-v438"');
  const footer = recipe.indexOf("i.jsx(bdExplicitFormActionsV438");
  assert.ok(scroll >= 0 && footer > scroll);
  assert.match(recipe, /\]\}\) ,i\.jsx\(bdExplicitFormActionsV438/);
  assert.match(recipe, /saveLabel:t\?"Сохранить":"Сохранить и подтвердить"/);
  assert.match(recipe, /secondaryAction:\{label:"Сохранить черновик"/);

  const override = css.slice(css.indexOf("/* bd-edit-form-actions-v438:"));
  assert.match(override, />\.bd-explicit-form-scroll-v438\{[^}]*overflow-y:auto/);
  assert.match(override, /\.bd-explicit-form-actions-v438\{[^}]*flex:0 0 auto/);
  assert.match(override, /env\(safe-area-inset-bottom\)/);
  assert.match(override, /--bd-explicit-visual-height-v438/);
  assert.match(override, /--bd-explicit-visual-bottom-v438/);
  assert.match(override, /display:grid!important/);
});

test("visual viewport drives the mobile sheet above iPhone and Android keyboards", () => {
  const helper = bundle.slice(bundle.indexOf("function bdUseExplicitFormViewportV438"), bundle.indexOf("function bdExplicitFormActionsV438"));
  assert.match(helper, /window\.visualViewport/);
  assert.match(helper, /addEventListener\?\.\("resize"/);
  assert.match(helper, /addEventListener\?\.\("scroll"/);
  assert.match(helper, /offsetTop/);
  assert.match(recipe, /bdUseExplicitFormViewportV438\(bdTechDialogRefV354\)/);
});

test("cancel, X, backdrop and Escape share unsaved-change protection", () => {
  const start = recipe.indexOf("const bdTechMarkDirtyV438=");
  const end = recipe.indexOf(";S.useEffect", start);
  assert.ok(start >= 0 && end > start);
  const lifecycle = recipe.slice(start, end);

  const run = ({ dirty, saving, confirm }) => {
    const surface = {
      value: dirty ? "true" : null,
      setAttribute(_name, value) { this.value = value; },
      getAttribute() { return this.value; },
    };
    const calls = { closed: 0, confirmed: 0, cleaned: 0 };
    const context = {
      bdTechDirtyRefV438: { current: dirty },
      bdTechDialogRefV354: { current: surface },
      bdRecipeSavingV418: saving,
      a: () => calls.closed++,
      window: {
        confirm: (message) => {
          assert.equal(message, "Изменения не сохранены. Выйти без сохранения?");
          calls.confirmed++;
          return confirm;
        },
        bdMarkNavigationClean: (target) => {
          assert.equal(target, surface);
          calls.cleaned++;
        },
      },
    };
    vm.runInNewContext(`${lifecycle};globalThis.result=bdTechCloseV438()`, context);
    return { ...calls, result: context.result };
  };

  assert.deepEqual(run({ dirty: false, saving: false, confirm: false }), { closed: 1, confirmed: 0, cleaned: 1, result: true });
  assert.deepEqual(run({ dirty: true, saving: false, confirm: false }), { closed: 0, confirmed: 1, cleaned: 0, result: false });
  assert.deepEqual(run({ dirty: true, saving: false, confirm: true }), { closed: 1, confirmed: 1, cleaned: 1, result: true });
  assert.deepEqual(run({ dirty: true, saving: true, confirm: true }), { closed: 0, confirmed: 0, cleaned: 0, result: false });

  assert.match(recipe, /onClick:p=>p\.target===p\.currentTarget&&bdTechCloseV438\(\)/);
  assert.match(recipe, /className:"bd-catalog-close",onClick:bdTechCloseV438/);
  assert.match(recipe, /I\.key==="Escape"[^}]*bdTechCloseV438\(\)/);
});

test("save is single-flight, closes only on success and keeps failures visible", () => {
  assert.match(recipe, /if\(bdRecipeSavingRefV418\.current\)return!1/);
  assert.match(recipe, /bdRecipeSavingRefV418\.current=!0/);
  assert.match(recipe, /R!==!1\?\(bdTechDirtyRefV438\.current=!1/);
  assert.match(recipe, /catch\(c\)\{return bdSetRecipeSaveErrorV418/);
  assert.match(recipe, /bdSetRecipeSaveErrorV418\("Не удалось сохранить техкарту\. Повторите попытку\."\),!1/);
  assert.match(recipe, /finally\{bdRecipeSavingRefV418\.current=!1,bdSetRecipeSavingV418\(!1\)\}/);
  assert.match(recipe, /saveDisabled:!bdTechCanConfirm,error:bdRecipeSaveErrorV418/);
});

test("editing ingredient quantity, unit, link, add and remove marks the recipe dirty", () => {
  assert.match(recipe, /const j=\(p,c\)=>\{bdTechMarkDirtyV438\(\)/);
  assert.match(recipe, /v=\(p,c\)=>\{bdTechMarkDirtyV438\(\)/);
  assert.match(recipe, /b=\(\)=>\{bdTechMarkDirtyV438\(\)/);
  assert.match(recipe, /className:"bd-catalog-remove",onClick:\(\)=>\{bdTechMarkDirtyV438\(\)/);
  assert.match(recipe, /onChoose:\(G,H\)=>\{N\(p,G,H\)/);
  assert.match(recipe, /onConfirmConversion:\(G,H\)=>K\(p,G,H\)/);
});

test("all application shells carry the v438 cache identity", () => {
  for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js", "public/bardoctor-preview-v396.js"]) {
    assert.match(readFileSync(new URL(relativePath, root), "utf8"), /20260920-edit-form-actions-v438/, relativePath);
  }
});
