import { env } from "cloudflare:workers";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";

const MAX_STAGED_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type UploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

function isUploadFile(value: FormDataEntryValue | null): value is File & UploadFile {
  return Boolean(
    value
    && typeof value === "object"
    && "arrayBuffer" in value
    && typeof value.arrayBuffer === "function",
  );
}

function safeFileName(value: string): string {
  const clean = value.replace(/[^\p{L}\p{N}._ -]+/gu, "_").trim();
  return (clean || "menu-page.jpg").slice(0, 180);
}

function inferredMimeType(filename: string): string {
  if (/\.png$/i.test(filename)) return "image/png";
  if (/\.webp$/i.test(filename)) return "image/webp";
  if (/\.gif$/i.test(filename)) return "image/gif";
  if (/\.(jpe?g)$/i.test(filename)) return "image/jpeg";
  return "application/octet-stream";
}

function normalizedMimeType(bytes: Uint8Array, declaredType: string, filename: string): string {
  const declared = declaredType.split(";")[0]?.trim().toLocaleLowerCase("en") || "";
  if (declared === "image/jpg" || declared === "image/pjpeg") return "image/jpeg";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x47
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  if (
    bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return declared || inferredMimeType(filename);
}

function catalogBucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "У вас нет права импортировать меню" },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { ok: false, error: "Не удалось прочитать страницу меню" },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!isUploadFile(file)) {
    return Response.json(
      { ok: false, error: "Выберите фотографию страницы меню" },
      { status: 400 },
    );
  }
  if (file.size <= 0 || file.size > MAX_STAGED_IMAGE_BYTES) {
    return Response.json(
      { ok: false, error: "Страница меню должна быть не больше 2 МБ после подготовки" },
      { status: 413 },
    );
  }

  const filename = safeFileName(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = normalizedMimeType(bytes, file.type, filename);
  if (!IMAGE_TYPES.has(mimeType)) {
    return Response.json(
      { ok: false, error: "Поддерживаются фотографии JPG, PNG, WEBP и GIF" },
      { status: 415 },
    );
  }

  const bucket = catalogBucket();
  if (!bucket) {
    return Response.json(
      { ok: false, error: "Хранилище оригиналов меню временно недоступно" },
      { status: 503 },
    );
  }
  const id = crypto.randomUUID();
  const source = form.get("source") === "camera" ? "camera" : "gallery";
  await bucket.put(`catalog/${account.id}/${id}`, bytes, {
    httpMetadata: { contentType: mimeType },
    customMetadata: {
      originalName: encodeURIComponent(filename),
      uploadedAt: new Date().toISOString(),
      source,
      pending: "true",
    },
  });

  return Response.json({
    ok: true,
    file: {
      id,
      name: filename,
      mimeType,
      source,
      size: bytes.byteLength,
    },
  });
}
