import type { AdapterInput, FieldMapping } from "./integrations/contracts";
import {
  applyFieldMapping,
  headerSignature,
  normalizeFieldName,
} from "./integrations/field-mapping";
import { parseUniversalFileRows } from "./integrations/universal-file-adapter";

type JsonRecord = Record<string, unknown>;

export const REVIEW_IMPORT_FIELDS = [
  { target: "text", label: "Текст отзыва", required: true, aliases: ["text", "review", "reviewText", "comment", "отзыв", "текст", "комментарий"] },
  { target: "rating", label: "Рейтинг", required: false, aliases: ["rating", "score", "stars", "оценка", "рейтинг", "звезды"] },
  { target: "publishedAt", label: "Дата публикации", required: false, aliases: ["publishedAt", "publishedDate", "reviewDate", "date", "дата", "дата публикации"] },
  { target: "authorName", label: "Автор", required: false, aliases: ["authorName", "author", "displayName", "имя автора", "автор", "гость"] },
  { target: "externalId", label: "Внешний ID", required: false, aliases: ["externalId", "reviewId", "external_id", "id", "внешний id", "id отзыва"] },
  { target: "source", label: "Источник", required: false, aliases: ["source", "provider", "platform", "источник", "площадка"] },
] as const;

export type ReviewFileInspection = {
  headers: string[];
  fileKind: "json" | "spreadsheet";
  headerSignature: string;
  suggestedMapping: FieldMapping;
  missingRequired: Array<{ target: string; label: string }>;
  sample: JsonRecord[];
  recordCount: number;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export function suggestReviewMapping(headers: readonly string[]): FieldMapping {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeFieldName(header), header]));
  const mapping: FieldMapping = {};
  for (const field of REVIEW_IMPORT_FIELDS) {
    const source = field.aliases
      .map(normalizeFieldName)
      .map((alias) => normalizedHeaders.get(alias))
      .find(Boolean);
    if (source) mapping[field.target] = source;
  }
  return mapping;
}

function requiredMissing(mapping: FieldMapping): Array<{ target: string; label: string }> {
  return REVIEW_IMPORT_FIELDS
    .filter((field) => field.required && !String(mapping[field.target] ?? "").trim())
    .map(({ target, label }) => ({ target, label }));
}

export async function inspectReviewFile(input: AdapterInput): Promise<ReviewFileInspection> {
  const parsed = await parseUniversalFileRows(input);
  if (parsed.fileKind === "xml") throw new Error("Для отзывов поддерживаются CSV, Excel и JSON");
  if (!parsed.values.length) throw new Error("В файле нет отзывов");
  const headers = [...new Set(parsed.values.slice(0, 50).flatMap((value) => Object.keys(record(value))))];
  const suggestedMapping = suggestReviewMapping(headers);
  return {
    headers,
    fileKind: parsed.fileKind,
    headerSignature: headerSignature(headers, parsed.fileKind),
    suggestedMapping,
    missingRequired: requiredMissing(suggestedMapping),
    sample: parsed.values.slice(0, 5).map(record),
    recordCount: parsed.values.length,
  };
}

export async function mapReviewFile(input: AdapterInput & {
  fieldMapping: FieldMapping;
  defaultSource?: string;
}): Promise<{ records: JsonRecord[]; warnings: string[] }> {
  const parsed = await parseUniversalFileRows(input);
  if (parsed.fileKind === "xml") throw new Error("Для отзывов поддерживаются CSV, Excel и JSON");
  const missing = requiredMissing(input.fieldMapping);
  if (missing.length) {
    throw new Error(`Не сопоставлены обязательные поля: ${missing.map((field) => field.label).join(", ")}`);
  }
  const warnings: string[] = [];
  if (parsed.values.length > 2_000) warnings.push("Обработаны первые 2 000 отзывов.");
  const records = parsed.values.slice(0, 2_000).map((value) => applyFieldMapping(
    value,
    input.fieldMapping,
    { source: input.defaultSource || "other" },
  ));
  return { records, warnings };
}
