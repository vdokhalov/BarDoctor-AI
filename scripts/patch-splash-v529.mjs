import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const restore=process.argv.includes('--restore');
export const splashCss=`
html[data-bd-startup-pending="v201"],html[data-bd-startup-pending="v201"] body,html[data-bd-startup-pending="v201"] #root {background:#0733aa !important;}
html .bd-static-startup-v201.bd-unified-splash-v394 {background:#0733aa !important;padding:0 !important;}
html .bd-unified-splash-content-v394 {display:none !important;visibility:hidden !important;}
html .bd-unified-splash-tagline-v394 {display:none !important;}
.bd-splash-art-v529 {position:absolute;inset:0;overflow:hidden;pointer-events:none;}
.bd-splash-art-stage-v529 {position:absolute;left:50%;top:50%;width:max(100vw,calc(100dvh * 853 / 1844));height:max(100dvh,calc(100vw * 1844 / 853));transform:translate(-50%,-50%);}
.bd-splash-art-stage-v529 img {position:absolute;inset:0;width:100%;height:100%;display:block;}
.bd-splash-static-v529 {clip-path:polygon(0 0,100% 0,100% 30.1%,0 30.1%,0 51.9%,100% 51.9%,100% 61.1%,0 61.1%,0 84.9%,100% 84.9%,100% 100%,0 100%);}
.bd-splash-brand-v529 {clip-path:inset(30% 0 48%);animation:bd-splash-brand-v529 550ms ease-out both;}
.bd-splash-line-v529 {clip-path:inset(61% 0 15%);animation:bd-splash-line-v529 850ms ease-out both;}
@keyframes bd-splash-brand-v529 {from {opacity:0;}to {opacity:1;}}
@keyframes bd-splash-line-v529 {from {clip-path:inset(61% 100% 15% 0);}to {clip-path:inset(61% 0 15% 0);}}
@media (min-aspect-ratio:3/4) {.bd-splash-art-stage-v529 {width:calc(100dvh * 853 / 1844);height:100dvh;}}
@media (prefers-reduced-motion:reduce) {.bd-splash-art-stage-v529 img {animation:none;}}
/* Native iOS starts with the same complete still: do not replay an entrance over it. */
@media (display-mode:standalone) {.bd-splash-art-stage-v529 img {animation:none;}}
`;
export const splashMarkup=`<div class="bd-splash-art-v529" aria-hidden="true"><div class="bd-splash-art-stage-v529">${['static','brand','line'].map(part=>`<img class="bd-splash-${part}-v529" src="/icons/bardoctor-splash-reference-v529.png" alt="" width="853" height="1844" decoding="sync" fetchpriority="high" />`).join('')}</div></div>`;
const head=`<!-- splash-v529:head --><link rel="preload" as="image" href="/icons/bardoctor-splash-reference-v529.png" /><style>${splashCss}</style><!-- /splash-v529:head -->`;
for(const file of ['public/app.html','app/bar-doctor-response.ts','dist/client/app.html']){
 if(!existsSync(file))continue;
 let s=readFileSync(file,'utf8').replace(/<!-- splash-v529:head -->[\s\S]*?<!-- \/splash-v529:head -->\n?/g,'').replace(/<!-- splash-v529:art -->[\s\S]*?<!-- \/splash-v529:art -->/g,'').replaceAll(/(bardoctor-launch-\d+x\d+-\dx)-v529.png/g,'$1-v394.png');
 if(!restore){
  s=s.replace('</head>',head+'\n</head>').replace(/(<div class="bd-static-startup-v201 bd-unified-splash-v394"[^>]*>)/,'$1<!-- splash-v529:art -->'+splashMarkup+'<!-- /splash-v529:art -->');
  s=s.replaceAll(/(bardoctor-launch-\d+x\d+-\dx)-v394.png/g,'$1-v529.png');
  if(!s.includes(head)||!s.includes(splashMarkup))throw Error('Missing splash host: '+file);
 }
 writeFileSync(file,s);
}
console.log(restore?'Splash v529 restored':'Splash v529 applied');
