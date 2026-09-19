import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fragmentPath = new URL("../scripts/fragments/menu-consumption-sot-v418.fragment.txt", import.meta.url);
const cssPath = new URL("../public/catalog.css", import.meta.url);
const root = new URL("../", import.meta.url);
const bundle = readFileSync(bundlePath, "utf8");
const fragment = readFileSync(fragmentPath, "utf8");
const css = readFileSync(cssPath, "utf8");

const sha = (value) => createHash("sha256").update(value).digest("hex");

test("menu actions patch is idempotent and the production bundle is valid", () => {
  const before = [bundlePath, fragmentPath, cssPath].map((path) => sha(readFileSync(path)));
  const run = spawnSync(process.execPath, ["scripts/patch-menu-edit-actions-v435.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  const after = [bundlePath, fragmentPath, cssPath].map((path) => sha(readFileSync(path)));
  assert.deepEqual(after, before);
  assert.equal(bundle.split('const bdMenuEditActionsVersionV435="v435";').length - 1, 1);
  const syntax = spawnSync(process.execPath, ["--check", fileURLToPath(bundlePath)], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test("footer is a persistent sibling of the independently scrolling form", () => {
  assert.match(fragment, /className:"bd-catalog-form bd-menu-position-scroll-v435"/);
  assert.match(fragment, /i\.jsxs\("footer",\{className:"bd-menu-position-actions-v435"/);
  assert.ok(
    fragment.indexOf(')]}),i.jsxs("footer",{className:"bd-menu-position-actions-v435"') > 0,
    "the form must close before the footer begins",
  );
  assert.match(fragment, /children:"Отмена"/);
  assert.match(fragment, /bdMenuSavingV418\?"Сохраняем…":"Сохранить"/);
  assert.match(fragment, /bdMenuSavingV418\|\|!h\.name\.trim\(\)/);
  assert.match(fragment, /bd-menu-position-error-v435",role:"alert"/);

  const override = css.slice(css.indexOf("/* bd-menu-edit-actions-v435 */"));
  assert.match(override, />\.bd-menu-position-scroll-v435\{[^}]*overflow-y:auto/);
  assert.match(override, /\.bd-menu-position-actions-v435 \.bd-catalog-sheet-actions\{position:static/);
  assert.match(override, /env\(safe-area-inset-bottom\)/);
  assert.match(override, /--bd-menu-visual-height-v435/);
  assert.match(override, /--bd-menu-visual-bottom-v435/);
});

test("cancel, close and backdrop use the existing unsaved-change confirmation wording", () => {
  const start = fragment.indexOf("const bdMenuMarkDirtyV435=");
  const end = fragment.indexOf("\n  const M=async()=>", start);
  assert.ok(start >= 0 && end > start);
  const lifecycle = fragment.slice(start, end);

  const run = ({ dirty, saving, confirm }) => {
    const surface = {
      value: dirty ? "true" : null,
      setAttribute(_name, value) { this.value = value; },
      getAttribute() { return this.value; },
    };
    const calls = { closed: 0, confirmed: 0, cleaned: 0 };
    const context = {
      bdMenuInteractedRefV418: { current: dirty },
      bdMenuDialogRefV418: { current: surface },
      bdMenuSavingV418: saving,
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
    vm.runInNewContext(`${lifecycle};globalThis.closeResult=bdMenuCloseV435()`, context);
    return { ...calls, result: context.closeResult };
  };

  assert.deepEqual(run({ dirty: false, saving: false, confirm: false }), {
    closed: 1, confirmed: 0, cleaned: 1, result: true,
  });
  assert.deepEqual(run({ dirty: true, saving: false, confirm: false }), {
    closed: 0, confirmed: 1, cleaned: 0, result: false,
  });
  assert.deepEqual(run({ dirty: true, saving: false, confirm: true }), {
    closed: 1, confirmed: 1, cleaned: 1, result: true,
  });
  assert.deepEqual(run({ dirty: true, saving: true, confirm: true }), {
    closed: 0, confirmed: 0, cleaned: 0, result: false,
  });

  assert.match(fragment, /onClick:P=>P\.target===P\.currentTarget&&bdMenuCloseV435\(\)/);
  assert.match(fragment, /className:"bd-catalog-close",onClick:bdMenuCloseV435/);
  assert.match(fragment, /className:"bd-catalog-secondary",onClick:bdMenuCloseV435/);
});

test("save keeps one in-flight request, closes only after success and retains the error", () => {
  assert.match(fragment, /try\{bdSetMenuSavingV418\(!0\),j\(""\);const ie=await s\(/);
  assert.match(fragment, /ie===!1\?j\("Не удалось сохранить позицию\. Повторите попытку\."\):a\(\)/);
  assert.match(fragment, /catch\(ie\)\{j\(ie instanceof Error\?ie\.message:"Не удалось сохранить позицию\."\)\}/);
  assert.match(fragment, /finally\{bdSetMenuSavingV418\(!1\)\}/);
  assert.match(fragment, /disabled:bdMenuSavingV418\|\|/);
});

test("all source shells carry the v435 cache identity", () => {
  for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
    assert.match(readFileSync(new URL(relativePath, root), "utf8"), /20260919-menu-edit-actions-v435/, relativePath);
  }
});
