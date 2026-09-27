import fs from 'node:fs';
const path='public/assets/index-BQGspy0I.js';
let source=fs.readFileSync(path,'utf8');
const start='/* sales-navigation-performance:start */',end='/* sales-navigation-performance:end */';
const fragment=`${start}
function bdSalesPosPage(){const[,navigate]=bt(),path=window.location.pathname,search=ste(),query=new URLSearchParams(search);query.set("embedded","1");return i.jsx("iframe",{src:path+"?"+query.toString(),title:"Продажи и склад","data-bd-sales-surface":"true",onLoad:event=>bdPrepareEmbeddedPage(event,navigate),style:{position:"fixed",inset:0,zIndex:80,display:"block",width:"100%",height:"100dvh",border:0,background:"#f5f6fb"}})}
${end}
`;
source=source.replace(/\/\* sales-navigation-performance:start \*\/[\s\S]*?\/\* sales-navigation-performance:end \*\/\n?/,'');
const anchor='function bdSalesImportPage(){';
if(!source.includes(anchor))throw Error('Sales canonical SPA page anchor missing');
source=source.replace(anchor,fragment+anchor);
const embedded='const bdEmbeddedPagePaths=[';
if(!source.includes(embedded))throw Error('Canonical embedded route allowlist missing');
source=source.replace(/const bdEmbeddedPagePaths=\[([^\]]+)\]/,(_all,paths)=>'const bdEmbeddedPagePaths=['+[...new Set(paths.split(',').concat(['"/cashier"','"/sales-entry"']))].join(',')+']');
const salesRoute='i.jsx(Xe,{path:"/sales-import",component:()=>i.jsx(pt,{component:bdSalesImportPage})})';
const posRoutes='i.jsx(Xe,{path:"/cashier",component:()=>i.jsx(pt,{component:bdSalesPosPage})}),i.jsx(Xe,{path:"/sales-entry",component:()=>i.jsx(pt,{component:bdSalesPosPage})}),';
if(!source.includes(salesRoute))throw Error('Canonical authenticated Sales router anchor missing');
source=source.replaceAll(posRoutes,'').replace(salesRoute,posRoutes+salesRoute);
fs.writeFileSync(path,source);
console.log('Sales standalone screens reuse canonical authenticated SPA host');
