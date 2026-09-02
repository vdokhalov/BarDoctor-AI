import assert from "node:assert/strict";
import test from "node:test";
import { assertSpreadsheetInput } from "../lib/bardoctor/spreadsheet-safety";

test("spreadsheet gate accepts OOXML, OLE and bounded CSV signatures", () => {
  assert.doesNotThrow(() => assertSpreadsheetInput(Uint8Array.from([0x50, 0x4b, 0x03, 0x04])));
  assert.doesNotThrow(() => assertSpreadsheetInput(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])));
  assert.doesNotThrow(() => assertSpreadsheetInput(new TextEncoder().encode("name,quantity\nTea,2\n")));
});

test("spreadsheet gate rejects empty, oversized and binary-disguised inputs before SheetJS", () => {
  assert.throws(() => assertSpreadsheetInput(new Uint8Array()), /SPREADSHEET_EMPTY/);
  assert.throws(() => assertSpreadsheetInput(new Uint8Array(17), 16), /SPREADSHEET_TOO_LARGE/);
  assert.throws(
    () => assertSpreadsheetInput(Uint8Array.from([0x7f, 0, 0x45, 0x4c, 0x46])),
    /SPREADSHEET_SIGNATURE_INVALID/,
  );
});
