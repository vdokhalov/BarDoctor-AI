import type { InvoiceOcrResult, OcrBounds, OcrLine } from "./invoice-recognition-v2";

export type OcrSourceDocument = {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
};

export type InvoiceOcrErrorCode =
  | "OCR_NOT_CONFIGURED"
  | "OCR_AUTH_FAILED"
  | "OCR_RATE_LIMITED"
  | "OCR_TIMEOUT"
  | "OCR_PROVIDER_UNAVAILABLE"
  | "OCR_UNSUPPORTED_FORMAT"
  | "OCR_FILE_TOO_LARGE"
  | "OCR_EMPTY_RESULT"
  | "OCR_INVALID_RESPONSE";

export class InvoiceOcrError extends Error {
  constructor(public readonly code: InvoiceOcrErrorCode, public readonly status?: number) {
    super(code);
    this.name = "InvoiceOcrError";
  }
}

type OcrEnvironment = {
  INVOICE_OCR_PROVIDER?: string;
  INVOICE_OCR_ENDPOINT?: string;
  INVOICE_OCR_API_KEY?: string;
  INVOICE_OCR_TIMEOUT_MS?: string;
  INVOICE_OCR_API_VERSION?: string;
  INVOICE_OCR_MODEL?: string;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function confidence(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed)) : null;
}

