import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import {
  authResult,
  findAccountByAppEmail,
  getChatGPTEmail,
  issueSession,
  normalizeEmail,
  sessionResponse,
} from "../../../../lib/bardoctor/auth";
import {
  authenticateLegacyPassword,
  importLegacyAccount,
} from "../../../../lib/bardoctor/legacy-import";
import {
  hashPassword,
  passwordValidationError,
  verifyPassword,
} from "../../../../lib/bardoctor/password";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import { canImportLegacyAccount } from "../../../../lib/bardoctor/account-identity";

const INVALID_CREDENTIALS = "Неверный email или пароль";

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = await readJsonRequest<{ email?: string; password?: string }>(request, {
      maxBytes: 64 * 1024,
    });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    if (!body.email?.trim() || !body.password) {
      return Response.json({ ok: false, error: "Введите email и пароль" }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    const existing = await findAccountByAppEmail(email);
    if (existing?.passwordHash) {
      const valid = await verifyPassword(body.password, existing);
      if (!valid) {
        return Response.json({ ok: false, error: INVALID_CREDENTIALS }, { status: 401 });
      }
      const token = await issueSession(existing);
      return sessionResponse(await authResult(existing, token, request), token, request);
    }

    const chatgptEmail = getChatGPTEmail(request);
    if (existing && chatgptEmail === existing.chatgptEmail) {
      const validationError = passwordValidationError(body.password);
      if (validationError) {
        return Response.json({ ok: false, error: validationError }, { status: 400 });
      }
      const password = await hashPassword(body.password);
      await getDb()
        .update(accounts)
        .set({ ...password, updatedAt: new Date().toISOString() })
        .where(eq(accounts.id, existing.id));
      const upgradedAccount = { ...existing, ...password };
      const token = await issueSession(upgradedAccount);
      return sessionResponse({
        ...(await authResult(upgradedAccount, token, request)),
        passwordUpgraded: true,
      }, token, request);
    }

    // Never forward credentials to the legacy service unless dispatch has
    // verified that the current ChatGPT identity owns the same email address.
    // Normal local-password login above remains independent of ChatGPT email.
    if (!chatgptEmail || !canImportLegacyAccount(chatgptEmail, email)) {
      return Response.json(
        { ok: false, error: INVALID_CREDENTIALS },
        { status: 401 },
      );
    }

    const legacyAuth = await authenticateLegacyPassword(email, body.password);
    if (!legacyAuth.ok) {
      return Response.json(
        { ok: false, error: INVALID_CREDENTIALS },
        { status: 401 },
      );
    }

    let account = existing;
    if (!account) {
      account = await importLegacyAccount({
        request,
        email: legacyAuth.email,
        token: legacyAuth.token,
        loginProfile: legacyAuth,
      });
    }
    const password = await hashPassword(body.password);
    await getDb()
      .update(accounts)
      .set({ ...password, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, account.id));
    account = { ...account, ...password };
    const token = await issueSession(account);
    return sessionResponse({
      ...(await authResult(account, token, request)),
      migrated: !existing,
      migrationSummary: account.migrationSummaryJson
        ? JSON.parse(account.migrationSummaryJson)
        : null,
    }, token, request);
  } catch (error) {
    console.error(
      "BarDoctor login failed",
      error instanceof Error ? error.message : "Unknown login error",
    );
    return Response.json(
      { ok: false, error: "Не удалось выполнить вход. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
