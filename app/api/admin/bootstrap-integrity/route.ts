import { readBootstrapIntegrityAudit } from "../../../../lib/bardoctor/bootstrap-integrity";
import { adminForbidden, authenticatePlatformAdmin } from "../../../../lib/bardoctor/platform-admin";

export async function GET(request: Request): Promise<Response> {
  if (!await authenticatePlatformAdmin(request)) return adminForbidden();
  return Response.json({ ok: true, report: await readBootstrapIntegrityAudit() }, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-BarDoctor-Data-Mode": "read-only-bootstrap-integrity-audit",
    },
  });
}