function rectangleFromPolygon(value: unknown): OcrBounds | undefined {
  if (!Array.isArray(value) || value.length < 4) return undefined;
  const points = typeof value[0] === "number"
    ? Array.from({ length: Math.floor(value.length / 2) }, (_, index) => ({ x: Number(value[index * 2]), y: Number(value[index * 2 + 1]) }))
    : value.map((point) => ({ x: Number(record(point).x), y: Number(record(point).y) }));
  if (!points.length || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return undefined;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function genericBounds(value: unknown): OcrBounds | undefined {
  const item = record(value);
  const x = Number(item.x);
  const y = Number(item.y);
  const width = Number(item.width);
  const height = Number(item.height);
  return [x, y, width, height].every(Number.isFinite)
    ? { x, y, width, height }
    : rectangleFromPolygon(value);
}

function providerError(status: number): InvoiceOcrError {
  if (status === 401 || status === 403) return new InvoiceOcrError("OCR_AUTH_FAILED", status);
  if (status === 413) return new InvoiceOcrError("OCR_FILE_TOO_LARGE", status);
  if (status === 415) return new InvoiceOcrError("OCR_UNSUPPORTED_FORMAT", status);
  if (status === 429) return new InvoiceOcrError("OCR_RATE_LIMITED", status);
  return new InvoiceOcrError("OCR_PROVIDER_UNAVAILABLE", status);
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function normalizeEndpoint(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvoiceOcrError("OCR_NOT_CONFIGURED");
  }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new InvoiceOcrError("OCR_NOT_CONFIGURED");
  }
  return url.toString().replace(/\/$/, "");
}

function canonicalSelfHostedResult(value: unknown, durationMs: number, page: number): InvoiceOcrResult {
  const root = record(value);
  const sourceLines = Array.isArray(root.lines) ? root.lines : [];
  const lines = sourceLines.map((source): OcrLine | null => {
    if (typeof source === "string") return { text: source.trim(), confidence: null, page };
    const item = record(source);
    const text = String(item.text ?? "").trim();
    return text ? {
      text,
      confidence: confidence(item.confidence),
      bounds: genericBounds(item.bounds ?? item.boundingBox ?? item.polygon),
      page,
    } : null;
  }).filter((line): line is OcrLine => Boolean(line));
  const rawText = String(root.rawText ?? root.text ?? lines.map((line) => line.text).join("\n")).trim();
  if (!rawText && !lines.length) throw new InvoiceOcrError("OCR_EMPTY_RESULT");
  return {
    rawText,
    lines,
    confidence: confidence(root.confidence),
    durationMs,
    engine: typeof root.engine === "string" ? root.engine.slice(0, 80) : "self_hosted",
    metadata: { provider: "self_hosted", preprocessing: "provider" },
  };
}

function spanRange(value: unknown): { offset: number; length: number } | null {
  const item = record(value);
  const offset = Number(item.offset);
  const length = Number(item.length);
  return Number.isFinite(offset) && Number.isFinite(length) ? { offset, length } : null;
}

function overlaps(left: { offset: number; length: number }, right: { offset: number; length: number }): boolean {
  return left.offset < right.offset + right.length && right.offset < left.offset + left.length;
}

function canonicalAzureResult(value: unknown, durationMs: number): InvoiceOcrResult {
  const root = record(value);
  const result = record(root.analyzeResult);
  const pages = Array.isArray(result.pages) ? result.pages.map(record) : [];
  const lines: OcrLine[] = [];
  const allWordConfidences: number[] = [];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex];
    const words = (Array.isArray(page.words) ? page.words : []).map(record);
    for (const word of words) {
      const score = confidence(word.confidence);
      if (score != null) allWordConfidences.push(score);
    }
    for (const source of Array.isArray(page.lines) ? page.lines.map(record) : []) {
      const text = String(source.content ?? "").trim();
      if (!text) continue;
      const lineSpans = (Array.isArray(source.spans) ? source.spans : [])
        .map(spanRange)
        .filter((span): span is { offset: number; length: number } => Boolean(span));
      const scores = words.filter((word) => {
        const span = spanRange(word.span);
        return span && lineSpans.some((lineSpan) => overlaps(lineSpan, span));
      }).map((word) => confidence(word.confidence)).filter((score): score is number => score != null);
      lines.push({
        text,
        confidence: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
        bounds: rectangleFromPolygon(source.polygon),
        page: Number(page.pageNumber) || pageIndex + 1,
      });
    }
  }
  const tables = Array.isArray(result.tables) ? result.tables.map(record) : [];
  for (const table of tables) {
    const cells = (Array.isArray(table.cells) ? table.cells : []).map(record);
    const rowIndexes = [...new Set(cells.map((cell) => Number(cell.rowIndex)).filter(Number.isFinite))].sort((a, b) => a - b);
    for (const rowIndex of rowIndexes) {
      const row = cells
        .filter((cell) => Number(cell.rowIndex) === rowIndex)
        .sort((left, right) => Number(left.columnIndex) - Number(right.columnIndex));
      const rowText = row.map((cell) => String(cell.content ?? "").trim()).filter(Boolean).join(" ");
      if (!rowText || lines.some((line) => line.text === rowText)) continue;
      const polygons = row.flatMap((cell) => {
        const regions = Array.isArray(cell.boundingRegions) ? cell.boundingRegions.map(record) : [];
        return regions.flatMap((region) => Array.isArray(region.polygon) ? region.polygon : []);
      });
      const page = row.flatMap((cell) =>
        (Array.isArray(cell.boundingRegions) ? cell.boundingRegions.map(record) : [])
          .map((region) => Number(region.pageNumber))
          .filter(Number.isFinite)
      )[0];
      lines.push({ text: rowText, confidence: null, bounds: rectangleFromPolygon(polygons), page: page || 1 });
    }
  }
  const rawText = String(result.content ?? lines.map((line) => line.text).join("\n")).trim();
  if (!rawText && !lines.length) throw new InvoiceOcrError("OCR_EMPTY_RESULT");
  return {
    rawText,
    lines,
    confidence: allWordConfidences.length
      ? allWordConfidences.reduce((sum, score) => sum + score, 0) / allWordConfidences.length
      : null,
    durationMs,
    engine: `azure_document_intelligence:${String(result.modelId ?? "prebuilt-read").slice(0, 60)}`,
    metadata: {
      provider: "azure_document_intelligence",
      apiVersion: String(result.apiVersion ?? ""),
      pageCount: pages.length,
      tableCount: tables.length,
      preprocessing: "provider_orientation_and_deskew",
    },
  };
}

