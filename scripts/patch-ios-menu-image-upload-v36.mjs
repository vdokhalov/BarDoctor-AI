import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const responsePath = new URL("../app/bar-doctor-response.ts", import.meta.url);

function replaceOnce(input, from, to, label) {
  const first = input.indexOf(from);
  if (first < 0) throw new Error(`${label}: source not found`);
  if (input.indexOf(from, first + from.length) >= 0) {
    throw new Error(`${label}: source is not unique`);
  }
  return input.slice(0, first) + to + input.slice(first + from.length);
}

let bundle = readFileSync(bundlePath, "utf8");

const previousImagePreparation = String.raw`async function bdProcPrepareImage(e){if(!String(e.type||"").startsWith("image/"))return e;return await new Promise(t=>{const n=URL.createObjectURL(e),r=new Image;r.onload=()=>{try{const a=1900,s=Math.min(1,a/Math.max(r.naturalWidth,r.naturalHeight)),l=document.createElement("canvas");l.width=Math.max(1,Math.round(r.naturalWidth*s)),l.height=Math.max(1,Math.round(r.naturalHeight*s));const u=l.getContext("2d");if(!u)throw new Error("canvas");u.drawImage(r,0,0,l.width,l.height),l.toBlob(d=>{URL.revokeObjectURL(n),d?t(new File([d],e.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg",lastModified:Date.now()})):t(e)},"image/jpeg",.88)}catch{URL.revokeObjectURL(n),t(e)}},r.onerror=()=>{URL.revokeObjectURL(n),t(e)},r.src=n})}`;

const robustImagePreparation = String.raw`const bdImageUploadVersion="ios-safe-v36",bdDirectImageTypes=new Set(["image/jpeg","image/png","image/webp","image/gif"]);
function bdUploadFileName(e,t="photo.jpg"){const n=String(e?.name||e?.bdFileName||t).replace(/[\/\\\r\n\0]+/g,"_").trim();return(n||t).slice(0,180)}
function bdCanonicalClientImageType(e){const t=String(e||"").split(";")[0].trim().toLocaleLowerCase("en");return t==="image/jpg"||t==="image/pjpeg"?"image/jpeg":t}
function bdReadImageDataUrl(e){return new Promise((t,n)=>{const r=new FileReader;r.onload=()=>typeof r.result==="string"&&r.result?t(r.result):n(new Error("Фотография не прочитана.")),r.onerror=()=>n(new Error("Фотография не прочитана.")),r.onabort=()=>n(new Error("Чтение фотографии отменено."));try{r.readAsDataURL(e)}catch{n(new Error("Фотография не прочитана на этом устройстве."))}})}
function bdLoadUploadImage(e){return new Promise((t,n)=>{const r=new Image;r.onload=()=>t(r),r.onerror=()=>n(new Error("Формат фотографии не поддерживается браузером."));try{r.src=e}catch{n(new Error("Формат фотографии не поддерживается браузером."))}})}
function bdCanvasImageBlob(e){return new Promise((t,n)=>{try{e.toBlob(r=>r?t(r):n(new Error("Не удалось подготовить фотографию.")),"image/jpeg",.88)}catch{n(new Error("Не удалось подготовить фотографию."))}})}
async function bdProcPrepareImage(e){if(!e||typeof e!=="object")throw new Error("Файл фотографии не прочитан. Выберите его ещё раз.");const t=bdUploadFileName(e),n=bdCanonicalClientImageType(e.type),r=n.startsWith("image/")||/\.(?:jpe?g|png|webp|gif|heic|heif)$/i.test(t);if(!r)return e;if(Number(e.size)>12582912)throw new Error("Одно фото не должно превышать 12 МБ.");if(bdDirectImageTypes.has(n)&&Number(e.size)<=8388608)return e;try{const a=await bdReadImageDataUrl(e),s=await bdLoadUploadImage(a),l=Math.max(s.naturalWidth||s.width||0,s.naturalHeight||s.height||0);if(!l)throw new Error("Фотография не содержит изображения.");const u=1900,d=Math.min(1,u/l),f=document.createElement("canvas");f.width=Math.max(1,Math.round((s.naturalWidth||s.width)*d)),f.height=Math.max(1,Math.round((s.naturalHeight||s.height)*d));const m=f.getContext("2d");if(!m)throw new Error("Не удалось подготовить фотографию.");m.drawImage(s,0,0,f.width,f.height);const h=await bdCanvasImageBlob(f),g=t.replace(/\.[^.]+$/,"")+".jpg";try{return new File([h],g,{type:"image/jpeg",lastModified:Date.now()})}catch{return Object.defineProperty(h,"bdFileName",{value:g,configurable:!0}),h}}catch(a){if(bdDirectImageTypes.has(n))return e;throw new Error("Формат фото не удалось обработать на iPhone. Сделайте снимок экрана или выберите версию JPG/PNG.")}}`;

if (bundle.includes(previousImagePreparation)) {
  bundle = replaceOnce(
    bundle,
    previousImagePreparation,
    robustImagePreparation,
    "iOS-safe image preparation",
  );
} else if (bundle.includes(`async ${robustImagePreparation}`)) {
  bundle = replaceOnce(
    bundle,
    `async ${robustImagePreparation}`,
    robustImagePreparation,
    "repair interrupted image preparation",
  );
} else if (!bundle.includes(robustImagePreparation)) {
  throw new Error("iOS-safe image preparation: neither old nor new source found");
}

if (bundle.includes('const bdPhotoGalleryVersion="gallery-v35";')) {
  bundle = replaceOnce(
    bundle,
    'const bdPhotoGalleryVersion="gallery-v35";',
    'const bdPhotoGalleryVersion="image-upload-v36";',
    "gallery implementation version",
  );
} else if (!bundle.includes('const bdPhotoGalleryVersion="image-upload-v36";')) {
  throw new Error("gallery implementation version: expected marker not found");
}

const purchaseUploadBefore = 'for(const J of Y)ie.append("files",J);';
const purchaseUploadAfter = 'for(let J=0;J<Y.length;J++){const iee=Y[J];ie.append("files",iee,bdUploadFileName(iee,bdUploadFileName(R[J],"document-"+(J+1)+".jpg")))}';
if (bundle.includes(purchaseUploadBefore)) {
  bundle = replaceOnce(
    bundle,
    purchaseUploadBefore,
    purchaseUploadAfter,
    "purchase upload filenames",
  );
} else if (!bundle.includes(purchaseUploadAfter)) {
  throw new Error("purchase upload filenames: expected source not found");
}

const menuUploadBefore = 'for(const W of R)G.append("files",W);';
const menuUploadAfter = 'for(let W=0;W<R.length;W++){const Gee=R[W];G.append("files",Gee,bdUploadFileName(Gee,bdUploadFileName(I[W],"menu-"+(W+1)+".jpg")))}';
if (bundle.includes(menuUploadBefore)) {
  bundle = replaceOnce(
    bundle,
    menuUploadBefore,
    menuUploadAfter,
    "menu upload filenames",
  );
} else if (!bundle.includes(menuUploadAfter)) {
  throw new Error("menu upload filenames: expected source not found");
}

writeFileSync(bundlePath, bundle);

for (const path of [bootstrapPath, appHtmlPath, responsePath]) {
  const input = readFileSync(path, "utf8");
  if (input.includes("gallery-v35")) {
    writeFileSync(path, input.replaceAll("gallery-v35", "image-upload-v36"));
  } else if (!input.includes("image-upload-v36")) {
    throw new Error(`${path.pathname}: cache version not found`);
  }
}

console.log("Applied iOS-safe menu image upload v36.");
