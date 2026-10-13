import fs from 'node:fs';
const path='public/assets/index-BQGspy0I.js';
let source=fs.readFileSync(path,'utf8');
const start='/* sales-navigation-performance:start */',end='/* sales-navigation-performance:end */';
const fragment=`${start}
function bdSalesFrameSource(previous,requested,frame){if(previous&&frame){try{const current=new URL(frame.contentWindow.location.href),target=new URL(requested,window.location.origin);current.searchParams.sort();target.searchParams.sort();if(current.href===target.href)return previous}catch{}}return requested}
function bdSalesPosPage(){const[,navigate]=bt(),path=window.location.pathname,search=ste(),query=new URLSearchParams(search);query.set("embedded","1");const requested=path+"?"+query.toString()+window.location.hash,frame=S.useRef(null),initial=S.useRef(requested),outer=S.useRef(requested);S.useLayoutEffect(()=>{const previous=outer.current;if(previous===requested)return;outer.current=requested;const next=bdSalesFrameSource(previous,requested,frame.current);if(next!==previous&&frame.current)frame.current.src=next},[requested]);return i.jsx(nt,{showBottomNav:!0,children:i.jsx("iframe",{ref:frame,src:initial.current,title:"Продажи и склад","data-bd-sales-surface":"true",onLoad:event=>bdPrepareEmbeddedPage(event,navigate),style:{display:"block",width:"100%",height:"calc(100dvh - var(--bd-header-total,64px) - 78px - env(safe-area-inset-bottom,0px))",border:0,background:"#f5f6fb"}})})}

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
// Journal and cashier share the established app frame and bottom navigation.
const importStart=source.indexOf('function bdSalesImportPage(){'),importEnd=source.indexOf('function ',importStart+10);
if(importStart<0||importEnd<0)throw Error('Sales journal frame boundary missing');
source=source.slice(0,importStart)+'function bdSalesImportPage(){return i.jsx(bdSalesPosPage,{})}\n'+source.slice(importEnd);
// Reuse the same nav component with a POS-only item set for staff.
source=source.replace('const u=[\n    {key:"home"','const u=localStorage.getItem("bd_active_role")==="cashier"?[{key:"sales",name:"Продажи",href:"/cashier",icon:kX}]:[\n    {key:"home"');
source=source.replace('const h=m.key==="home"?', 'const h=m.key==="sales"?e==="/cashier":m.key==="home"?');
source=source.replace('m.key==="more"?Ele.some(', 'm.key==="more"?["/sales-import","/cashier"].includes(e)||Ele.some(');
fs.writeFileSync(path,source);
console.log('Sales standalone screens reuse canonical authenticated SPA host');