function ocrSpaceBounds(words: JsonRecord[]): OcrBounds | undefined {
  const boxes = words.map((word) => ({
    x: Number(word.Left),
    y: Number(word.Top),
    width: Number(word.Width),
    height: Number(word.Height),
  })).filter((box) => [box.x, box.y, box.width, box.height].every(Number.isFinite));
  if (!boxes.length) return undefined;
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
}

function canonicalOcrSpaceResult(value: unknown, durationMs: number, page: number): InvoiceOcrResult {
  const root = record(value);
  if (root.IsErroredOnProcessing === true || Number(root.OCRExitCode) !== 1) {
    const messages = [root.ErrorMessage, root.ErrorDetails]
      .flatMap((entry) => Array.isArray(entry) ? entry : [entry])
      .map((entry) => String(entry ?? "").toLocaleLowerCase("en-US"));
    if (messages.some((message) => /api key|unauthor|invalid key/.test(message))) throw new InvoiceOcrError("OCR_AUTH_FAILED");
    if (messages.some((message) => /limit|rate|quota/.test(message))) throw new InvoiceOcrError("OCR_RATE_LIMITED");
    if (messages.some((message) => /file size|too large/.test(message))) throw new InvoiceOcrError("OCR_FILE_TOO_LARGE");
    if (messages.some((message) => /format|extension|mime/.test(message))) throw new InvoiceOcrError("OCR_UNSUPPORTED_FORMAT");
    throw new InvoiceOcrError("OCR_PROVIDER_UNAVAILABLE");
  }
  const parsedResults = Array.isArray(root.ParsedResults) ? root.ParsedResults.map(record) : [];
  const parsed = parsedResults[0] ?? {};
  const overlay = record(parsed.TextOverlay);
  const overlayLines = Array.isArray(overlay.Lines) ? overlay.Lines.map(record) : [];
  const lines = overlayLines.map((source): OcrLine | null => {
    const text = String(source.LineText ?? "").trim();
    if (!text) return null;
    const words = Array.isArray(source.Words) ? source.Words.map(record) : [];
    return { text, confidence: null, bounds: ocrSpaceBounds(words), page };
  }).filter((line): line is OcrLine => Boolean(line));
  const rawText = String(parsed.ParsedText ?? lines.map((line) => line.text).join("\n")).trim();
  if (!rawText && !lines.length) throw new InvoiceOcrError("OCR_EMPTY_RESULT");
  return {
    rawText,
    lines: lines.length ? lines : rawText.split(/\r?\n/).map((text) => text.trim()).filter(Boolean)
      .map((text) => ({ text, confidence: null, page })),
    confidence: null,
    durationMs,
    engine: "ocr_space:engine3",
    metadata: {
      provider: "ocr_space",
      preprocessing: "provider_orientation_scale_and_table",
      orientation: String(parsed.TextOrientation ?? ""),
      overlay: Boolean(overlay.HasOverlay),
      processingTimeMs: Number(root.ProcessingTimeInMilliseconds) || null,
    },
  };
}

async function selfHostedOcr(input: {
  endpoint: string;
  apiKey?: string;
  document: OcrSourceDocument;
  page: number;
  timeout: number;
  fetchImpl: typeof fetch;
}): Promise<InvoiceOcrResult> {
  const startedAt = Date.now();
  const headers = new Headers({ "Content-Type": "application/json", "Accept": "application/json" });
  if (input.apiKey) headers.set("Authorization", `Bearer ${input.apiKey}`);
  let response: Response;
  try {
    response = await input.fetchImpl(input.endpoint, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(input.timeout),
      body: JSON.stringify({
        document: { filename: input.document.filename, mimeType: input.document.mimeType, dataBase64: base64(input.document.bytes) },
        languages: ["ru", "en"],
        preprocessing: {
          preserveOriginal: true,
          autoOrient: true,
          documentBounds: true,
          perspectiveCorrection: true,
          grayscale: true,
          contrastNormalization: true,
          maxLongEdge: 2600,
        },
        output: { rawText: true, lines: true, boundingBoxes: true, confidence: true },
      }),
    });
  } catch (error) {
    if (isTimeoutError(error)) throw new InvoiceOcrError("OCR_TIMEOUT");
    throw new InvoiceOcrError("OCR_PROVIDER_UNAVAILABLE");
  }
  if (!response.ok) throw providerError(response.status);
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new InvoiceOcrError("OCR_INVALID_RESPONSE");
  }
  return canonicalSelfHostedResult(result, Date.now() - startedAt, input.page);
}

