import {readFileSync,writeFileSync} from 'node:fs';
import {build} from 'esbuild';
import {parse} from 'acorn';
const file='public/assets/index-BQGspy0I.js',start='/* warehouse-document:start */',end='/* warehouse-document:end */';
let source=readFileSync(file,'utf8');const at=source.indexOf(start);if(at>=0){const to=source.indexOf(end,at);if(to<0)throw Error('Incomplete warehouse document module');source=source.slice(0,at)+source.slice(to+end.length).replace(/^\n/,'');}
const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='bdWarehousePage');if(!node)throw Error('Warehouse page missing');let page=source.slice(node.start,node.end);
const patches=[
 ['const q=[...N].sort','const bdWarehouseDocument=bdWarehouseDocumentClient.useDocument({documentId:new URLSearchParams(o).get("sourceDocumentId"),venue:Number(bdUseProcVenueContextV168().activeVenueId),ready:!!Ot()});const q=[...N].sort'],
 ['R=[..._].filter(B=>bdWarehouseMovementFilterV275', 'R=[...(bdWarehouseDocument.active?bdWarehouseDocument.items:_)].filter(B=>bdWarehouseDocument.active||bdWarehouseMovementFilterV275'],
 ['R.length?i.jsx("div",{className:"bd-warehouse-movement-list"','bdWarehouseDocument.notice,R.length?i.jsx("div",{className:"bd-warehouse-movement-list"'],
 ['R.slice(0,200).map','(bdWarehouseDocument.active?R:R.slice(0,200)).map'],
];
for(const [before,after] of patches){if(process.argv.includes('--restore'))continue;if(page.includes(after))continue;if(!page.includes(before))throw Error('Warehouse anchor missing: '+before);page=page.replace(before,after);}
const oldEmpty=':i.jsxs("div",{className:"bd-warehouse-empty",children:[i.jsx("strong",{children:"Движений пока нет"})';
const newEmpty=':bdWarehouseDocument.active?null:i.jsxs("div",{className:"bd-warehouse-empty",children:[i.jsx("strong",{children:"Движений пока нет"})';
patches.push([oldEmpty,newEmpty]);
if(process.argv.includes('--restore')){for(const[before,after]of patches)page=page.replace(after,before);source=source.slice(0,node.start)+page+source.slice(node.end);writeFileSync(file,source);process.exit(0);}
if(!page.includes(newEmpty)){if(!page.includes(oldEmpty))throw Error('Warehouse empty anchor missing');page=page.replace(oldEmpty,newEmpty);}
source=source.slice(0,node.start)+page+source.slice(node.end);
const built=await build({entryPoints:['lib/bardoctor/client/warehouse-document.tsx'],bundle:true,write:false,format:'iife',globalName:'bdWarehouseDocumentModule',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',minify:true});
const clientCode=built.outputFiles[0].text+'\nconst bdWarehouseDocumentClient=bdWarehouseDocumentModule.createWarehouseDocumentClient(S,{headers:()=>ca(Ot()),venue:()=>Number(localStorage.getItem("bd_active_venue_id")),identity:()=>String(Ot())+":"+String(gz())});';
source=source.replace('function bdWarehousePage(',start+'\n'+clientCode+'\n'+end+'\nfunction bdWarehousePage(');parse(source,{ecmaVersion:'latest',sourceType:'module'});writeFileSync(file,source);console.log('Warehouse document server reader applied');
