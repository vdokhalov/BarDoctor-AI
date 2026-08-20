import { getIntegrationValue } from "./integration-secrets";
import { runtimeEnv } from "./runtime-env";
import {
  recordAIUsageEvent,
  reserveOpenAIRequest,
  type AIObservabilityContext,
  type AIProviderUsage,
} from "./ai-usage";
import {
  AIServiceError,
  type AnthropicContent,
} from "./anthropic";

type AIMessage = {
  role: "user" | "assistant";
  content: AnthropicContent;
};

type OpenAIInputContent =
  | { type: "input_text"; text: string }
  | { type: "output_text"; text: string }
  | {
      type: "input_image";
      image_url: string;
      detail: "auto" | "low" | "high" | "original";
    };

export type OpenAIWebSource = {
  url: string;
  title: string;
};

type OpenAIWebLocation = {
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
};

export type OpenAIResponseSchema = {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
};

export type OpenAITextInput = {
  accountId: number;
  system: string;
  messages: AIMessage[];
  maxTokens: number;
  imageDetail?: "auto" | "low" | "high" | "original";
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
  timeoutMs?: number;
  responseSchema?: OpenAIResponseSchema;
  observability?: AIObservabilityContext;
};

type OpenAIResponsePayload = {
  id?: unknown;
  status?: unknown;
  incomplete_details?: { reason?: unknown };
  error?: { code?: unknown; message?: unknown };
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: unknown;
      text?: unknown;
      refusal?: unknown;
    }>;
  }>;
  usage?: {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
  };
};

function token(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function providerUsage(payload: { usage?: OpenAIResponsePayload["usage"] }): AIProviderUsage | null {
  if (!payload.usage) return null;
  const inputTokens = token(payload.usage.input_tokens ?? payload.usage.prompt_tokens);
  const outputTokens = token(payload.usage.output_tokens ?? payload.usage.completion_tokens);
  const totalTokens = token(payload.usage.total_tokens);
  return inputTokens !== null || outputTokens !== null || totalTokens !== null
    ? { inputTokens, outputTokens, totalTokens }
    : null;
}

async function observeOpenAI(input: {
  accountId: number;
  context?: AIObservabilityContext;
  requestId: string;
  model: string;
  startedAt: number;
  status: "success" | "error" | "queued" | "in_progress";
  payload?: { usage?: OpenAIResponsePayload["usage"] } | null;
  errorCode?: string | null;
}) {
  await recordAIUsageEvent({
    accountId: input.accountId,
    context: input.context,
    requestId: input.requestId,
    provider: "openai",
    model: input.model,
    status: input.status,
    latencyMs: Date.now() - input.startedAt,
    usage: input.payload ? providerUsage(input.payload) : null,
    errorCode: input.errorCode,
  });
}

export type OpenAIBackgroundResult =
  | {
      responseId: string;
      status: "queued";
    }
  | {
      responseId: string;
      status: "in_progress";
    }
  | {
      responseId: string;
      status: "completed";
      text: string;
    }
  | {
      responseId: string;
      status: "failed" | "cancelled" | "canceled" | "incomplete";
      error: AIServiceError;
    };

function responsesEndpoint(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return base.endsWith("/v1") ? `${base}/responses` : `${base}/v1/responses`;
}

function chatCompletionsEndpoint(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
}

function openAIContent(
  message: AIMessage,
  imageDetail: "auto" | "low" | "high" | "original" = "auto",
): string | OpenAIInputContent[] {
  if (typeof message.content === "string") return message.content;

  return message.content.map((block): OpenAIInputContent => {
    if (block.type === "image") {
      return {
        type: "input_image",
        image_url: `data:${block.source.media_type};base64,${block.source.data}`,
        detail: imageDetail,
      };
    }
    return {
      type: message.role === "assistant" ? "output_text" : "input_text",
      text: block.text,
    };
  });
}

function responseText(payload: {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }>;
}): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((block) => block.type === "output_text" && typeof block.text === "string")
    .map((block) => String(block.text))
    .join("\n")
    .trim();
}

export function openAIStructuredText(
  responseSchema?: OpenAIResponseSchema,
): {
  format: {
    type: "json_schema";
    name: string;
    description?: string;
    strict: true;
    schema: Record<string, unknown>;
  };
} | undefined {
  if (!responseSchema) return undefined;
  return {
    format: {
      type: "json_schema",
      name: responseSchema.name,
      description: responseSchema.description,
      strict: true,
      schema: responseSchema.schema,
    },
  };
}

