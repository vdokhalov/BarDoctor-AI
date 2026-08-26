import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fragmentPath = new URL("./fragments/more-hub-v166.fragment.txt", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);

let source = readFileSync(bundlePath, "utf8");

const oldLogo = 'function bdVenueLogoV280({profile:e,size:t=64,previewUrl:n=""}){const[r,a]=S.useState(!1),s=n||e?.logoId?n||"/api/venues/logo/"+e.logoId:"",l=Use(e?.name||"Заведение");S.useEffect(()=>a(!1),[s]);return i.jsx("span",{className:"bd-venue-logo-v280",style:{"--bd-venue-logo-size":t+"px"},"aria-hidden":!0,children:s&&!r?i.jsx("img",{src:s,alt:"",width:t,height:t,onError:()=>a(!0)}):l})}';
const previousCanonicalLogo = 'function bdVenueLogoV280({profile:e,size:t=64,previewUrl:n="",className:r=""}){const[a,s]=S.useState(!1),l=n||e?.logoId?n||"/api/venues/logo/"+e.logoId:"",u=Use(e?.name||"Заведение");S.useEffect(()=>s(!1),[l]);return i.jsx("span",{className:"bd-venue-logo-v280"+(r?" "+r:""),style:{"--bd-venue-logo-size":t+"px"},"aria-hidden":!0,children:l&&!a?i.jsx("img",{src:l,alt:"",width:t,height:t,decoding:"async",onError:()=>s(!0)}):u})}';
const canonicalLogo = 'function bdCanonicalVenueIdentityV297(e){if(e&&Object.prototype.hasOwnProperty.call(e,"logoId"))return e;try{const t=localStorage.getItem("bd_session")||"session",n=JSON.parse(localStorage.getItem("bd_venue_context__"+t)||"null"),r=Number(localStorage.getItem("bd_active_venue_id"))||Number(n?.activeVenueId)||null,a=Array.isArray(n?.venues)?n.venues.find(s=>Number(s?.id)===r)||n.venues[0]||null:null;return a?{...a,...e,name:e?.name||a.name||"Заведение",logoId:a.logoId??null}:e||{name:"Заведение",logoId:null}}catch{return e||{name:"Заведение",logoId:null}}}function bdVenueLogoV280({profile:e,size:t=64,previewUrl:n="",className:r=""}){const a=bdCanonicalVenueIdentityV297(e),[s,l]=S.useState(!1),u=n||a?.logoId?n||"/api/venues/logo/"+a.logoId:"",d=Use(a?.name||"Заведение");S.useEffect(()=>l(!1),[u]);return i.jsx("span",{className:"bd-venue-logo-v280"+(r?" "+r:""),style:{"--bd-venue-logo-size":t+"px"},"aria-hidden":!0,children:u&&!s?i.jsx("img",{src:u,alt:"",width:t,height:t,decoding:"async",onError:()=>l(!0)}):d})}';
if (source.includes(oldLogo)) source = source.replace(oldLogo, canonicalLogo);
if (source.includes(previousCanonicalLogo)) source = source.replace(previousCanonicalLogo, canonicalLogo);
if (
  !source.includes("function bdCanonicalVenueIdentityV297(e)")
  || !source.includes('function bdVenueLogoV280({profile:e,size:t=64,previewUrl:n="",className:r=""})')
) throw new Error("Canonical venue logo component was not found");

const oldContextUpdate = '{...m,name:a?.name||m.name,currency:a?.currency||m.currency,hasProfile:!0}:m):null;f&&(u.venues=f,localStorage.setItem(l,JSON.stringify(u)),window.dispatchEvent(new CustomEvent("bd:venue-context-updated",{detail:{venueId:d}})))';
const canonicalContextUpdate = '{...m,name:a?.name||m.name,currency:a?.currency||m.currency,logoId:a?.logoId??null,hasProfile:!0}:m):null;f&&(u.venues=f,localStorage.setItem(l,JSON.stringify(u)),window.dispatchEvent(new CustomEvent("bd:venue-context",{detail:u})))';
if (source.includes(oldContextUpdate)) source = source.replace(oldContextUpdate, canonicalContextUpdate);
if (!source.includes(canonicalContextUpdate)) throw new Error("Canonical venue context update was not found");

const startMarker = "/* bd-more-hub-v166:start */";
const endMarker = "/* bd-more-hub-v166:end */";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("More hub anchors were not found");
const fragment = readFileSync(fragmentPath, "utf8").trim();
source = source.slice(0, start) + fragment + source.slice(end + endMarker.length);

if (!source.includes('i.jsx(bdVenueLogoV280,{profile:t,size:54,className:"bd-more-avatar-v166"})')) {
  throw new Error("More does not use the canonical venue logo component");
}

writeFileSync(bundlePath, source);

let bootstrap = readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes("20260826-venue-identity-v297")) {
  bootstrap = bootstrap.replace(
    "20260825-business-health-v284\";",
    "20260825-business-health-v284-20260826-venue-identity-v297\";",
  );
  writeFileSync(bootstrapPath, bootstrap);
}

console.log("Venue identity v297 patch applied");
