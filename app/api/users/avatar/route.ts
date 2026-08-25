import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import { authenticateIdentityRequest, unauthorized } from "../../../../lib/bardoctor/auth";

const MAX_AVATAR_BYTES = 1024 * 1024;
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
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return noStore({ ok: false, error: "Не удалось прочитать фото" }, 400);
  }
  const file = form.get("file");
  if (!isUploadFile(file)) return noStore({ ok: false, error: "Выберите фото профиля" }, 400);
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    return noStore({ ok: false, error: "Фото должно быть не больше 1 МБ после подготовки" }, 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = normalizedMime(bytes, file.type);
  if (!IMAGE_TYPES.has(mimeType)) {
    return noStore({ ok: false, error: "Поддерживаются изображения JPG, PNG и WEBP" }, 415);
  }
  const storage = bucket();
  if (!storage) return noStore({ ok: false, error: "Хранилище фото временно недоступно" }, 503);

  const id = crypto.randomUUID();
  const key = `users/${account.id}/avatars/${id}`;
  await storage.put(key, bytes, {
    httpMetadata: { contentType: mimeType },
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      purpose: "user-avatar",
      accountId: String(account.id),
    },
  });

  const previousAvatarId = account.avatarId;
  try {
    await getDb().update(accounts).set({ avatarId: id, updatedAt: new Date().toISOString() }).where(eq(accounts.id, account.id));
  } catch (error) {
    await storage.delete(key);
    throw error;
  }
  if (previousAvatarId && previousAvatarId !== id) {
    await storage.delete(`users/${account.id}/avatars/${previousAvatarId}`).catch(() => undefined);
  }

  return noStore({ ok: true, avatar: { id, mimeType, size: bytes.byteLength } });
}
