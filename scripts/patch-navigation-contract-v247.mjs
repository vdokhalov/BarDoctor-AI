import fs from "node:fs";

const assetPath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(assetPath, "utf8");

// Warehouse context is URL-owned, so reload and history restore the same view.
if (source.includes('function bdWarehousePage(){')) {
 const start=source.indexOf('function bdWarehousePage(){');
 // Anchors are unique to the warehouse component; do not touch other modules.
 const oldSearch='[v,b]=S.useState(()=>window.bdReadNavigationQuery("q",""))';
 const search='v=new URLSearchParams(o).get("q")||"",b=value=>e(bdWarehouseNavigationUrlV247({q:value||null}),{replace:!0})';
 const oldGroup='[bdWarehouseGroupMode,bdSetWarehouseGroupMode]=S.useState("sections")';
 const group='bdWarehouseGroupMode=["sections","categories","subcategories","list"].includes(new URLSearchParams(o).get("group"))?new URLSearchParams(o).get("group"):"sections",bdSetWarehouseGroupMode=value=>e(bdWarehouseNavigationUrlV247({group:value==="sections"?null:value}))';
 let tail=source.slice(start);
 if(tail.includes(oldSearch))tail=tail.replace(oldSearch,search);
 if(tail.includes(oldGroup))tail=tail.replace(oldGroup,group);
 tail=tail.replace('tab:f==="stock"?null:f,q:v||null,valuation:', 'tab:f==="stock"?null:f,valuation:').replace('[f,v,bdWarehouseValuationOnly]','[f,bdWarehouseValuationOnly]');
 source=source.slice(0,start)+tail;
 fs.writeFileSync(assetPath,source);
}

if (source.includes("bdWarehouseNavigationUrlV247")) {
  console.log("Navigation contract v247 already patched");
  process.exit(0);
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one anchor, found ${count}`);
  source = source.replace(before, after);
}

replaceOnce(
  "function bdWarehousePage(){",
  `function bdWarehouseNavigationUrlV247(values){const url=new URL(window.location.href);Object.entries(values||{}).forEach(([key,value])=>{value==null||value===""||value===false?url.searchParams.delete(key):url.searchParams.set(key,String(value))});return url.pathname+(url.searchParams.toString()?"?"+url.searchParams.toString():"")+url.hash}
function bdWarehousePage(){`,
  "warehouse navigation helper",
);

replaceOnce(
  '[h,g]=S.useState(()=>{const B=new URLSearchParams(o);return B.get("add")==="inventory"?{initial:null,startEditing:!0}:null})',
  '[h,g]=S.useState(()=>{const B=new URLSearchParams(o),U=B.get("inventory");if(U==="new"||B.get("add")==="inventory")return{initial:null,startEditing:!0};if(U){const Q=bdWarehouseArray("bd_inventory_snapshots").find(H=>String(H.id)===String(U));return Q?{initial:Q,startEditing:!["completed","confirmed"].includes(String(Q.status||""))}:null}return null})',
  "inventory URL state",
);

replaceOnce(
  '[O,M]=S.useState(!1),[P,C]=S.useState(null),[bdWarehouseValuationOnly,bdSetWarehouseValuationOnly]',
  '[O,M]=S.useState(!1),[P,C]=S.useState(()=>{const B=window.bdReadNavigationQuery("product","");return B?bdWarehouseCanonicalBalances(xr("bd_assortment_v1")).find(U=>bdWarehouseKey(U)===B)||null:null}),[bdWarehouseValuationOnly,bdSetWarehouseValuationOnly]',
  "warehouse product URL state",
);

replaceOnce(
  'bdWarehouseNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({tab:f==="stock"?null:f,q:v||null,valuation:bdWarehouseValuationOnly?"issues":null})},[f,v,bdWarehouseValuationOnly]),D=S.useRef(null)',
  'bdWarehouseNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({tab:f==="stock"?null:f,q:v||null,valuation:bdWarehouseValuationOnly?"issues":null})},[f,v,bdWarehouseValuationOnly]),bdWarehouseOverlayNavigationV247=S.useEffect(()=>{const B=new URLSearchParams(o),U=B.get("inventory"),Q=B.get("add")==="inventory",H=B.get("product");if(U==="new"||Q)g({initial:null,startEditing:!0});else if(U){const X=A.find(Z=>String(Z.id)===String(U));X?g({initial:X,startEditing:!["completed","confirmed"].includes(String(X.status||""))}):window.bdNavigateBack(bdWarehouseNavigationUrlV247({inventory:null,add:null}))}else g(null);if(H){const X=N.find(Z=>bdWarehouseKey(Z)===H);X?C(X):window.bdNavigateBack(bdWarehouseNavigationUrlV247({product:null}))}else C(null)},[o,A,N]),D=S.useRef(null)',
  "warehouse overlay route synchronization",
);

source = source.replaceAll(
  'onClick:()=>g({initial:null,startEditing:!0})',
  'onClick:()=>e(bdWarehouseNavigationUrlV247({inventory:"new",add:null,tab:"counts"}))',
);
replaceOnce(
  'onClick:()=>g({initial:B,startEditing:!te})',
  'onClick:()=>e(bdWarehouseNavigationUrlV247({inventory:B.id,add:null,tab:"counts"}))',
  "inventory history route",
);
replaceOnce(
  'mode:bdWarehouseGroupMode,onOpen:C,searchActive:!!v',
  'mode:bdWarehouseGroupMode,onOpen:B=>e(bdWarehouseNavigationUrlV247({product:bdWarehouseKey(B)})),searchActive:!!v',
  "warehouse product route",
);
replaceOnce(
  'function bdWarehouseProductSaved(B){if(B.assortment){Kse("bd_assortment_v1",B.assortment);E(bdWarehouseCanonicalBalances(B.assortment))}C(null)}',
  'function bdWarehouseProductSaved(B){if(B.assortment){Kse("bd_assortment_v1",B.assortment);E(bdWarehouseCanonicalBalances(B.assortment))}window.bdNavigateBack(bdWarehouseNavigationUrlV247({product:null}))}',
  "product save return",
);
replaceOnce(
  'U.close!==!1&&g(null);',
  'U.close!==!1&&window.bdNavigateBack(bdWarehouseNavigationUrlV247({inventory:null,add:null}));',
  "inventory save return",
);
replaceOnce(
  'onClose:()=>C(null),onSaved:bdWarehouseProductSaved',
  'onClose:()=>window.bdNavigateBack(bdWarehouseNavigationUrlV247({product:null})),onSaved:bdWarehouseProductSaved',
  "product close return",
);
replaceOnce(
  'onClose:()=>g(null),onSaved:xe',
  'onClose:()=>window.bdNavigateBack(bdWarehouseNavigationUrlV247({inventory:null,add:null})),onSaved:xe',
  "inventory close return",
);
replaceOnce(
  'window.open("/api/inventory/counts?id="+encodeURIComponent(doc.id)+"&format=print","_blank","noopener,noreferrer")',
  'window.open("/api/inventory/counts?id="+encodeURIComponent(doc.id)+"&format=print","_blank")',
  "inventory print opener",
);
replaceOnce(
  'onClick:()=>window.location.assign("/sales-import")',
  'onClick:()=>window.bdNavigate("/sales-import")',
  "sales import transition",
);

fs.writeFileSync(assetPath, source);
console.log("Navigation contract v247 patched");
