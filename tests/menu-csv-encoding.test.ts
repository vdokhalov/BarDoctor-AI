import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { menuSpreadsheetText } from "../lib/bardoctor/menu-spreadsheet";
import type { MenuImportDraft } from "../lib/bardoctor/catalog";
import { type MenuDraft, validateMenuDraft } from "../lib/bardoctor/menu-ingestion";
import { menuImportRuntime } from "./helpers/menu-import-runtime";

const cyrillic = readFileSync(new URL("./fixtures/menu-cyrillic-utf8.csv", import.meta.url));
const ascii = readFileSync(new URL("./fixtures/menu-ascii.csv", import.meta.url));
const expected = { name: "Коктейль «Ёжик», №1", department: "Бар", category: "Без подраздела", warnings: "Проверьте состав — мята и лайм" };
const csvWorkbook = XLSX.read(cyrillic.toString("utf8"), { type: "string", raw: true });
const cases = [
  { name: "UTF-8 without BOM", filename: "меню.csv", mimeType: "text/csv", bytes: cyrillic, expected },
  { name: "UTF-8 with BOM", filename: "меню-BOM.csv", mimeType: "text/csv", bytes: readFileSync(new URL("./fixtures/menu-cyrillic-utf8-bom.csv", import.meta.url)), expected },
  { name: "ASCII", filename: "ascii.csv", mimeType: "text/csv", bytes: ascii, expected: { name: "ASCII Service", department: "bar", category: "Alcohol", warnings: "Review ingredients" } },
  { name: "XLSX", filename: "меню.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: XLSX.write(csvWorkbook, { type: "array", bookType: "xlsx" }), expected },
];

for (const fixture of cases) test(`menu preprocessing preserves exact Unicode: ${fixture.name}`, () => {
  const text = menuSpreadsheetText(new Uint8Array(fixture.bytes), fixture);
  const cells = text.split("\n")[2].split("\t");
  assert.deepEqual([cells[0], cells[3], cells[4], cells[8]], Object.values(fixture.expected));
});

test("CSV extensions and MIME, TSV, semicolon, CRLF, escaped quotes and multiline remain on SheetJS", () => {
  for (const source of [{ filename: "export.CSV", mimeType: "application/vnd.ms-excel" }, { filename: "upload", mimeType: "text/csv" }, { filename: "menu.tsv", mimeType: "text/tab-separated-values" }]) {
    const text = menuSpreadsheetText(new TextEncoder().encode('sep=;\r\nname;category\r\n"Ёжик, ""мята""\nлайм";Без подраздела\r\n'), source);
    assert.equal(text, 'Лист: Sheet1\nname\tcategory\nЁжик, "мята"\nлайм\tБез подраздела');
  }
  const tsv = menuSpreadsheetText(new TextEncoder().encode("name\tcategory\nЧай\tНапитки\n"), { filename: "menu.tsv", mimeType: "application/octet-stream" });
  assert.equal(tsv, "Лист: Sheet1\nname\tcategory\nЧай\tНапитки");
});

test("BOM-declared UTF-16 and binary XLS retain existing parser decoding", () => {
  const utf16 = Buffer.concat([Buffer.from([255, 254]), Buffer.from(cyrillic.toString("utf8"), "utf16le")]);
  const legacyXls = XLSX.write(csvWorkbook, { type: "array", bookType: "biff8" });
  for (const source of [{ bytes: utf16, filename: "menu.csv", mimeType: "text/csv" }, { bytes: legacyXls, filename: "menu.xls", mimeType: "application/vnd.ms-excel" }]) {
    const text = menuSpreadsheetText(new Uint8Array(source.bytes), source);
    for (const value of Object.values(expected)) assert.ok(text.includes(value), value);
  }
});

for (const fixture of cases) test(`${fixture.name}: actual upload → preprocessing → draft → diff → validate → confirm → canonical/read reload`, async () => {
  const r = await menuImportRuntime({ ingestion: "./app/api/menu/ingestion/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route" });
  try {
    const user = await r.register("csv-encoding@isolated.test"), venueId = user.activeVenueId;
    r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Synthetic CSV encoding", currency: "MDL", timezone: "Europe/Chisinau" }), user.userId);
    const canonical = () => JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_assortment_v1'").get(user.userId)?.data_json));
    const before = canonical();
    const form = new FormData(); form.append("file", new File([new Uint8Array(fixture.bytes)], fixture.filename, { type: fixture.mimeType }));
    const response = await r.api.catalogImport.POST(new Request("https://isolated.test/api/catalog/import", { method: "POST", headers: { "X-Session-Email": user.email, "X-Session-Token": user.token, "X-Venue-Id": String(venueId) }, body: form }));
    const normalized = await response.json() as { draft: MenuImportDraft }; assert.equal(response.status, 200, JSON.stringify(normalized));
    for (const value of Object.values(fixture.expected)) assert.ok(r.prompts[0].includes(value), value);
    assert.deepEqual([...r.uploads.values()][0], new Uint8Array(fixture.bytes), "original stored bytes unchanged");
    const item = normalized.draft.menuItems[0]; assert.equal(item.name, fixture.expected.name); assert.equal(item.category, fixture.expected.category); assert.equal(item.department, "bar"); assert.deepEqual(item.warnings, [fixture.expected.warnings]); assert.equal(normalized.draft.sourceFileName, fixture.filename);
    const send = async (body: object) => { const response = await r.api.ingestion.POST(r.request(user, "/api/menu/ingestion", "POST", { venueId, ...body })); return { status: response.status, body: await response.json() as { draft: MenuDraft; preview: ReturnType<typeof validateMenuDraft>; idempotent?: boolean } }; };
    let result = await send({ action: "create", source: "IMPORT", draftId: "draft:" + normalized.draft.id, items: [{ ...item, sectionId: "bar", taxonomyCategoryId: "alcohol", consumptionMode: "NONE" }] }); assert.equal(result.status, 201);
    const equalRow = (draft: typeof result.body.draft) => { assert.equal(draft.rows[0].item.name, fixture.expected.name); assert.equal(draft.rows[0].item.category, fixture.expected.category); };
    equalRow(result.body.draft); assert.deepEqual(canonical(), before);
    result = await send({ action: "update", draftId: result.body.draft.id, revision: result.body.draft.revision, rows: result.body.draft.rows.map((row: object) => ({ ...row, decision: "apply", reviewed: true })) });
    equalRow(result.body.draft); assert.equal(result.body.preview.diff[0].status, "ADDED"); assert.equal(result.body.preview.diff[0].name, fixture.expected.name);
    result = await send({ action: "validate", draftId: result.body.draft.id, revision: result.body.draft.revision }); assert.equal(result.status, 200, JSON.stringify(result.body)); equalRow(result.body.draft); assert.deepEqual(canonical(), before);
    const command = { action: "confirm", draftId: result.body.draft.id, revision: result.body.draft.revision, validationHash: result.body.draft.validationHash };
    result = await send(command); assert.equal(result.status, 201, JSON.stringify(result.body)); equalRow(result.body.draft);
    const after = canonical(); assert.equal(after.menuItems[0].name, fixture.expected.name); assert.equal(after.menuItems[0].category, fixture.expected.category); assert.equal(after.menuItems[0].sectionId, "bar"); assert.equal(after.menuItems[0].taxonomyCategoryId, "alcohol");
    for (let reload = 0; reload < 2; reload++) {
      const stored = await r.api.storeKey.GET(r.request(user, "/api/store/bd_assortment_v1"), { params: Promise.resolve({ key: "bd_assortment_v1" }) } as never); assert.equal(stored.status, 200); assert.equal((await stored.json() as { data: { menuItems: { category: string }[] } }).data.menuItems[0].category, fixture.expected.category);
      const read = await r.api.overview.GET(r.request(user, "/api/assortment/overview?period=2026-09")); assert.equal(read.status, 200);
      const projected = (await read.json() as { analytics: { menuItems: { name: string; groupName: string; category: string }[] } }).analytics.menuItems[0]; assert.equal(projected.name, fixture.expected.name); assert.equal(projected.groupName, "Бар"); assert.equal(projected.category, "Алкоголь");
    }
    assert.equal((await send(command)).body.idempotent, true); assert.deepEqual(canonical(), after);
    for (const field of ["recipes", "nomenclature", "stockBalances"]) assert.deepEqual(after[field], before[field]);
  } finally { r.close(); }
});
