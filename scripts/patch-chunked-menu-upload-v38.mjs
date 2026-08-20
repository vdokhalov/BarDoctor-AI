import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const responsePath = new URL("../app/bar-doctor-response.ts", import.meta.url);

function replaceOnce(input, from, to, label) {
  const count = input.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return input.replace(from, to);
}

function replaceSegment(input, start, end, replacement, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  return input.slice(0, startIndex) + replacement + input.slice(endIndex);
}

function transformRange(input, start, end, transform, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  const current = input.slice(startIndex, endIndex);
  const next = transform(current);
  return input.slice(0, startIndex) + next + input.slice(endIndex);
}

const stagedUploadHelpers = String.raw`const bdMenuChunkUploadVersion="chunked-menu-v38",bdMenuPageTargetBytes=1572864;
async function bdCatalogDeleteFiles(e){for(const t of e)try{await fetch("/api/catalog/files/"+encodeURIComponent(t),{method:"DELETE"})}catch{}}
async function bdCatalogStageResponse(e,t){const n=await e.text();let r=null;try{r=n?JSON.parse(n):null}catch{}if(!e.ok||!r?.ok){if(e.status===413)throw new Error("Страница "+t+" не поместилась после автоматической подготовки. Повторите загрузку.");throw new Error(r?.error||"Не удалось загрузить страницу "+t)}return r}
async function bdCatalogStageImages(e,t,n){const r=[];try{for(let a=0;a<e.length;a++){typeof n==="function"&&n("Подготавливаю страницу "+(a+1)+" из "+e.length+"…");const s=e[a],l=await bdProcPrepareImage(s,{force:!0,targetBytes:bdMenuPageTargetBytes}),u=new FormData;u.append("file",l,bdUploadFileName(l,bdUploadFileName(s,"menu-"+(a+1)+".jpg"))),u.append("source",t),typeof n==="function"&&n("Загружаю страницу "+(a+1)+" из "+e.length+"…");const d=await fetch("/api/catalog/files",{method:"POST",body:u}),f=await bdCatalogStageResponse(d,a+1);r.push(f.file)}return r}catch(a){await bdCatalogDeleteFiles(r.map(s=>s.id));throw a}}
`;

const catalogUpload = String.raw`Z=async(p,c="upload")=>{const I=Array.isArray(p)?p:[p];if(!I.length||!L)return;k(c==="camera"?"Читаю фотографию меню…":c==="gallery"?"Готовлю "+I.length+" страниц меню…":"Распознаю меню и цены…");try{if(I.every(R=>bdClientImageInfo(R).isImage)){const R=await bdCatalogStageImages(I,c,k);try{k("Собираю "+I.length+" страниц в одно меню…");const G=await fetch("/api/catalog/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceFileIds:R.map(H=>H.id),source:c})}),H=await bdUploadResponseJson(G,"Не удалось распознать меню");m(H.draft)}catch(G){await bdCatalogDeleteFiles(R.map(H=>H.id));throw G}return}const R=I[0],G=new FormData;G.append("file",R,bdUploadFileName(R,"menu-file")),G.append("source",c);const H=await fetch("/api/catalog/import",{method:"POST",body:G}),J=await bdUploadResponseJson(H,"Не удалось распознать меню");m(J.draft)}catch(R){n({variant:"error",title:"Меню не распознано",description:R instanceof Error?R.message:"Попробуйте более чёткое фото или другой файл."})}finally{k("")}},`;

let bundle = readFileSync(bundlePath, "utf8");

if (bundle.includes('const bdImageUploadVersion="chunked-menu-v38"')) {
  bundle = replaceOnce(
    bundle,
    'const bdImageUploadVersion="chunked-menu-v38"',
    'const bdImageUploadVersion="payload-safe-v37"',
    "restore image preparation version",
  );
}

if (bundle.includes('const bdMenuUploadBatchVersion="chunked-menu-v38"')) {
  const start = bundle.indexOf('const bdMenuUploadBatchVersion="chunked-menu-v38"');
  const end = bundle.indexOf("function bdSuppliersPage(){", start);
  if (end < 0) throw new Error("duplicate batch helper end marker not found");
  bundle = bundle.slice(0, start) + bundle.slice(end);
}

if (!bundle.includes('const bdMenuChunkUploadVersion="chunked-menu-v38"')) {
  bundle = replaceOnce(
    bundle,
    "function bdSuppliersPage(){",
    stagedUploadHelpers + "function bdSuppliersPage(){",
    "staged menu upload helpers",
  );
} else {
  bundle = replaceSegment(
    bundle,
    'const bdMenuChunkUploadVersion="chunked-menu-v38"',
    "function bdSuppliersPage(){",
    stagedUploadHelpers,
    "refresh staged menu upload helpers",
  );
}

bundle = transformRange(
  bundle,
  "function bdCatalogPage(){",
  "const n_e=",
  (page) => replaceSegment(
    page,
    'Z=async(p,c="upload")=>',
    "Q=async p=>",
    catalogUpload,
    "catalog staged upload",
  ),
  "catalog page",
);

if (bundle.includes('const bdPhotoGalleryVersion="payload-safe-v37";')) {
  bundle = replaceOnce(
    bundle,
    'const bdPhotoGalleryVersion="payload-safe-v37";',
    'const bdPhotoGalleryVersion="chunked-menu-v38";',
    "photo gallery version",
  );
}

writeFileSync(bundlePath, bundle);

for (const path of [bootstrapPath, appHtmlPath, responsePath]) {
  const input = readFileSync(path, "utf8");
  if (input.includes("20260729-upload-payload-v37")) {
    writeFileSync(
      path,
      input.replaceAll("20260729-upload-payload-v37", "20260729-chunked-menu-v38"),
    );
  } else if (!input.includes("20260729-chunked-menu-v38")) {
    throw new Error(`${path.pathname}: cache version not found`);
  }
}

console.log("Applied one-page staging and unified menu recognition v38.");
