import { getIntegrationValue } from "./integration-secrets";
import { runtimeEnv } from "./runtime-env";
import {
  AIServiceError,
  aiErrorResponse,
  anthropicText,
  parseAIJson,
  type AnthropicContent,
} from "./anthropic";
import { openAIText, type OpenAIResponseSchema } from "./openai";
import type { AIObservabilityContext } from "./ai-usage";

export type AIContent = AnthropicContent;

type AIInput = {
  accountId: number;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: AIContent }>;
  maxTokens: number;
  imageDetail?: "auto" | "low" | "high" | "original";
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
  timeoutMs?: number;
  responseSchema?: OpenAIResponseSchema;
  observability?: AIObservabilityContext;
};

export async function aiText(input: AIInput): Promise<string> {
  const openAIKey = await getIntegrationValue(input.accountId, "OPENAI_API_KEY");
  if (openAIKey) return openAIText(input);

  const anthropicKey = await getIntegrationValue(input.accountId, "ANTHROPIC_API_KEY")
    ?? runtimeEnv("AI_INTEGRATIONS_ANTHROPIC_API_KEY");
  if (anthropicKey) return anthropicText(input);

  throw new AIServiceError(
    "AI временно недоступен: сервис BarDoctor ещё не получил серверное подключение OpenAI.",
    503,
  );
}

export { AIServiceError, aiErrorResponse, parseAIJson };
