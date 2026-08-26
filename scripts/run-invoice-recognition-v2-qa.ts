import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { configuredInvoiceOcr } from "../lib/bardoctor/invoice-ocr";
import {
  parseInvoiceOcr,
  recognitionQualityAgainstGroundTruth,
  type InvoiceRecognitionGroundTruth,
} from "../lib/bardoctor/invoice-recognition-v2";

type QaCase = {
  id: string;
  files: Array<{ path: string; mimeType: string }>;
  expected: InvoiceRecognitionGroundTruth;
};

type QaManifest = { cases: QaCase[] };
type QaResult = ReturnType<typeof recognitionQualityAgainstGroundTruth> & {
  id: string;
  ocrDurationMs: number;
  totalDurationMs: number;
  ocrConfidence: number | null;
};

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("Usage: npm run qa:invoice-recognition-v2 -- /absolute/path/manifest.json");
const absoluteManifest = resolve(manifestPath);
const manifest = JSON.parse(await readFile(absoluteManifest, "utf8")) as QaManifest;
if (!Array.isArray(manifest.cases) || !manifest.cases.length) throw new Error("QA manifest has no cases");

const environment = {
  INVOICE_OCR_PROVIDER: process.env.INVOICE_OCR_PROVIDER,
  INVOICE_OCR_ENDPOINT: process.env.INVOICE_OCR_ENDPOINT,
  INVOICE_OCR_API_KEY: process.env.INVOICE_OCR_API_KEY,
  INVOICE_OCR_TIMEOUT_MS: process.env.INVOICE_OCR_TIMEOUT_MS,
  INVOICE_OCR_API_VERSION: process.env.INVOICE_OCR_API_VERSION,
  INVOICE_OCR_MODEL: process.env.INVOICE_OCR_MODEL,
};

const results: QaResult[] = [];
for (const testCase of manifest.cases) {
  const documents = await Promise.all(testCase.files.map(async (file) => {
    const path = resolve(dirname(absoluteManifest), file.path);
    return {
      bytes: new Uint8Array(await readFile(path)),
      filename: path.split("/").at(-1) ?? "invoice",
      mimeType: file.mimeType,
    };
  }));
  const startedAt = Date.now();
  const ocr = await configuredInvoiceOcr({ documents, environment });
  const parsed = parseInvoiceOcr(ocr);
  results.push({
    id: testCase.id,
    ocrDurationMs: ocr.durationMs,
    totalDurationMs: Date.now() - startedAt,
    ocrConfidence: ocr.confidence,
    ...recognitionQualityAgainstGroundTruth(parsed, testCase.expected),
  });
}

const average = (key: keyof (typeof results)[number]) => {
  const values = results.map((result) => result[key]).filter((value): value is number => typeof value === "number");
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
};
const report = {
  caseCount: results.length,
  averageOcrDurationMs: average("ocrDurationMs"),
  averageTotalDurationMs: average("totalDurationMs"),
  averageLineRecall: average("lineRecall"),
  averageQuantityAccuracy: average("quantityAccuracy"),
  averageUnitPriceAccuracy: average("unitPriceAccuracy"),
  averageLineTotalAccuracy: average("lineTotalAccuracy"),
  cases: results,
};

// Deliberately output metrics and case IDs only, never OCR text or document bytes.
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
