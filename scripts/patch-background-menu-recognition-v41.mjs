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

const backgroundHelpers = String.raw`const bdMenuChunkUploadVersion="background-menu-v41",bdMenuPageTargetBytes=1572864,bdMenuRecognitionBatchSize=1,bdMenuRecognitionConcurrency=2,bdMenuPollIntervalMs=1800,bdMenuPollDeadlineMs=480000;
async function bdCatalogDeleteFiles(e){for(const t of e)try{await fetch("/api/catalog/files/"+encodeURIComponent(t),{method:"DELETE"})}catch{}}
async function bdCatalogStageResponse(e,t){const n=await e.text();let r=null;try{r=n?JSON.parse(n):null}catch{}if(!e.ok||!r?.ok){if(e.status===413)throw new Error("Страница "+t+" не поместилась после автоматической подготовки. Повторите загрузку.");throw new Error(r?.error||"Не удалось загрузить страницу "+t)}return r}
async function bdCatalogStageImages(e,t,n){const r=[];try{for(let a=0;a<e.length;a++){typeof n==="function"&&n("Подготавливаю страницу "+(a+1)+" из "+e.length+"…");const s=e[a],l=await bdProcPrepareImage(s,{force:!0,targetBytes:bdMenuPageTargetBytes}),u=new FormData;u.append("file",l,bdUploadFileName(l,bdUploadFileName(s,"menu-"+(a+1)+".jpg"))),u.append("source",t),typeof n==="function"&&n("Загружаю страницу "+(a+1)+" из "+e.length+"…");const d=await fetch("/api/catalog/files",{method:"POST",body:u}),f=await bdCatalogStageResponse(d,a+1);r.push(f.file)}return r}catch(a){await bdCatalogDeleteFiles(r.map(s=>s.id));throw a}}
async function bdCatalogJsonResponse(e,t){const n=await e.text();let r=null;try{r=n?JSON.parse(n):null}catch{}if(!e.ok||!r?.ok){const a=new Error(r?.error||t);a.status=e.status,a.code=r?.code||"";throw a}return r}
function bdCatalogWait(e){return new Promise(t=>setTimeout(t,e))}
async function bdCatalogPollJob(e,t,n){const r=Date.now()+bdMenuPollDeadlineMs;let a=0;while(Date.now()<r){await bdCatalogWait(bdMenuPollIntervalMs);try{const s=await fetch("/api/catalog/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"poll-recognition",jobId:e})});if(s.status===202){a=0;continue}if(!s.ok&&[502,503,504].includes(s.status)&&a++<3)continue;return await bdCatalogJsonResponse(s,t)}catch(s){if((s instanceof TypeError||[502,503,504].includes(Number(s?.status)))&&a++<3)continue;if(s instanceof Error&&!/Load failed/i.test(s.message))throw s;throw new Error(n||t)}}throw new Error("Распознавание страницы заняло больше восьми минут. Повторите загрузку позже.")}
async function bdCatalogRequest(e,t,n){let r=null;for(let a=0;a<2;a++)try{const s=await fetch("/api/catalog/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!s.ok&&[502,503,504].includes(s.status)&&a===0)continue;const l=await bdCatalogJsonResponse(s,t);return l?.jobId?await bdCatalogPollJob(l.jobId,t,n):l}catch(s){r=s;if(a===0&&(s instanceof TypeError||[502,503,504].includes(Number(s?.status))))continue;break}if(r instanceof Error&&!/Load failed/i.test(r.message))throw r;throw new Error(n||t)}
function bdCatalogSplitRecognitionError(e){return Number(e?.status)===422&&["AI_RESPONSE_FORMAT","AI_OUTPUT_INCOMPLETE"].includes(String(e?.code||""))}
async function bdCatalogRecogniseImages(e,t,n){const r=[];for(let a=0;a<e.length;a+=bdMenuRecognitionBatchSize)r.push({files:e.slice(a,a+bdMenuRecognitionBatchSize),start:a+1});const s=new Array(r.length);let l=0,u=0,d=null;async function f(){for(;;){if(d)return;const m=l++;if(m>=r.length)return;const h=r[m],g=h.start+h.files.length-1,y=h.files.length===1?"Распознаю страницу "+h.start+" из "+e.length+"…":"Распознаю страницы "+h.start+"–"+g+" из "+e.length+"…";try{typeof n==="function"&&n(y);const j=await bdCatalogRequest({action:"recognise-batch",sourceFileIds:h.files.map(v=>v.id),source:t,pageStart:h.start,pageTotal:e.length},"Не удалось распознать страницу "+h.start,"Связь прервалась при распознавании страницы "+h.start+". Повторите загрузку.");s[m]=[j.part],u+=h.files.length,typeof n==="function"&&n("Распознано "+u+" из "+e.length+" страниц меню…")}catch(j){if(h.files.length>1&&bdCatalogSplitRecognitionError(j)){const v=[];try{for(let b=0;b<h.files.length;b++){const N=h.start+b;typeof n==="function"&&n("Уточняю страницу "+N+" из "+e.length+"…");const E=await bdCatalogRequest({action:"recognise-batch",sourceFileIds:[h.files[b].id],source:t,pageStart:N,pageTotal:e.length},"Не удалось распознать страницу "+N,"Связь прервалась при распознавании страницы "+N+". Повторите загрузку.");v.push(E.part),u++,typeof n==="function"&&n("Распознано "+u+" из "+e.length+" страниц меню…")}s[m]=v}catch(b){d=b;return}}else{d=j;return}}}}await Promise.all(Array.from({length:Math.min(bdMenuRecognitionConcurrency,r.length)},()=>f()));if(d)throw d;const m=s.flat().filter(Boolean);typeof n==="function"&&n("Объединяю "+e.length+" страниц в одно меню…");const h=await bdCatalogRequest({action:"merge-batches",sourceFileIds:e.map(g=>g.id),source:t,parts:m},"Не удалось объединить распознанные страницы","Связь прервалась при сборке меню. Повторите загрузку.");return h.draft}
`;

let bundle = readFileSync(bundlePath, "utf8");

bundle = replaceSegment(
  bundle,
  'const bdMenuChunkUploadVersion="structured-menu-v40"',
  "function bdSuppliersPage(){",
  backgroundHelpers,
  "background menu helpers",
);

bundle = replaceOnce(
  bundle,
  'const bdPhotoGalleryVersion="structured-menu-v40";',
  'const bdPhotoGalleryVersion="background-menu-v41";',
  "photo gallery version",
);

writeFileSync(bundlePath, bundle);

for (const path of [bootstrapPath, appHtmlPath, responsePath]) {
  const input = readFileSync(path, "utf8");
  writeFileSync(
    path,
    input.replaceAll(
      "20260729-structured-menu-v40",
      "20260729-background-menu-v41",
    ),
  );
}

console.log("Applied asynchronous background menu recognition v41.");
