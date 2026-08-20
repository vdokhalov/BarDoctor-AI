import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDirectory);
const bundlePath = join(projectRoot, "public/assets/index-BQGspy0I.js");
const fragmentPath = join(scriptDirectory, "fragments/monthly-report-v165.fragment.txt");

const startMarker = "/* bd-monthly-report-v165:start */";
const endMarker = "/* bd-monthly-report-v165:end */";
const insertionMarker = "const bdPayrollConfirmationVersion=";

let bundle = await readFile(bundlePath, "utf8");
const fragment = (await readFile(fragmentPath, "utf8")).trim();

const existingStart = bundle.indexOf(startMarker);
const existingEnd = bundle.indexOf(endMarker);
if (existingStart >= 0 && existingEnd > existingStart) {
  bundle = bundle.slice(0, existingStart) + bundle.slice(existingEnd + endMarker.length);
}

if (bundle.includes("function bdMonthlyReportPage()")) {
  bundle = bundle.replace(
    "function bdMonthlyReportPage()",
    "function bdMonthlyReportLegacyPage()",
  );
}

if (!bundle.includes("function bdMonthlyReportLegacyPage()")) {
  throw new Error("Legacy monthly report component was not found");
}

const insertionIndex = bundle.indexOf(insertionMarker);
if (insertionIndex < 0) {
  throw new Error("Payroll insertion marker was not found");
}

bundle = bundle.slice(0, insertionIndex) + fragment + "\n\n" + bundle.slice(insertionIndex);
await writeFile(bundlePath, bundle);

console.log("Monthly report v165 injected");