function completedResponseText(
  payload: OpenAIResponsePayload,
  emptyMessage: string,
): string {
  if (payload.status === "incomplete") {
    const reason = payload.incomplete_details?.reason;
    throw new AIServiceError(
      reason === "max_output_tokens"
        ? "Ответ AI не поместился целиком. BarDoctor повторит эту часть меню отдельно."
        : "AI не завершил распознавание этой части меню.",
      422,
      "AI_OUTPUT_INCOMPLETE",
    );
  }
  const refusal = (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .find((block) => block.type === "refusal" && typeof block.refusal === "string")
    ?.refusal;
  if (typeof refusal === "string" && refusal.trim()) {
    throw new AIServiceError(
      "AI не смог обработать эту часть меню. Попробуйте другое фото.",
      422,
      "AI_OUTPUT_REFUSAL",
    );
  }
  const text = responseText(payload);
  if (!text) throw new AIServiceError(emptyMessage, 502, "AI_EMPTY_RESPONSE");
  return text;
}

function validResponseId(value: unknown): value is string {
  return typeof value === "string" && /^resp_[a-zA-Z0-9_-]{8,200}$/.test(value);
}

function backgroundResult(
  payload: OpenAIResponsePayload,
  emptyMessage: string,
): OpenAIBackgroundResult {
  if (!validResponseId(payload.id)) {
    throw new AIServiceError("OpenAI не вернул идентификатор распознавания.", 502);
  }
  const responseId = payload.id;
  const status = typeof payload.status === "string" ? payload.status : "";
  if (status === "queued" || status === "in_progress") {
    return { responseId, status };
  }
  if (status === "completed") {
    return {
      responseId,
      status,
      text: completedResponseText(payload, emptyMessage),
    };
  }
  if (status === "incomplete") {
    let error: AIServiceError;
    try {
      completedResponseText(payload, emptyMessage);
      error = new AIServiceError("AI не завершил распознавание этой части меню.", 422);
    } catch (caught) {
      error = caught instanceof AIServiceError
        ? caught
        : new AIServiceError("AI не завершил распознавание этой части меню.", 422);
    }
    return { responseId, status, error };
  }
  if (status === "failed" || status === "cancelled" || status === "canceled") {
    return {
      responseId,
      status,
      error: new AIServiceError(
        "OpenAI не завершил распознавание. BarDoctor может повторить только эту страницу.",
        502,
        "AI_BACKGROUND_FAILED",
      ),
    };
  }
  throw new AIServiceError("OpenAI вернул неизвестный статус распознавания.", 502);
}

function normaliseWebSource(value: unknown): OpenAIWebSource | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const nested = record.url_citation && typeof record.url_citation === "object"
    ? record.url_citation as Record<string, unknown>
    : record;
  const url = typeof nested.url === "string" ? nested.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return null;
  const title = typeof nested.title === "string" && nested.title.trim()
    ? nested.title.trim().slice(0, 180)
    : new URL(url).hostname.replace(/^www\./, "");
  return { url, title };
}

function uniqueWebSources(sources: Array<OpenAIWebSource | null>): OpenAIWebSource[] {
  const seen = new Set<string>();
  const result: OpenAIWebSource[] = [];
  for (const source of sources) {
    if (!source || seen.has(source.url)) continue;
    seen.add(source.url);
    result.push(source);
    if (result.length >= 30) break;
  }
  return result;
}

function responseWebSources(payload: {
  output?: Array<{
    action?: { sources?: unknown[] };
    content?: Array<{ annotations?: unknown[] }>;
  }>;
}): OpenAIWebSource[] {
  return uniqueWebSources((payload.output ?? []).flatMap((item) => [
    ...(item.action?.sources ?? []).map(normaliseWebSource),
    ...(item.content ?? []).flatMap((content) =>
      (content.annotations ?? []).map(normaliseWebSource)),
  ]));
}

function providerErrorMessage(status: number, providerCode: string): string {
  return status === 401 || status === 403
    ? "Серверное подключение OpenAI требует проверки администратором BarDoctor."
    : status === 429 && providerCode === "insufficient_quota"
      ? "На балансе OpenAI недостаточно средств или ещё не активировалась оплата."
      : status === 429
        ? "OpenAI временно ограничил частоту запросов. Повторите немного позже."
        : `OpenAI временно недоступен (HTTP ${status}).`;
}

