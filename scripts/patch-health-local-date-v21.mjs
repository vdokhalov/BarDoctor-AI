import fs from "node:fs";
import path from "node:path";

const target = path.join(process.cwd(), "public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(target, "utf8");

const before =
  'const b=new Date(v.date);return!Number.isNaN(b.getTime())&&b>=u&&b<=l';
const after =
  'const b=new Date(typeof v.date==="string"&&/^\\d{4}-\\d{2}-\\d{2}$/.test(v.date)?v.date+"T00:00:00":v.date);return!Number.isNaN(b.getTime())&&b>=u&&b<=l';

if (source.includes(after)) {
  console.log("health local-date normalization v21 already applied");
  process.exit(0);
}

if (!source.includes(before)) {
  throw new Error("Health attendance date anchor was not found");
}

source = source.replace(before, after);
fs.writeFileSync(target, source);
console.log("applied health local-date normalization v21");
