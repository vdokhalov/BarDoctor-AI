import assert from "node:assert/strict";
import test from "node:test";

import {
  findBlankLineStartBeforeMarker,
  findLineStartBeforeMarker,
  findUniquePatternStart,
} from "../scripts/lib/patch-line-boundaries.mjs";

for (const newline of ["\n", "\r\n"]) {
  test(`patch anchors preserve ${newline === "\n" ? "LF" : "CRLF"} boundaries`, () => {
    const source = `before${newline}function helper(){}${newline}${newline}${newline}function WS(){}`;
    const helperStart = findLineStartBeforeMarker(source, "function helper()");
    const helperEnd = findBlankLineStartBeforeMarker(source, "function WS()", helperStart);

    assert.equal(source.slice(helperStart, helperStart + newline.length), newline);
    assert.equal(source.slice(helperEnd, helperEnd + newline.length), newline);
    assert.equal(
      source.slice(0, helperStart) + source.slice(helperEnd),
      `before${newline}${newline}function WS(){}`,
    );

    const stripped = source.slice(0, helperStart) + source.slice(helperEnd);
    const insertAt = findBlankLineStartBeforeMarker(stripped, "function WS()");
    const replayed = stripped.slice(0, insertAt)
      + `${newline}function helper(){}${newline}`
      + stripped.slice(insertAt);
    assert.equal(replayed, source);
  });
}

for (const newline of ["\n", "\r\n"]) {
  test(`blank-line anchor ignores surplus ${newline === "\n" ? "LF" : "CRLF"} separators`, () => {
    const source = `before${newline}${newline}${newline}${newline}function marker(){}`;
    const boundary = findBlankLineStartBeforeMarker(source, "function marker()");
    assert.equal(source.slice(boundary), `${newline}${newline}function marker(){}`);
  });
}

test("patch anchors fail closed when the owned blank-line boundary is missing", () => {
  const source = "before\nfunction helper(){}\nfunction WS(){}";
  const helperStart = findLineStartBeforeMarker(source, "function helper()");

  assert.notEqual(helperStart, -1);
  assert.equal(findBlankLineStartBeforeMarker(source, "function WS()", helperStart), -1);
  assert.equal(findLineStartBeforeMarker(source, "function missing()"), -1);
});

for (const newline of ["\n", "\r\n"]) {
  test(`unique style anchor accepts ${newline === "\n" ? "LF" : "CRLF"}`, () => {
    const source = `head${newline}    <style>${newline}      /* bd-owned */${newline}    </style>`;
    assert.equal(
      findUniquePatternStart(source, /    <style>\r?\n      \/\* bd-/),
      source.indexOf("    <style>"),
    );
  });
}

test("unique style anchor rejects missing and duplicate owned sections", () => {
  const owned = "    <style>\n      /* bd-owned */";
  assert.equal(findUniquePatternStart("<style></style>", /    <style>\r?\n      \/\* bd-/), -1);
  assert.equal(findUniquePatternStart(`${owned}\n${owned}`, /    <style>\r?\n      \/\* bd-/), -1);
});
