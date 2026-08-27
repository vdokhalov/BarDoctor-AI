import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("invoice diagnostic page is server-side owner protected and hidden from primary navigation", async () => {
  const [route, shell, navigation] = await Promise.all([
    read("app/diagnostics/invoice-recognition/route.ts"),
    read("public/bardoctor-preview.js"),
    read("public/navigation-contract-v247.js"),
  ]);
  assert.match(route, /authenticateRequest\(request\)/);
  assert.match(route, /account\.role !== "owner"/);
  assert.match(route, /account\.id !== DATA_ACCOUNT_ID/);
  assert.match(route, /account\.venueId !== VENUE_ID/);
  assert.match(route, /status: 403/);
  assert.doesNotMatch(shell, /diagnostics\/invoice-recognition/);
  assert.doesNotMatch(navigation, /diagnostics\/invoice-recognition/);
});

test("owner surface uses the existing controlled endpoint and authoritative context", async () => {
  const route = await read("app/api/purchases/hybrid-production-qa/route.ts");
  assert.match(route, /stage: "surface"/);
  assert.match(route, /venueId: account\.venueId/);
  assert.match(route, /dataAccountId: account\.id/);
  assert.match(route, /canonicalSource: "bd_assortment_v1"/);
  assert.match(route, /configuredMode/);
  assert.match(route, /v2Primary: false/);
  assert.match(route, /productionVersion: PRODUCTION_VERSION/);
  assert.match(route, /documents: selection\.selected\.map/);
  assert.match(route, /normalizeInvoiceText\(document\.id\) === requestedDocument/);
  assert.doesNotMatch(route, /searchParams\.get\("venue/);
});

test("shadow diagnostic UI performs no purchase, stock or finance writes", async () => {
  const client = await read("public/invoice-diagnostic-v319.js");
  assert.match(client, /request\("ocr_parser"/);
  assert.match(client, /request\("persisted_learning"/);
  assert.match(client, /for\(var index=1;index<=3;index\+\+\)/);
  assert.doesNotMatch(client, /api\/purchases\/(confirm|update|repost|cancel|delete)/);
  assert.doesNotMatch(client, /api\/(inventory|expenses|write-offs)/);
  assert.doesNotMatch(client, /INVOICE_RECOGNITION_V2_MODE/);
  assert.match(client, /purchaseWrites:0/);
  assert.match(client, /stockMovementWrites:0/);
  assert.match(client, /expenseWrites:0/);
  assert.match(client, /supplierDebtWrites:0/);
});

test("mapping confirmation is explicit, two-step and uses the canonical application flow", async () => {
  const [page, client, mappingRoute] = await Promise.all([
    read("app/diagnostics/invoice-recognition/route.ts"),
    read("public/invoice-diagnostic-v319.js"),
    read("app/api/purchases/mappings/route.ts"),
  ]);
  assert.match(page, /Новый независимый repeat run/);
  assert.match(client, /data-prepare/);
  assert.match(client, /data-confirm/);
  assert.match(client, /Подтвердить и сохранить mapping/);
  assert.match(client, /fetch\("\/api\/purchases\/mappings"/);
  assert.match(mappingRoute, /upsertSupplierProductMapping/);
  assert.match(mappingRoute, /audit_log/);
  assert.match(mappingRoute, /Пользователь подтвердил соответствие/);
  assert.match(client, /request\("persisted_learning",state\.document\.id\)/);
});

test("diagnostic result exposes parser, AI, history and safe export details", async () => {
  const [api, client] = await Promise.all([
    read("app/api/purchases/hybrid-production-qa/route.ts"),
    read("public/invoice-diagnostic-v319.js"),
  ]);
  assert.match(api, /commercialFields/);
  assert.match(api, /historicalMapping/);
  assert.match(api, /mappingKey/);
  assert.match(api, /providerStatus/);
  assert.match(api, /statuses/);
  assert.match(client, /raw OCR blocks/);
  assert.match(client, /arithmetic anomaly/);
  assert.match(client, /inputTokens/);
  assert.match(client, /outputTokens/);
  assert.match(client, /providerLatencyMs/);
  assert.match(client, /stripSecrets/);
  assert.match(client, /api\.\?key\|authorization\|secret\|rawProviderPayload/);
  assert.match(client, /bardoctor\.invoice-diagnostic\.v1/);
});

test("diagnostic layout includes explicit mobile and desktop responsive contracts", async () => {
  const css = await read("public/invoice-diagnostic-v319.css");
  assert.match(css, /grid-template-columns:1\.1fr 1fr \.9fr/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /\.diag-line-body\{grid-template-columns:1fr/);
  assert.match(css, /min-width:320px/);
});
