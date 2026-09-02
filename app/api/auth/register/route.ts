import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import {
  authResult,
  ensureOwnerVenue,
  findAccountByAppEmail,
  getChatGPTEmail,
  issueSession,
  normalizeEmail,
  sessionResponse,
} from "../../../../lib/bardoctor/auth";
import {
  claimVenueInvite,
  findActiveInvite,
} from "../../../../lib/bardoctor/access-service";
import {
  hashPassword,
  passwordValidationError,
} from "../../../../lib/bardoctor/password";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import {
  authRateLimitedResponse,
  clearSuccessfulAuthLimit,
  consumeAuthRateLimit,
} from "../../../../lib/bardoctor/auth-rate-limit";

const REGISTRATION_UNAVAILABLE =
  "Не удалось завершить регистрацию. Проверьте данные или войдите в существующий аккаунт.";

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = await readJsonRequest<{
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      invitationCode?: string;
      registrationMode?: "owner" | "join";
    }>(request, { maxBytes: 64 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    if (!body.email?.trim() || !body.firstName?.trim() || !body.password) {
      return Response.json(
        { ok: false, error: "Заполните все обязательные поля" },
        { status: 400 },
      );
    }

    const appEmail = normalizeEmail(body.email);
    const rateLimit = await consumeAuthRateLimit(request, "register", appEmail);
    if (!rateLimit.allowed) return authRateLimitedResponse(rateLimit);
    const chatgptEmail = getChatGPTEmail(request);
    const joiningVenue = body.registrationMode === "join" || Boolean(body.invitationCode?.trim());
    if (joiningVenue && !body.invitationCode?.trim()) {
      return Response.json(
        { ok: false, error: "Введите код приглашения от владельца" },
        { status: 400 },
      );
    }
    if (joiningVenue) {
      const inviteRateLimit = await consumeAuthRateLimit(
        request,
        "invitation",
        body.invitationCode ?? "",
      );
      if (!inviteRateLimit.allowed) return authRateLimitedResponse(inviteRateLimit);
    }
    const invite = joiningVenue
      ? await findActiveInvite(body.invitationCode ?? "")
      : null;
    if (joiningVenue && !invite) {
      return Response.json(
        { ok: false, error: "Код приглашения недействителен, использован или истёк" },
        { status: 400 },
      );
    }
    const validationError = passwordValidationError(body.password);
    if (validationError) {
      return Response.json({ ok: false, error: validationError }, { status: 400 });
    }

    if (await findAccountByAppEmail(appEmail)) {
      return Response.json(
        { ok: false, code: "REGISTRATION_UNAVAILABLE", error: REGISTRATION_UNAVAILABLE },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const now = new Date().toISOString();
    const password = await hashPassword(body.password);
    const [account] = await getDb()
      .insert(accounts)
      .values({
        chatgptEmail: chatgptEmail ?? appEmail,
        appEmail,
        ...password,
        firstName: body.firstName.trim(),
        lastName: body.lastName?.trim() || null,
        phone: body.phone?.trim() || null,
        accountKind: "user",
        role: invite?.role ?? "owner",
        ownsVenue: !invite,
        migrationStatus: "server_authoritative",
        updatedAt: now,
      })
      .returning();

    if (invite) {
      const membership = await claimVenueInvite(account, body.invitationCode ?? "");
      if (!membership) {
        await getDb().delete(accounts).where(eq(accounts.id, account.id));
        return Response.json(
          { ok: false, error: "Код уже использован. Попросите владельца создать новый" },
          { status: 409 },
        );
      }
    } else {
      await ensureOwnerVenue(account);
    }

    const token = await issueSession(account);
    await clearSuccessfulAuthLimit(request, "register", appEmail);
    if (invite) {
      await clearSuccessfulAuthLimit(request, "invitation", body.invitationCode ?? "");
    }
    return sessionResponse(
      {
        ...(await authResult(account, token, request)),
        joinedVenue: Boolean(invite),
      },
      token,
      request,
      201,
    );
  } catch (error) {
    if (error instanceof Error && /unique/i.test(error.message)) {
      return Response.json(
        { ok: false, code: "REGISTRATION_UNAVAILABLE", error: REGISTRATION_UNAVAILABLE },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error(
      "BarDoctor registration failed",
      error instanceof Error ? error.message : "Unknown registration error",
    );
    return Response.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}
