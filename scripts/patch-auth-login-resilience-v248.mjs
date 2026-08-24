import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const responsePath = new URL("../app/bar-doctor-response.ts", import.meta.url);

const versionMarker = 'const bdAuthLoginVersionV248="auth-login-v248";';
const cacheSuffix = "-20260823-auth-login-v248";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  const second = source.indexOf(before, first + 1);
  if (first < 0 || second >= 0) {
    throw new Error(`${label}: expected exactly one match`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let bundle = fs.readFileSync(bundlePath, "utf8");
if (!bundle.includes(versionMarker)) {
  const oldRequest = 'async function Rse(e,t){try{return await(await fetch(`${hz}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e.trim().toLowerCase(),password:t})})).json()}catch{return{ok:!1,error:"Нет соединения с сервером. Проверьте интернет."}}}';
  const resilientRequest = `${versionMarker}function bdAuthHomeTargetV248(){const e=new URLSearchParams(window.location.search).get("venue");return e&&/^\\d+$/.test(e)?"/home?venue="+encodeURIComponent(e):"/home"}function bdAuthCompleteLoginV248(){const e=bdAuthHomeTargetV248();try{window.history.replaceState(window.history.state,"",e),window.location.reload()}catch{window.location.assign(e)}}async function Rse(e,t){const n=new AbortController,r=setTimeout(()=>n.abort(),15e3);try{const a=await fetch(\`\${hz}/login\`,{method:"POST",credentials:"include",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e.trim().toLowerCase(),password:t}),signal:n.signal}),s=await a.json();return a.ok&&s?.ok?s:{ok:!1,error:s?.error||"Не удалось выполнить вход. Попробуйте ещё раз."}}catch(a){return{ok:!1,error:a?.name==="AbortError"?"Вход занял слишком много времени. Попробуйте ещё раз.":"Нет соединения с сервером. Проверьте интернет."}}finally{clearTimeout(r)}}`;
  bundle = replaceOnce(bundle, oldRequest, resilientRequest, "login request helper");

  const oldSubmit = 'async function g(){const y=t.trim();if(!(!y||!r)){m(""),d(!0);try{const j=await Rse(y,r);if(!j.ok){m(j.error),d(!1);return}iz(j.email),xz(j.token,j.userId),j.firstName&&Fg({firstName:j.firstName,lastName:j.lastName??void 0,email:j.email,phone:j.phone??void 0,role:j.role??"owner"});const v="/".replace(/\\/$/,"");window.location.replace(v+"/home")}catch{m("Произошла ошибка. Попробуйте ещё раз."),d(!1)}}}';
  const resilientSubmit = 'async function g(){const y=t.trim();if(!(!y||!r)){m(""),d(!0);try{const j=await Rse(y,r);if(!j.ok){m(j.error||"Не удалось выполнить вход. Попробуйте ещё раз.");return}iz(j.email||y),j.token&&j.userId&&xz(j.token,j.userId),j.firstName&&Fg({firstName:j.firstName,lastName:j.lastName??void 0,email:j.email||y,phone:j.phone??void 0,role:j.role??"owner"}),bdAuthCompleteLoginV248()}catch{m("Произошла ошибка. Попробуйте ещё раз.")}finally{d(!1)}}}';
  bundle = replaceOnce(bundle, oldSubmit, resilientSubmit, "login submit handler");
  fs.writeFileSync(bundlePath, bundle);
}

let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes("bd-auth-single-read-v248")) {
  const oldAuthResponse = `      return pendingResponse.then(function (response) {
        response.clone().json().then(function (result) {
          rememberAccessContext(result);
          if (result && result.ok && result.joinedVenue) {
            sessionStorage.removeItem("bd_pending_invite_code");
          }
        }).catch(function () {});
        return response;
      });`;
  const singleReadResponse = `      // bd-auth-single-read-v248: consume the auth body once. Response.clone()
      // could leave both readers waiting indefinitely in embedded browsers.
      return pendingResponse.then(function (response) {
        return response.text().then(function (body) {
          try {
            var result = JSON.parse(body);
            rememberAccessContext(result);
            if (result && result.ok && result.joinedVenue) {
              sessionStorage.removeItem("bd_pending_invite_code");
            }
          } catch {
            // The caller will surface malformed auth responses.
          }
          return new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        });
      });`;
  bootstrap = replaceOnce(bootstrap, oldAuthResponse, singleReadResponse, "auth response interceptor");
}
if (!bootstrap.includes(cacheSuffix)) {
  bootstrap = replaceOnce(
    bootstrap,
    'script.src = "/assets/index-BQGspy0I.js?v=20260821-inventory-reconciliation-v224-user-display-units-v236-purchase-units-v237-collapsed-tree-v239-accounting-currency-v243-warehouse-valuation-v244-inventory-workflow-v245-inventory-layer-v246";',
    `script.src = "/assets/index-BQGspy0I.js?v=20260821-inventory-reconciliation-v224-user-display-units-v236-purchase-units-v237-collapsed-tree-v239-accounting-currency-v243-warehouse-valuation-v244-inventory-workflow-v245-inventory-layer-v246${cacheSuffix}";`,
    "application bundle cache token",
  );
}
fs.writeFileSync(bootstrapPath, bootstrap);

for (const path of [appHtmlPath, responsePath]) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(cacheSuffix)) continue;
  source = replaceOnce(
    source,
    "-20260822-navigation-v247\"></script>",
    `-20260822-navigation-v247${cacheSuffix}\"></script>`,
    `${path.pathname} bootstrap cache token`,
  );
  fs.writeFileSync(path, source);
}
