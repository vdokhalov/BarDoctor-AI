import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import {
  deleteIntegrationValues,
  getIntegrationValue,
  IntegrationSecretError,
  integrationStatus,
  saveIntegrationValue,
  type IntegrationKey,
} from "../../../lib/bardoctor/integration-secrets";
import { hasPermission } from "../../../lib/bardoctor/access-control";

type Service = "openai" | "anthropic" | "onesignal" | "google_places" | "google_business";
type JsonRecord = Record<string, unknown>;

const SERVICE_KEYS: Record<Service, IntegrationKey[]> = {
  openai: ["OPENAI_API_KEY", "OPENAI_MODEL"],
  anthropic: ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"],
  onesignal: ["ONESIGNAL_REST_API_KEY"],
  google_places: ["GOOGLE_PLACES_API_KEY"],
  google_business: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
};

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function service(value: unknown): Service | null {
  return value === "openai" || value === "anthropic" || value === "onesignal" || value === "google_places" || value === "google_business"
    ? value
    : null;
}

async function body(request: Request): Promise<JsonRecord> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 24_000) {
    throw new IntegrationSecretError("Слишком большой запрос.", 413);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    return parsed as JsonRecord;
  } catch {
    throw new IntegrationSecretError("Некорректный запрос.", 400);
  }
}

function validateSecret(value: string, label: string): void {
  if (value.length < 16 || value.length > 8_000) {
    throw new IntegrationSecretError(`${label}: проверьте, что значение скопировано полностью.`, 400);
  }
}

function validateModel(value: string): void {
  if (!/^[a-zA-Z0-9._:-]{3,120}$/.test(value)) {
    throw new IntegrationSecretError("Название модели содержит недопустимые символы.", 400);
  }
}

async function statusPayload(accountId: number, request: Request) {
  const [status, openAIModel, anthropicModel] = await Promise.all([
    integrationStatus(accountId, Object.values(SERVICE_KEYS).flat()),
    getIntegrationValue(accountId, "OPENAI_MODEL"),
    getIntegrationValue(accountId, "ANTHROPIC_MODEL"),
  ]);
  const configured = (key: IntegrationKey) => status[key] !== "missing";
  const source = (keys: IntegrationKey[]) => keys.some((key) => status[key] === "environment")
    ? "environment"
    : keys.some((key) => status[key] === "platform_store")
      ? "platform_store"
      : keys.every(configured)
        ? "secure_store"
        : "missing";
  const openAISource = source(["OPENAI_API_KEY"]);
  const oneSignalSource = source(["ONESIGNAL_REST_API_KEY"]);

  return {
    services: {
      openai: {
        includedInSubscription: true,
        configured: configured("OPENAI_API_KEY"),
        source: openAISource === "environment" || openAISource === "platform_store"
          ? "subscription"
          : "missing",
      },
      anthropic: {
        configured: configured("ANTHROPIC_API_KEY"),
        source: source(["ANTHROPIC_API_KEY"]),
      },
      onesignal: {
        includedInSubscription: true,
        configured: configured("ONESIGNAL_REST_API_KEY"),
        source: oneSignalSource === "environment" || oneSignalSource === "platform_store"
          ? "subscription"
          : "missing",
      },
      google_places: {
        configured: configured("GOOGLE_PLACES_API_KEY"),
        source: source(["GOOGLE_PLACES_API_KEY"]),
      },
      google_business: {
        configured: configured("GOOGLE_CLIENT_ID") && configured("GOOGLE_CLIENT_SECRET"),
        source: source(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]),
      },
    },
    openAIModel: openAIModel || DEFAULT_OPENAI_MODEL,
    anthropicModel: anthropicModel || DEFAULT_ANTHROPIC_MODEL,
    googleCallbackUrl: new URL("/api/reviews/sources/google/callback", request.url).toString(),
  };
}

