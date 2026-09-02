import { getBarDoctorReleaseIdentity } from "../../../lib/bardoctor/release-identity";
import { runtimeEnv } from "../../../lib/bardoctor/runtime-env";

export function GET(): Response {
  return Response.json(getBarDoctorReleaseIdentity(
    runtimeEnv("BARDOCTOR_ENVIRONMENT") || "unconfigured",
  ), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
