import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  configuredInvoiceOcr,
  InvoiceOcrError,
} from "../lib/bardoctor/invoice-ocr";
import {
  applyDeterministicMappings,
  compareRecognitionResults,
  confidenceLevel,
  fuzzyNomenclatureScore,
  invoiceRecognitionMode,
  invoiceRecognitionRequestMode,
  nomenclatureCandidates,
  normalizeInvoiceText,
  packageFingerprint,
  parseInvoiceLine,
  parseInvoiceOcr,
  recognitionQualityAgainstGroundTruth,
  recognitionMetrics,
  upsertConfirmedSupplierMappings,
  type SupplierItemMapping,
} from "../lib/bardoctor/invoice-recognition-v2";
import { applyPurchaseToInventory } from "../lib/bardoctor/inventory";
import { normalizePurchaseDocument } from "../lib/bardoctor/purchases";

const nomenclature = {
  nomenclature: [
    { id: "cola-125", key: "stock:cola-125|ml", venueId: 10, name: "Coca-Cola 1,25 л", aliases: ["КОКА КОЛА ПЭТ 1.25"], unit: "ml", packageSize: "1,25 л" },
    { id: "water-500", key: "stock:water-500|ml", venueId: 10, name: "Вода 500 мл", aliases: ["ВОДА ПЭТ 0.5"], unit: "ml", packageSize: "500 мл" },
    { id: "other-venue", key: "stock:other|ml", venueId: 11, name: "Coca-Cola 1,25 л", unit: "ml", packageSize: "1,25 л" },
  ],
};

test("invoice text normalization preserves raw semantics and canonicalizes decimals and units", () => {
  assert.equal(normalizeInvoiceText("  КОКА-КОЛА   1,25 L. "), "кока кола 1.25 l");
  assert.equal(normalizeInvoiceText("500ml"), "500 ml");
  assert.equal(packageFingerprint("Бутылка 1,25 л"), "ml:1250");
  assert.equal(packageFingerprint("500 ml"), "ml:500");
});

test("parser extracts quantity, unit price and total with decimal comma", () => {
  const line = parseInvoiceLine("КОКА КОЛА ПЭТ 1,25  2 шт  38,50  77,00");
  assert.ok(line);
  assert.equal(line.rawName, "КОКА КОЛА ПЭТ 1,25");
  assert.equal(line.quantity, 2);
  assert.equal(line.unitPrice, 38.5);
  assert.equal(line.lineTotal, 77);
  assert.equal(line.requiresReview, false);
});

test("parser handles real 1C-style Russian headers, word dates and numbered table rows", () => {
  const draft = parseInvoiceOcr({
    rawText: [
      "Накладная № 394 от 26 августа 2026 г.",
      "Поставщик: Рынок",
      "Покупатель: ООО Шаг",
      "1 | Капуста пекинская кг | кг | 1,09 кг | 44,95 | 49,00",
      "Итого: 587,10",
    ].join("\n"),
    lines: [
      { text: "Накладная № 394 от 26 августа 2026 г.", confidence: 0.98 },
      { text: "Поставщик: Рынок", confidence: 0.98 },
      { text: "1 | Капуста пекинская кг | кг | 1,09 кг | 44,95 | 49,00", confidence: 0.94 },
    ],
    confidence: 0.96,
    durationMs: 25,
  });
  assert.equal(draft.documentNumber, "394");
  assert.equal(draft.date, "2026-08-26");
  assert.equal(draft.supplierName, "Рынок");
  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0].rawName, "Капуста пекинская");
  assert.equal(draft.items[0].quantity, 1.09);
  assert.equal(draft.items[0].unitPrice, 44.95);
  assert.equal(draft.items[0].lineTotal, 49);
});

test("parser uses structured raw table rows when OCR overlay exposes split columns", () => {
  const draft = parseInvoiceOcr({
    rawText: [
      "Накладная № 393 от 24 августа 2026 г.",
      "Поставщик: Квинт",
      "| № | Товар | Мест | Количество | Цена | Сумма |",
      "| 1 | Коньяк Белый аист л.! | л | 3 л | 120,33 | 361,00 |",
      "Итого: 361,00",
    ].join("\n"),
    lines: [
      { text: "1", confidence: null },
      { text: "Коньяк Белый аист л.!", confidence: null },
      { text: "3 л", confidence: null },
      { text: "120,33", confidence: null },
      { text: "361,00", confidence: null },
    ],
    confidence: null,
    durationMs: 20,
  });
  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0].quantity, 3);
  assert.equal(draft.items[0].unitPrice, 120.33);
  assert.equal(draft.items[0].lineTotal, 361);
  assert.equal(draft.items[0].rawName, "Коньяк Белый аист");
});

