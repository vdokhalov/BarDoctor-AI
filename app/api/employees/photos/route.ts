import { env } from "cloudflare:workers";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";

const MAX_PHOTO_BYTES = 700 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadFile = File & {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

function isUploadFile(value: FormDataEntryValue | null): value is UploadFile {
  return Boolean(value && typeof value === "object" && "arrayBuffer" in value);
}

function normalizedMime(bytes: Uint8Array, declared: string): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return declared.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
}

function bucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

function noStore(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "team.manage")) {
    return noStore({ ok: false, code: "ACCESS_DENIED", error: "Нет права изменять карточки сотрудников" }, 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return noStore({ ok: false, error: "Не удалось прочитать фотографию" }, 400);
  }
  const file = form.get("file");
  if (!isUploadFile(file)) return noStore({ ok: false, error: "Выберите фотографию сотрудника" }, 400);
  if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
    return noStore({ ok: false, error: "Фото должно быть не больше 700 КБ после подготовки" }, 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = normalizedMime(bytes, file.type);
  if (!IMAGE_TYPES.has(mimeType)) {
    return noStore({ ok: false, error: "Поддерживаются фотографии JPG, PNG и WEBP" }, 415);
  }
  const storage = bucket();
  if (!storage) return noStore({ ok: false, error: "Хранилище фотографий временно недоступно" }, 503);

  const id = crypto.randomUUID();
  await storage.put(`employees/${account.id}/${id}`, bytes, {
    httpMetadata: { contentType: mimeType },
    customMetadata: { uploadedAt: new Date().toISOString(), purpose: "employee-avatar" },
  });
  return noStore({ ok: true, photo: { id, mimeType, size: bytes.byteLength } });
}