async function providerErrorCode(response: Response): Promise<string> {
  try {
    const payload = await response.clone().json() as { error?: { code?: unknown } };
    return typeof payload.error?.code === "string" ? payload.error.code : "";
  } catch {
    return "";
  }
}

export async function openAIWebSearch(input: {
  accountId: number;
  system: string;
  prompt: string;
  maxTokens: number;
  location?: OpenAIWebLocation;
  observability?: AIObservabilityContext;
}): Promise<{ text: string; sources: OpenAIWebSource[]; model: string }> {
  const apiKey = await getIntegrationValue(input.accountId, "OPENAI_API_KEY");
  if (!apiKey) {
    throw new AIServiceError(
      "AI временно недоступен: серверное подключение OpenAI ещё не настроено.",
      503,
    );
  }

  const trialUsage = await reserveOpenAIRequest(input.accountId);
  if (!trialUsage) {
    throw new AIServiceError(
      "AI временно недоступен из-за технического ограничения нагрузки. Повторите позже.",
      429,
    );
  }

  const configuredModel = await getIntegrationValue(input.accountId, "OPENAI_MODEL")
    ?? "gpt-5.4-mini";
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const baseUrl = runtimeEnv("OPENAI_BASE_URL") ?? "https://api.openai.com";
  const location = Object.fromEntries(
    Object.entries(input.location ?? {}).filter(([, item]) => typeof item === "string" && item.trim()),
  );
  const webTool = {
    type: "web_search",
    search_context_size: "high",
    ...(Object.keys(location).length ? { user_location: { type: "approximate", ...location } } : {}),
  };

  let response: Response;
  try {
    response = await fetch(responsesEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: configuredModel,
        instructions: input.system,
        input: input.prompt,
        tools: [webTool],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        max_output_tokens: input.maxTokens,
        store: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model: configuredModel, startedAt, status: "error", errorCode: "network" });
    throw new AIServiceError("Не удалось соединиться с OpenAI. Повторите запрос позже.", 502);
  }

  if (response.ok) {
    const payload = await response.json() as {
      output_text?: unknown;
      usage?: OpenAIResponsePayload["usage"];
      output?: Array<{
        action?: { sources?: unknown[] };
        content?: Array<{ type?: unknown; text?: unknown; annotations?: unknown[] }>;
      }>;
    };
    const text = responseText(payload);
    if (!text) throw new AIServiceError("OpenAI вернул пустой ответ.", 502);
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model: configuredModel, startedAt, status: "success", payload });
    return { text, sources: responseWebSources(payload), model: configuredModel };
  }

  const primaryCode = await providerErrorCode(response);
  if (![400, 404, 422].includes(response.status)) {
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model: configuredModel, startedAt, status: "error", errorCode: primaryCode || `http_${response.status}` });
    throw new AIServiceError(
      providerErrorMessage(response.status, primaryCode),
      response.status >= 500 ? 502 : response.status,
    );
  }

  const searchModel = "gpt-5-search-api";
  const approximate = Object.keys(location).length
    ? { user_location: { type: "approximate", approximate: location } }
    : {};
  let fallback: Response;
  try {
    fallback = await fetch(chatCompletionsEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: searchModel,
        web_search_options: { search_context_size: "high", ...approximate },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt },
        ],
        max_tokens: input.maxTokens,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model: searchModel, startedAt, status: "error", errorCode: "network" });
    throw new AIServiceError("Не удалось соединиться с веб-поиском OpenAI.", 502);
  }
  if (!fallback.ok) {
    const fallbackCode = await providerErrorCode(fallback);
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model: searchModel, startedAt, status: "error", errorCode: fallbackCode || `http_${fallback.status}` });
    throw new AIServiceError(
      providerErrorMessage(fallback.status, fallbackCode),
      fallback.status >= 500 ? 502 : fallback.status,
    );
  }
  const payload = await fallback.json() as {
    usage?: OpenAIResponsePayload["usage"];
    choices?: Array<{
      message?: {
        content?: unknown;
        annotations?: unknown[];
      };
    }>;
  };
  const message = payload.choices?.[0]?.message;
  const text = typeof message?.content === "string" ? message.content.trim() : "";
  if (!text) throw new AIServiceError("OpenAI вернул пустой результат поиска.", 502);
  await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model: searchModel, startedAt, status: "success", payload });
  return {
    text,
    sources: uniqueWebSources((message?.annotations ?? []).map(normaliseWebSource)),
    model: searchModel,
  };
}

