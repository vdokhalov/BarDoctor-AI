import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const drizzleDirectory = path.join(root, "drizzle");
const journal = JSON.parse(readFileSync(path.join(drizzleDirectory, "meta", "_journal.json"), "utf8"));
const entries = journal.entries ?? [];
const sqlTags = readdirSync(drizzleDirectory)
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .map((name) => name.replace(/\.sql$/, ""))
  .sort();
const journalTags = entries.map((entry) => entry.tag);

assert.deepEqual(journalTags, sqlTags, "every deployable SQL migration must appear exactly once in the journal");
entries.forEach((entry, index) => {
  assert.equal(entry.idx, index, `migration journal index ${index} is not contiguous`);
  assert.match(entry.tag, /^\d{4}_[a-z0-9_]+$/, `invalid migration tag: ${entry.tag}`);
});

const latest = entries.at(-1);
assert.ok(latest, "migration journal is empty");
const version = latest.tag.match(/^(\d{4})_/)[1];
assert.ok(
  existsSync(path.join(drizzleDirectory, "meta", `${version}_snapshot.json`)),
  `latest schema snapshot ${version}_snapshot.json is missing`,
);

const hostingPlugin = readFileSync(path.join(root, "build", "sites-vite-plugin.ts"), "utf8");
assert.match(hostingPlugin, /drizzleSource/);
assert.doesNotMatch(hostingPlugin, /ops\/manual-migrations|ops\/migration-history/);

console.log(`Migration ledger verified: ${entries.length} deployable migrations; schema version ${version}.`);