function integrationError(error: unknown): Response {
  if (error instanceof IntegrationSecretError) {
    return noStore(Response.json({ ok: false, error: error.message }, { status: error.status }));
  }
  return noStore(Response.json(
    { ok: false, error: "Не удалось сохранить настройки интеграции." },
    { status: 500 },
  ));
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "integrations.manage")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Интеграции доступны только владельцу" },
      { status: 403 },
    ));
  }
  try {
    return noStore(Response.json({ ok: true, data: await statusPayload(account.id, request) }));
  } catch (error) {
    return integrationError(error);
  }
}

export async function PUT(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "integrations.manage")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Интеграции доступны только владельцу" },
      { status: 403 },
    ));
  }

  try {
    const values = await body(request);
    const selectedService = service(values.service);
    if (!selectedService) throw new IntegrationSecretError("Неизвестная интеграция.", 400);

    const current = await integrationStatus(account.id, SERVICE_KEYS[selectedService]);
    if (selectedService === "openai" || selectedService === "onesignal") {
      throw new IntegrationSecretError(
        selectedService === "openai"
          ? "AI включён в подписку и настраивается централизованно BarDoctor."
          : "Серверная отправка push настраивается централизованно BarDoctor.",
        403,
      );
    }

    if (selectedService === "anthropic") {
      const apiKey = text(values.apiKey);
      const model = text(values.model) || DEFAULT_ANTHROPIC_MODEL;
      validateModel(model);
      if (apiKey) {
        validateSecret(apiKey, "Ключ Anthropic");
        await saveIntegrationValue(account.id, "ANTHROPIC_API_KEY", apiKey);
      } else if (current.ANTHROPIC_API_KEY === "missing") {
        throw new IntegrationSecretError("Вставьте ключ Anthropic.", 400);
      }
      await saveIntegrationValue(account.id, "ANTHROPIC_MODEL", model);
    }

    if (selectedService === "google_places") {
      const apiKey = text(values.apiKey);
      if (apiKey) {
        validateSecret(apiKey, "Ключ Google Places");
        await saveIntegrationValue(account.id, "GOOGLE_PLACES_API_KEY", apiKey);
      } else if (current.GOOGLE_PLACES_API_KEY === "missing") {
        throw new IntegrationSecretError("Вставьте ключ Google Places.", 400);
      }
    }

    if (selectedService === "google_business") {
      const clientId = text(values.clientId);
      const clientSecret = text(values.clientSecret);
      if (Boolean(clientId) !== Boolean(clientSecret)) {
        throw new IntegrationSecretError("Введите одновременно Client ID и Client secret.", 400);
      }
      if (clientId && clientSecret) {
        validateSecret(clientId, "Google Client ID");
        validateSecret(clientSecret, "Google Client secret");
        await saveIntegrationValue(account.id, "GOOGLE_CLIENT_ID", clientId);
        await saveIntegrationValue(account.id, "GOOGLE_CLIENT_SECRET", clientSecret);
      } else if (
        current.GOOGLE_CLIENT_ID === "missing"
        || current.GOOGLE_CLIENT_SECRET === "missing"
      ) {
        throw new IntegrationSecretError("Введите Google Client ID и Client secret.", 400);
      }
    }

    return noStore(Response.json({
      ok: true,
      data: await statusPayload(account.id, request),
      message: "Настройки сохранены в защищённом хранилище.",
    }));
  } catch (error) {
    return integrationError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "integrations.manage")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Интеграции доступны только владельцу" },
      { status: 403 },
    ));
  }

  try {
    const values = await body(request);
    const selectedService = service(values.service);
    if (!selectedService) throw new IntegrationSecretError("Неизвестная интеграция.", 400);
    if (selectedService === "openai" || selectedService === "onesignal") {
      throw new IntegrationSecretError(
        selectedService === "openai"
          ? "Серверное подключение AI нельзя удалить из аккаунта заведения."
          : "Серверное подключение push нельзя удалить из аккаунта заведения.",
        403,
      );
    }
    await deleteIntegrationValues(account.id, SERVICE_KEYS[selectedService]);
    return noStore(Response.json({
      ok: true,
      data: await statusPayload(account.id, request),
      message: "Сохранённые настройки удалены.",
    }));
  } catch (error) {
    return integrationError(error);
  }
}