async function azureOcr(input: {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  model: string;
  document: OcrSourceDocument;
  timeout: number;
  fetchImpl: typeof fetch;
}): Promise<InvoiceOcrResult> {
  const startedAt = Date.now();
  const analyzeUrl = `${input.endpoint}/documentintelligence/documentModels/${encodeURIComponent(input.model)}:analyze?api-version=${encodeURIComponent(input.apiVersion)}`;
  const headers = new Headers({
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Ocp-Apim-Subscription-Key": input.apiKey,
  });
  let response: Response;
  try {
    response = await input.fetchImpl(analyzeUrl, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(input.timeout),
      body: JSON.stringify({ base64Source: base64(input.document.bytes) }),
    });
  } catch (error) {
    if (isTimeoutError(error)) throw new InvoiceOcrError("OCR_TIMEOUT");
    throw new InvoiceOcrError("OCR_PROVIDER_UNAVAILABLE");
  }
  if (!response.ok) throw providerError(response.status);
  const operationLocation = response.headers.get("operation-location");
  if (!operationLocation) throw new InvoiceOcrError("OCR_INVALID_RESPONSE");
  let operationUrl: URL;
  try {
    operationUrl = new URL(operationLocation);
  } catch {
    throw new InvoiceOcrError("OCR_INVALID_RESPONSE");
  }
  if (operationUrl.origin !== new URL(input.endpoint).origin) {
    throw new InvoiceOcrError("OCR_INVALID_RESPONSE");
  }
  const deadline = startedAt + input.timeout;
  let attempts = 0;
  while (Date.now() < deadline && attempts < 60) {
    attempts += 1;
    let poll: Response;
    try {
      poll = await input.fetchImpl(operationUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
      });
    } catch (error) {
      if (isTimeoutError(error)) throw new InvoiceOcrError("OCR_TIMEOUT");
      throw new InvoiceOcrError("OCR_PROVIDER_UNAVAILABLE");
    }
    if (!poll.ok) throw providerError(poll.status);
    let body: unknown;
    try {
      body = await poll.json();
    } catch {
      throw new InvoiceOcrError("OCR_INVALID_RESPONSE");
    }
    const status = String(record(body).status ?? "").toLocaleLowerCase("en-US");
    if (status === "succeeded") return canonicalAzureResult(body, Date.now() - startedAt);
    if (status === "failed" || status === "canceled") throw new InvoiceOcrError("OCR_PROVIDER_UNAVAILABLE");
    const retryAfter = Math.max(250, Math.min(2_000, Number(poll.headers.get("retry-after")) * 1_000 || 500));
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, Math.max(0, deadline - Date.now()))));
  }
  throw new InvoiceOcrError("OCR_TIMEOUT");
}