test("parser deterministically reconstructs vertical OCR table cells", () => {
  const draft = parseInvoiceOcr({
    rawText: [
      "Накладная № 394 от 26 августа 2026 г.", "Поставщик: Рынок",
      "№", "Товар", "Мест", "Количество", "Цена", "Сумма",
      "1", "Капуста пекинская кг.!", "кг", "1,09 кг", "44,95", "49,00",
      "2", "Сыр Российский кг.!", "кг", "0,206 кг", "160,00", "32,96",
      "Итого:", "81,96",
    ].join("\n"),
    lines: [], confidence: null, durationMs: 20,
  });
  assert.equal(draft.items.length, 2);
  assert.equal(draft.items[0].rawName, "Капуста пекинская");
  assert.equal(draft.items[1].quantity, 0.206);
  assert.equal(draft.items[1].unitPrice, 160);
  assert.equal(draft.items[1].lineTotal, 32.96);
});

test("OCR output remains an intermediate representation before deterministic parsing", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const ocr = await configuredInvoiceOcr({
    documents: [{ bytes: new Uint8Array([1, 2, 3]), filename: "invoice.jpg", mimeType: "image/jpeg" }],
    environment: { INVOICE_OCR_ENDPOINT: "https://ocr.example.test/read", INVOICE_OCR_API_KEY: "server-secret" },
    fetchImpl: async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({
        rawText: "ООО ВПРОК\nНакладная № 42 от 26.08.2026\nКОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00\nИтого 77,00 RUB",
        confidence: 94,
        lines: [
          { text: "ООО ВПРОК", confidence: 98, bounds: { x: 1, y: 2, width: 3, height: 4 } },
          { text: "КОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00", confidence: 91 },
        ],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  assert.equal(ocr.lines[0].bounds?.x, 1);
  assert.equal(ocr.confidence, 0.94);
  assert.equal((calls[0].preprocessing as Record<string, unknown>).preserveOriginal, true);
  const draft = parseInvoiceOcr(ocr);
  assert.equal(draft.documentNumber, "42");
  assert.equal(draft.date, "2026-08-26");
  assert.equal(draft.items.length, 1);
  assert.equal(draft.total, 77);
});

test("Azure Document Intelligence adapter polls server-side OCR and canonicalizes lines, confidence and bounds", async () => {
  const calls: Array<{ url: string; method: string; headers: Headers; body?: string }> = [];
  const ocr = await configuredInvoiceOcr({
    documents: [{ bytes: new Uint8Array([1, 2, 3]), filename: "invoice.jpg", mimeType: "image/jpeg" }],
    environment: {
      INVOICE_OCR_PROVIDER: "azure_document_intelligence",
      INVOICE_OCR_ENDPOINT: "https://bardoctor-ocr.cognitiveservices.azure.com",
      INVOICE_OCR_API_KEY: "server-secret",
    },
    fetchImpl: async (url, init) => {
      calls.push({
        url: String(url),
        method: String(init?.method ?? "GET"),
        headers: new Headers(init?.headers),
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      if (calls.length === 1) {
        return new Response(null, {
          status: 202,
          headers: { "Operation-Location": "https://bardoctor-ocr.cognitiveservices.azure.com/result/42" },
        });
      }
      return new Response(JSON.stringify({
        status: "succeeded",
        analyzeResult: {
          apiVersion: "2024-11-30",
          modelId: "prebuilt-layout",
          content: "ООО ВПРОК\nКОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00",
          pages: [{
            pageNumber: 1,
            lines: [{
              content: "КОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00",
              polygon: [1, 2, 5, 2, 5, 4, 1, 4],
              spans: [{ offset: 10, length: 42 }],
            }],
            words: [
              { content: "КОКА", confidence: 0.96, span: { offset: 10, length: 4 } },
              { content: "КОЛА", confidence: 0.94, span: { offset: 15, length: 4 } },
            ],
          }],
          tables: [{
            cells: [
              { rowIndex: 0, columnIndex: 0, content: "1" },
              { rowIndex: 0, columnIndex: 1, content: "КОКА КОЛА ПЭТ 1,25" },
              { rowIndex: 0, columnIndex: 2, content: "2 шт" },
              { rowIndex: 0, columnIndex: 3, content: "38,50" },
              { rowIndex: 0, columnIndex: 4, content: "77,00" },
            ],
          }],
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /prebuilt-layout:analyze/);
  assert.equal(calls[0].headers.get("Ocp-Apim-Subscription-Key"), "server-secret");
  assert.equal(JSON.parse(calls[0].body ?? "{}").base64Source, "AQID");
  assert.equal(ocr.engine, "azure_document_intelligence:prebuilt-layout");
  assert.equal(ocr.lines[0].bounds?.width, 4);
  assert.equal(ocr.lines[0].confidence, 0.95);
  assert.equal(ocr.metadata?.preprocessing, "provider_orientation_and_deskew");
  assert.equal(ocr.metadata?.tableCount, 1);
  assert.ok(ocr.lines.some((line) => line.text.includes("2 шт 38,50 77,00")));
});

test("OCR adapter classifies provider failures without leaking provider messages", async () => {
  await assert.rejects(
    configuredInvoiceOcr({
      documents: [{ bytes: new Uint8Array([1]), filename: "invoice.jpg", mimeType: "image/jpeg" }],
      environment: {
        INVOICE_OCR_PROVIDER: "azure_document_intelligence",
        INVOICE_OCR_ENDPOINT: "https://bardoctor-ocr.cognitiveservices.azure.com",
        INVOICE_OCR_API_KEY: "server-secret",
      },
      fetchImpl: async () => new Response("provider-specific quota text", { status: 429 }),
    }),
    (error: unknown) => error instanceof InvoiceOcrError && error.code === "OCR_RATE_LIMITED",
  );
});

test("OCR.Space adapter canonicalizes table text and overlay bounds", async () => {
  const requests: Array<{ url: string; body: FormData }> = [];
  const ocr = await configuredInvoiceOcr({
    documents: [{ bytes: new Uint8Array([1, 2, 3]), filename: "invoice.jpg", mimeType: "image/jpeg" }],
    environment: { INVOICE_OCR_PROVIDER: "ocr_space", INVOICE_OCR_API_KEY: "server-secret" },
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), body: init?.body as FormData });
      return new Response(JSON.stringify({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ProcessingTimeInMilliseconds: 42,
        ParsedResults: [{
          ParsedText: "1 | Капуста | кг | 1,09 кг | 44,95 | 49,00",
          TextOrientation: "0",
          TextOverlay: {
            HasOverlay: true,
            Lines: [{
              LineText: "1 | Капуста | кг | 1,09 кг | 44,95 | 49,00",
              Words: [
                { WordText: "1", Left: 10, Top: 20, Width: 5, Height: 8 },
                { WordText: "Капуста", Left: 20, Top: 20, Width: 40, Height: 8 },
              ],
            }],
          },
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  const request = requests[0];
  assert.ok(request);
  assert.equal(request.url, "https://api.ocr.space/parse/image");
  assert.equal(request.body.get("apikey"), "server-secret");
  assert.equal(request.body.get("language"), "rus");
  assert.equal(request.body.get("isTable"), "true");
  assert.equal(request.body.get("OCREngine"), "3");
  assert.ok(request.body.get("file") instanceof Blob);
  assert.equal(ocr.engine, "ocr_space:engine3");
  assert.equal(ocr.lines[0].bounds?.x, 10);
  assert.equal(ocr.lines[0].bounds?.width, 50);
  assert.equal(ocr.metadata?.processingTimeMs, 42);
});

test("OCR.Space adapter classifies quota errors returned inside HTTP 200", async () => {
  await assert.rejects(
    configuredInvoiceOcr({
      documents: [{ bytes: new Uint8Array([1]), filename: "invoice.jpg", mimeType: "image/jpeg" }],
      environment: { INVOICE_OCR_PROVIDER: "ocr_space", INVOICE_OCR_API_KEY: "server-secret" },
      fetchImpl: async () => new Response(JSON.stringify({
        OCRExitCode: 3,
        IsErroredOnProcessing: true,
        ErrorMessage: ["Monthly quota limit reached"],
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    }),
    (error: unknown) => error instanceof InvoiceOcrError && error.code === "OCR_RATE_LIMITED",
  );
});

test("confirmed supplier mapping is exact, venue-scoped and prevents an AI fallback", () => {
  const mappings: SupplierItemMapping[] = [{
    id: "map-1",
    venueId: 10,
    supplierId: "supplier-vprok",
    rawName: "КОКА КОЛА ПЭТ 1,25",
    normalizedRawName: normalizeInvoiceText("КОКА КОЛА ПЭТ 1,25"),
    packageFingerprint: "ml:1250",
    nomenclatureId: "cola-125",
    confirmations: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  }];
  const parsed = parseInvoiceOcr({
    rawText: "ВПРОК\nКОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00",
    lines: [{ text: "ВПРОК", confidence: 1 }, { text: "КОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00", confidence: 1 }],
    confidence: 1,
    durationMs: 20,
  });
  const result = applyDeterministicMappings({
    document: parsed,
    supplierId: "supplier-vprok",
    venueId: 10,
    mappings,
    nomenclature: nomenclatureCandidates(nomenclature, 10),
  });
  assert.equal(result.items[0].purchaseProductKey, "stock:cola-125|ml");
  assert.equal(result.items[0].mappingSource, "history");
  assert.equal(result.items[0].requiresReview, false);
  const metrics = recognitionMetrics({ mode: "primary", ocr: null, document: result, startedAt: Date.now() });
  assert.equal(metrics.exactMappingsCount, 1);
  assert.equal(metrics.aiRequestCount, 0);

  const wrongVenue = applyDeterministicMappings({
    document: parsed,
    supplierId: "supplier-vprok",
    venueId: 11,
    mappings,
    nomenclature: nomenclatureCandidates(nomenclature, 11),
  });
  assert.notEqual(wrongVenue.items[0].mappingSource, "history");
});

test("fuzzy scoring uses aliases and packaging but does not silently select ambiguous candidates", () => {
  const candidates = nomenclatureCandidates(nomenclature, 10);
  assert.ok(fuzzyNomenclatureScore("КОКА КОЛА ПЭТ 1,25", candidates[0]) > 0.9);
  assert.equal(confidenceLevel(0.91, 0.03), "medium");
  assert.equal(confidenceLevel(0.91, 0.2), "high");
});

test("20-line partial invoice keeps 18 deterministic results when AI is unavailable", () => {
  const candidates = Array.from({ length: 18 }, (_, index) => ({
    id: "product-" + index,
    key: "canonical-" + index,
    name: "Товар " + index,
    unit: "pcs",
    packageSize: "1 шт.",
    aliases: ["ПОЗИЦИЯ " + index],
  }));
  const mappings: SupplierItemMapping[] = Array.from({ length: 15 }, (_, index) => ({
    id: "mapping-" + index,
    venueId: 10,
    supplierId: "supplier-1",
    rawName: "ПОЗИЦИЯ " + index,
    normalizedRawName: normalizeInvoiceText("ПОЗИЦИЯ " + index),
    nomenclatureId: "product-" + index,
    confirmations: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  }));
  const document = {
    documentType: "invoice" as const,
    supplierName: "Поставщик",
    supplierType: "wholesale" as const,
    currency: "RUB",
    paymentMethod: "unknown" as const,
    total: 2_000,
    confidence: 0.9,
    warnings: [],
    items: Array.from({ length: 20 }, (_, index) => ({
      id: "line-" + index,
      rawName: index < 18 ? "ПОЗИЦИЯ " + index : "НЕИЗВЕСТНО " + index,
      normalizedRawName: normalizeInvoiceText(index < 18 ? "ПОЗИЦИЯ " + index : "НЕИЗВЕСТНО " + index),
      name: index < 18 ? "ПОЗИЦИЯ " + index : "НЕИЗВЕСТНО " + index,
      quantity: 1,
      unit: "шт.",
      packageSize: "1 шт.",
      unitPrice: 100,
      lineTotal: 100,
      confidence: 0.95,
      confidenceLevel: "high" as const,
      requiresReview: false,
    })),
  };
  const result = applyDeterministicMappings({
    document,
    supplierId: "supplier-1",
    venueId: 10,
    mappings,
    nomenclature: candidates,
  });
  assert.equal(result.items.filter((item) => !item.requiresReview).length, 18);
  assert.equal(result.items.filter((item) => item.requiresReview).length, 2);
  assert.equal(result.items.filter((item) => item.mappingSource === "history").length, 15);
  assert.equal(result.items.filter((item) => item.mappingSource === "exact_alias").length, 3);
});

test("low-confidence OCR never auto-selects a fuzzy nomenclature candidate", () => {
  const parsed = parseInvoiceOcr({
    rawText: "Поставщик\nКОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00",
    lines: [
      { text: "Поставщик", confidence: 0.3 },
      { text: "КОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00", confidence: 0.3 },
    ],
    confidence: 0.3,
    durationMs: 100,
  });
  const result = applyDeterministicMappings({
    document: parsed,
    venueId: 10,
    mappings: [],
    nomenclature: nomenclatureCandidates(nomenclature, 10),
  });
  assert.equal(result.items[0].purchaseProductKey, undefined);
  assert.equal(result.items[0].requiresReview, true);
});

test("user-confirmed mapping is reused and remains isolated from another venue", () => {
  const saved = upsertConfirmedSupplierMappings({
    current: [],
    venueId: 10,
    supplierId: "supplier-vprok",
    actorAccountId: 7,
    now: "2026-08-26T08:00:00.000Z",
    items: [{ rawName: "КОКА КОЛА ПЭТ 1,25", packageSize: "1,25 л", nomenclatureId: "cola-125" }],
  });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].nomenclatureId, "cola-125");
  const second = upsertConfirmedSupplierMappings({
    current: saved,
    venueId: 10,
    supplierId: "supplier-vprok",
    actorAccountId: 7,
    now: "2026-08-27T08:00:00.000Z",
    items: [{ rawName: "КОКА КОЛА ПЭТ 1,25", packageSize: "1,25 л", purchaseProductKey: "cola-125" }],
  });
  assert.equal(second[0].confirmations, 2);
  assert.equal(second.some((mapping) => mapping.venueId === 11), false);
});

test("V2 draft keeps canonical references and enters the existing Purchase/Inventory pipeline", () => {
  const document = normalizePurchaseDocument({
    id: "invoice-v2",
    documentType: "invoice",
    supplierName: "ВПРОК",
    date: "2026-08-26",
    currency: "RUB",
    source: "camera",
    total: 77,
    items: [{
      id: "line-1",
      rawName: "КОКА КОЛА ПЭТ 1,25",
      normalizedRawName: normalizeInvoiceText("КОКА КОЛА ПЭТ 1,25"),
      name: "Coca-Cola 1,25 л",
      quantity: 2,
      unit: "шт.",
      packageSize: "1,25 л",
      unitPrice: 38.5,
      lineTotal: 77,
      purchaseProductKey: "stock:cola-125|ml",
      nomenclatureId: "cola-125",
      mappingSource: "history",
      confidenceLevel: "high",
      requiresReview: false,
    }],
  });
  assert.equal(document.items[0].rawName, "КОКА КОЛА ПЭТ 1,25");
  assert.equal(document.items[0].purchaseProductKey, "stock:cola-125|ml");
  const result = applyPurchaseToInventory({ assortment: { stockBalances: [] }, document, accountingCurrency: "RUB" });
  assert.equal(result.movements.length, 1);
  assert.equal(result.movements[0].productKey, "stock:coca cola 1 25 л|ml");
  assert.equal(result.movements[0].amount, 2_500);
});

test("feature flag provides immediate rollback and shadow comparison is recognition-only", () => {
  assert.equal(invoiceRecognitionMode({}), "legacy");
  assert.equal(invoiceRecognitionMode({ INVOICE_RECOGNITION_V2_MODE: "primary" }), "primary");
  assert.equal(invoiceRecognitionMode({ INVOICE_RECOGNITION_V2_MODE: "shadow" }), "shadow");
  assert.equal(invoiceRecognitionMode({ INVOICE_RECOGNITION_V2_MODE: "broken" }), "legacy");
  const comparison = compareRecognitionResults(
    { supplierName: "ВПРОК", date: "2026-08-26", total: 77, items: [{}] },
    { documentType: "invoice", supplierName: "ВПРОК", supplierType: "wholesale", date: "2026-08-26", currency: "RUB", paymentMethod: "unknown", total: 77, confidence: 1, warnings: [], items: [] },
  );
  assert.equal(comparison.supplierMatch, true);
  assert.equal(comparison.documentNumberMatch, true);
  assert.equal(comparison.lineCountDelta, -1);
});

test("request-scoped QA modes are owner-only and never change the configured legacy flag", () => {
  const environment = { INVOICE_RECOGNITION_V2_MODE: "legacy" };
  assert.deepEqual(invoiceRecognitionRequestMode({ environment, role: "owner", requestedQaMode: "shadow" }), {
    configuredMode: "legacy",
    activeMode: "shadow",
    qaMode: "shadow",
    simulateAiUnavailable: false,
  });
  assert.deepEqual(invoiceRecognitionRequestMode({ environment, role: "owner", requestedQaMode: "ai-unavailable" }), {
    configuredMode: "legacy",
    activeMode: "primary",
    qaMode: "ai-unavailable",
    simulateAiUnavailable: true,
  });
  assert.equal(invoiceRecognitionRequestMode({ environment, role: "manager", requestedQaMode: "shadow" }).activeMode, "legacy");
  assert.equal(invoiceRecognitionRequestMode({ environment: { INVOICE_RECOGNITION_V2_MODE: "primary" }, role: "owner", requestedQaMode: "shadow" }).activeMode, "primary");
});

test("quality evaluation measures real-dataset ground truth without logging document contents", () => {
  const document = parseInvoiceOcr({
    rawText: "ВПРОК\nКОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00\nИтого 77,00",
    lines: [{ text: "ВПРОК", confidence: 0.98 }, { text: "КОКА КОЛА ПЭТ 1,25 2 шт 38,50 77,00", confidence: 0.96 }],
    confidence: 0.97,
    durationMs: 30,
  });
  const quality = recognitionQualityAgainstGroundTruth(document, {
    supplierName: "ВПРОК",
    total: 77,
    items: [{ rawName: "Coca Cola PET 1.25", quantity: 2, unitPrice: 38.5, lineTotal: 77 }],
  });
  assert.equal(quality.lineRecall, 1);
  assert.equal(quality.quantityAccuracy, 1);
  assert.equal(quality.unitPriceAccuracy, 1);
  assert.equal(quality.documentTotalMatch, true);
});

test("route keeps legacy, limits AI to unresolved lines and returns manual continuation when providers fail", async () => {
  const route = await readFile(new URL("../app/api/purchases/scan/route.ts", import.meta.url), "utf8");
  const confirm = await readFile(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), "utf8");
  const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
  assert.match(route, /mode === "legacy"/);
  assert.match(route, /items\.filter\(\(item\) => item\.requiresReview\)/);
  assert.match(route, /INVOICE_RECOGNITION_V2_AI_FALLBACK_UNAVAILABLE/);
  assert.match(route, /OCR_FAILED/);
  assert.match(route, /PARSER_FAILED/);
  assert.match(route, /VALIDATION_REQUIRED/);
  assert.match(route, /manualContinuation: true/);
  assert.match(route, /invoiceRecognitionRequestMode/);
  assert.match(route, /simulateAiUnavailable/);
  assert.match(route, /INVOICE_RECOGNITION_STARTED/);
  assert.match(route, /jobId: input\.jobId/);
  assert.match(route, /X-Invoice-Recognition-Job-Id/);
  assert.match(route, /shadowResult: v2\.document/);
  assert.match(route, /ocr_purchases\." \+ input\.jobId/);
  assert.match(route, /Документ распознан частично/);
  assert.doesNotMatch(route, /limit:\s*10000/);
  assert.match(confirm, /INVOICE_RECOGNITION_REVIEW_REQUIRED/);
  assert.match(confirm, /INVOICE_MAPPING_STORE_KEY/);
  assert.match(bundle, /Читаем документ…/);
  assert.match(bundle, /Сопоставляем позиции…/);
  assert.match(bundle, /bdInvoiceRecognitionPhaseTimer=setTimeout/);
  assert.match(bundle, /clearTimeout\(bdInvoiceRecognitionPhaseTimer\)/);
  assert.match(bundle, /function bdInvoiceRecognitionQaUrlV2/);
  assert.match(bundle, /invoiceRecognitionQa/);
  assert.doesNotMatch(bundle, /fetch\("\/api\/purchases\/scan"/);
  assert.doesNotMatch(bundle, /(?<!bdInvoiceRecognitionPhaseTimer=)setTimeout\(\(\)=>[GE]\("Сопоставляем позиции…"\),650\)/);
  assert.match(bundle, /function bdInvoiceLineMappingV2/);
  assert.match(bundle, /Найти по всей номенклатуре…/);
  assert.match(bundle, /mappingSource:"manual"/);
});
