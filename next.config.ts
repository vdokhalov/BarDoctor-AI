import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";

function releaseBuildId(): string {
  const configured = process.env.BARDOCTOR_BUILD_ID?.trim()
    || process.env.BARDOCTOR_SOURCE_COMMIT?.trim();
  if (configured) return configured;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    throw new Error("BARDOCTOR_BUILD_ID is required when Git metadata is unavailable");
  }
}

const nextConfig: NextConfig = {
  // Vinext otherwise generates a random UUID, making identical release inputs
  // produce different server artifacts. The build ID is public provenance, not
  // a secret, and follows the canonical source commit by default.
  generateBuildId: async () => releaseBuildId(),
};

export default nextConfig;
