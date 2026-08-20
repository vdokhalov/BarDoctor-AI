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

const progressiveHelpers = String.raw`const bdMenuChunkUploadVersion="progressive-ocr-v39",bdMenuPageTargetBytes=1572864,bdMenuRecognitionBatchSize=2,bdMenuRecognitionConcurrency=2;
async function bdCatalogDeleteFiles(e){for(const t of e)try{await fetch("/api/catalog/files/"+encodeURIComponent(t),{method:"DELETE"})}catch{}}
async function bdCatalogStageResponse(e,t){const n=await e.text();let r=null;try{r=n?JSON.parse(n):null}catch{}if(!e.ok||!r?.ok){if(e.status===413)throw new Error("Страница "+t+" не поместилась после автоматической подготовки. Повторите загрузку.");throw new Error(r?.error||"Не удалось загрузить страницу "+t)}return r}
async function bdCatalogStageImages(e,t,n){const r=[];try{for(let a=0;a<e.length;a++){typeof n==="function"&&n("Подготавливаю страницу "+(a+1)+" из "+e.length+"…");const s=e[a],l=await bdProcPrepareImage(s,{force:!0,targetBytes:bdMenuPageTargetBytes}),u=new FormData;u.append("file",l,bdUploadFileName(l,bdUploadFileName(s,"menu-"+(a+1)+".jpg"))),u.append("source",t),typeof n==="function"&&n("Загружаю страницу "+(a+1)+" из "+e.length+"…");const d=await fetch("/api/catalog/files",{method:"POST",body:u}),f=await bdCatalogStageResponse(d,a+1);r.push(f.file)}return r}catch(a){await bdCatalogDeleteFiles(r.map(s=>s.id));throw a}}
async function bdCatalogJsonResponse(e,t){const n=await e.text();let r=null;try{r=n?JSON.parse(n):null}catch{}if(!e.ok||!r?.ok){const a=new Error(r?.error||t);a.status=e.status;throw a}return r}
async function bdCatalogRequest(e,t,n){let r=null;for(let a=0;a<2;a++)try{const s=await fetch("/api/catalog/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!s.ok&&[502,503,504].includes(s.status)&&a===0)continue;return await bdCatalogJsonResponse(s,t)}catch(s){r=s;if(a===0&&(s instanceof TypeError||[502,503,504].includes(Number(s?.status))))continue;break}if(r instanceof Error&&!/Load failed/i.test(r.message))throw r;throw new Error(n||t)}
async function bdCatalogRecogniseImages(e,t,n){const r=[];for(let a=0;a<e.length;a+=bdMenuRecognitionBatchSize)r.push({files:e.slice(a,a+bdMenuRecognitionBatchSize),start:a+1});const s=new Array(r.length);let l=0,u=0,d=null;async function f(){for(;;){if(d)return;const m=l++;if(m>=r.length)return;const h=r[m],g=h.start+h.files.length-1;try{typeof n==="function"&&n("Распознаю страницы "+h.start+"–"+g+" из "+e.length+"…");const y=await bdCatalogRequest({action:"recognise-batch",sourceFileIds:h.files.map(j=>j.id),source:t,pageStart:h.start,pageTotal:e.length},"Не удалось распознать страницы "+h.start+"–"+g,"Связь прервалась при распознавании страниц "+h.start+"–"+g+". Повторите загрузку.");s[m]=y.part,u++,typeof n==="function"&&n("Распознано "+u+" из "+r.length+" частей меню…")}catch(y){d=y;return}}}await Promise.all(Array.from({length:Math.min(bdMenuRecognitionConcurrency,r.length)},()=>f()));if(d)throw d;typeof n==="function"&&n("Объединяю "+e.length+" страниц в одно меню…");const m=await bdCatalogRequest({action:"merge-batches",sourceFileIds:e.map(h=>h.id),source:t,parts:s},"Не удалось объединить распознанные страницы","Связь прервалась при сборке меню. Повторите загрузку.");return m.draft}
`;

const catalogUpload = String.raw`Z=async(p,c="upload")=>{const I=Array.isArray(p)?p:[p];if(!I.length||!L)return;k(c==="camera"?"Читаю фотографию меню…":c==="gallery"?"Готовлю "+I.length+" страниц меню…":"Распознаю меню и цены…");try{if(I.every(R=>bdClientImageInfo(R).isImage)){const R=await bdCatalogStageImages(I,c,k);try{const G=await bdCatalogRecogniseImages(R,c,k);m(G)}catch(G){await bdCatalogDeleteFiles(R.map(H=>H.id));throw G}return}const R=I[0],G=new FormData;G.append("file",R,bdUploadFileName(R,"menu-file")),G.append("source",c);const H=await fetch("/api/catalog/import",{method:"POST",body:G}),J=await bdUploadResponseJson(H,"Не удалось распознать меню");m(J.draft)}catch(R){n({variant:"error",title:"Меню не распознано",description:R instanceof Error?R.message:"Попробуйте более чёткое фото или другой файл."})}finally{k("")}},`;

let bundle = readFileSync(bundlePath, "utf8");

bundle = replaceSegment(
  bundle,
  'const bdMenuChunkUploadVersion="chunked-menu-v38"',
  "function bdSuppliersPage(){",
  progressiveHelpers,
  "progressive menu helpers",
);

bundle = transformRange(
  bundle,
  "function bdCatalogPage(){",
  "const n_e=",
  (page) => replaceSegment(
    page,
    'Z=async(p,c="upload")=>',
    "Q=async p=>",
    catalogUpload,
    "catalog progressive recognition",
  ),
  "catalog page",
);

bundle = replaceOnce(
  bundle,
  'const bdPhotoGalleryVersion="chunked-menu-v38";',
  'const bdPhotoGalleryVersion="progressive-ocr-v39";',
  "photo gallery version",
);

writeFileSync(bundlePath, bundle);

for (const path of [bootstrapPath, appHtmlPath, responsePath]) {
  const input = readFileSync(path, "utf8");
  writeFileSync(
    path,
    input.replaceAll(
      "20260729-chunked-menu-v38",
      "20260729-progressive-ocr-v39",
    ),
  );
}

console.log("Applied progressive multi-request menu recognition v39.");