export async function openAIText(input: OpenAITextInput): Promise<string> {
  const apiKey = await getIntegrationValue(input.accountId, "OPENAI_API_KEY");
  if (!apiKey) {
    throw new AIServiceError(
      "AI временно недоступен: серверное подключение OpenAI ещё не настроено.",
      503,
    );
  }

  const trialUsage = await reserveOpenAIRequest(input.accountId);
  if (!trialUsage) {
    throw new AIServiceError(
      "AI временно недоступен из-за технического ограничения нагрузки. Повторите позже.",
      429,
    );
  }

  const model = await getIntegrationValue(input.accountId, "OPENAI_MODEL")
    ?? "gpt-5.4-mini";
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const baseUrl = runtimeEnv("OPENAI_BASE_URL") ?? "https://api.openai.com";
  const supportsReasoningEffort = /^(?:gpt-5|o\d|o4)/i.test(model);

  let response: Response;
  try {
    response = await fetch(responsesEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: input.system,
        input: input.messages.map((message) => ({
          role: message.role,
          content: openAIContent(message, input.imageDetail),
        })),
        reasoning: input.reasoningEffort && supportsReasoningEffort
          ? { effort: input.reasoningEffort }
          : undefined,
        text: openAIStructuredText(input.responseSchema),
        max_output_tokens: input.maxTokens,
        store: false,
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 90_000),
    });
  } catch {
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model, startedAt, status: "error", errorCode: "network" });
    throw new AIServiceError("Не удалось соединиться с OpenAI. Повторите запрос позже.", 502);
  }

  if (!response.ok) {
    const providerCode = await providerErrorCode(response);
    const message = providerErrorMessage(response.status, providerCode);
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model, startedAt, status: "error", errorCode: providerCode || `http_${response.status}` });
    throw new AIServiceError(message, response.status >= 500 ? 502 : response.status);
  }

  const payload = await response.json() as OpenAIResponsePayload;
  await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model, startedAt, status: "success", payload });
  return completedResponseText(payload, "OpenAI вернул пустой ответ.");
}

export async function startOpenAIText(
  input: OpenAITextInput,
): Promise<OpenAIBackgroundResult> {
  const apiKey = await getIntegrationValue(input.accountId, "OPENAI_API_KEY");
  if (!apiKey) {
    throw new AIServiceError(
      "AI временно недоступен: серверное подключение OpenAI ещё не настроено.",
      503,
    );
  }

  const trialUsage = await reserveOpenAIRequest(input.accountId);
  if (!trialUsage) {
    throw new AIServiceError(
      "AI временно недоступен из-за технического ограничения нагрузки. Повторите позже.",
      429,
    );
  }

  const model = await getIntegrationValue(input.accountId, "OPENAI_MODEL")
    ?? "gpt-5.4-mini";
  const startedAt = Date.now();
  const temporaryRequestId = crypto.randomUUID();
  const baseUrl = runtimeEnv("OPENAI_BASE_URL") ?? "https://api.openai.com";
  const supportsReasoningEffort = /^(?:gpt-5|o\d|o4)/i.test(model);

  let response: Response;
  try {
    response = await fetch(responsesEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: input.system,
        input: input.messages.map((message) => ({
          role: message.role,
          content: openAIContent(message, input.imageDetail),
        })),
        reasoning: input.reasoningEffort && supportsReasoningEffort
          ? { effort: input.reasoningEffort }
          : undefined,
        text: openAIStructuredText(input.responseSchema),
        max_output_tokens: input.maxTokens,
        background: true,
        store: false,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId: temporaryRequestId, model, startedAt, status: "error", errorCode: "network" });
    throw new AIServiceError(
      "Не удалось запустить распознавание в OpenAI. Повторите запрос позже.",
      502,
    );
  }

  if (!response.ok) {
    const providerCode = await providerErrorCode(response);
    const message = providerErrorMessage(response.status, providerCode);
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId: temporaryRequestId, model, startedAt, status: "error", errorCode: providerCode || `http_${response.status}` });
    throw new AIServiceError(message, response.status >= 500 ? 502 : response.status);
  }

  const payload = await response.json() as OpenAIResponsePayload;
  const result = backgroundResult(payload, "OpenAI вернул пустой ответ.");
  await observeOpenAI({
    accountId: input.accountId,
    context: input.observability,
    requestId: `openai:${result.responseId}`,
    model,
    startedAt,
    status: result.status === "completed" ? "success" : result.status === "queued" ? "queued" : result.status === "in_progress" ? "in_progress" : "error",
    payload,
    errorCode: "error" in result ? result.error.code : null,
  });
  return result;
}

