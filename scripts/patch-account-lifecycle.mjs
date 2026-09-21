import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const bundlePath = new URL('public/assets/index-BQGspy0I.js', root);
let bundle = fs.readFileSync(bundlePath, 'utf8');
const row = 'i.jsx(bdSettingsSectionV182,{title:"Заведения и аккаунт",children:i.jsxs(i.Fragment,{children:[i.jsx(bdSettingsRowV182,{title:"Управление заведениями",subtitle:"Архивация, восстановление и удаление",onClick:()=>window.location.assign("/settings/lifecycle")}),i.jsx(bdSettingsRowV182,{title:"Архив заведений",onClick:()=>window.location.assign("/settings/lifecycle#archive")}),i.jsx(bdSettingsRowV182,{title:"Удалить мой аккаунт",destructive:!0,onClick:()=>window.location.assign("/settings/lifecycle#account-title")})]})}),';
const fragmentPath = new URL('scripts/fragments/settings-v182.fragment.txt', root);
let fragment = fs.readFileSync(fragmentPath, 'utf8');
for (const target of ['bundle','fragment']) {
  let source = target === 'bundle' ? bundle : fragment;
  if (!source.includes('title:"Управление заведениями",subtitle:"Архивация')) {
    const anchor = 'i.jsx(bdSettingsSectionV182,{title:"Приложение"';
    if (!source.includes(anchor)) throw new Error('Settings lifecycle anchor missing');
    source = source.replace(anchor, row + anchor);
  }
  if (target === 'bundle') bundle = source; else fragment = source;
}
if (!bundle.includes('function bdLifecycleEmpty()')) {
  const helper = 'function bdLifecycleEmpty(){return i.jsxs("main",{"data-bd-lifecycle-empty":!0,style:{maxWidth:560,margin:"40px auto",padding:24},children:[i.jsx("h1",{children:"Нет активных заведений"}),i.jsx("p",{children:"Создайте новое заведение или восстановите прежнее из архива."}),i.jsx("a",{href:"/venues/new",style:{display:"block",padding:16},children:"Создать заведение"}),i.jsx("a",{href:"/settings/lifecycle#archive",style:{display:"block",padding:16},children:"Открыть архив заведений"}),i.jsx("a",{href:"/settings/lifecycle",style:{display:"block",padding:16},children:"Заведения и аккаунт"})]})}';
  const anchor = 'function bdBootstrapRecoveryV274(){const e=bdAuthBootstrapV274(),t=e.reason==="confirmed_owner_venue_inactive";';
  if (!bundle.includes(anchor)) throw new Error('Bootstrap lifecycle anchor missing');
  bundle = bundle.replace(anchor, helper + anchor + 'if(e.state==="recovery_required"&&e.accessibleVenueCount===0)return i.jsx(bdLifecycleEmpty,{});');
}
fs.writeFileSync(bundlePath, bundle); fs.writeFileSync(fragmentPath, fragment);
for (const name of ['public/bardoctor-preview.js', 'public/bardoctor-preview-v396.js']) {
  const path = new URL(name, root); if (!fs.existsSync(path)) continue;
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes('bd_identity_incarnation')) continue;
  const anchor = '    if (!result || !result.ok) return;';
  const start = source.indexOf('function rememberAccessContext(result)');
  const index = source.indexOf(anchor, start);
  if (start < 0 || index < 0) throw new Error('Identity cache anchor missing: ' + name);
  const code = `
    // Account incarnation, not email: a fresh registration must never reuse an old cache.
    if (result.userId && result.email) {
      var incarnationKey = "bd_identity_incarnation__" + result.email;
      var previousIdentity = localStorage.getItem(incarnationKey) || (localStorage.getItem("bd_session") === result.email ? localStorage.getItem("bd_session_userid") : null);
      if (previousIdentity !== String(result.userId)) {
        for (var storage of [localStorage, sessionStorage]) {
          for (var index = storage.length - 1; index >= 0; index--) {
            var key = storage.key(index);
            if (key && (key.startsWith("bd_") || key.startsWith("bardoctor")) && (!key.includes("__") || key.endsWith("__" + result.email) || key.includes("__" + result.email + "__")) && !["bd_session","bd_session_token","bd_session_userid"].includes(key)) storage.removeItem(key);
          }
        }
      }
      localStorage.setItem(incarnationKey, String(result.userId));
    }
`;
  source = source.slice(0, index + anchor.length) + code + source.slice(index + anchor.length);
  fs.writeFileSync(path, source);
}
console.log('Account / venue lifecycle settings, empty state and identity cache guard prepared');
