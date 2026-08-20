import fs from "node:fs";

const cssPath = "public/ai-doctor-attention-v196.css";
let css = fs.readFileSync(cssPath, "utf8");

if (!css.includes(".bd-ai-compact-row > div {\n  min-width: 0;\n  flex: 1 1 0;")) {
  css = css.replace(
    ".bd-ai-compact-kind {",
    ".bd-ai-compact-row > div {\n  min-width: 0;\n  flex: 1 1 0;\n}\n\n.bd-ai-compact-kind {",
  );
}

if (!css.includes(".bd-ai-compact-row > small {\n    width: 100%;\n    max-width: none;")) {
  css = css.replace(
    "  .bd-ai-footer-actions,\n  .bd-ai-refresh {",
    "  .bd-ai-priority-meta,\n  .bd-ai-compact-row {\n    align-items: stretch;\n    flex-direction: column;\n  }\n\n  .bd-ai-compact-row > div {\n    width: 100%;\n  }\n\n  .bd-ai-compact-row > small {\n    width: 100%;\n    max-width: none;\n    text-align: left;\n  }\n\n  .bd-ai-footer-actions,\n  .bd-ai-refresh {",
  );
}

fs.writeFileSync(cssPath, css);
