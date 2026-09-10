import fs from "node:fs";
import { finalizeClientRelease, verifyClientRelease } from "./lib/client-release-integrity.mjs";

// Legacy preparation patches also rewrite emitted HTML and loaders. If a build
// exists, restore its complete release contract before any artifact tests run.
if (fs.existsSync("dist/server/index.js")) {
  finalizeClientRelease(process.cwd(), fs.readFileSync("public/assets/index-BQGspy0I.js"));
  const release = verifyClientRelease(process.cwd());
  console.log(`Prepared artifact release verified: ${release.name}`);
}
