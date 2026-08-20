import {
  adminJson,
  claimInitialPlatformAdmin,
} from "../../../../lib/bardoctor/platform-admin";

export async function POST(request: Request): Promise<Response> {
  const result = await claimInitialPlatformAdmin(request);
  return adminJson(
    result.ok
      ? { ok: true, message: "Internal Admin активирован" }
      : { ok: false, error: result.error ?? "Активация отклонена" },
    result.status,
  );
}
