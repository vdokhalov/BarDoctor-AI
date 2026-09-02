const DEFAULT_MAX_JSON_BYTES = 1024 * 1024;

export type JsonRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

type JsonRequestOptions = {
  maxBytes?: number;
  requireObject?: boolean;
};

function jsonError(status: number, code: string, error: string): JsonRequestResult<never> {
  return {
    ok: false,
    response: Response.json(
      { ok: false, code, error },
      { status, headers: { "cache-control": "no-store" } },
    ),
  };
}

export async function readJsonRequest<T>(
  request: Request,
  options: JsonRequestOptions = {},
): Promise<JsonRequestResult<T>> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_JSON_BYTES;
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return jsonError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Запрос слишком большой. Уменьшите объём данных и повторите попытку.",
    );
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return jsonError(400, "INVALID_JSON", "Не удалось прочитать данные запроса.");
  }

  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return jsonError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Запрос слишком большой. Уменьшите объём данных и повторите попытку.",
    );
  }
  if (!raw.trim()) {
    return jsonError(400, "INVALID_JSON", "Отправлены пустые данные запроса.");
  }

  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return jsonError(400, "INVALID_JSON", "Данные запроса имеют неверный формат JSON.");
  }

  if (
    options.requireObject !== false
    && (data === null || typeof data !== "object" || Array.isArray(data))
  ) {
    return jsonError(400, "INVALID_JSON", "Ожидался объект с данными запроса.");
  }

  return { ok: true, data: data as T };
}
