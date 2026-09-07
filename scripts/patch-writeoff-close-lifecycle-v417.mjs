import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marker = "20260907-writeoff-close-lifecycle-v417";
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const fragmentPath = path.join(root, "scripts/fragments/writeoff-workflow-v271.fragment.txt");
const versionTargets = [
  "app/bar-doctor-response.ts",
  "public/app.html",
  "public/bardoctor-preview.js",
];

function patchWorkspace(source, label) {
  const start = source.indexOf("function bdWriteoffWorkspaceV271");
  const endAnchor = source.indexOf("function bdWarehouseNavigationUrlV247", start);
  const end = endAnchor >= 0 ? endAnchor : source.length;
  if (start < 0) throw new Error(`${marker}: write-off workspace missing in ${label}`);

  let workspace = source.slice(start, end);
  if (!workspace.includes("bdWriteoffSheetOpenV417")) {
    const replacements = [
      [
        ',N=b.get("writeoff"),E=',
        ',N=b.get("writeoff"),[bdWriteoffSheetOpenV417,bdSetWriteoffSheetOpenV417]=S.useState(()=>N==="new"),E=',
      ],
      [
        "S.useEffect(()=>{T()},[]),S.useEffect(()=>{const A=()=>",
        'S.useEffect(()=>{T()},[]),S.useEffect(()=>{bdSetWriteoffSheetOpenV417(N==="new")},[N]),S.useEffect(()=>{const A=()=>',
      ],
      [
        'function x(){a(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}),{replace:!0})}',
        'function x(){bdSetWriteoffSheetOpenV417(!1),a(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}),{replace:!0})}',
      ],
      [
        'onClick:()=>a(bdWarehouseNavigationUrlV247({writeoff:"new",tab:"writeoffs"}))',
        'onClick:()=>{bdSetWriteoffSheetOpenV417(!0),a(bdWarehouseNavigationUrlV247({writeoff:"new",tab:"writeoffs"}))}',
      ],
      [
        'N==="new"&&n&&i.jsx(bdWriteoffSheet',
        'N==="new"&&n&&bdWriteoffSheetOpenV417&&i.jsx(bdWriteoffSheet',
      ],
    ];

    for (const [before, after] of replacements) {
      if (!workspace.includes(before)) throw new Error(`${marker}: anchor missing in ${label}: ${before}`);
      workspace = workspace.replaceAll(before, after);
    }
  }

  const required = [
    'S.useState(()=>N==="new")',
    'bdSetWriteoffSheetOpenV417(N==="new")},[N]',
    'function x(){bdSetWriteoffSheetOpenV417(!1),a(',
    'onClick:()=>{bdSetWriteoffSheetOpenV417(!0),a(',
    'N==="new"&&n&&bdWriteoffSheetOpenV417&&i.jsx(bdWriteoffSheet',
  ];
  for (const token of required) {
    if (!workspace.includes(token)) throw new Error(`${marker}: lifecycle invariant missing in ${label}: ${token}`);
  }

  return source.slice(0, start) + workspace + source.slice(end);
}

for (const [filePath, label] of [[fragmentPath, "canonical fragment"], [bundlePath, "client bundle"]]) {
  const source = fs.readFileSync(filePath, "utf8");
  fs.writeFileSync(filePath, patchWorkspace(source, label));
}

for (const relativePath of versionTargets) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const next = source.replace(
    /index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g,
    (match, version) => version.includes(marker) ? match : `${match}-${marker}`,
  );
  if (!next.includes(marker)) throw new Error(`${marker}: client asset reference missing in ${relativePath}`);
  fs.writeFileSync(filePath, next);
}

console.log(`${marker}: applied`);
