import fs from 'node:fs';
const asset='public/assets/index-BQGspy0I.js';let code=fs.readFileSync(asset,'utf8');
function replace(before,after){if(!code.includes(before)&&!code.includes(after))throw Error('Timezone patch anchor missing: '+before.slice(0,100));let start=0;while(true){const at=code.indexOf(before,start);if(at<0)break;if(code.slice(at,at+after.length)!==after)code=code.slice(0,at)+after+code.slice(at+before.length);start=at+after.length;}}
const helper='function bdVenueTimezoneReact({value:e,onChange:t,suggest:n}){const r=S.useRef(null),a=S.useRef(t);a.current=t;S.useEffect(()=>{const l=r.current;if(!l)return;const u=d=>a.current(d.detail);l.addEventListener("timezonechange",u);return()=>l.removeEventListener("timezonechange",u)},[]);S.useEffect(()=>{if(n&&!e){a.current(Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC");return}if(r.current)r.current.value=e||""},[e,n]);return i.jsx("bd-venue-timezone",{ref:r})}';
if(!code.includes('function bdVenueTimezoneReact('))replace('function bdVenueScheduleReact(',helper+'function bdVenueScheduleReact(');
replace('r=S.useRef(t),p=S.useRef(null);r.current=t;', 'r=S.useRef(t),p=S.useRef(null),v=S.useRef(e);r.current=t;v.current=e;');
replace('p.current=l.detail;r.current(l.detail)', 'p.current=l.detail;r.current({...v.current,...l.detail})');
replace('function bdVenueScheduleReact({value:e,onChange:t})','function bdVenueScheduleReact({value:e,onChange:t,suggestTimezone:bdSuggest})');
replace('return i.jsx("bd-venue-schedule",{ref:n})','return i.jsxs(i.Fragment,{children:[i.jsx(bdVenueTimezoneReact,{value:e.timezone,suggest:bdSuggest,onChange:bdZone=>r.current({...e,timezone:bdZone})}),i.jsx("bd-venue-schedule",{ref:n})]})');
replace('i.jsx(bdVenueScheduleReact,{value:e,onChange:n=>{t("openTime",n.openTime),t("closeTime",n.closeTime),t("workingDays",n.workingDays)}})','i.jsx(bdVenueScheduleReact,{value:e,suggestTimezone:!0,onChange:n=>{t("openTime",n.openTime),t("closeTime",n.closeTime),t("workingDays",n.workingDays),t("timezone",n.timezone)}})');
replace('openTime:b.openTime,closeTime:b.closeTime,workingDays:b.workingDays','openTime:b.openTime,closeTime:b.closeTime,workingDays:b.workingDays,timezone:b.timezone??N.timezone');
replace('openTime:C.openTime,closeTime:C.closeTime,workingDays:C.workingDays','openTime:C.openTime,closeTime:C.closeTime,workingDays:C.workingDays,timezone:C.timezone??N.timezone');
replace('function QCe(e){return e?{name:e.name,','function QCe(e){return e?{timezone:e.timezone||"",name:e.name,');
replace('openTime:a.openTime,closeTime:a.closeTime,areas:a.areas','openTime:a.openTime,closeTime:a.closeTime,timezone:a.timezone||void 0,areas:a.areas');
replace('openTime:u.openTime,closeTime:u.closeTime,workingDays:u.workingDays','openTime:u.openTime,closeTime:u.closeTime,workingDays:u.workingDays,timezone:u.timezone');
fs.writeFileSync(asset,code);
for(const path of ['public/app.html','app/bar-doctor-response.ts']){let s=fs.readFileSync(path,'utf8');if(!s.includes('/venue-timezone.js?v=venue-time-v456')){const marker='<script src="/venue-schedule.js';if(!s.includes(marker))throw Error('Timezone shell missing '+path);s=s.replace(marker,'<script src="/venue-timezone.js?v=venue-time-v456" defer></script>\n    '+marker);fs.writeFileSync(path,s);}}
console.log('Venue timezone setting applied');
