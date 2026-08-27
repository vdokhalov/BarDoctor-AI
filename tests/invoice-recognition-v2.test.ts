import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  configuredInvoiceOcr,
  InvoiceOcrError,
} from "../lib/bardoctor/invoice-ocr";
import {
  applyDeterministicMappings,
  canonicalInvoiceSupplierMappings,
  compareRecognitionResults,
  confidenceLevel,
  fuzzyNomenclatureScore,
  invoiceRecognitionMode,
  invoiceRecognitionRequestMode,
  mergeShadowMappingMetadata,
  nomenclatureCandidates,
  normalizeInvoicePackageSemantics,
  normalizeInvoiceText,
  packageFingerprint,
  parsedInvoiceDocumentFromLegacy,
  parseInvoiceLine,
  parseInvoiceOcr,
  recognitionQualityAgainstGroundTruth,
  recognitionMetrics,
  upsertConfirmedSupplierMappings,
  type ParsedInvoiceDocument,
  type SupplierItemMapping,
} from "../lib/bardoctor/invoice-recognition-v2";
import { applyPurchaseToInventory } from "../lib/bardoctor/inventory";
import { normalizePurchaseDocument } from "../lib/bardoctor/purchases";
import {
  resolveCanonicalPurchaseItem,
  upsertSupplierProductMapping,
} from "../lib/bardoctor/nomenclature-identity";

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
  assert.equal(normalizeInvoiceText("  КОКА-КОЛА (ПЭТ) 1,25 Л, бут. "), "кока кола pet 1.25 l bottle");
  assert.equal(normalizeInvoiceText("Майонез, уп. 500 г"), "майонез pack 500 g");
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

test("Vprok 379 parser reads reversed one-litre markers without copying measured totals into package", () => {
  const fixtures = [
    ["1 | Водка Волк л.1 | л | 10 л | 114,30 | 1143,00", "1 л", "л"],
    ["2 | Коньяк Нистру л.1 | л | 10 л | 237,70 | 2377,00", "1 л", "л"],
    ["3 | Коньяк Сюрпризный л.1 | л | 10 л | 275,20 | 2752,00", "1 л", "л"],
    ["9 | Кола п.1 | л | 75 л | 23,74 | 1780,50", "1 л", "л"],
  ] as const;
  for (const [raw, expectedPackage, expectedUnit] of fixtures) {
    const line = parseInvoiceLine(raw);
    assert.ok(line, raw);
    assert.equal(line.packageSize, expectedPackage, raw);
    assert.equal(line.unit, expectedUnit, raw);
  }
});

test("Vprok 379 parser repairs OCR bang markers and restores measured quantity and unit", () => {
  const fixtures = [
    ["Водка Волк л.! л 10 114,30 1143,00", 10],
    ["Коньяк Нистру л.! л 10 237,70 2377,00", 10],
    ["Коньяк Сюрпризный л.! л 10 275,20 2752,00", 10],
    ["Кола л.! л 75 23,74 1780,50", 75],
  ] as const;
  for (const [raw, expectedQuantity] of fixtures) {
    const line = parseInvoiceLine(raw);
    assert.ok(line, raw);
    assert.equal(line.quantity, expectedQuantity, raw);
    assert.equal(line.unit, "л", raw);
    assert.equal(line.packageSize, "1 л", raw);
  }
});

