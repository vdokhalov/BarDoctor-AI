import {
  adminForbidden,
  authenticatePlatformAdmin,
} from "../../../../lib/bardoctor/platform-admin";
import { readOwnerAccessIntegrityAudit } from "../../../../lib/bardoctor/owner-access";

export async function GET(request: Request): Promise<Response> {
  if (!await authenticatePlatformAdmin(request)) return adminForbidden();
  return Response.json({
    ok: true,
    report: await readOwnerAccessIntegrityAudit(),
  }, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-BarDoctor-Data-Mode": "read-only-owner-access-audit",
    },
  });
}
