import {readFileSync,writeFileSync} from 'node:fs';
import {build} from 'esbuild';
import {parse} from 'acorn';
const file='public/assets/index-BQGspy0I.js',start='/* warehouse-document:start */',end='/* warehouse-document:end */';
let source=readFileSync(file,'utf8');const at=source.indexOf(start);if(at>=0){const to=source.indexOf(end,at);if(to<0)throw Error('Incomplete warehouse document module');source=source.slice(0,at)+source.slice(to+end.length).replace(/^\n/,'');}
const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='bdWarehousePage');if(!node)throw Error('Warehouse page missing');let page=source.slice(node.start,node.end);
const patches=[
 ['i.jsx("h3",{children:"Движения товара"}),i.jsx("p",{children:"Каждый приход, расход и корректировка с источником"})','i.jsx("h3",{children:"Движение товара"})'],
 ['[bdWarehouseMovementFilterV275Value,bdSetWarehouseMovementFilterV275]=S.useState("all")','[bdWarehouseMovementFilterV275Value,bdSetWarehouseMovementFilterV275]=S.useState(()=>window.bdReadNavigationQuery("movementFilter","all"))'],
 ['function L(){const B=bdWarehouseRecord', 'S.useEffect(()=>{const params=new URLSearchParams(o);bdSetWarehouseMovementFilterV275(params.get("movementFilter")||"all")},[o]);function L(){const B=bdWarehouseRecord'],
 ['onClick:()=>bdSetWarehouseMovementFilterV275(B[0])','onClick:()=>{bdSetWarehouseMovementFilterV275(B[0]);window.bdSyncNavigationQuery({movementFilter:B[0]==="all"?null:B[0]})}'],
 ['const q=[...N].sort','const bdWarehouseDocument=bdWarehouseDocumentClient.useDocument({documentId:new URLSearchParams(o).get("sourceDocumentId"),venue:Number(bdUseProcVenueContextV168().activeVenueId),ready:!!Ot(),enabled:f==="movements"});const q=[...N].sort'],
 ['R=[..._].filter(B=>bdWarehouseMovementFilterV275', 'R=[...(bdWarehouseDocument.active?bdWarehouseDocument.items:_)].filter(B=>bdWarehouseDocument.documentScoped||bdWarehouseMovementFilterV275'],
 ['R.length?i.jsx("div",{className:"bd-warehouse-movement-list"','bdWarehouseDocument.notice,R.length?i.jsx("div",{className:"bd-warehouse-movement-list"'],
 ['R.slice(0,200).map','(bdWarehouseDocument.active?R:R.slice(0,200)).map'],
 ['B.type==="writeoff"&&B.sourceDocumentId&&i.jsx("button",','["receipt","inventory_adjustment"].includes(B.type)&&i.jsx(bdWarehouseDocumentClient.SourceLink,{movement:B,navigate:e}),B.type==="writeoff"&&B.sourceDocumentId&&i.jsx("button",'],
];
for(const [before,after] of patches){if(process.argv.includes('--restore'))continue;if(page.includes(after))continue;if(!page.includes(before))throw Error('Warehouse anchor missing: '+before);page=page.replace(before,after);}
const labels=[
 ['function xe(){const w=bdProcQueryUrlV168({documentId:null,supplierId:null,compareKey:null,edit:null});','function xe(){const back=bdWarehouseDocumentModule.stockReturnUrl(window.location.search,window.location.origin,Number(localStorage.getItem("bd_active_venue_id")));if(back){e(back);return;}const w=bdProcQueryUrlV168({documentId:null,supplierId:null,compareKey:null,edit:null});'],
 ['(A.location||"Основной склад")+(A.shiftId?" · Смена":"")','bdWarehouseDocumentModule.writeoffLocationLabel(A)+" · "+bdWarehouseDocumentModule.writeoffSourceLabel(A)'],
 ['e.location||e.warehouseExternalId||"Основной склад"','bdWarehouseDocumentModule.writeoffLocationLabel(e)'],
 ['...(e.shiftId?[["Источник","Закрытие смены"]]:[])','["Источник",bdWarehouseDocumentModule.writeoffSourceLabel(e)]'],
 ['groupName:n.groups.find(j=>j.id===m.groupId)?.name||({bar:"Бар",kitchen:"Кухня",hookah:"Кальяны"}[m.department]||"Другое")','groupName:bdWarehouseDocumentModule.menuSectionLabel(n,m)'],
];
// Source replacements run after page offsets have been applied below.
function applyLabels(value){for(const [before,after]of labels){const from=process.argv.includes('--restore')?after:before,to=process.argv.includes('--restore')?before:after;if(value.includes(from))value=value.replaceAll(from,to);else if(!value.includes(to))throw Error('Display label anchor missing: '+from);}return value;}
const oldEmpty=':i.jsxs("div",{className:"bd-warehouse-empty",children:[i.jsx("strong",{children:"Движений пока нет"})';
const newEmpty=':bdWarehouseDocument.active?null:i.jsxs("div",{className:"bd-warehouse-empty",children:[i.jsx("strong",{children:"Движений пока нет"})';
patches.push([oldEmpty,newEmpty]);
if(process.argv.includes('--restore')){for(const[before,after]of patches)page=page.replace(after,before);source=source.slice(0,node.start)+page+source.slice(node.end);writeFileSync(file,applyLabels(source));process.exit(0);}
if(!page.includes(newEmpty)){if(!page.includes(oldEmpty))throw Error('Warehouse empty anchor missing');page=page.replace(oldEmpty,newEmpty);}
source=source.slice(0,node.start)+page+source.slice(node.end);
// The host owns React. Override react-jsx from tsconfig: a bundled React 19
// JSX runtime creates elements that the shipped React renderer cannot render.
const built=await build({entryPoints:['lib/bardoctor/client/warehouse-document.tsx'],bundle:true,write:false,format:'iife',globalName:'bdWarehouseDocumentModule',jsx:'transform',tsconfigRaw:{compilerOptions:{jsx:'react'}},jsxFactory:'React.createElement',jsxFragment:'React.Fragment',minify:true});
const clientCode=built.outputFiles[0].text+'\nconst bdWarehouseDocumentClient=bdWarehouseDocumentModule.createWarehouseDocumentClient(S,{headers:()=>ca(Ot()),venue:()=>Number(localStorage.getItem("bd_active_venue_id")),identity:()=>String(Ot())+":"+String(gz())});';
source=source.replace('function bdWarehousePage(',start+'\n'+clientCode+'\n'+end+'\nfunction bdWarehousePage(');parse(source,{ecmaVersion:'latest',sourceType:'module'});writeFileSync(file,applyLabels(source));console.log('Warehouse document server reader applied');
