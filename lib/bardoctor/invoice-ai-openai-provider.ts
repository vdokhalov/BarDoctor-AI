import { aiText, type AIContent } from "./ai-provider";
import {
  INVOICE_AI_RESPONSE_SCHEMA,
  type InvoiceAIMatchingProvider,
} from "./invoice-ai-matching";

export function createOpenAIInvoiceMatchingProvider(input: {
  accountId: number;
  actorAccountId: number;
  venueId: number;
  jobId: string;
}): InvoiceAIMatchingProvider {
  return {
    async match(batch, attempt) {
      const content: AIContent = JSON.stringify(batch);
      return aiText({
        accountId: input.accountId,
        observability: {
          actorAccountId: input.actorAccountId,
          venueId: input.venueId,
          feature: `invoice_matching.${input.jobId}.${batch.batchId.split(":").at(-1)}.a${attempt}`,
        },
        system: [
          "Match structured supplier invoice lines to canonical candidates.",
          "Choose only an id/key present in that line's candidates. Never invent identifiers, SKU, barcode, products or packaging.",
          "Treat brand, producer, volume, weight, pack count and unit as identity constraints.",
          "Same brand with different size or package is ambiguous, not a high-confidence match.",
          "Return NO_MATCH through nomenclatureId=null when no candidate is suitable.",
          "High confidence is reserved for an unambiguous product and package identity; otherwise mark unresolved.",
        ].join(" "),
        messages: [{ role: "user", content }],
        maxTokens: Math.min(5_500, 350 + batch.lines.length * 120),
        reasoningEffort: "low",
        timeoutMs: 60_000,
        responseSchema: INVOICE_AI_RESPONSE_SCHEMA,
      });
    },
  };
}
