import {
  authenticateSchemaDiagnosticAdmin,
  readProductionSchemaDiagnostic,
  type ReadOnlyDatabase,
} from "../../../../lib/bardoctor/production-schema-diagnostic";
import { adminForbidden, adminJson } from "../../../../lib/bardoctor/platform-admin";
import { getD1 } from "../../../../db";

export async function GET(request: Request): Promise<Response> {
  try {
    const database = getD1() as unknown as ReadOnlyDatabase;
    if (!await authenticateSchemaDiagnosticAdmin(request, database)) return adminForbidden();
    return adminJson(await readProductionSchemaDiagnostic(database));
  } catch {
    return adminJson({
      ok: false,
      environment: "production",
      readOnly: true,
      code: "SCHEMA_DIAGNOSTIC_FAILED",
      error: "Не удалось прочитать metadata базы данных",
    }, 500);
  }
}
