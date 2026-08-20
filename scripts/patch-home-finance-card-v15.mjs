import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-home-kpis":"finance-v15"')) {
  console.log("Animated home finance card v15 is already applied.");
  process.exit(0);
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) {
    throw new Error(`Marker not found: ${search.slice(0, 180)}`);
  }
  source =
    source.slice(0, index) + replacement + source.slice(index + search.length);
}

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`End marker not found: ${endMarker}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

const homeFinanceCard = String.raw`function bdHomeKpis({report:e,health:t,onNavigate:n}){const r=e.revenue>0?Math.round(e.payroll/e.revenue*1e3)/10:null,a=e.revenue>0?e.cashResult:null,s=e.revenue>0?e.resultBeforeCost:null,l=a!==null&&a<0,u=[{label:"Предварит.",value:bdHomeSignedMoney(s),tone:bdHomeMetricTone(s)},{label:"ФОТ",value:r!==null?r+"%":"—",tone:r!==null&&r>35?"#FBBF24":"#5EEAD4"},{label:"Данные",value:t.coveragePercent+"%",tone:t.coveragePercent>=60?"#A5B4FC":"#FBBF24"}];return i.jsxs("section",{"data-bd-home-kpis":"finance-v15",className:"flex flex-col gap-3",children:[i.jsxs("div",{className:"flex items-end justify-between px-1 gap-3",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-500",children:"Главное за месяц"}),i.jsx("h2",{className:"text-[20px] font-black tracking-tight text-slate-950 mt-1",children:bdMonthDisplay(e.meta.key)})]}),i.jsxs("span",{className:"text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1",children:[e.accountedShifts,"/",e.expectedShifts," смен"]})]}),i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"0 4px"},children:[i.jsx("p",{style:{fontSize:11,fontWeight:900,letterSpacing:".08em",textTransform:"uppercase",color:"#4F46E5"},children:"Денежный результат · 1 из 3"}),i.jsx("p",{style:{fontSize:10.5,fontWeight:700,color:"#94A3B8"},children:"Нажмите для подробностей"})]}),i.jsxs(W.button,{type:"button","aria-label":"Открыть раздел Финансы",onClick:()=>n("/finance"),initial:{opacity:0,y:14,scale:.98},animate:{opacity:1,y:0,scale:1},transition:{duration:.48,ease:[.22,1,.36,1]},whileTap:{scale:.975},style:{position:"relative",width:"100%",overflow:"hidden",border:0,borderRadius:28,background:"linear-gradient(145deg,#11162F 0%,#1C2453 50%,#312E81 100%)",padding:18,color:"#FFFFFF",textAlign:"left",boxShadow:"0 22px 48px rgba(30,41,90,.25)"},children:[i.jsx(W.span,{"aria-hidden":!0,animate:{scale:[1,1.14,1],opacity:[.28,.52,.28]},transition:{duration:4.8,repeat:1/0,ease:"easeInOut"},style:{position:"absolute",width:190,height:190,borderRadius:"50%",right:-68,top:-92,background:l?"radial-gradient(circle,rgba(251,113,133,.38),rgba(251,113,133,0) 68%)":"radial-gradient(circle,rgba(94,234,212,.34),rgba(94,234,212,0) 68%)"}}),i.jsx(W.span,{"aria-hidden":!0,animate:{x:["-170%","320%"]},transition:{duration:1.35,delay:.55,repeat:1/0,repeatDelay:3.4,ease:"easeInOut"},style:{position:"absolute",inset:"0 auto 0 0",width:70,transform:"skewX(-18deg)",background:"linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent)"}}),i.jsxs("div",{style:{position:"relative",zIndex:1},children:[i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[i.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,minWidth:0},children:[i.jsx(W.span,{initial:{scale:.65,rotate:-12},animate:{scale:1,rotate:0},transition:{type:"spring",stiffness:280,damping:18,delay:.16},style:{display:"flex",alignItems:"center",justifyContent:"center",width:40,height:40,borderRadius:14,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.12)",fontSize:19,fontWeight:900,color:l?"#FDA4AF":"#5EEAD4"},children:"₽"}),i.jsxs("div",{style:{minWidth:0},children:[i.jsx("p",{style:{fontSize:10,fontWeight:850,letterSpacing:".11em",textTransform:"uppercase",color:"rgba(255,255,255,.52)"},children:"После всех внесённых расходов"}),i.jsx("p",{style:{fontSize:12.5,fontWeight:750,color:"rgba(255,255,255,.86)",marginTop:3},children:"Денежный результат"})]})]}),i.jsxs(W.span,{animate:{x:[0,3,0]},transition:{duration:1.5,repeat:1/0,repeatDelay:1.5},style:{fontSize:12,fontWeight:800,color:"rgba(255,255,255,.72)",whiteSpace:"nowrap"},children:["Финансы ","→"]})]}),i.jsx(W.p,{initial:{opacity:0,scale:.9,y:7},animate:{opacity:1,scale:1,y:0},transition:{duration:.45,delay:.18},style:{fontSize:36,fontWeight:950,letterSpacing:"-.045em",lineHeight:1.05,color:a===null?"#CBD5E1":l?"#FB7185":"#4ADE80",marginTop:20,overflowWrap:"anywhere"},children:bdHomeSignedMoney(a)}),i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:8},children:[i.jsxs("p",{style:{fontSize:11.5,color:"rgba(255,255,255,.62)"},children:["Выручка ",i.jsx("strong",{style:{color:"#FFFFFF",fontWeight:850},children:e.revenue>0?GM(e.revenue):"—"})]}),i.jsx("p",{style:{fontSize:10.5,color:"rgba(255,255,255,.48)",textAlign:"right"},children:"Закупки учтены полностью"})]}),i.jsx("div",{style:{height:1,background:"rgba(255,255,255,.11)",margin:"16px 0 12px"}}),i.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8},children:u.map((d,f)=>i.jsxs(W.div,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},transition:{duration:.35,delay:.28+f*.07},style:{minWidth:0,borderRadius:15,padding:"10px 9px",background:"rgba(255,255,255,.075)",border:"1px solid rgba(255,255,255,.08)"},children:[i.jsx("p",{style:{fontSize:9.5,fontWeight:750,color:"rgba(255,255,255,.48)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:d.label}),i.jsx("p",{style:{fontSize:13.5,fontWeight:900,color:d.tone,marginTop:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:d.value})]},d.label))})]})]})]})}`;

replaceBetween("function bdHomeKpis(", "function bdHomeAttention(", homeFinanceCard);

replaceOnce(
  "i.jsx(bdHomeKpis,{report:y,health:l})",
  "i.jsx(bdHomeKpis,{report:y,health:l,onNavigate:h})",
);

await writeFile(bundlePath, source);
console.log("Animated home finance card v15 applied.");
