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

function transformRange(input, start, end, transform, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  const current = input.slice(startIndex, endIndex);
  const next = transform(current);
  return input.slice(0, startIndex) + next + input.slice(endIndex);
}

const imageUploadBlock = String.raw`const bdImageUploadVersion="payload-safe-v37",bdDirectImageTypes=new Set(["image/jpeg","image/png","image/webp","image/gif"]),bdUploadPayloadBudgetBytes=7864320,bdUploadSingleSourceLimitBytes=33554432;
function bdUploadFileName(e,t="photo.jpg"){const n=String(e?.name||e?.bdFileName||t).replace(/[\/\\\r\n\0]+/g,"_").trim();return(n||t).slice(0,180)}
function bdCanonicalClientImageType(e){const t=String(e||"").split(";")[0].trim().toLocaleLowerCase("en");return t==="image/jpg"||t==="image/pjpeg"?"image/jpeg":t}
function bdClientImageInfo(e){const t=bdUploadFileName(e),n=bdCanonicalClientImageType(e?.type),r=n.startsWith("image/")||/\.(?:jpe?g|png|webp|gif|heic|heif)$/i.test(t);return{name:t,type:n,isImage:r}}
function bdReadImageDataUrl(e){return new Promise((t,n)=>{const r=new FileReader;r.onload=()=>typeof r.result==="string"&&r.result?t(r.result):n(new Error("Фотография не прочитана.")),r.onerror=()=>n(new Error("Фотография не прочитана.")),r.onabort=()=>n(new Error("Чтение фотографии отменено."));try{r.readAsDataURL(e)}catch{n(new Error("Фотография не прочитана на этом устройстве."))}})}
function bdLoadUploadImage(e){return new Promise((t,n)=>{const r=new Image;r.onload=()=>t(r),r.onerror=()=>n(new Error("Формат фотографии не поддерживается браузером."));try{r.src=e}catch{n(new Error("Формат фотографии не поддерживается браузером."))}})}
function bdCanvasImageBlob(e,t){return new Promise((n,r)=>{try{e.toBlob(a=>a?n(a):r(new Error("Не удалось подготовить фотографию.")),"image/jpeg",t)}catch{r(new Error("Не удалось подготовить фотографию."))}})}
function bdUploadImageFile(e,t){try{return new File([e],t,{type:"image/jpeg",lastModified:Date.now()})}catch{return Object.defineProperty(e,"bdFileName",{value:t,configurable:!0}),e}}
async function bdProcPrepareImage(e,t={}){if(!e||typeof e!=="object")throw new Error("Файл фотографии не прочитан. Выберите его ещё раз.");const n=bdClientImageInfo(e);if(!n.isImage)return e;const r=Number(e.size)||0,a=Math.max(393216,Number(t.targetBytes)||1887436);if(r<=0)throw new Error("Фотография пуста. Выберите её ещё раз.");if(r>bdUploadSingleSourceLimitBytes)throw new Error("Одно исходное фото не должно превышать 32 МБ.");if(!t.force&&bdDirectImageTypes.has(n.type)&&r<=393216)return e;try{const s=await bdReadImageDataUrl(e),l=await bdLoadUploadImage(s),u=l.naturalWidth||l.width||0,d=l.naturalHeight||l.height||0,f=Math.max(u,d);if(!f)throw new Error("Фотография не содержит изображения.");const m=a<=720896?1700:a<=1258291?2000:2400;let h=Math.min(1,m/f),g=null;for(let y=0;y<5;y++){const j=document.createElement("canvas");j.width=Math.max(1,Math.round(u*h)),j.height=Math.max(1,Math.round(d*h));const v=j.getContext("2d");if(!v)throw new Error("Не удалось подготовить фотографию.");v.fillStyle="#fff",v.fillRect(0,0,j.width,j.height),v.drawImage(l,0,0,j.width,j.height);g=await bdCanvasImageBlob(j,[.86,.8,.74,.68,.62][y]);if(g.size<=a)break;h*=Math.min(.9,Math.max(.58,Math.sqrt(a/g.size)*.94))}if(!g)throw new Error("Не удалось подготовить фотографию.");if(r<=a&&g.size>=r)return e;if(g.size>a*1.15)throw new Error("Фотографию не удалось уменьшить до безопасного размера.");return bdUploadImageFile(g,n.name.replace(/\.[^.]+$/,"")+".jpg")}catch(s){if(bdDirectImageTypes.has(n.type)&&r<=a)return e;const l=s instanceof Error?s.message:"";if(l&&l!=="Формат фотографии не поддерживается браузером.")throw s;throw new Error("Формат фото не удалось обработать на iPhone. Сделайте снимок экрана или выберите версию JPG/PNG.")}}
async function bdProcPrepareImages(e){const t=Array.isArray(e)?e:[e],n=t.filter(r=>bdClientImageInfo(r).isImage);if(!n.length)return t;if(n.length!==t.length)throw new Error("Фотографии и файлы других типов загружайте отдельно.");const r=Math.max(393216,Math.floor((bdUploadPayloadBudgetBytes-65536)/n.length)),a=Math.min(1887436,r),s=[];for(const l of t)s.push(await bdProcPrepareImage(l,{force:n.length>1||Number(l.size)>393216,targetBytes:a}));const u=s.reduce((l,d)=>l+(Number(d.size)||0),0);if(u>bdUploadPayloadBudgetBytes)throw new Error("Фотографии всё ещё слишком велики. Выберите меньше страниц за один раз.");return s}
async function bdUploadResponseJson(e,t){const n=await e.text();let r=null;try{r=n?JSON.parse(n):null}catch{}if(!e.ok||!r?.ok){if(e.status===413)throw new Error("Фотографии слишком велики для одной загрузки. Выберите меньше страниц и повторите.");throw new Error(r?.error||t)}return r}
`;

