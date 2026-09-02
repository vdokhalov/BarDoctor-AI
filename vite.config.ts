import vinext from "vinext";
import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

function gitValue(args: string[], fallback: string): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function sourceCommit(): string {
  return process.env.BARDOCTOR_SOURCE_COMMIT?.trim()
    || gitValue(["rev-parse", "HEAD"], "source-commit-unavailable");
}

function buildNumber(): string {
  return process.env.BARDOCTOR_BUILD_NUMBER?.trim()
    || gitValue(["rev-list", "--count", "HEAD"], "build-number-unavailable");
}

function buildTimestamp(): string {
  if (process.env.BARDOCTOR_BUILD_TIMESTAMP?.trim()) {
    return process.env.BARDOCTOR_BUILD_TIMESTAMP.trim();
  }
  if (process.env.SOURCE_DATE_EPOCH?.trim()) {
    const seconds = Number(process.env.SOURCE_DATE_EPOCH);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000).toISOString();
  }
  return gitValue(["show", "-s", "--format=%cI", "HEAD"], "build-timestamp-unavailable");
}

function appVersion(): string {
  const parsed = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version?: unknown };
  return typeof parsed.version === "string" && parsed.version.trim()
    ? parsed.version.trim()
    : "app-version-unavailable";
}

function schemaVersion(): string {
  const journal = JSON.parse(
    readFileSync(new URL("./drizzle/meta/_journal.json", import.meta.url), "utf8"),
  ) as { entries?: Array<{ tag?: unknown }> };
  const tag = journal.entries?.at(-1)?.tag;
  return typeof tag === "string" ? tag.match(/^(\d{4})_/)?.[1] || tag : "schema-version-unavailable";
}

const { d1, r2 } = hostingConfig;
const localRuntimeBindings = Object.fromEntries(
  [
    "BARDOCTOR_PLATFORM_ADMIN_IDENTITY_SHA256",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "INVOICE_RECOGNITION_V2_MODE",
    "INVOICE_RECOGNITION_V2_AI_FALLBACK",
    "INVOICE_OCR_PROVIDER",
    "INVOICE_OCR_ENDPOINT",
    "INVOICE_OCR_API_KEY",
    "INVOICE_OCR_TIMEOUT_MS",
    "INVOICE_OCR_API_VERSION",
    "INVOICE_OCR_MODEL",
    "ONESIGNAL_APP_ID",
    "ONESIGNAL_REST_API_KEY",
    "NOTIFICATION_CRON_SECRET",
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
      __BARDOCTOR_APP_VERSION__: JSON.stringify(appVersion()),
      __BARDOCTOR_BUILD_NUMBER__: JSON.stringify(buildNumber()),
      __BARDOCTOR_BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp()),
      __BARDOCTOR_SCHEMA_VERSION__: JSON.stringify(schemaVersion()),
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
