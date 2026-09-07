import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("write-off close unmounts the React sheet before route synchronization", async () => {
  const bundle = await readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8");
  const start = bundle.indexOf("function bdWriteoffWorkspaceV271");
  const end = bundle.indexOf("function bdWarehouseNavigationUrlV247", start);
  assert.ok(start >= 0 && end > start, "write-off workspace must exist in the release bundle");
  const workspace = bundle.slice(start, end);

  assert.match(workspace, /\[bdWriteoffSheetOpenV417,bdSetWriteoffSheetOpenV417\]=S\.useState\(\(\)=>N==="new"\)/);
  assert.match(workspace, /S\.useEffect\(\(\)=>\{bdSetWriteoffSheetOpenV417\(N==="new"\)\},\[N\]\)/);
  assert.match(workspace, /function x\(\)\{bdSetWriteoffSheetOpenV417\(!1\),a\(/);
  assert.match(workspace, /onClick:\(\)=>\{bdSetWriteoffSheetOpenV417\(!0\),a\(/);
  assert.match(workspace, /N==="new"&&n&&bdWriteoffSheetOpenV417&&i\.jsx\(bdWriteoffSheet/);
});

test("write-off lifecycle fix is included in versioned release references", async () => {
  const marker = "20260907-writeoff-close-lifecycle-v417";
  for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
    const source = await readFile(new URL(relativePath, root), "utf8");
    assert.match(source, new RegExp(marker));
  }
});

test("desktop browser QA still requires the write-off shell to detach", async () => {
  const qa = await readFile(new URL("scripts/mobile-navigation-qa-v269.cjs", root), "utf8");
  assert.match(qa, /await shell\.waitFor\(\{ state: "detached" \}\)/);
});

test("legacy write-off navigation patch preserves the hardened close lifecycle", async () => {
  const patch = await readFile(new URL("scripts/patch-writeoff-navigation-v296.mjs", root), "utf8");
  assert.match(patch, /const lifecycleClose = 'function x\(\)\{bdSetWriteoffSheetOpenV417\(!1\),a\(/);
  assert.match(patch, /!source\.includes\(newClose\) && !source\.includes\(lifecycleClose\)/);
});
