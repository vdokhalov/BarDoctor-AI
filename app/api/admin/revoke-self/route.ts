import {
  adminJson,
  revokeTemporaryMigrationOperator,
} from "../../../../lib/bardoctor/platform-admin";

export async function POST(request: Request): Promise<Response> {
  const result = await revokeTemporaryMigrationOperator(request);
  return adminJson(
    result.ok
      ? { ok: true, message: "Временный административный доступ отозван" }
      : { ok: false, error: result.error ?? "Отзыв доступа отклонён" },
    result.status,
  );
}
