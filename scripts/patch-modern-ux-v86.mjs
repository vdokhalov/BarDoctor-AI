import { readFile, writeFile } from "node:fs/promises";
import { parse } from "acorn";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let bundle = await readFile(bundlePath, "utf8");

function replaceOnce(label, before, after) {
  const first = bundle.indexOf(before);
  const last = bundle.lastIndexOf(before);
  if (first < 0) throw new Error(`${label}: source marker not found`);
  if (first !== last) throw new Error(`${label}: source marker is not unique`);
  bundle = bundle.slice(0, first) + after + bundle.slice(first + before.length);
}

function reorderAiResult() {
  const ast = parse(bundle, { ecmaVersion: "latest", sourceType: "script" });
  const component = ast.body.find((node) => node.type === "FunctionDeclaration" && node.id?.name === "Fce");
  if (!component) throw new Error("AI result component Fce not found");
  const returnStatement = component.body.body.find((node) => node.type === "ReturnStatement");
  const props = returnStatement?.argument?.arguments?.[1]?.properties;
  const children = props?.find((property) => property.key?.name === "children")?.value;
  if (!children || children.type !== "ArrayExpression") throw new Error("AI result children array not found");

  function rank(elementText) {
    if (elementText.includes("e.topPriority")) return 10;
    if (elementText.includes("Управленческий диагноз")) return 15;
    if (elementText.includes("e.analysis?.why")) return 20;
    if (elementText.includes("e.financialAssessment")) return 30;
    if (elementText.includes("e.analysis?.impact")) return 31;
    if (elementText.includes("e.topThree")) return 40;
    if (elementText.includes("e.analysis?.how")) return 41;
    if (elementText.includes("data-bd-ai-recommendations")) return 50;
    if (elementText.includes("data-bd-ai-areas")) return 60;
    if (elementText.includes("e.contextCoverage")) return 70;
    if (elementText.includes("e.analysis?.patterns")) return 71;
    if (elementText.includes("Обновить диагноз")) return 90;
    throw new Error(`Unclassified AI result block: ${elementText.slice(0, 90)}`);
  }

  const blocks = children.elements.map((element, index) => {
    const text = bundle.slice(element.start, element.end);
    return { text, index, rank: rank(text) };
  });
  assertAiRanks(blocks);
  const ordered = [...blocks].sort((left, right) => left.rank - right.rank || left.index - right.index);
  bundle = bundle.slice(0, children.start + 1) + ordered.map((block) => block.text).join(",") + bundle.slice(children.end - 1);
}

function assertAiRanks(blocks) {
  const ranks = blocks.map((block) => block.rank);
  if (blocks.length !== 12 || new Set(ranks).size !== 12) {
    throw new Error(`Unexpected AI result topology: ${blocks.length} blocks, ranks ${ranks.join(",")}`);
  }
}

const classBasedNotFound = 'function Ale(){const e=Ot()?"/home":"/login";return i.jsx("main",{"data-bd-not-found":"modern-v86",className:"min-h-screen w-full flex items-center justify-center bg-[#F4F6FB] px-6 py-10",children:i.jsxs("section",{className:"w-full max-w-[460px] rounded-[26px] border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_16px_48px_rgba(30,36,65,.08)]",children:[i.jsx("p",{className:"text-[12px] font-black uppercase tracking-[.14em] text-indigo-600",children:"Ошибка 404"}),i.jsx("h1",{className:"mt-3 text-[28px] font-black tracking-tight text-slate-950",children:"Страница не найдена"}),i.jsx("p",{className:"mt-3 text-[14px] leading-relaxed text-slate-600",children:"Возможно, ссылка устарела или адрес был введён неверно. Данные BarDoctor не изменены."}),i.jsx("a",{href:e,className:"mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 text-[14px] font-bold text-white hover:bg-indigo-700",children:"Вернуться в BarDoctor"})]})})}';
const notFoundInline = 'function Ale(){const e=Ot()?"/home":"/login";return i.jsx("main",{"data-bd-not-found":"modern-v86",style:{minHeight:"100dvh",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 24px",boxSizing:"border-box",background:"#F4F6FB"},children:i.jsxs("section",{style:{width:"min(100%,460px)",padding:"32px 24px",boxSizing:"border-box",border:"1px solid #E1E5EE",borderRadius:26,background:"#FFFFFF",textAlign:"center",boxShadow:"0 16px 48px rgba(30,36,65,.08)"},children:[i.jsx("p",{style:{margin:0,color:"#4F46E5",fontSize:12,fontWeight:900,letterSpacing:".14em",textTransform:"uppercase"},children:"Ошибка 404"}),i.jsx("h1",{style:{margin:"12px 0 0",color:"#111827",fontSize:28,fontWeight:950,lineHeight:1.15,letterSpacing:"-.025em"},children:"Страница не найдена"}),i.jsx("p",{style:{margin:"12px 0 0",color:"#596174",fontSize:14,lineHeight:1.55},children:"Возможно, ссылка устарела или адрес был введён неверно. Данные BarDoctor не изменены."}),i.jsx("a",{href:e,style:{display:"flex",minHeight:48,alignItems:"center",justifyContent:"center",marginTop:24,padding:"0 20px",borderRadius:16,color:"#FFFFFF",background:"#4F46E5",fontSize:14,fontWeight:800,textDecoration:"none"},children:"Вернуться в BarDoctor"})]})})}';

