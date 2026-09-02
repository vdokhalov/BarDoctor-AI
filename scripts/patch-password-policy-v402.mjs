import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(target, "utf8");

const replacements = [
  ['t.password.length<6?"Минимум 6 символов"', 't.password.length<15?"Минимум 15 символов"'],
  ['placeholder:"Минимум 6 символов"', 'placeholder:"Минимум 15 символов"'],
];

for (const [before, after] of replacements) {
  const matches = source.split(before).length - 1;
  if (matches !== 1) {
    throw new Error(`Expected exactly one password-policy match for ${before}, found ${matches}`);
  }
  source = source.replace(before, after);
}

await writeFile(target, source);
console.log("bd-password-policy-v402: patched registration minimum to 15 characters");
