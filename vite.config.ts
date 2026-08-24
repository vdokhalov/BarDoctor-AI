import vinext from "vinext";
import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

function sourceCommit(): string {
  if (process.env.BARDOCTOR_SOURCE_COMMIT?.trim()) return process.env.BARDOCTOR_SOURCE_COMMIT.trim();
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "source-commit-unavailable";
  }
}

const { d1, r2 } = hostingConfig;
const localRuntimeBindings = Object.fromEntries(
  [
    "BARDOCTOR_PLATFORM_ADMIN_IDENTITY_SHA256",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "ONESIGNAL_APP_ID",
    "ONESIGNAL_REST_API_KEY",
    "BARDOCTOR_SECRETS_KEY",
  ]
    .map((key) => [key, process.env[key]])
    .filter((entry): entry is [string, string] => Boolean(entry[1])),
);

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  triggers: {
    crons: ["0 * * * *"],
  },
  vars: localRuntimeBindings,
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: {
      __BARDOCTOR_SOURCE_COMMIT__: JSON.stringify(sourceCommit()),
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      watch: {
        // Sites keeps its npm/wrangler runtime under the project root. Watching
        // that cache can exhaust the host's inotify quota before Vite starts.
        ignored: ["**/.sites-runtime/**", "**/.wrangler/**"],
        ...(isCodexSeatbeltSandbox
          ? { useFsEvents: false, usePolling: true }
          : {}),
      },
    },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
