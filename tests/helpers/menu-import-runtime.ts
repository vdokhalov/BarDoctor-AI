import * as XLSX from "xlsx";
import { lifecycleRuntime } from "./lifecycle-runtime";

/** Stub only the external AI model; upload, decoding, normalization and APIs stay real. */
export async function menuImportRuntime(extraRoutes: Record<string, string> = {}) {
  const prompts: string[] = [];
  const uploads = new Map<string, Uint8Array>();
  const runtime = await lifecycleRuntime({ ...extraRoutes, catalogImport: "./app/api/catalog/import/route" }, {
    plugins: [{ name: "menu-import-model", setup(builder) {
      builder.onResolve({ filter: /^menu-import-test-model$/ }, () => ({ path: "menu-import-test-model", external: true }));
      builder.onResolve({ filter: /\/ai-provider$/ }, () => ({ path: "menu-import-model", namespace: "menu-import-test" }));
      builder.onLoad({ filter: /.*/, namespace: "menu-import-test" }, () => ({
        contents: `export { AIServiceError, aiErrorResponse, parseAIJson } from './lib/bardoctor/anthropic'; export { aiText } from 'menu-import-test-model';`,
        resolveDir: process.cwd(), loader: "ts",
      }));
    } }],
    bindings: { BUCKET: {
      async put(key: string, bytes: Uint8Array) { uploads.set(key, new Uint8Array(bytes)); },
      async delete(keys: string | string[]) { for (const key of typeof keys === "string" ? [keys] : keys) uploads.delete(key); },
    } },
    modules: { "menu-import-test-model": { aiText: async (input: { messages: { content: string }[] }) => {
      const prompt = input.messages[0].content; prompts.push(prompt);
      const table = prompt.split("Извлечённая таблица:\n")[1]?.replace(/^Лист: [^\n]*\n/, "");
      if (!table) throw new Error("Expected production spreadsheet preprocessing before model boundary");
      const workbook = XLSX.read(table, { type: "string", raw: true });
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
      return JSON.stringify({ currency: "MDL", confidence: 1, warnings: [], recipes: [], menuItems: rows.map(row => ({
        ...row, salePrice: Number(row.salePrice ?? row.price), type: row.type || "service", active: row.active !== "false", plannedSales: Number(row.plannedSales || 0),
        warnings: row.warnings ? [row.warnings] : [],
      })) });
    } } },
  });
  return { ...runtime, prompts, uploads };
}
