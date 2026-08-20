import { runtimeEnv } from "./runtime-env";
import { getIntegrationValue } from "./integration-secrets";
import {
  recordAIUsageEvent,
  type AIObservabilityContext,
} from "./ai-usage";

export type AnthropicTextBlock = { type: "text"; text: string };
export type AnthropicImageBlock = {
  type: "image";
  source: { type: "base64"; media_type: string; data: string };
};
export type AnthropicContent = string | Array<AnthropicTextBlock | AnthropicImageBlock>;

type AnthropicMessage = { role: "user" | "assistant"; content: AnthropicContent };

export class AIServiceError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly code = "AI_SERVICE_ERROR",
  ) {
    super(message);
  }
}

function messagesEndpoint(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return base.endsWith("/v1") ? `${base}/messages` : `${base}/v1/messages`;
}

export async function anthropicText(input: {
  accountId: number;
  system: string;
  messages: AnthropicMessage[];
  maxTokens: number;
  imageDetail?: "auto" | "low" | "high" | "original";
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
  timeoutMs?: number;
  observability?: AIObservabilityContext;
}): Promise<string> {
  const apiKey =
    await getIntegrationValue(input.accountId, "ANTHROPIC_API_KEY") ??
    runtimeEnv("AI_INTEGRATIONS_ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new AIServiceError(
      "AI ещё не подключён. Добавьте секрет ANTHROPIC_API_KEY в настройках приложения.",
      503,
    );
  }

  const baseUrl =
    await getIntegrationValue(input.accountId, "ANTHROPIC_BASE_URL") ??
    runtimeEnv("AI_INTEGRATIONS_ANTHROPIC_BASE_URL") ??
    "https://api.anthropic.com";
  const model = await getIntegrationValue(input.accountId, "ANTHROPIC_MODEL")
    ?? "claude-sonnet-5";
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(messagesEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: input.maxTokens, system: input.system, messages: input.messages }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 90_000),
    });
  } catch {
    await recordAIUsageEvent({ accountId: input.accountId, context: input.observability, requestId, provider: "anthropic", model, status: "error", latencyMs: Date.now() - startedAt, errorCode: "network" });
    throw new AIServiceError("Не удалось соединиться с Anthropic.", 502);
  }

  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? "Anthropic отклонил ключ API. Проверьте секрет ANTHROPIC_API_KEY."
      : response.status === 429
        ? "Лимит AI временно исчерпан. Повторите запрос немного позже."
        : `AI-сервис временно недоступен (HTTP ${response.status}).`;
    await recordAIUsageEvent({ accountId: input.accountId, context: input.observability, requestId, provider: "anthropic", model, status: "error", latencyMs: Date.now() - startedAt, errorCode: `http_${response.status}` });
    throw new AIServiceError(message, response.status >= 500 ? 502 : response.status);
  }

  const payload = await response.json() as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (payload.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) throw new AIServiceError("AI вернул пустой ответ.", 502);
  await recordAIUsageEvent({
    accountId: input.accountId,
    context: input.observability,
    requestId,
    provider: "anthropic",
    model,
    status: "success",
    latencyMs: Date.now() - startedAt,
    usage: { inputTokens: payload.usage?.input_tokens, outputTokens: payload.usage?.output_tokens },
  });
  return text;
}

export function parseAIJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1)) as T;
      } catch {
        // Fall through to the stable public error below.
      }
    }
    throw new AIServiceError(
      "AI вернул ответ в неожиданном формате. Повторите запрос.",
      422,
      "AI_RESPONSE_FORMAT",
    );
  }
}

export function aiErrorResponse(error: unknown): Response {
  const serviceError = error instanceof AIServiceError
    ? error
    : new AIServiceError("Не удалось выполнить AI-анализ.", 502);
  return Response.json(
    { success: false, code: serviceError.code, error: serviceError.message },
    { status: serviceError.status },
  );
}
