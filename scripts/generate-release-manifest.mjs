import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const git = (args, fallback) => {
  try { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
  catch { return fallback; }
};
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const schemaVersion = readdirSync(path.join(root, "drizzle"))
  .map((name) => /^(\d{4})_.+\.sql$/.exec(name)?.[1])
  .filter(Boolean)
  .sort()
  .at(-1) || "schema-version-unavailable";
const digest = execFileSync(process.execPath, [path.join(root, "scripts", "artifact-digest.mjs"), "dist"], {
  cwd: root,
  encoding: "utf8",
}).trim();

const manifest = {
  appVersion: packageJson.version || "app-version-unavailable",
  buildNumber: process.env.BARDOCTOR_BUILD_NUMBER?.trim() || git(["rev-list", "--count", "HEAD"], "build-number-unavailable"),
  gitCommit: process.env.BARDOCTOR_SOURCE_COMMIT?.trim() || git(["rev-parse", "HEAD"], "source-commit-unavailable"),
  buildTimestamp: process.env.BARDOCTOR_BUILD_TIMESTAMP?.trim() || git(["show", "-s", "--format=%cI", "HEAD"], "build-timestamp-unavailable"),
  schemaVersion,
  environment: process.env.BARDOCTOR_ENVIRONMENT?.trim() || "unconfigured",
  artifactSha256: digest,
  digestScope: "dist excluding release-manifest.json; sorted relative paths and file contents",
};

writeFileSync(path.join(root, "dist", "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Release manifest generated for ${manifest.gitCommit}; artifact ${digest}`);
