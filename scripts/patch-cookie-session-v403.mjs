import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(target, "utf8");

const replacements = [
  [
    'function xz(e,t){try{localStorage.setItem(_C,e),localStorage.setItem(mz,String(t))}catch{}}',
    'function xz(e,t){try{localStorage.removeItem(_C),localStorage.setItem(mz,String(t))}catch{}}',
  ],
  [
    'function gz(){try{return localStorage.getItem(_C)}catch{return null}}',
    'function gz(){return null}',
  ],
  [
    'function ca(e){const t=gz();return t?{"X-Session-Email":e,"X-Session-Token":t}:{}}',
    'function ca(){return{}}',
  ],
  [
    'async function bdLogoutSession(){const e=Ot();if(!e||!gz())return;try{await fetch(`${hz}/logout`,{method:"POST",headers:ca(e)})}catch{}}',
    'async function bdLogoutSession(){const e=Ot();if(!e)return;try{await fetch(`${hz}/logout`,{method:"POST",credentials:"include",headers:{"X-BarDoctor-Auth-Mode":"cookie-v1"}})}catch{}}',
  ],
  [
    'fetch(`${hz}/register`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})',
    'fetch(`${hz}/register`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","X-BarDoctor-Auth-Mode":"cookie-v1"},body:JSON.stringify(e)})',
  ],
  [
    'headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e.trim().toLowerCase(),password:t})',
    'headers:{"Content-Type":"application/json","X-BarDoctor-Auth-Mode":"cookie-v1"},body:JSON.stringify({email:e.trim().toLowerCase(),password:t})',
  ],
  [
    'if(!Ot()){a(!0);return}if(!gz()){sz(),yz(),window.location.replace("/".replace(/\\\/$/,"")+"/login");return}let f=!1;',
    'if(!Ot()){a(!0);return}let f=!1;',
  ],
  [
    'const a=localStorage.getItem("bd_session"),s=localStorage.getItem("bd_session_token");\n    if(!a||!s){r(null);return}\n    const l=new AbortController,u={Accept:"application/json","X-Session-Email":a,"X-Session-Token":s};',
    'const a=localStorage.getItem("bd_session");\n    if(!a){r(null);return}\n    const l=new AbortController,u={Accept:"application/json"};',
  ],
];

for (const [before, after] of replacements) {
  const matches = source.split(before).length - 1;
  if (matches !== 1) throw new Error(`Expected exactly one cookie-session match, found ${matches}`);
  source = source.replace(before, after);
}

source = `/* bd-cookie-session-v403 */\n${source}`;
await writeFile(target, source);
console.log("bd-cookie-session-v403: primary client moved to HttpOnly cookie auth");