if (bundle.includes('const bdModernUxVersion="modern-v86";')) {
  let refined = false;
  if (bundle.includes(classBasedNotFound)) {
    replaceOnce("404 compiled-style refinement", classBasedNotFound, notFoundInline);
    refined = true;
  } else if (bundle.includes(notFoundInline)) {
    // Already refined.
  } else {
    throw new Error("Modern UX v86 marker exists but its 404 contract is unknown");
  }
  if (!bundle.includes('"data-bd-ai-order":"react-v86"')) {
    replaceOnce(
      "AI React order marker",
      '"data-bd-ai-result":"scan-order-v86",className:',
      '"data-bd-ai-result":"scan-order-v86","data-bd-ai-order":"react-v86",className:',
    );
    reorderAiResult();
    refined = true;
  }
  if (refined) {
    await writeFile(bundlePath, bundle);
    console.log("Refined Modern UX v86 with bundle-independent 404 and React-native AI scan order.");
  } else {
    console.log("Modern UX v86 patch already applied.");
  }
  process.exit(0);
}

const fieldBefore = 'function ze({label:e,placeholder:t,type:n="text",value:r,defaultValue:a,onChange:s,onInput:bdOnInput,error:l,hint:u,leftIcon:d,rightElement:f,disabled:m,readOnly:h,className:g}){return i.jsxs("div",{className:X("w-full flex flex-col",g),children:[e&&i.jsx("label",{className:"text-[14px] font-semibold text-foreground mb-1.5",children:e}),i.jsxs("div",{className:"relative flex items-center",children:[d&&i.jsx("div",{className:"absolute left-4 flex items-center justify-center text-muted-foreground pointer-events-none",children:d}),i.jsx("input",{type:n,placeholder:t,value:r,defaultValue:a,onChange:s,onInput:bdOnInput,disabled:m,readOnly:h,className:X("bd-input-base",d?"pl-11":"pl-4",f?"pr-11":"pr-4",l&&"border-destructive bg-destructive/5 focus:border-destructive")}),f&&i.jsx("div",{className:"absolute right-4 flex items-center justify-center",children:f})]}),l&&i.jsxs("span",{className:"text-destructive text-[13px] mt-1.5 flex items-center gap-1",children:[i.jsx(Fn,{className:"w-3.5 h-3.5"}),l]}),!l&&u&&i.jsx("span",{className:"text-muted-foreground text-[13px] mt-1.5",children:u})]})}';
const fieldAfter = 'const bdModernUxVersion="modern-v86";function ze({label:e,placeholder:t,type:n="text",value:r,defaultValue:a,onChange:s,onInput:bdOnInput,error:l,hint:u,leftIcon:d,rightElement:f,disabled:m,readOnly:h,className:g,id:bdProvidedId,inputMode:bdInputMode,autoComplete:bdAutoComplete,enterKeyHint:bdEnterKeyHint,name:bdName}){const bdGeneratedId=S.useId(),bdFieldId=bdProvidedId||bdGeneratedId,bdErrorId=bdFieldId+"-error",bdHintId=bdFieldId+"-hint",bdResolvedInputMode=bdInputMode||(n==="number"?"decimal":n==="tel"?"tel":void 0),bdDescribedBy=l?bdErrorId:u?bdHintId:void 0;return i.jsxs("div",{className:X("w-full flex flex-col",g),children:[e&&i.jsx("label",{htmlFor:bdFieldId,className:"text-[14px] font-semibold text-foreground mb-1.5",children:e}),i.jsxs("div",{className:"relative flex items-center",children:[d&&i.jsx("div",{className:"absolute left-4 flex items-center justify-center text-muted-foreground pointer-events-none",children:d}),i.jsx("input",{id:bdFieldId,name:bdName,type:n,inputMode:bdResolvedInputMode,autoComplete:bdAutoComplete,enterKeyHint:bdEnterKeyHint,placeholder:t,value:r,defaultValue:a,onChange:s,onInput:bdOnInput,disabled:m,readOnly:h,"aria-invalid":!!l,"aria-describedby":bdDescribedBy,className:X("bd-input-base",d?"pl-11":"pl-4",f?"pr-11":"pr-4",l&&"border-destructive bg-destructive/5 focus:border-destructive")}),f&&i.jsx("div",{className:"absolute right-4 flex items-center justify-center",children:f})]}),l&&i.jsxs("span",{id:bdErrorId,className:"text-destructive text-[13px] mt-1.5 flex items-center gap-1",children:[i.jsx(Fn,{className:"w-3.5 h-3.5"}),l]}),!l&&u&&i.jsx("span",{id:bdHintId,className:"text-muted-foreground text-[13px] mt-1.5",children:u})]})}';
replaceOnce("semantic form field", fieldBefore, fieldAfter);

