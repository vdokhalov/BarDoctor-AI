import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const [bundle, html, responseSource, imageInfo] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  stat(new URL("../public/icons/bardoctor-launch-390x844-v348.png", import.meta.url)),
]);

test("v348 provides a native iOS launch image for the reported iPhone viewport", () => {
  assert.match(bundle, /bdIosLaunchScreenVersionV348="v348"/);
  assert.ok(imageInfo.size > 100_000, "launch image is unexpectedly empty");
  for (const source of [html, responseSource]) {
    assert.match(source, /rel="apple-touch-startup-image" href="\/icons\/bardoctor-launch-390x844-(?:3x-v394|v348)\.png"/);
    assert.match(source, /device-width: 390px.*device-height: 844px.*webkit-device-pixel-ratio: 3/);
    assert.match(source, /name="bd-ios-launch-screen" content="v348"/);
  }
});
