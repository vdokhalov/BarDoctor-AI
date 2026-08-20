import fs from "node:fs";

function replaceOnce(file, label, before, after) {
  const source = fs.readFileSync(file, "utf8");
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Standalone navigation target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Standalone navigation target is not unique: ${label}`);
  }
  fs.writeFileSync(file, source.slice(0, first) + after + source.slice(first + before.length));
}

replaceOnce(
  "public/venue-create.css",
  "venue Back touch target",
  ".icon-button{display:grid;width:42px;height:42px;",
  ".icon-button{display:grid;width:44px;height:44px;",
);

replaceOnce(
  "public/supplier-alternatives.css",
  "supplier alternatives safe-area header",
  "@media(max-width:600px){.terms{grid-template-columns:1fr}.hero{padding:24px 20px}.head{align-items:flex-start}}\n",
  "@media(max-width:600px){.terms{grid-template-columns:1fr}.hero{padding:24px 20px}.head{align-items:flex-start}}\n.top{min-height:calc(78px + env(safe-area-inset-top));height:auto;padding:calc(14px + env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) 14px max(18px,env(safe-area-inset-left))}\n",
);

console.log("Applied standalone navigation safe-area and touch-target fixes.");
