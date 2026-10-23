import fs from 'node:fs';import {transformSync} from 'esbuild';
const file='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(file,'utf8');const restore=process.argv.includes('--restore');
function change(a,b){const x=restore?b:a,y=restore?a:b;if(s.includes(x))s=s.replace(x,y);else if(!restore&&!s.includes(y))throw Error('Archive anchor missing '+x.slice(0,85));}
change('path:"/catalog",component:()=>i.jsx(pt,{component:bdAssortmentCommandPageV170})','path:"/catalog",component:()=>i.jsx(pt,{component:bdArchiveCatalogPage})');
change('path:"/nomenclature",component:()=>i.jsx(pt,{component:bdNomenclaturePage})','path:"/nomenclature",component:()=>i.jsx(pt,{component:bdArchiveNomenclaturePage})');
change('children:[m&&i.jsx("button",{type:"button",onClick:f,children:"Разделы"})]','children:[i.jsx("button",{type:"button",onClick:()=>window.bdNavigate(bdArchiveUrl("menu",{view:"archive",activeQ:t||null,q:null,itemId:null})),children:"Архив"}),m&&i.jsx("button",{type:"button",onClick:f,children:"Разделы"})]');
change('className:"bd-nomenclature-quick-actions-v238",children:[y&&','className:"bd-nomenclature-quick-actions-v238",children:[i.jsx("button",{type:"button",onClick:()=>e(bdArchiveUrl("inventory",{view:"archive",activeQ:a||null,q:null,item:null})),children:"Архив"}),y&&');
const start='/* assortment-archive:start */',end='/* assortment-archive:end */';if(s.includes(start))s=s.slice(0,s.indexOf(start))+s.slice(s.indexOf(end)+end.length);
if(!restore){let code=transformSync(fs.readFileSync('scripts/fragments/assortment-archive.jsx','utf8'),{loader:'jsx',jsxFactory:'i.createElement',jsxFragment:'i.Fragment',target:'es2020'}).code; // Runtime's JSX object exports jsx/jsxs, not React.createElement.
code=code.replaceAll('i.createElement(', 'S.createElement(');
s=s.replace('function bdAssortmentCommandPageV170(){',start+code+end+'function bdAssortmentCommandPageV170(){');}
fs.writeFileSync(file,s);