async function ocrSpaceOcr(input: {
  endpoint: string;
  apiKey: string;
  document: OcrSourceDocument;
  page: number;
  timeout: number;
  fetchImpl: typeof fetch;
}): Promise<InvoiceOcrResult> {
  const startedAt = Date.now();
  const form = new FormData();
  form.set("apikey", input.apiKey);
  form.set("language", "rus");
  form.set("isTable", "true");
  form.set("detectOrientation", "true");
  form.set("scale", "true");
  form.set("isOverlayRequired", "true");
  form.set("OCREngine", "3");
  const fileBytes = new Uint8Array(input.document.bytes.byteLength);
  fileBytes.set(input.document.bytes);
  form.set("file", new Blob([fileBytes], { type: input.document.mimeType }), input.document.filename);
  let response: Response;
  try {
    response = await input.fetchImpl(input.endpoint, {
      method: "POST",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(input.timeout),
      body: form,
    });
  } catch (error) {
    if (isTimeoutError(error)) throw new InvoiceOcrError("OCR_TIMEOUT");
    throw new InvoiceOcrError("OCR_PROVIDER_UNAVAILABLE");
  }
  if (!response.ok) throw providerError(response.status);
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new InvoiceOcrError("OCR_INVALID_RESPONSE");
  }
  return canonicalOcrSpaceResult(result, Date.now() - startedAt, input.page);
}

export async function configuredInvoiceOcr(input: {
  documents: OcrSourceDocument[];
  environment: OcrEnvironment;
  fetchImpl?: typeof fetch;
}): Promise<InvoiceOcrResult> {
  const requestedProvider = String(input.environment.INVOICE_OCR_PROVIDER ?? "").toLocaleLowerCase("en-US");
  const endpointValue = input.environment.INVOICE_OCR_ENDPOINT?.trim()
    || (requestedProvider === "ocr_space" || requestedProvider === "ocrspace" ? "https://api.ocr.space/parse/image" : "");
  if (!endpointValue) throw new InvoiceOcrError("OCR_NOT_CONFIGURED");
  const endpoint = normalizeEndpoint(endpointValue);
  const fetchImpl = input.fetchImpl ?? fetch;
  const timeout = Math.min(90_000, Math.max(3_000, Number(input.environment.INVOICE_OCR_TIMEOUT_MS) || 45_000));
  const inferredAzure = /(?:cognitiveservices|api\.cognitive\.microsoft)\.azure\.com$/i.test(new URL(endpoint).hostname);
  const provider = String(input.environment.INVOICE_OCR_PROVIDER ?? (inferredAzure ? "azure_document_intelligence" : "self_hosted"))
    .toLocaleLowerCase("en-US");
  if (!input.documents.length) throw new InvoiceOcrError("OCR_EMPTY_RESULT");
  const results: InvoiceOcrResult[] = [];
  for (let page = 0; page < input.documents.length; page += 1) {
    const document = input.documents[page];
    if (provider === "azure" || provider === "azure_document_intelligence") {
      const apiKey = input.environment.INVOICE_OCR_API_KEY?.trim();
      if (!apiKey) throw new InvoiceOcrError("OCR_NOT_CONFIGURED");
      results.push(await azureOcr({
        endpoint,
        apiKey,
        apiVersion: input.environment.INVOICE_OCR_API_VERSION?.trim() || "2024-11-30",
        model: input.environment.INVOICE_OCR_MODEL?.trim() || "prebuilt-layout",
        document,
        timeout,
        fetchImpl,
      }));
    } else if (provider === "ocr_space" || provider === "ocrspace") {
      const apiKey = input.environment.INVOICE_OCR_API_KEY?.trim();
      if (!apiKey) throw new InvoiceOcrError("OCR_NOT_CONFIGURED");
      results.push(await ocrSpaceOcr({ endpoint, apiKey, document, page: page + 1, timeout, fetchImpl }));
    } else if (provider === "self_hosted") {
      results.push(await selfHostedOcr({
        endpoint,
        apiKey: input.environment.INVOICE_OCR_API_KEY,
        document,
        page: page + 1,
        timeout,
        fetchImpl,
      }));
    } else {
      throw new InvoiceOcrError("OCR_NOT_CONFIGURED");
    }
  }
  const scores = results.map((result) => result.confidence).filter((value): value is number => value != null);
  return {
    rawText: results.map((result) => result.rawText).join("\n\n"),
    lines: results.flatMap((result) => result.lines),
    confidence: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null,
    durationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
    engine: results[0]?.engine,
    metadata: { ...results[0]?.metadata, sourceDocumentCount: results.length },
  };
}
