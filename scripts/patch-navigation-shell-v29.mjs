import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

function replaceExact(label, before, after) {
  if (!source.includes(before)) throw new Error(`Не найден фрагмент: ${label}`);
  source = source.replace(before, after);
}

function replaceRange(label, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Не найден диапазон: ${label}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

replaceRange(
  "единая нижняя навигация",
  "const Ele=",
  "function nt",
  `const Ele=["/more","/equipment","/suppliers","/reviews","/notifications","/settings","/about","/integrations","/data-control"];
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
    const h=m.key==="home"?e==="/home"||e.startsWith("/analysis")||e==="/market"||e==="/opportunities":
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
  const o=i.jsx("nav",{"data-bd-bottom-nav":"navigation-v29",style:{position:"fixed",left:"50%",transform:"translateX(-50%)",right:"auto",bottom:0,width:"100%",maxWidth:430,zIndex:50,height:"calc(76px + env(safe-area-inset-bottom))",padding:"0 4px env(safe-area-inset-bottom)",boxSizing:"border-box",background:"rgba(255,255,255,.98)",backdropFilter:"blur(24px) saturate(180%)",WebkitBackdropFilter:"blur(24px) saturate(180%)",borderTop:"1px solid rgba(22,27,46,.08)",boxShadow:"0 -8px 30px rgba(22,27,46,.08)"},children:i.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",width:"100%",height:"100%",alignItems:"stretch"},children:u.map(v)})});
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

replaceExact(
  "внутренний переход к поручениям",
  'onClick:()=>window.location.assign("/tasks")',
  'onClick:()=>history.pushState(null,"","/tasks")',
);

const routerStart = "function lEe(){";
const routerIndex = source.indexOf(routerStart);
if (routerIndex < 0) throw new Error("Не найден маршрутизатор приложения");

const embeddedComponents = `const bdEmbeddedPagePaths=["/market","/opportunities","/data-control","/integrations","/notifications"];
function bdPrepareEmbeddedPage(e,t){
  const n=e.currentTarget,r=n.contentWindow,a=n.contentDocument;
  if(!r||!a)return;
  const s=r.location.pathname,l=r.location.search,u=r.location.hash;
  if(!bdEmbeddedPagePaths.includes(s)){t(s+l+u);return}
  a.documentElement.setAttribute("data-bd-embedded","true");
  if(!a.getElementById("bd-embedded-shell-style")){
    const d=a.createElement("link");
    d.id="bd-embedded-shell-style";
    d.rel="stylesheet";
    d.href="/embedded-shell-v269.css";
    a.head.appendChild(d)
  }
  if(a.documentElement.dataset.bdNavigationBound==="true")return;
  a.documentElement.dataset.bdNavigationBound="true";
  a.addEventListener("click",function(d){
    const f=d.target&&d.target.closest?d.target.closest("a[href],button[data-route]"):null;
    if(!f)return;
    if(f.tagName==="A"&&(f.target==="_blank"||f.hasAttribute("download")))return;
    const m=f.tagName==="A"?f.getAttribute("href"):f.getAttribute("data-route");
    if(!m)return;
    let h;
    try{h=new URL(m,r.location.href)}catch{return}
    if(h.origin!==r.location.origin)return;
    if(s==="/notifications"&&h.pathname===s){
      const g=new URL(h.href),y=new URL(window.location.href),j=y.searchParams.get("venue");
      j&&!g.searchParams.has("venue")&&g.searchParams.set("venue",j);
      g.searchParams.delete("embedded");
      const v=g.pathname+g.search+g.hash,b=new URL(g.href);
      b.searchParams.set("embedded","1");
      d.preventDefault();
      d.stopPropagation();
      d.stopImmediatePropagation();
      window.history.replaceState(window.history.state,"",v);
      r.history.replaceState({bdNotificationView:!0},"",b.pathname+b.search+b.hash);
      r.dispatchEvent(new r.PopStateEvent("popstate",{state:r.history.state}));
      return
    }
    d.preventDefault();
    d.stopPropagation();
    d.stopImmediatePropagation();
    t(h.pathname+h.search+h.hash)
  },true)
}
function bdEmbeddedPage({source:e,title:t}){
  const[,n]=bt(),r=new URLSearchParams(window.location.search);
  r.set("embedded","1");
  const a=e+"?"+r.toString()+window.location.hash;
  return i.jsx(nt,{showBottomNav:!0,className:"bg-[#F8F9FC]",children:i.jsx("iframe",{src:a,title:t,onLoad:s=>bdPrepareEmbeddedPage(s,n),style:{display:"block",width:"100%",height:"calc(100dvh - 76px - env(safe-area-inset-bottom))",border:0,background:"#F8F9FC"}})})
}
function bdMarketPage(){return i.jsx(bdEmbeddedPage,{source:"/market",title:"Анализ рынка и конкурентов"})}
function bdOpportunitiesPage(){return i.jsx(bdEmbeddedPage,{source:"/opportunities",title:"Календарь возможностей"})}
function bdDataControlPage(){return i.jsx(bdEmbeddedPage,{source:"/data-control",title:"Контроль данных и доступа"})}
function bdIntegrationsPage(){return i.jsx(bdEmbeddedPage,{source:"/integrations",title:"Интеграции BarDoctor"})}
function bdNotificationsPage(){return i.jsx(bdEmbeddedPage,{source:"/notifications",title:"Уведомления BarDoctor"})}
`;
source = source.slice(0, routerIndex) + embeddedComponents + source.slice(routerIndex);

replaceExact(
  "маршруты встроенных разделов",
  'i.jsx(Xe,{path:"/finance",component:()=>i.jsx(pt,{component:BAe})}),i.jsx(Xe,{path:"/profile",component:e_e})',
  'i.jsx(Xe,{path:"/finance",component:()=>i.jsx(pt,{component:BAe})}),i.jsx(Xe,{path:"/market",component:()=>i.jsx(pt,{component:bdMarketPage})}),i.jsx(Xe,{path:"/opportunities",component:()=>i.jsx(pt,{component:bdOpportunitiesPage})}),i.jsx(Xe,{path:"/data-control",component:()=>i.jsx(pt,{component:bdDataControlPage})}),i.jsx(Xe,{path:"/integrations",component:()=>i.jsx(pt,{component:bdIntegrationsPage})}),i.jsx(Xe,{path:"/profile",component:e_e})',
);

replaceExact(
  "страница уведомлений внутри приложения",
  'i.jsx(Xe,{path:"/notifications",component:()=>i.jsx(pt,{component:Ll})})',
  'i.jsx(Xe,{path:"/notifications",component:()=>i.jsx(pt,{component:bdNotificationsPage})})',
);

fs.writeFileSync(bundlePath, source);
console.log("Unified navigation shell applied");
