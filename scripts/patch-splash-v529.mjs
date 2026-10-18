import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const restore=process.argv.includes('--restore');
const geometry=readFileSync('scripts/splash-geometry-v532.js','utf8');
const timing=readFileSync('scripts/splash-timing-v531.js','utf8');
export const splashCss=`
html[data-bd-startup-pending="v201"],html[data-bd-startup-pending="v201"] body,html[data-bd-startup-pending="v201"] #root {background:#0733aa !important;}
html .bd-static-startup-v201.bd-unified-splash-v394 {background:#0733aa !important;padding:0 !important;}
html .bd-unified-splash-content-v394 {display:none !important;visibility:hidden !important;}
html .bd-unified-splash-tagline-v394 {display:none !important;}
.bd-splash-art-v529 {position:absolute;inset:0;overflow:hidden;pointer-events:none;}
.bd-splash-art-stage-v529 {position:absolute;left:50%;top:50%;width:max(100vw,calc(100dvh * 853 / 1844));height:max(100dvh,calc(100vw * 1844 / 853));transform:translate(-50%,-50%);}
.bd-splash-art-stage-v529 img {position:absolute;inset:0;width:100%;height:100%;display:block;}
@media (min-aspect-ratio:3/4) {.bd-splash-art-stage-v529 {width:calc(100dvh * 853 / 1844);height:100dvh;}}
@media (prefers-reduced-motion:reduce) {.bd-splash-art-stage-v529 img {animation:none;}}
html[data-bd-startup-pending="v201"] .bd-static-startup-v201[data-bd-splash-fading] {opacity:0 !important;transition:opacity 180ms ease-out !important;}
@media (prefers-reduced-motion:reduce) {html[data-bd-startup-pending="v201"] .bd-static-startup-v201[data-bd-splash-fading] {transition:none !important;}}
/* Native and first HTML artwork are both complete and opaque; only exit fades. */
`;
// Inline the unchanged PNG: first HTML artwork does not depend on a second fetch.
const artwork='data:image/png;base64,'+readFileSync('public/icons/bardoctor-splash-reference-v529.png').toString('base64');
export const splashMarkup=`<div class="bd-splash-art-v529" aria-hidden="true"><div class="bd-splash-art-stage-v529"><img class="bd-splash-complete-v533" src="${artwork}" alt="" width="853" height="1844" decoding="sync" fetchpriority="high" /></div></div>`;
const head=`<!-- splash-v529:head --><style>${splashCss}</style><!-- /splash-v529:head -->`;
for(const file of ['public/app.html','app/bar-doctor-response.ts','dist/client/app.html']){
 if(!existsSync(file))continue;
 let s=readFileSync(file,'utf8').replace(/<!-- splash-v529:head -->[\s\S]*?<!-- \/splash-v529:head -->\n?/g,'').replace(/<!-- splash-v529:art -->[\s\S]*?<!-- \/splash-v529:art -->/g,'').replaceAll(/(bardoctor-launch-\d+x\d+-\dx)-v529.png/g,'$1-v394.png');
 if(!restore){
  s=s.replace('</head>',head+'\n</head>').replace(/(<div class="bd-static-startup-v201 bd-unified-splash-v394"[^>]*>)/,'$1<!-- splash-v529:art -->'+splashMarkup+'<script>'+geometry+'</script><script>'+timing+'</script><!-- /splash-v529:art -->');
  s=s.replaceAll(/(bardoctor-launch-\d+x\d+-\dx)-v394.png/g,'$1-v529.png');
  if(!s.includes(head)||!s.includes(splashMarkup))throw Error('Missing splash host: '+file);
 }
 writeFileSync(file,s);
}
console.log(restore?'Splash v529 restored':'Splash v529 applied');

const home=`const t=document.querySelector('[data-bd-home-page], [data-bd-authenticated-home-shell]');if(!t)return;`;
const homeTimed=home+'if(window.bdSplashReadyV531&&window.bdSplashReadyV531(()=>bdStartupFirstPaintCompleteV201()))return;';
const auth=`  document.documentElement.removeAttribute("data-bd-startup-pending");
  document.documentElement.removeAttribute("data-bd-startup-completing");
  document.querySelector('[data-bd-static-startup="v201"]')?.remove();
  window.__bdSplashReleasedV396=true;
  window.dispatchEvent(new CustomEvent("bd:startup-complete",{detail:{version:"auth-handoff-v423"}}));`;
const authTimed='  const bdReleaseSplashV531=()=>{\n'+auth+'\n  };if(!window.bdSplashReadyV531||!window.bdSplashReadyV531(bdReleaseSplashV531))bdReleaseSplashV531();';
for(const file of process.argv.includes('--shell-only')?[]:['public/assets/index-BQGspy0I.js']){let s=readFileSync(file,'utf8');s=s.replace(homeTimed,home).replace(authTimed,auth);if(!restore){if(!s.includes(home)||!s.includes(auth))throw Error('Splash success handoff anchor missing');s=s.replace(home,homeTimed).replace(auth,authTimed);}writeFileSync(file,s);}
