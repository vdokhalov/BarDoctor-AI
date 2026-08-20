import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

function replaceRange(label, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Не найден диапазон: ${label}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

replaceRange(
  "нижняя навигация",
  "const Ele=",
  "function nt",
  `const Ele=["/more","/equipment","/suppliers","/reviews","/notifications","/settings","/about","/integrations"];
function Tle(){
  const[e,t]=bt(),n=ste(),[r,a]=S.useState(!1);
  const u=[
    {key:"home",name:"Главная",href:"/home",icon:pQ},
    {key:"shifts",name:"Смены",href:"/shifts",icon:SQ},
    {key:"finance",name:"Финансы",href:"/finance",icon:$c},
    {key:"add",name:"Добавить",icon:Vt,action:!0},
    {key:"team",name:"Команда",href:"/employees",icon:zr},
    {key:"more",name:"Ещё",href:"/more",icon:tS}
  ];
  const d=[
    {name:"Закрыть смену",description:"Внести выручку и состав команды",href:"/shifts?closeShift=1",icon:SQ},
    {name:"Добавить расход",description:"Записать накопительный расход",href:"/finance?addExpense=1",icon:$c},
    {name:"Сообщить о происшествии",description:"Зафиксировать проблему или жалобу",href:"/add",icon:Ic},
    {name:"Создать поручение",description:"Назначить задачу сотруднику",href:"/tasks?new=1",icon:zr}
  ];
  function f(m){a(!1);t(m)}
  function v(m){
    const h=m.key==="home"?e==="/home"||e.startsWith("/analysis"):
      m.key==="shifts"?e==="/shifts"||e.startsWith("/finance/shift/"):
      m.key==="finance"?e.startsWith("/finance")&&!e.startsWith("/finance/shift/")||["/salaries","/reports","/warehouse"].some(g=>e===g||e.startsWith(g+"/")):
      m.key==="team"?["/employees","/tasks","/payroll","/decisions"].some(g=>e===g||e.startsWith(g+"/")):
      m.key==="more"?Ele.some(g=>e===g||e.startsWith(g+"/")):!1;
    const y=m.icon;
    const p={position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,minWidth:0,width:"100%",height:"100%",padding:0,border:0,background:"transparent",color:h?"#5B55F5":"#A5AABA",textDecoration:"none",WebkitTapHighlightColor:"transparent"};
    const c=i.jsxs("span",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,minWidth:0},children:[
      i.jsx(y,{strokeWidth:h?2.5:1.75,style:{width:20,height:20}}),
      i.jsx("span",{style:{fontSize:8.5,lineHeight:1,fontWeight:h?800:600,letterSpacing:"-.01em",whiteSpace:"nowrap"},children:m.name})
    ]});
    if(m.action)return i.jsx("button",{type:"button",onClick:()=>a(!0),style:{...p,color:"#5B55F5"},children:c},m.key);
    return i.jsxs(Zl,{href:m.href,style:p,children:[
      h&&i.jsx("span",{style:{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:32,height:3,borderRadius:"0 0 999px 999px",background:"#5B55F5"}}),
      c
    ]},m.key)
  }
  function x(m){
    const h=m.icon;
    return i.jsxs("button",{type:"button",onClick:()=>f(m.href),style:{width:"100%",display:"flex",alignItems:"center",gap:12,minHeight:66,border:0,borderRadius:18,padding:"10px 12px",textAlign:"left",background:"#F8F9FC",color:"#111827"},children:[
      i.jsx("span",{style:{width:44,height:44,borderRadius:14,background:"rgba(91,85,245,.10)",color:"#5B55F5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:i.jsx(h,{size:20})}),
      i.jsxs("span",{style:{minWidth:0,flex:1},children:[
        i.jsx("span",{style:{display:"block",fontSize:14,lineHeight:1.2,fontWeight:800,color:"#111827"},children:m.name}),
        i.jsx("span",{style:{display:"block",fontSize:11.5,lineHeight:1.25,color:"#7C8498",marginTop:4},children:m.description})
      ]}),
      i.jsx(Br,{size:16,style:{color:"#B1B6C4",flexShrink:0}})
    ]},m.href)
  }
  const o=i.jsx("nav",{"data-bd-bottom-nav":"stage5-v23",style:{position:"fixed",left:"50%",transform:"translateX(-50%)",right:"auto",bottom:0,width:"100%",maxWidth:430,zIndex:50,height:"calc(76px + env(safe-area-inset-bottom))",padding:"0 4px env(safe-area-inset-bottom)",boxSizing:"border-box",background:"rgba(255,255,255,.98)",backdropFilter:"blur(24px) saturate(180%)",WebkitBackdropFilter:"blur(24px) saturate(180%)",borderTop:"1px solid rgba(22,27,46,.08)",boxShadow:"0 -8px 30px rgba(22,27,46,.08)"},children:i.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",width:"100%",height:"100%",alignItems:"stretch"},children:u.map(v)})});
  if(!r)return i.jsx(i.Fragment,{children:o});
  const q=i.jsx(W.button,{type:"button","aria-label":"Закрыть меню добавления",onClick:()=>a(!1),initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},style:{position:"fixed",inset:0,zIndex:55,border:0,background:"rgba(15,23,42,.38)",backdropFilter:"blur(2px)",WebkitBackdropFilter:"blur(2px)"}});
  const k=i.jsxs(W.div,{initial:{opacity:0,y:22,scale:.98},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:18,scale:.98},transition:{duration:.2},style:{position:"fixed",zIndex:60,left:10,right:10,margin:"0 auto",bottom:"calc(84px + env(safe-area-inset-bottom))",width:"min(410px,calc(100vw - 20px))",boxSizing:"border-box",borderRadius:26,border:"1px solid rgba(255,255,255,.75)",background:"rgba(255,255,255,.99)",padding:12,boxShadow:"0 22px 70px rgba(15,23,42,.24)"},children:[
    i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"8px 8px 10px"},children:[
      i.jsxs("div",{children:[
        i.jsx("p",{style:{margin:0,fontSize:17,lineHeight:1.2,fontWeight:900,color:"#111827"},children:"Добавить"}),
        i.jsx("p",{style:{margin:"4px 0 0",fontSize:12,lineHeight:1.25,color:"#7C8498"},children:"Выберите действие"})
      ]}),
      i.jsx("button",{type:"button",onClick:()=>a(!1),style:{width:36,height:36,borderRadius:"50%",border:0,background:"#F1F3F8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,lineHeight:1,color:"#111827"},children:"×"})
    ]}),
    i.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:4},children:d.map(x)})
  ]});
  return i.jsxs(i.Fragment,{children:[o,q,k]})
}
`
);

replaceRange(
  "AI-анализ внутри главной",
  "function bdHomeFreshAi",
  "function bdHomeDaily",
  `function bdHomeFreshAi({diagnosis:e,health:t,latestDataAt:n,onNavigate:r}){const a=!!e&&t.hasEnoughData&&t.coveragePercent>=60&&Number(e.cachedAt||0)>=n,s=a?(e.data?.topPriority?.title||e.data?.summary):null;return i.jsxs("section",{"data-bd-home-ai":"inside-home-v23",style:{borderRadius:24,border:"1px solid rgba(109,116,255,.24)",background:"linear-gradient(145deg,#111936 0%,#1B2854 54%,#2C3D83 100%)",padding:16,overflow:"hidden",color:"#FFFFFF",boxShadow:"0 18px 42px rgba(24,35,79,.18)"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:12},children:[i.jsx("span",{style:{width:40,height:40,borderRadius:14,background:"linear-gradient(145deg,#6D6BFF,#4D49E8)",color:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,flexShrink:0,boxShadow:"0 8px 20px rgba(91,85,245,.28)"},children:"AI"}),i.jsxs("span",{style:{flex:1,minWidth:0},children:[i.jsx("span",{style:{display:"block",fontSize:10,lineHeight:1.2,fontWeight:900,textTransform:"uppercase",letterSpacing:".14em",color:"#8DE5D5"},children:a?"Актуальная AI-рекомендация":"AI-анализ"}),i.jsx("span",{style:{display:"block",fontSize:14,lineHeight:1.38,fontWeight:800,color:"#FFFFFF",marginTop:6,overflowWrap:"anywhere"},children:s||"Диагностика заведения, приоритеты и рекомендации на основе ваших данных."})]})]}),i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:16},children:[i.jsxs("button",{type:"button",onClick:()=>r("/analysis"),style:{minHeight:44,borderRadius:14,border:0,background:"#6862F5",color:"#FFFFFF",padding:"0 10px",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:4},children:["Открыть анализ",i.jsx(Br,{size:14})]}),i.jsxs("button",{type:"button",onClick:()=>r("/market"),style:{minHeight:44,borderRadius:14,border:"1px solid rgba(255,255,255,.18)",background:"rgba(255,255,255,.10)",color:"#FFFFFF",padding:"0 10px",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:4},children:["Рынок рядом",i.jsx(Br,{size:14})]})]})]})}
`
);

fs.writeFileSync(bundlePath, source);
console.log("Stage 5 mobile style repair applied");