const homeBefore = 'function bdHomeDaily({profile:e,revenue:t,expenses:n,gapReasons:r,employees:a,equipment:s,equipmentAlerts:l,settings:u,snapshots:d,diagnosis:f,health:m,latestDataAt:h,onNavigate:g}){const y=S.useMemo(()=>bdBuildMonthlyReport(e,bdDateKey(new Date).slice(0,7),t,n,d,u,r),[e,t,n,d,u,r]),j=S.useMemo(()=>bdHomeTodayState(e,t,new Date),[e,t]),v=S.useMemo(()=>({...y,settings:u,snapshots:d}),[y,u,d]);return i.jsxs("div",{"data-bd-home-daily":"v31",className:"flex flex-col gap-5",children:[i.jsx("div",{"data-bd-home-health":"split-v19",children:i.jsx(wce,{report:m,onDetail:()=>g("/health")})}),i.jsx(bdHomeTodayCard,{today:j}),i.jsx(bdHomeMoneyCard,{report:y,onNavigate:g}),i.jsx(bdHomePrimaryAction,{today:j,onNavigate:g}),i.jsx(bdHomeAttention,{profile:e,report:v,revenue:t,gapReasons:r,equipmentAlerts:l,settings:u,snapshots:d,onNavigate:g}),i.jsx(bdSetupChecklist,{employees:a,snapshots:d,onNavigate:g}),i.jsx(bdHomeSections,{report:y,employees:a,equipment:s,settings:u,snapshots:d,equipmentAlerts:l,onNavigate:g}),i.jsx(bdHomeFreshAi,{diagnosis:f,health:m,latestDataAt:h,onNavigate:g})]})}';
const homeAfter = 'function bdHomeDaily({profile:e,revenue:t,expenses:n,gapReasons:r,employees:a,equipment:s,equipmentAlerts:l,settings:u,snapshots:d,diagnosis:f,health:m,latestDataAt:h,onNavigate:g}){const y=S.useMemo(()=>bdBuildMonthlyReport(e,bdDateKey(new Date).slice(0,7),t,n,d,u,r),[e,t,n,d,u,r]),j=S.useMemo(()=>bdHomeTodayState(e,t,new Date),[e,t]),v=S.useMemo(()=>({...y,settings:u,snapshots:d}),[y,u,d]);return i.jsxs("div",{"data-bd-home-daily":"v31",className:"flex flex-col gap-5",children:[i.jsx(bdHomeMoneyCard,{report:y,onNavigate:g}),i.jsx(bdHomeTodayCard,{today:j}),i.jsx(bdHomePrimaryAction,{today:j,onNavigate:g}),i.jsx(bdHomeAttention,{profile:e,report:v,revenue:t,gapReasons:r,equipmentAlerts:l,settings:u,snapshots:d,onNavigate:g}),i.jsx("div",{"data-bd-home-health":"split-v19",children:i.jsx(wce,{report:m,onDetail:()=>g("/health")})}),i.jsx(bdSetupChecklist,{employees:a,snapshots:d,onNavigate:g}),i.jsx(bdHomeSections,{report:y,employees:a,equipment:s,settings:u,snapshots:d,equipmentAlerts:l,onNavigate:g}),i.jsx(bdHomeFreshAi,{diagnosis:f,health:m,latestDataAt:h,onNavigate:g})]})}';
replaceOnce("home priority order", homeBefore, homeAfter);

const notFoundBefore = 'function Ale(){return i.jsx("div",{className:"min-h-screen w-full flex items-center justify-center bg-gray-50",children:i.jsx(j7,{className:"w-full max-w-md mx-4",children:i.jsxs(w7,{className:"pt-6",children:[i.jsxs("div",{className:"flex mb-4 gap-2",children:[i.jsx(Fn,{className:"h-8 w-8 text-red-500"}),i.jsx("h1",{className:"text-2xl font-bold text-gray-900",children:"404 Page Not Found"})]}),i.jsx("p",{className:"mt-4 text-sm text-gray-600",children:"Did you forget to add the page to the router?"})]})})})}';
const notFoundAfter = notFoundInline;
replaceOnce("professional 404", notFoundBefore, notFoundAfter);

replaceOnce(
  "AI scan order hook",
  'return i.jsxs("div",{className:"flex flex-col gap-5 px-6 pt-4 pb-10",children:',
  'return i.jsxs("div",{"data-bd-ai-result":"scan-order-v86","data-bd-ai-order":"react-v86",className:"flex flex-col gap-5 px-6 pt-4 pb-10",children:',
);

reorderAiResult();

await writeFile(bundlePath, bundle);
console.log("Applied Modern UX v86 patch: semantic fields, home hierarchy, AI scan order and 404 copy.");
