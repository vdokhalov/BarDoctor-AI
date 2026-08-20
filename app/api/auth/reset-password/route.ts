import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { accounts, sessions } from "../../../../db/schema";
import { canResetAccountPassword } from "../../../../lib/bardoctor/account-identity";
import {
  findAccountByAppEmail,
  getChatGPTEmail,
  normalizeEmail,
} from "../../../../lib/bardoctor/auth";
import {
  hashPassword,
  passwordValidationError,
} from "../../../../lib/bardoctor/password";
import { readJsonRequest } from "../../../../lib/bardoctor/http";

const IDENTITY_MISMATCH =
  "Этот аккаунт BarDoctor не связан с подтверждённой учётной записью ChatGPT";

export async function POST(request: Request): Promise<Response> {
  try {
    const authenticatedEmail = getChatGPTEmail(request);
    if (!authenticatedEmail) {
      return Response.json(
        {
          ok: false,
          error: "Сначала подтвердите учётную запись через ChatGPT",
          needsChatGPTSignIn: true,
        },
        { status: 401 },
      );
    }

    const parsed = await readJsonRequest<{
      email?: string;
      password?: string;
    }>(request, { maxBytes: 64 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    if (!body.email?.trim() || !body.password) {
      return Response.json(
        { ok: false, error: "Введите email аккаунта и новый пароль" },
        { status: 400 },
      );
    }

    const validationError = passwordValidationError(body.password);
    if (validationError) {
      return Response.json({ ok: false, error: validationError }, { status: 400 });
    }

    const account = await findAccountByAppEmail(normalizeEmail(body.email));
    if (!account || !canResetAccountPassword(authenticatedEmail, account)) {
      return Response.json({ ok: false, error: IDENTITY_MISMATCH }, { status: 403 });
    }

    const password = await hashPassword(body.password);
    const now = new Date().toISOString();
    const db = getDb();
    await db.batch([
      db
        .update(accounts)
        .set({ ...password, updatedAt: now })
        .where(eq(accounts.id, account.id)),
      db.delete(sessions).where(eq(sessions.accountId, account.id)),
    ]);

    return Response.json({
      ok: true,
      email: account.appEmail,
      message: "Новый пароль установлен",
    });
  } catch (error) {
    console.error(
      "BarDoctor password reset failed",
      error instanceof Error ? error.message : "Unknown password reset error",
    );
    return Response.json(
      { ok: false, error: "Не удалось установить новый пароль. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
