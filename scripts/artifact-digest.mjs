import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "dist");
if (!existsSync(root)) throw new Error(`Artifact directory does not exist: ${root}`);

const files = [];
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(filePath);
    else if (path.relative(root, filePath) !== "release-manifest.json") files.push(filePath);
  }
}
collect(root);
files.sort((a, b) => path.relative(root, a).localeCompare(path.relative(root, b), "en"));

const digest = createHash("sha256");
for (const filePath of files) {
  const relative = path.relative(root, filePath).split(path.sep).join("/");
  const contents = readFileSync(filePath);
  digest.update(`${relative}\0${contents.length}\0`);
  digest.update(contents);
}
process.stdout.write(digest.digest("hex"));
