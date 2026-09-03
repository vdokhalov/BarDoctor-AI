import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

for (const relative of ["public/app.html", "app/bar-doctor-response.ts"]) {
  test(`v398 keeps the web launch raster in native screen coordinates: ${relative}`, async () => {
    const source = await readFile(new URL(relative, root), "utf8");

    assert.match(source, /name="bd-native-fullscreen-raster" content="v398"/);
    assert.match(source, /data-bd-native-fullscreen-raster="v398"/);
    assert.match(source, /data-bd-native-fullscreen-raster="v398" data-bd-shell-first-startup="v397"/);
    assert.match(source, /--bd-launch-raster-width-v398", Math\.round\(screen\.width\) \+ "px"/);
    assert.match(source, /--bd-launch-raster-height-v398", Math\.round\(screen\.height\) \+ "px"/);
    assert.match(
      source,
      /background-size: var\(--bd-launch-raster-width-v398\) var\(--bd-launch-raster-height-v398\) !important/,
    );
    assert.doesNotMatch(
      source.slice(source.indexOf("/* bd-native-continuity-v396 */", source.indexOf("<style>"))),
      /background-size: 100% 100% !important/,
    );
  });
}