let bundle = readFileSync(bundlePath, "utf8");

if (!bundle.includes('const bdImageUploadVersion="payload-safe-v37"')) {
  const start = bundle.indexOf('const bdImageUploadVersion="ios-safe-v36"');
  const end = bundle.indexOf("function bdSuppliersPage(){", start);
  if (start < 0 || end < 0) {
    throw new Error("image upload block: v36 source not found");
  }
  bundle = bundle.slice(0, start) + imageUploadBlock + bundle.slice(end);
}

bundle = transformRange(
  bundle,
  "function bdSuppliersPage(){",
  'const bdPhotoGalleryVersion="image-upload-v36";',
  (page) => {
    let next = page;
    if (next.includes("const Y=[];for(const J of R)Y.push(await bdProcPrepareImage(J));")) {
      next = replaceOnce(
        next,
        "const Y=[];for(const J of R)Y.push(await bdProcPrepareImage(J));",
        "const Y=await bdProcPrepareImages(R);",
        "supplier image batch preparation",
      );
    }
    if (next.includes('const oe=await fetch("/api/purchases/scan",{method:"POST",body:ie}),ue=await oe.json();if(!oe.ok||!ue.ok)throw new Error(ue.error||"Не удалось распознать документ");')) {
      next = replaceOnce(
        next,
        'const oe=await fetch("/api/purchases/scan",{method:"POST",body:ie}),ue=await oe.json();if(!oe.ok||!ue.ok)throw new Error(ue.error||"Не удалось распознать документ");',
        'const oe=await fetch("/api/purchases/scan",{method:"POST",body:ie}),ue=await bdUploadResponseJson(oe,"Не удалось распознать документ");',
        "supplier upload response",
      );
    }
    if (!next.includes("const Y=await bdProcPrepareImages(R);")) {
      throw new Error("supplier image batch preparation: v37 source not found");
    }
    if (!next.includes('ue=await bdUploadResponseJson(oe,"Не удалось распознать документ")')) {
      throw new Error("supplier upload response: v37 source not found");
    }
    return next;
  },
  "supplier page",
);

if (bundle.includes('const bdPhotoGalleryVersion="image-upload-v36";')) {
  bundle = replaceOnce(
    bundle,
    'const bdPhotoGalleryVersion="image-upload-v36";',
    'const bdPhotoGalleryVersion="payload-safe-v37";',
    "photo gallery version",
  );
}

bundle = transformRange(
  bundle,
  "function bdCatalogPage(){",
  "const n_e=",
  (page) => {
    let next = page;
    if (next.includes("const R=[];for(const W of I)R.push(await bdProcPrepareImage(W));")) {
      next = replaceOnce(
        next,
        "const R=[];for(const W of I)R.push(await bdProcPrepareImage(W));",
        "const R=await bdProcPrepareImages(I);",
        "catalog image batch preparation",
      );
    }
    if (next.includes('const H=await fetch("/api/catalog/import",{method:"POST",body:G}),J=await H.json();if(!H.ok||!J.ok)throw new Error(J.error||"Не удалось распознать меню");')) {
      next = replaceOnce(
        next,
        'const H=await fetch("/api/catalog/import",{method:"POST",body:G}),J=await H.json();if(!H.ok||!J.ok)throw new Error(J.error||"Не удалось распознать меню");',
        'const H=await fetch("/api/catalog/import",{method:"POST",body:G}),J=await bdUploadResponseJson(H,"Не удалось распознать меню");',
        "catalog upload response",
      );
    }
    if (!next.includes("const R=await bdProcPrepareImages(I);")) {
      throw new Error("catalog image batch preparation: v37 source not found");
    }
    if (!next.includes('J=await bdUploadResponseJson(H,"Не удалось распознать меню")')) {
      throw new Error("catalog upload response: v37 source not found");
    }
    return next;
  },
  "catalog page",
);

writeFileSync(bundlePath, bundle);

for (const path of [bootstrapPath, appHtmlPath, responsePath]) {
  const input = readFileSync(path, "utf8");
  if (input.includes("20260729-image-upload-v36")) {
    writeFileSync(
      path,
      input.replaceAll("20260729-image-upload-v36", "20260729-upload-payload-v37"),
    );
  } else if (!input.includes("20260729-upload-payload-v37")) {
    throw new Error(`${path.pathname}: cache version not found`);
  }
}

console.log("Applied upload payload safety v37.");
