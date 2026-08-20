import {
  adminForbidden,
  adminJson,
  authenticatePlatformAdmin,
} from "../../../../lib/bardoctor/platform-admin";
import {
  internalAdminAI,
  internalAdminAudit,
  internalAdminAuditDetail,
  internalAdminDashboard,
  internalAdminIntegrationDetail,
  internalAdminIntegrations,
  internalAdminPush,
  internalAdminReviews,
  internalAdminSystem,
  internalAdminUserDetail,
  internalAdminUsers,
  internalAdminVenueDetail,
  internalAdminVenues,
} from "../../../../lib/bardoctor/internal-admin-data";

type RouteContext = { params: Promise<{ section: string }> };

function positiveInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const platformAdmin = await authenticatePlatformAdmin(request);
  if (!platformAdmin) return adminForbidden();

  const { section } = await context.params;
  const url = new URL(request.url);
  const options = {
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: positiveInteger(url.searchParams.get("page")) ?? undefined,
    limit: positiveInteger(url.searchParams.get("limit")) ?? undefined,
  };
  try {
    if (section === "session") {
      return adminJson({
        ok: true,
        admin: {
          id: platformAdmin.account.id,
          name: [platformAdmin.account.firstName, platformAdmin.account.lastName].filter(Boolean).join(" ")
            || platformAdmin.account.appEmail,
          email: platformAdmin.account.appEmail,
          permissions: platformAdmin.permissions,
        },
        security: {
          mfaAvailable: false,
          mfaRequired: platformAdmin.admin.mfaRequired,
          note: "Текущая архитектура входа не поддерживает проверенный второй фактор, enrollment и recovery",
        },
      });
    }
    if (section === "dashboard") return adminJson({ ok: true, data: await internalAdminDashboard() });
    if (section === "users") {
      const id = positiveInteger(url.searchParams.get("id"));
      if (url.searchParams.has("id") && !id) return adminJson({ ok: false, error: "Некорректный user ID" }, 400);
      const data = id ? await internalAdminUserDetail(id) : await internalAdminUsers(options);
      return data ? adminJson({ ok: true, data }) : adminJson({ ok: false, error: "Пользователь не найден" }, 404);
    }
    if (section === "venues") {
      const id = positiveInteger(url.searchParams.get("id"));
      if (url.searchParams.has("id") && !id) return adminJson({ ok: false, error: "Некорректный venue ID" }, 400);
      const data = id ? await internalAdminVenueDetail(id) : await internalAdminVenues(options);
      return data ? adminJson({ ok: true, data }) : adminJson({ ok: false, error: "Заведение не найдено" }, 404);
    }
    if (section === "integrations") {
      const id = url.searchParams.get("id");
      const data = id ? await internalAdminIntegrationDetail(id) : await internalAdminIntegrations(options);
      return data ? adminJson({ ok: true, data }) : adminJson({ ok: false, error: "Интеграция не найдена" }, 404);
    }
    if (section === "reviews") return adminJson({ ok: true, data: await internalAdminReviews(options) });
    if (section === "ai") return adminJson({ ok: true, data: await internalAdminAI(options) });
    if (section === "push") return adminJson({ ok: true, data: await internalAdminPush(options) });
    if (section === "system") return adminJson({ ok: true, data: await internalAdminSystem() });
    if (section === "audit") {
      const id = positiveInteger(url.searchParams.get("id"));
      if (url.searchParams.has("id") && !id) return adminJson({ ok: false, error: "Некорректный event ID" }, 400);
      const data = id ? await internalAdminAuditDetail(id) : await internalAdminAudit(options);
      return data ? adminJson({ ok: true, data }) : adminJson({ ok: false, error: "Событие не найдено" }, 404);
    }
    return adminJson({ ok: false, error: "Admin endpoint not found" }, 404);
  } catch (error) {
    console.error(
      "Internal Admin request failed",
      section,
      error instanceof Error ? error.message : "Unknown error",
    );
    return adminJson({ ok: false, error: "Не удалось загрузить данные Internal Admin" }, 500);
  }
}