export async function retrieveOpenAIText(
  accountId: number,
  responseId: string,
  observability?: AIObservabilityContext,
): Promise<OpenAIBackgroundResult> {
  if (!validResponseId(responseId)) {
    throw new AIServiceError("Некорректный идентификатор распознавания.", 400);
  }
  const apiKey = await getIntegrationValue(accountId, "OPENAI_API_KEY");
  if (!apiKey) {
    throw new AIServiceError(
      "AI временно недоступен: серверное подключение OpenAI ещё не настроено.",
      503,
    );
  }
  const baseUrl = runtimeEnv("OPENAI_BASE_URL") ?? "https://api.openai.com";
  const model = await getIntegrationValue(accountId, "OPENAI_MODEL") ?? "gpt-5.4-mini";
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(
      `${responsesEndpoint(baseUrl)}/${encodeURIComponent(responseId)}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch {
    await observeOpenAI({ accountId, context: observability, requestId: `openai:${responseId}`, model, startedAt, status: "error", errorCode: "poll_network" });
    throw new AIServiceError(
      "Не удалось проверить статус распознавания. BarDoctor попробует ещё раз.",
      502,
      "AI_POLL_TEMPORARY",
    );
  }

  if (!response.ok) {
    const providerCode = await providerErrorCode(response);
    const message = providerErrorMessage(response.status, providerCode);
    await observeOpenAI({ accountId, context: observability, requestId: `openai:${responseId}`, model, startedAt, status: "error", errorCode: providerCode || `http_${response.status}` });
    throw new AIServiceError(message, response.status >= 500 ? 502 : response.status);
  }

  const payload = await response.json() as OpenAIResponsePayload;
  const result = backgroundResult(payload, "OpenAI вернул пустой ответ.");
  await observeOpenAI({
    accountId,
    context: observability,
    requestId: `openai:${responseId}`,
    model,
    startedAt,
    status: result.status === "completed" ? "success" : result.status === "queued" ? "queued" : result.status === "in_progress" ? "in_progress" : "error",
    payload,
    errorCode: "error" in result ? result.error.code : null,
  });
  return result;
}

export async function openAIFileText(input: {
  accountId: number;
  system: string;
  prompt: string;
  filename: string;
  mimeType: string;
  dataBase64: string;
  maxTokens: number;
  detail?: "auto" | "low" | "high";
  responseSchema?: OpenAIResponseSchema;
  observability?: AIObservabilityContext;
}): Promise<string> {
  const apiKey = await getIntegrationValue(input.accountId, "OPENAI_API_KEY");
  if (!apiKey) {
    throw new AIServiceError(
      "Для распознавания PDF требуется серверное подключение OpenAI.",
      503,
    );
  }

  const trialUsage = await reserveOpenAIRequest(input.accountId);
  if (!trialUsage) {
    throw new AIServiceError(
      "AI временно недоступен из-за технического ограничения нагрузки. Повторите позже.",
      429,
    );
  }

  const model = await getIntegrationValue(input.accountId, "OPENAI_MODEL")
    ?? "gpt-5.4-mini";
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const baseUrl = runtimeEnv("OPENAI_BASE_URL") ?? "https://api.openai.com";

  let response: Response;
  try {
    response = await fetch(responsesEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: input.system,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: input.filename,
                file_data: `data:${input.mimeType};base64,${input.dataBase64}`,
                detail: input.mimeType === "application/pdf"
                  ? input.detail ?? "high"
                  : undefined,
              },
              { type: "input_text", text: input.prompt },
            ],
          },
        ],
        text: openAIStructuredText(input.responseSchema),
        max_output_tokens: input.maxTokens,
        store: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model, startedAt, status: "error", errorCode: "network" });
    throw new AIServiceError("Не удалось передать документ в OpenAI.", 502);
  }

  if (!response.ok) {
    const providerCode = await providerErrorCode(response);
    await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model, startedAt, status: "error", errorCode: providerCode || `http_${response.status}` });
    throw new AIServiceError(
      providerErrorMessage(response.status, providerCode),
      response.status >= 500 ? 502 : response.status,
    );
  }

  const payload = await response.json() as OpenAIResponsePayload;
  await observeOpenAI({ accountId: input.accountId, context: input.observability, requestId, model, startedAt, status: "success", payload });
  return completedResponseText(payload, "OpenAI не смог прочитать документ.");
}
