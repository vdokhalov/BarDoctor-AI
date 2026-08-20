import fs from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let source = fs.readFileSync(bundlePath, "utf8");
let replacements = 0;

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Context patch target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Context patch target is not unique: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
  replacements += 1;
}

function replaceAfter(label, anchor, before, after, range = 12000) {
  const start = source.indexOf(anchor);
  if (start < 0) throw new Error(`Context patch anchor not found: ${label}`);
  const first = source.indexOf(before, start);
  if (first < 0 || first > start + range) {
    throw new Error(`Context patch target not found after anchor: ${label}`);
  }
  const second = source.indexOf(before, first + before.length);
  if (second >= 0 && second <= start + range) {
    throw new Error(`Context patch target is not unique after anchor: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
  replacements += 1;
}

replaceOnce(
  "Shifts month from URL",
  '[selected,setSelected]=S.useState(months[0]);',
  '[selected,setSelected]=S.useState(()=>{const key=window.bdReadNavigationQuery("month","");return months.find(row=>toe(row.year,row.month)===key)||months[0]});',
);
replaceOnce(
  "Shifts month to URL",
  'S.useEffect(()=>{const params=new URLSearchParams(location);if(params.get("closeShift")==="1"){setEditing(void 0);setSheet("revenue")}},[location]);',
  'S.useEffect(()=>{const params=new URLSearchParams(location);if(params.get("closeShift")==="1"){setEditing(void 0);setSheet("revenue")}},[location]);S.useEffect(()=>{window.bdSyncNavigationQuery({month:toe(selected.year,selected.month)})},[selected.year,selected.month]);',
);
replaceOnce(
  "Shifts modal close preserves context",
  'function closeSheet(){setSheet(null);setEditing(void 0);navigate("/shifts")}',
  'function closeSheet(){setSheet(null);setEditing(void 0);window.bdSyncNavigationQuery({closeShift:null,month:toe(selected.year,selected.month)})}',
);

replaceOnce(
  "Finance tab from URL",
  '[b,N]=S.useState("revenue")',
  '[b,N]=S.useState(()=>window.bdReadNavigationQuery("view","revenue")==="expenses"?"expenses":"revenue")',
);
replaceOnce(
  "Finance month from URL and context sync",
  '[H,I]=S.useState(U[0]),V=',
  '[H,I]=S.useState(()=>{const key=window.bdReadNavigationQuery("month","");return U.find(ve=>toe(ve.year,ve.month)===key)||U[0]}),bdFinanceNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({view:b==="expenses"?"expenses":null,month:toe(H.year,H.month)})},[b,H.year,H.month]),V=',
);
replaceOnce(
  "Finance save returns to preserved context",
  '_(null),A(void 0),e("/finance")',
  '_(null),A(void 0),window.bdSyncNavigationQuery({closeShift:null,view:b==="expenses"?"expenses":null,month:ne})',
);

replaceOnce(
  "Warehouse tab and search from URL",
  '[f,m]=S.useState("stock")',
  '[f,m]=S.useState(()=>["stock","movements","counts","writeoffs"].includes(window.bdReadNavigationQuery("tab","stock"))?window.bdReadNavigationQuery("tab","stock"):"stock")',
);
replaceAfter(
  "Warehouse search from URL",
  "function bdWarehousePage()",
  '[v,b]=S.useState("")',
  '[v,b]=S.useState(()=>window.bdReadNavigationQuery("q",""))',
);
replaceOnce(
  "Warehouse context to URL",
  '[P,C]=S.useState(null),D=S.useRef(null),z=',
  '[P,C]=S.useState(null),bdWarehouseNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({tab:f==="stock"?null:f,q:v||null})},[f,v]),D=S.useRef(null),z=',
);

replaceOnce(
  "Reports month from URL and context sync",
  '[d,f]=S.useState(u[0]),m=S.useMemo(',
  '[d,f]=S.useState(()=>u.includes(window.bdReadNavigationQuery("month",""))?window.bdReadNavigationQuery("month",""):u[0]),bdReportNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({month:d})},[d]),m=S.useMemo(',
);

replaceOnce(
  "Salaries month and search from URL",
  '[m,h]=S.useState(bdPayrollInitialMonth),[g,y]=S.useState(""),[j,v]=S.useState(!1),b=',
  '[m,h]=S.useState(()=>window.bdReadNavigationQuery("month",bdPayrollInitialMonth)),[g,y]=S.useState(()=>window.bdReadNavigationQuery("q","")),[j,v]=S.useState(!1),bdSalariesNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({month:m,q:g||null})},[m,g]),b=',
);
replaceOnce(
  "Salary detail month from URL",
  '[g,y]=S.useState(bdPayrollInitialMonth),[j,v]=S.useState(null),b=',
  '[g,y]=S.useState(()=>window.bdReadNavigationQuery("month",bdPayrollInitialMonth)),[j,v]=S.useState(null),bdSalaryNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({month:g})},[g]),b=',
);

replaceOnce(
  "Employee directory context from URL",
  '[s,l]=S.useState("all"),[u,d]=S.useState(""),[f,m]=S.useState(null),h=',
  '[s,l]=S.useState(()=>["all","active","on_leave","dismissed"].includes(window.bdReadNavigationQuery("status","all"))?window.bdReadNavigationQuery("status","all"):"all"),[u,d]=S.useState(()=>window.bdReadNavigationQuery("q","")),[f,m]=S.useState(null),h=',
);
replaceOnce(
  "Employee directory context to URL",
  '}),[e]);function y(){m({mode:"add"})}',
  '}),[e]),bdEmployeeNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({status:s==="all"?null:s,q:u||null})},[s,u]);function y(){m({mode:"add"})}',
);

replaceOnce(
  "Cases context from URL",
  '[n,r]=S.useState("all"),[a,s]=S.useState(""),[l,u]=S.useState(0),d=F2[l].key,f=',
  '[n,r]=S.useState(()=>window.bdReadNavigationQuery("status","all")),[a,s]=S.useState(()=>window.bdReadNavigationQuery("q","")),[l,u]=S.useState(()=>{const key=window.bdReadNavigationQuery("sort","");const index=F2.findIndex(item=>item.key===key);return index<0?0:index}),d=F2[l].key,bdCasesNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({status:n==="all"?null:n,q:a||null,sort:d})},[n,a,d]),f=',
);

replaceOnce(
  "Events context from URL",
  '[n,r]=S.useState("all"),[a,s]=S.useState(""),l=S.useMemo(',
  '[n,r]=S.useState(()=>window.bdReadNavigationQuery("filter","all")),[a,s]=S.useState(()=>window.bdReadNavigationQuery("q","")),bdEventsNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({filter:n==="all"?null:n,q:a||null})},[n,a]),l=S.useMemo(',
);

replaceAfter(
  "Suppliers tab from URL",
  "function bdSuppliersPage()",
  '[r,a]=S.useState("documents")',
  '[r,a]=S.useState(()=>["documents","compare","suppliers"].includes(window.bdReadNavigationQuery("tab","documents"))?window.bdReadNavigationQuery("tab","documents"):"documents")',
);
replaceAfter(
  "Suppliers search from URL",
  "function bdSuppliersPage()",
  '[y,j]=S.useState("")',
  '[y,j]=S.useState(()=>window.bdReadNavigationQuery("q",""))',
);
replaceOnce(
  "Suppliers context to URL",
  'bdCanManageFinance=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("finance.manage"):localStorage.getItem("bd_active_role")==="owner";S.useEffect(()=>{t&&',
  'bdCanManageFinance=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("finance.manage"):localStorage.getItem("bd_active_role")==="owner";S.useEffect(()=>{window.bdSyncNavigationQuery({tab:r==="documents"?null:r,q:y||null})},[r,y]);S.useEffect(()=>{t&&',
);

replaceAfter(
  "Catalog tab from URL",
  "function bdCatalogPage()",
  '[r,a]=S.useState("menu")',
  '[r,a]=S.useState(()=>["menu","recipes","needs"].includes(window.bdReadNavigationQuery("tab","menu"))?window.bdReadNavigationQuery("tab","menu"):"menu")',
);
replaceOnce(
  "Catalog context to URL",
  'L=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("inventory.manage"):localStorage.getItem("bd_active_role")==="owner";S.useEffect(()=>{t&&',
  'L=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("inventory.manage"):localStorage.getItem("bd_active_role")==="owner";S.useEffect(()=>{window.bdSyncNavigationQuery({tab:r==="menu"?null:r})},[r]);S.useEffect(()=>{t&&',
);

fs.writeFileSync(bundlePath, source);
console.log(`Applied ${replacements} context-preservation replacements.`);