test("Sherif measured litres stay litres when a product name contains a one-litre PET marker", () => {
  const line = parseInvoiceLine("13 | Кола п.1 | л | 15 л | 21,60 | 324,00");
  assert.ok(line);
  assert.equal(line.packageSize, "1 л");
  assert.equal(line.unit, "л");
  assert.equal(line.quantity, 15);
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

test("legacy structured lines feed Hybrid matching without trusting legacy canonical IDs", () => {
  const document = parsedInvoiceDocumentFromLegacy({
    documentType: "invoice",
    supplierName: "Рынок",
    documentNumber: "394",
    date: "2026-08-26",
    currency: "RUB",
    total: 587.1,
    confidence: 0.91,
    items: [
      {
        id: "legacy-394-1",
        name: "Молоко 1 л",
        quantity: 2,
        unit: "шт.",
        packageSize: "1 л",
        unitPrice: 50,
        lineTotal: 100,
        confidence: 0.94,
        nomenclatureId: "hallucinated-id",
      },
    ],
  });
  assert.equal(document.documentNumber, "394");
  assert.equal(document.items.length, 1);
  assert.equal(document.items[0].rawName, "Молоко 1 л");
  assert.equal(document.items[0].nomenclatureId, undefined);
  assert.equal(document.items[0].confidenceLevel, "high");
});

test("legacy package semantics distinguish counted bottles from measured totals", () => {
  assert.deepEqual(normalizeInvoicePackageSemantics({
    quantity: 12,
    unit: "л",
    packageSize: "0,5 л",
  }), { unit: "шт.", packageSize: "0,5 л" });
  assert.deepEqual(normalizeInvoicePackageSemantics({
    quantity: 10,
    unit: "л",
    packageSize: "10 л",
  }), { unit: "л", packageSize: "л" });
  assert.deepEqual(normalizeInvoicePackageSemantics({
    quantity: 1.5,
    unit: "л",
    packageSize: "л",
  }), { unit: "л", packageSize: "л" });

  const document = parsedInvoiceDocumentFromLegacy({
    supplierName: "Шериф",
    total: 75.6,
    confidence: 0.94,
    items: [{
      id: "water-line",
      name: "Моршинская вода 0.5 л",
      quantity: 12,
      unit: "л",
      packageSize: "0.5 л",
      unitPrice: 6.3,
      lineTotal: 75.6,
      confidence: 0.94,
    }],
  });
  assert.equal(document.items[0].unit, "шт.");
  assert.equal(document.items[0].packageSize, "0.5 л");
  assert.equal(normalizePurchaseDocument(document).items[0].quantityMode, "count");
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

test("supplier article and barcode resolve before name similarity", () => {
  const source: ParsedInvoiceDocument = {
    documentType: "invoice",
    supplierName: "Поставщик",
    supplierType: "wholesale",
    currency: "RUB",
    paymentMethod: "unknown",
    total: 200,
    confidence: 0.9,
    warnings: [],
    items: [
      {
        id: "article-line",
        rawName: "Неузнаваемая строка арт AB-125",
        normalizedRawName: "неузнаваемая строка арт ab 125",
        supplierArticle: "AB-125",
        name: "Неузнаваемая строка",
        quantity: 1,
        unit: "шт.",
        unitPrice: 100,
        lineTotal: 100,
        confidence: 0.9,
        confidenceLevel: "medium",
        requiresReview: true,
      },
      {
        id: "barcode-line",
        rawName: "OCR ошибка 4601234567890",
        normalizedRawName: "ocr ошибка 4601234567890",
        barcode: "4601234567890",
        name: "OCR ошибка",
        quantity: 1,
        unit: "шт.",
        unitPrice: 100,
        lineTotal: 100,
        confidence: 0.9,
        confidenceLevel: "medium",
        requiresReview: true,
      },
    ],
  };
  const result = applyDeterministicMappings({
    document: source,
    supplierId: "supplier-1",
    venueId: 10,
    mappings: [],
    nomenclature: [
      { id: "article-product", key: "article-product|pcs", name: "Другой товар", unit: "pcs", packageSize: "1 шт.", aliases: [], supplierArticles: ["AB-125"] },
      { id: "barcode-product", key: "barcode-product|pcs", name: "Совсем иное", unit: "pcs", packageSize: "1 шт.", aliases: [], barcodes: ["4601234567890"] },
    ],
  });
  assert.deepEqual(result.items.map((item) => item.nomenclatureId), ["article-product", "barcode-product"]);
  assert.ok(result.items.every((item) => item.mappingSource === "supplier_identifier" && item.requiresReview === false));
});

test("matcher reads the full canonical venue dataset, including stock-only identities", () => {
  const assortment = {
    stockBalances: Array.from({ length: 550 }, (_, index) => ({
      key: `stock:item-${index}|g`,
      productKey: `stock:item-${index}|g`,
      venueId: 10,
      name: index === 537 ? "Капуста пекинская" : `Товар ${index}`,
      unit: "g",
      current: 0,
      active: true,
    })),
    nomenclature: [{
      id: "canonical-537",
      key: "stock:item-537|g",
      productKey: "stock:item-537|g",
      venueId: 10,
      name: "Капуста пекинская",
      unit: "g",
      aliases: ["Пекинская капуста"],
      active: true,
    }],
  };
  const candidates = nomenclatureCandidates(assortment, 10);
  assert.equal(candidates.length, 550);
  assert.equal(candidates.filter((candidate) => candidate.key === "stock:item-537|g").length, 1);
  assert.deepEqual(candidates.find((candidate) => candidate.key === "stock:item-537|g")?.aliases, ["Пекинская капуста"]);
  const parsed = parseInvoiceOcr({
    rawText: "Рынок\nПекинская капуста 1 кг 44,95 44,95",
    lines: [{ text: "Пекинская капуста 1 кг 44,95 44,95", confidence: 0.96 }],
    confidence: 0.96,
    durationMs: 5,
  });
  const matched = applyDeterministicMappings({ document: parsed, supplierId: "market", venueId: 10, mappings: [], nomenclature: candidates });
  assert.equal(matched.items[0].purchaseProductKey, "stock:item-537|g");
  assert.equal(matched.items[0].mappingSource, "exact_alias");
  assert.equal(matched.items[0].name, "Пекинская капуста");
  assert.equal(matched.items[0].rawName, "Пекинская капуста");
  assert.equal(matched.items[0].nomenclatureName, "Капуста пекинская");
  assert.equal(matched.items[0].confidenceLevel, "medium");
  assert.equal(matched.items[0].requiresReview, true);
});

test("package identity prevents a high-confidence wrong-size match", () => {
  const candidates = nomenclatureCandidates({ nomenclature: [
    { id: "cola-500", key: "stock:cola-500|ml", venueId: 10, name: "Coca-Cola 0,5 л", unit: "ml", packageSize: "0,5 л" },
    { id: "cola-1250", key: "stock:cola-1250|ml", venueId: 10, name: "Coca-Cola 1,25 л", unit: "ml", packageSize: "1,25 л" },
  ] }, 10);
  assert.ok(fuzzyNomenclatureScore("Кока Кола ПЭТ 1,25 л", candidates[1]) > 0.85);
  assert.ok(fuzzyNomenclatureScore("Кока Кола ПЭТ 1,25 л", candidates[0]) < 0.6);
});

test("exact aliases cannot bypass volume, unit, pack or canonical variant conflicts", () => {
  const base = {
    documentType: "invoice" as const,
    supplierName: "Шериф",
    supplierType: "wholesale" as const,
    currency: "RUB",
    paymentMethod: "unknown" as const,
    total: 1,
    confidence: 0.95,
    warnings: [],
  };
  const cases = [
    { rawName: "Моршинская 0.5 л газированная вода", unit: "шт.", packageSize: "0.5 л", candidate: { name: "Моршинская 1.5 л газированная вода", unit: "ml", packageSize: "1.5 л" } },
    { rawName: "Пиво Kozel светлое", unit: "шт.", packageSize: "1 шт.", candidate: { name: "Пиво Kozel тёмное", unit: "pcs", packageSize: "1 шт." } },
    { rawName: "Вода бутылка 6×0.5 л", unit: "уп.", packageSize: "6×0.5 л", candidate: { name: "Вода бутылка 1×0.5 л", unit: "pcs", packageSize: "1×0.5 л" } },
    { rawName: "Сок коробка 1 л", unit: "шт.", packageSize: "1 л", candidate: { name: "Сок бутылка 1 л", unit: "ml", packageSize: "1 л" } },
  ];
  for (const [index, value] of cases.entries()) {
    const line = {
      id: `conflict-${index}`, rawName: value.rawName, normalizedRawName: normalizeInvoiceText(value.rawName), name: value.rawName,
      quantity: 1, unit: value.unit, packageSize: value.packageSize, unitPrice: 1, lineTotal: 1,
      confidence: 0.95, confidenceLevel: "high" as const, requiresReview: false,
    };
    const result = applyDeterministicMappings({
      document: { ...base, items: [line] }, supplierId: "sherif", venueId: 10, mappings: [],
      nomenclature: [{ id: `candidate-${index}`, key: `candidate-${index}`, aliases: [value.rawName], ...value.candidate }],
    });
    assert.equal(result.items[0].nomenclatureId, undefined, value.rawName);
    assert.equal(result.items[0].requiresReview, true, value.rawName);
  }
});

test("manual confirmation persists in canonical supplier memory and is reused on the second pass", () => {
  const candidates = nomenclatureCandidates({ stockBalances: [{
    id: "cabbage",
    key: "stock:cabbage|g",
    venueId: 10,
    name: "Капуста пекинская",
    unit: "g",
    active: true,
  }] }, 10);
  const rawName = "КАП ПЕКИН ПРЕМИУМ";
  const firstDocument = {
    documentType: "invoice" as const,
    supplierName: "Рынок",
    supplierType: "wholesale" as const,
    currency: "RUB",
    paymentMethod: "unknown" as const,
    total: 49,
    confidence: 0.95,
    warnings: [],
    items: [{
      id: "line-1", rawName, normalizedRawName: normalizeInvoiceText(rawName), name: rawName,
      quantity: 1.09, unit: "кг", unitPrice: 44.95, lineTotal: 49,
      confidence: 0.95, confidenceLevel: "high" as const, requiresReview: false,
    }],
  };
  const first = applyDeterministicMappings({ document: firstDocument, supplierId: "market", venueId: 10, mappings: [], nomenclature: candidates });
  assert.equal(first.items[0].requiresReview, true);

  const resolution = resolveCanonicalPurchaseItem({
    assortment: {},
    document: { id: "draft-1", venueId: 10, supplierId: "market", supplierName: "Рынок", currency: "RUB" },
    item: { id: "line-1", name: rawName, purchaseProductKey: "stock:cabbage|g", unit: "g" },
    canonicalItems: candidates,
    now: "2026-08-26T12:00:00.000Z",
  });
  const assortment = {
    supplierProductMappings: upsertSupplierProductMapping([], { ...resolution.sourceMapping, status: "confirmed", confidence: 1 }),
  };
  const mappings = canonicalInvoiceSupplierMappings(assortment, 10);
  const second = applyDeterministicMappings({ document: firstDocument, supplierId: "market", venueId: 10, mappings, nomenclature: candidates });
  assert.equal(second.items[0].mappingSource, "history");
  assert.equal(second.items[0].purchaseProductKey, "stock:cabbage|g");
  assert.equal(second.items[0].name, rawName);
  assert.equal(second.items[0].nomenclatureName, "Капуста пекинская");
  assert.equal(second.items[0].requiresReview, false);
  const metrics = recognitionMetrics({ mode: "shadow", ocr: null, document: second, nomenclatureCandidatesCount: candidates.length, matchingDurationMs: 2, startedAt: Date.now() });
  assert.equal(metrics.historicalMappingsCount, 1);
  assert.equal(metrics.unresolvedCount, 0);
  assert.equal(metrics.aiRequestCount, 0);
});

test("user correction replaces the prior supplier identity instead of leaving a conflicting mapping", () => {
  const current: SupplierItemMapping[] = [{
    id: "wrong", venueId: 10, supplierId: "sherif", rawName: "Кола 0.5 л", normalizedRawName: "кола 0.5 l",
    packageFingerprint: "ml:500", purchaseUnit: "pcs", nomenclatureId: "cola-1250", confirmations: 1,
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
  }];
  const corrected = upsertConfirmedSupplierMappings({
    current, venueId: 10, supplierId: "sherif", actorAccountId: 1,
    items: [{ rawName: "Кола 0.5 л", packageSize: "0.5 л", unit: "шт.", nomenclatureId: "cola-500" }],
    now: "2026-08-27T00:00:00.000Z",
  });
  assert.equal(corrected.length, 1);
  assert.equal(corrected[0].nomenclatureId, "cola-500");
  assert.equal(corrected[0].confirmations, 2);
});

test("migrated dimensional supplier memory safely matches a counted package", () => {
  const candidates = nomenclatureCandidates({ nomenclature: [{
    id: "water-500",
    key: "stock:water-500|ml",
    venueId: 10,
    name: "Моршинская вода 0,5 л",
    unit: "ml",
    packageSize: "0,5 л",
  }] }, 10);
  const document = parsedInvoiceDocumentFromLegacy({
    supplierName: "Шериф",
    total: 75.6,
    confidence: 0.94,
    items: [{
      id: "water-line",
      name: "Моршинская вода 0.5 л",
      quantity: 12,
      unit: "л",
      packageSize: "0.5 л",
      unitPrice: 6.3,
      lineTotal: 75.6,
      confidence: 0.94,
    }],
  });
  const mapped = applyDeterministicMappings({
    document,
    supplierId: "sheriff",
    venueId: 10,
    mappings: [{
      id: "migrated-water",
      venueId: 10,
      supplierId: "sheriff",
      rawName: "Моршинская вода 0.5 л",
      normalizedRawName: normalizeInvoiceText("Моршинская вода 0.5 л"),
      packageFingerprint: "ml:500",
      purchaseUnit: "ml",
      nomenclatureId: "stock:water-500|ml",
      confirmations: 0,
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
    }],
    nomenclature: candidates,
  });
  assert.equal(mapped.items[0].mappingSource, "history");
  assert.equal(mapped.items[0].purchaseProductKey, "stock:water-500|ml");
  assert.equal(mapped.items[0].requiresReview, false);
});

test("canonical supplier mappings remain supplier-aware and venue-scoped", () => {
  const makeMapping = (supplierId: string, venueId: number, canonicalProductKey: string) => {
    const resolution = resolveCanonicalPurchaseItem({
      assortment: {},
      document: { venueId, supplierId, supplierName: supplierId },
      item: { name: "Кола 1.25", purchaseProductKey: canonicalProductKey, unit: "ml" },
      canonicalItems: [{ key: canonicalProductKey, name: canonicalProductKey, unit: "ml" }],
    });
    return { ...resolution.sourceMapping, status: "confirmed" as const, confidence: 1 };
  };
  const assortment = { supplierProductMappings: [
    makeMapping("supplier-a", 10, "stock:cola-a|ml"),
    makeMapping("supplier-b", 10, "stock:cola-b|ml"),
    makeMapping("supplier-a", 11, "stock:cola-other-venue|ml"),
  ] };
  const venueTen = canonicalInvoiceSupplierMappings(assortment, 10);
  assert.equal(venueTen.length, 2);
  assert.equal(venueTen.find((mapping) => mapping.supplierId === "supplier-a")?.nomenclatureId, "stock:cola-a|ml");
  assert.equal(canonicalInvoiceSupplierMappings(assortment, 11)[0].nomenclatureId, "stock:cola-other-venue|ml");
});

test("real 15-line market invoice learns once and resolves the second pass without AI", () => {
  const names = [
    "Капуста пекинская", "Сыр Российский", "Майонез", "Кетчуп", "Специи в ассортименте",
    "Апельсины", "Лимоны", "Лаваш", "Шампиньоны", "Яблоки", "Помидоры", "Огурцы",
    "Зелень пучок", "Лист салата", "Филе куриное",
  ];
  const stockBalances = [
    ...Array.from({ length: 500 }, (_, index) => ({
      key: `stock:filler-${index}|g`, name: `Служебная позиция ${index}`, unit: "g", venueId: 10, active: true,
    })),
    ...names.map((name, index) => ({
      id: `market-${index}`, key: `stock:market-${index}|g`, name, unit: index === 7 || index === 12 ? "pcs" : "g", venueId: 10, active: true,
    })),
  ];
  const candidates = nomenclatureCandidates({ stockBalances }, 10);
  const rawNames = names.map((name, index) => `РЫН-${String(index + 1).padStart(3, "0")} ${name.slice(0, Math.max(5, Math.floor(name.length * 0.55)))}`);
  const document = {
    documentType: "invoice" as const,
    supplierName: "Рынок",
    supplierType: "wholesale" as const,
    currency: "RUB",
    paymentMethod: "unknown" as const,
    total: 587.1,
    confidence: 0.96,
    warnings: [],
    items: rawNames.map((rawName, index) => ({
      id: `line-${index + 1}`, rawName, normalizedRawName: normalizeInvoiceText(rawName), name: rawName,
      quantity: 1, unit: index === 7 || index === 12 ? "шт" : "кг", unitPrice: 10 + index,
      lineTotal: 10 + index, confidence: 0.96, confidenceLevel: "high" as const, requiresReview: false,
    })),
  };
  const first = applyDeterministicMappings({ document, supplierId: "market", venueId: 10, mappings: [], nomenclature: candidates });
  assert.equal(first.items.length, 15);
  assert.ok(first.items.every((item) => item.mappingCandidates?.length || item.requiresReview));

  let mappings: unknown[] = [];
  for (let index = 0; index < rawNames.length; index += 1) {
    const resolution = resolveCanonicalPurchaseItem({
      assortment: { supplierProductMappings: mappings },
      document: { id: "market-invoice-394", venueId: 10, supplierId: "market", supplierName: "Рынок" },
      item: {
        id: `line-${index + 1}`,
        name: rawNames[index],
        purchaseProductKey: `stock:market-${index}|g`,
        unit: index === 7 || index === 12 ? "pcs" : "g",
      },
      canonicalItems: candidates,
    });
    mappings = upsertSupplierProductMapping(mappings, { ...resolution.sourceMapping, status: "confirmed", confidence: 1 });
  }
  const second = applyDeterministicMappings({
    document,
    supplierId: "market",
    venueId: 10,
    mappings: canonicalInvoiceSupplierMappings({ supplierProductMappings: mappings }, 10),
    nomenclature: candidates,
  });
  assert.equal(second.items.filter((item) => item.mappingSource === "history").length, 15);
  assert.equal(second.items.filter((item) => item.requiresReview).length, 0);
  const metrics = recognitionMetrics({ mode: "shadow", ocr: null, document: second, nomenclatureCandidatesCount: candidates.length, startedAt: Date.now() });
  assert.equal(metrics.historicalMappingsCount, 15);
  assert.equal(metrics.unresolvedCount, 0);
  assert.equal(metrics.aiRequestCount, 0);
  assert.equal(metrics.aiEstimatedTokenUsage, 0);
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

test("shadow review keeps legacy commercial data and exposes V2 canonical mapping metadata", () => {
  const merged = mergeShadowMappingMetadata(
    {
      supplierName: "Рынок",
      items: [{
        id: "legacy-1",
        name: "Капуста пекинская",
        quantity: 1.09,
        unit: "кг",
        unitPrice: 44.95,
        lineTotal: 49,
      }],
    },
    {
      documentType: "invoice",
      supplierId: "supplier-market",
      supplierName: "Рынок",
      supplierType: "wholesale",
      currency: "RUB",
      paymentMethod: "unknown",
      total: 49,
      confidence: 0.98,
      warnings: [],
      items: [{
        id: "v2-1",
        rawName: "Капуста пекинская",
        normalizedRawName: "капуста пекинская",
        name: "Капуста пекинская",
        quantity: 1.09,
        unit: "kg",
        unitPrice: 44.95,
        lineTotal: 49,
        confidence: 0.9,
        confidenceLevel: "medium",
        purchaseProductKey: "stock:cabbage|kg",
        nomenclatureId: "cabbage",
        mappingSource: "ai",
        mappingCandidates: [{ id: "cabbage", key: "stock:cabbage|kg", name: "Капуста пекинская", score: 0.9 }],
        requiresReview: false,
      }],
    },
  );
  assert.equal(merged.supplierId, "supplier-market");
  const [line] = merged.items as Array<Record<string, unknown>>;
  assert.equal(line.name, "Капуста пекинская");
  assert.equal(line.quantity, 1.09);
  assert.equal(line.unitPrice, 44.95);
  assert.equal(line.lineTotal, 49);
  assert.equal(line.rawName, "Капуста пекинская");
  assert.equal(line.mappingSource, "ai");
  assert.equal(line.requiresReview, true);
  assert.deepEqual(line.mappingCandidates, [{ id: "cabbage", key: "stock:cabbage|kg", name: "Капуста пекинская", score: 0.9 }]);
});

test("shadow review never attaches mapping evidence to a commercially different line", () => {
  const merged = mergeShadowMappingMetadata(
    { items: [{ id: "legacy-1", name: "Вода", quantity: 2, unitPrice: 50, lineTotal: 100 }] },
    {
      documentType: "invoice",
      supplierName: "Рынок",
      supplierType: "wholesale",
      currency: "RUB",
      paymentMethod: "unknown",
      total: 49,
      confidence: 0.98,
      warnings: [],
      items: [{
        id: "v2-1",
        rawName: "Капуста пекинская",
        normalizedRawName: "капуста пекинская",
        name: "Капуста пекинская",
        quantity: 1.09,
        unit: "kg",
        unitPrice: 44.95,
        lineTotal: 49,
        confidence: 0.9,
        confidenceLevel: "medium",
        mappingCandidates: [{ id: "cabbage", key: "stock:cabbage|kg", name: "Капуста пекинская", score: 0.9 }],
        requiresReview: true,
      }],
    },
  );
  const [line] = merged.items as Array<Record<string, unknown>>;
  assert.equal(line.rawName, undefined);
  assert.equal(line.mappingCandidates, undefined);
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
  const mappingRoute = await readFile(new URL("../app/api/purchases/mappings/route.ts", import.meta.url), "utf8");
  const aiMatching = await readFile(new URL("../lib/bardoctor/invoice-ai-matching.ts", import.meta.url), "utf8");
  const aiProvider = await readFile(new URL("../lib/bardoctor/invoice-ai-openai-provider.ts", import.meta.url), "utf8");
  const jobMigration = await readFile(new URL("../drizzle/0025_hybrid_invoice_matching_jobs.sql", import.meta.url), "utf8");
  const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
  const bootstrap = await readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");
  const appHtml = await readFile(new URL("../public/app.html", import.meta.url), "utf8");
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
  assert.match(route, /recognitionFingerprint/);
  assert.match(route, /acquireRecognitionJob/);
  assert.match(route, /completeRecognitionJob/);
  assert.match(route, /invoice_recognition_jobs/);
  assert.match(route, /X-Invoice-Recognition-Job-Id/);
  assert.match(route, /shadowResult: v2\.document/);
  assert.match(route, /mergeShadowMappingMetadata\(legacy, v2\.document\)/);
  assert.match(route, /parsedDocument: legacy \? parsedInvoiceDocumentFromLegacy\(legacy\) : undefined/);
  assert.match(route, /engine: "legacy_structured_lines"/);
  assert.match(route, /inputStrategy: mode === "shadow" \? "legacy_structured_lines_v1"/);
  assert.match(route, /ocr_purchases\." \+ input\.jobId/);
  assert.match(route, /Документ распознан частично/);
  assert.doesNotMatch(route, /limit:\s*10000/);
  assert.match(aiMatching, /INVOICE_AI_BATCH_MAX_LINES = 40/);
  assert.match(aiMatching, /allowed\.has\(requested\)/);
  assert.match(aiMatching, /insufficient_quota/);
  assert.match(aiProvider, /responseSchema: INVOICE_AI_RESPONSE_SCHEMA/);
  assert.match(aiProvider, /Never invent identifiers/);
  assert.match(jobMigration, /PRIMARY KEY\(`account_id`, `venue_id`, `fingerprint`\)/);
  assert.match(confirm, /INVOICE_RECOGNITION_REVIEW_REQUIRED/);
  assert.match(confirm, /INVOICE_MAPPING_STORE_KEY/);
  assert.match(mappingRoute, /resolveCanonicalPurchaseItem/);
  assert.match(mappingRoute, /upsertSupplierProductMapping/);
  assert.match(mappingRoute, /ASSORTMENT_STORE_KEY/);
  assert.match(mappingRoute, /account\.venueId/);
  assert.match(mappingRoute, /INVOICE_RECOGNITION_V2_MAPPING_CONFIRMED/);
  assert.match(mappingRoute, /body\.action === "remove"/);
  assert.match(mappingRoute, /INVOICE_RECOGNITION_V2_MAPPING_REMOVED/);
  assert.doesNotMatch(mappingRoute, /INVOICE_MAPPING_STORE_KEY/);
  assert.match(bundle, /Читаем документ…/);
  assert.match(bundle, /Сопоставляем позиции…/);
  assert.match(bundle, /bdInvoiceRecognitionPhaseTimer=setTimeout/);
  assert.match(bundle, /clearTimeout\(bdInvoiceRecognitionPhaseTimer\)/);
  assert.match(bundle, /function bdInvoiceRecognitionQaUrlV2/);
  assert.match(bundle, /invoiceRecognitionQa/);
  assert.match(bundle, /sessionStorage\.setItem\(bdInvoiceRecognitionQaStorageV2/);
  assert.match(bundle, /sessionStorage\.getItem\(bdInvoiceRecognitionQaStorageV2/);
  assert.match(bundle, /sessionStorage\.removeItem\(bdInvoiceRecognitionQaStorageV2/);
  assert.doesNotMatch(bundle, /fetch\("\/api\/purchases\/scan"/);
  assert.doesNotMatch(bundle, /(?<!bdInvoiceRecognitionPhaseTimer=)setTimeout\(\(\)=>[GE]\("Сопоставляем позиции…"\),650\)/);
  assert.match(bundle, /function bdInvoiceLineMappingV3/);
  assert.match(bundle, /data-bd-invoice-mapping-memory":"canonical-v3"/);
  assert.match(bundle, /fetch\("\/api\/purchases\/mappings"/);
  assert.match(bundle, /Найти по всей номенклатуре…/);
  assert.match(bundle, /mappingSource:"manual"/);
  assert.match(bundle, /nomenclatureName:k\.name,name:e\.rawName\|\|e\.name/);
  assert.doesNotMatch(bundle, /nomenclatureId:k\.id,name:k\.name/);
  assert.match(bundle, /children:e\.nomenclatureName\|\|C\.find/);
  assert.match(bundle, /Оставить без связи/);
  assert.match(bundle, /action:"remove"/);
  assert.match(bundle, /Подтвердите предложенную номенклатуру/);
  assert.match(bundle, /e\.mappingSource==="ai"/);
  assert.match(bundle, /function bdInvoiceReviewSummaryV4/);
  assert.match(bundle, /Подтвердить ",s," уверенных соответствий/);
  assert.match(bundle, /bdInvoiceReviewOrderV4\(e\.items\)\.map/);
  assert.match(bundle, /e\.source==="manual"\|\|\(!g\.requiresReview/);
  assert.match(bundle, /g\.mappingSource\|\|bdCatArray\(g\.mappingCandidates\)\.length>0/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=[^\"]*20260826-invoice-create-canonical-v297/);
  assert.match(appHtml, /catalog\.css\?v=[^\"]*20260826-invoice-create-canonical-v297/);
  assert.match(appHtml, /bardoctor-preview\.js\?v=[^\"]*20260826-invoice-create-canonical-v297/);
});
