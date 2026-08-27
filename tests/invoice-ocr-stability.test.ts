import assert from "node:assert/strict";
import test from "node:test";
import { configuredStableInvoiceOcr } from "../lib/bardoctor/invoice-ocr-stability";
import { invoiceOcrStageTrace } from "../lib/bardoctor/invoice-recognition-v2";

function ocrSpaceBody(rows: string[], total = 300) {
  const all = ["Поставщик: Впрок", ...rows, `Итого: ${total}`];
  return {
    OCRExitCode: 1,
    IsErroredOnProcessing: false,
    ParsedResults: [{
      ParsedText: all.join("\n"),
      TextOverlay: {
        HasOverlay: true,
        Lines: all.map((LineText, index) => ({
          LineText,
          Words: [{ Left: 10, Top: 20 + index * 24, Width: 220, Height: 18 }],
        })),
      },
    }],
  };
}

function fetchSequence(values: unknown[]): typeof fetch {
  let index = 0;
  return (async () => Response.json(values[Math.min(index++, values.length - 1)])) as typeof fetch;
}

const environment = {
  INVOICE_OCR_PROVIDER: "ocr_space",
  INVOICE_OCR_ENDPOINT: "https://api.ocr.space/parse/image",
  INVOICE_OCR_API_KEY: "test-key",
};
const documents = [{ bytes: new Uint8Array([1, 2, 3]), filename: "invoice.jpg", mimeType: "image/jpeg" }];

test("stable OCR retries an incomplete commercial total and selects the complete parse", async () => {
  const result = await configuredStableInvoiceOcr({
    documents,
    environment,
    fetchImpl: fetchSequence([
      ocrSpaceBody(["1 Товар А 1 шт 100 100"]),
      ocrSpaceBody(["1 Товар А 1 шт 100 100", "2 Коньяк Нистру 1 шт 200 200"]),
    ]),
  });
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0].reconciled, false);
  assert.equal(result.attempts[1].reconciled, true);
  assert.equal(result.selectedAttempt, 2);
  assert.equal(result.parsed.items.length, 2);
  assert.equal(result.parsed.items[1].rawName, "Коньяк Нистру");
});

test("stable OCR uses a third attempt when two provider reads remain incomplete", async () => {
  const result = await configuredStableInvoiceOcr({
    documents,
    environment,
    fetchImpl: fetchSequence([
      ocrSpaceBody(["1 Товар А 1 шт 100 100"]),
      ocrSpaceBody(["1 Товар А 1 шт 100 100"]),
      ocrSpaceBody(["1 Товар А 1 шт 100 100", "2 Коньяк Нистру 1 шт 200 200"]),
    ]),
  });
  assert.equal(result.attempts.length, 3);
  assert.equal(result.selectedAttempt, 3);
  assert.equal(result.parsed.items.length, 2);
});

test("OCR stage trace keeps raw text, coordinates, parser decision, and Nistru row", () => {
  const trace = invoiceOcrStageTrace({
    rawText: "Коньяк Нистру 10 л 237,70 2377,00",
    lines: [{
      text: "Коньяк Нистру 10 л 237,70 2377,00",
      confidence: null,
      page: 1,
      bounds: { x: 12, y: 48, width: 420, height: 22 },
    }],
    confidence: null,
    durationMs: 1,
  });
  assert.equal(trace.overlayBlocks[0].bounds?.y, 48);
  assert.equal(trace.overlayBlocks[0].parsed, true);
  assert.equal(trace.overlayBlocks[0].rejectedBecause, null);
  assert.equal(trace.parsedItems[0].rawName, "Коньяк Нистру");
  assert.equal(trace.parsedItems[0].quantity, 10);
});
