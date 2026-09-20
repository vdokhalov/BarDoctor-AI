import fs from 'node:fs';
const bundlePath='public/assets/index-BQGspy0I.js';
const fragmentPath='scripts/fragments/menu-consumption-sot-v418.fragment.txt';
const helpers=fs.readFileSync('scripts/fragments/menu-taxonomy-v440.fragment.txt','utf8').replace(/^\uFEFF/,'').trim();
function once(source,before,after){if(source.split(before).length!==2)throw Error('v440 anchor missing/ambiguous: '+before.slice(0,100));return source.replace(before,after)}
let menu=fs.readFileSync(fragmentPath,'utf8');
if(!menu.includes('bdMenuTaxRetryV440')){
 menu=once(menu,'[bdMenuTaxLoadingV350,bdSetMenuTaxLoadingV350]=S.useState(!0),','[bdMenuTaxLoadingV350,bdSetMenuTaxLoadingV350]=S.useState(!0),[bdMenuTaxErrorV440,bdSetMenuTaxErrorV440]=S.useState(null),[bdMenuTaxRetryV440,bdSetMenuTaxRetryV440]=S.useState(0),');
 const begin=menu.indexOf('  S.useEffect(()=>{let P=!0;bdTaxRequestV336(');
 const end=menu.indexOf('  async function bdCreateMenuTaxonomy',begin);
 if(begin<0||end<0)throw Error('v440 taxonomy effect boundaries');
 menu=menu.slice(0,begin)+`  S.useEffect(()=>{let live=true;const controller=new AbortController();bdSetMenuTaxLoadingV350(true);bdSetMenuTaxErrorV440(null);bdMenuTaxonomyRequestV440(bdMenuVenueId,controller.signal).then(response=>{if(!live)return;bdSetMenuTaxonomy(response.taxonomy);bdSetMenuTaxPathsV350(response.legacyMenuPaths||[]);g(draft=>bdMenuTaxonomyMergeV440(draft,response,Boolean(e?.id)));bdSetMenuTaxLoadingV350(false)}).catch(error=>{if(!live||error?.name==='AbortError')return;bdSetMenuTaxErrorV440(error);bdSetMenuTaxLoadingV350(false)});return()=>{live=false;controller.abort()}},[bdMenuVenueId,e?.id,bdMenuTaxRetryV440]);
  const bdMenuTaxIssueV440=bdMenuTaxLoadingV350?'Загружаем разделы и категории':bdMenuTaxErrorV440?.message||bdMenuTaxonomyIssueV440(bdMenuTaxonomy,h);
`+menu.slice(end);
 menu=once(menu,'if(bdMenuSavingRefV438.current)return!1;','if(bdMenuSavingRefV438.current)return!1;if(bdMenuTaxIssueV440){j(bdMenuTaxIssueV440);return!1;}');
 menu=once(menu,'saveDisabled:!h.name.trim()','saveDisabled:!!bdMenuTaxIssueV440||!h.name.trim()');
 menu=once(menu,'saveDisabledReason:!h.name.trim()?','saveDisabledReason:bdMenuTaxIssueV440||(!h.name.trim()?');
 menu=once(menu,'"Проверьте способ списания и связанные данные":"",error:y','"Проверьте способ списания и связанные данные":""),error:y');
 menu=once(menu,'i.jsx(bdTaxonomySelectorsV336,{taxonomy:bdMenuTaxonomy,value:h,onChange:bdMenuSetTaxonomyV350,onCreate:bdCreateMenuTaxonomy})',`bdMenuTaxErrorV440?i.jsxs("div",{className:"bd-catalog-structure-error",role:"alert",children:[i.jsx("p",{children:bdMenuTaxErrorV440.message}),i.jsx("button",{type:"button",onClick:()=>{j("");bdSetMenuTaxRetryV440(count=>count+1)},children:"Повторить загрузку"})]}):i.jsxs("div",{children:[bdMenuTaxIssueV440&&i.jsx("p",{role:"alert",children:bdMenuTaxIssueV440}),i.jsx(bdMenuTaxonomySelectorsV440,{taxonomy:bdMenuTaxonomy,value:h,onChange:bdMenuSetTaxonomyV350,onCreate:bdCreateMenuTaxonomy})]})`);
 // Pin taxonomy creation too. Do not mutate a newly mounted editor after a venue switch.
 menu=once(menu,'{method:"POST",body:JSON.stringify({action:"create",level:P','{method:"POST",headers:{"X-Venue-Id":String(bdMenuVenueId)},body:JSON.stringify({action:"create",level:P');
 fs.writeFileSync(fragmentPath,menu);
}
let bundle=fs.readFileSync(bundlePath,'utf8');
const helperStart=bundle.indexOf('function bdMenuTaxonomyMergeV440(');
if(helperStart>=0){const end=bundle.indexOf('function bdCatMenuEditor(',helperStart);bundle=bundle.slice(0,helperStart)+bundle.slice(end)}
const start=bundle.indexOf('function bdCatMenuEditor('),end=bundle.indexOf('function bdCatStructureManager(',start);
if(start<0||end<0)throw Error('v440 editor boundaries');
bundle=bundle.slice(0,start)+helpers+'\n'+menu.trim()+'\n'+bundle.slice(end);
if(!bundle.includes('nomenclatureStructure:t.nomenclatureStructure,horizonDays:'))bundle=once(bundle,'return{version:2,horizonDays:','return{version:2,nomenclatureStructure:t.nomenclatureStructure,horizonDays:');
fs.writeFileSync(bundlePath,bundle);
console.log('Applied scoped menu taxonomy loader v440');

for(const file of ['app/bar-doctor-response.ts','public/app.html','public/bardoctor-preview.js','public/bardoctor-preview-v396.js']){
 const token='20260920-general-tech-card-v440';
 const source=fs.readFileSync(file,'utf8').replace(/index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g,(match,version)=>version.includes(token)?match:match+'-'+token);
 fs.writeFileSync(file,source);
}
