import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

let changed = false;

const modernSplash = String.raw`function ble(){return i.jsxs("div",{"data-bd-splash":"ai-pulse","data-bd-brand-splash":"v159",style:{minHeight:"100dvh",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",background:"radial-gradient(circle at 50% 42%, #171B3D 0%, #0D1022 42%, #070911 100%)",color:"#FFFFFF"},children:[i.jsx(W.div,{"aria-hidden":!0,style:{position:"absolute",width:360,height:360,borderRadius:"50%",background:"rgba(91,92,235,0.18)",filter:"blur(90px)",top:"22%",left:"50%",marginLeft:-180},animate:{opacity:[.35,.65,.35],scale:[.9,1.08,.9]},transition:{duration:3.2,repeat:1/0,ease:"easeInOut"}}),i.jsx(W.div,{"aria-hidden":!0,style:{position:"absolute",width:260,height:260,borderRadius:"50%",background:"rgba(46,211,183,0.08)",filter:"blur(80px)",bottom:"8%",right:"-18%"},animate:{opacity:[.2,.5,.2],scale:[1,1.15,1]},transition:{duration:4,repeat:1/0,ease:"easeInOut"}}),i.jsxs(W.div,{initial:{opacity:0,y:12,scale:.97},animate:{opacity:1,y:0,scale:1},transition:{duration:.65,ease:[.22,1,.36,1]},style:{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:390,padding:"32px 28px",textAlign:"center"},children:[i.jsxs("div",{style:{position:"relative",width:164,height:164,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:30},children:[i.jsx(W.div,{"aria-hidden":!0,style:{position:"absolute",inset:0,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.10)",borderTopColor:"#8B7BFF",borderRightColor:"rgba(91,92,235,0.65)",boxShadow:"0 0 34px rgba(91,92,235,0.16)"},animate:{rotate:360},transition:{duration:2.4,repeat:1/0,ease:"linear"}}),i.jsx(W.div,{"aria-hidden":!0,style:{position:"absolute",inset:12,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.08)",background:"linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.015))",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 60px rgba(0,0,0,0.34)"},animate:{scale:[1,1.025,1]},transition:{duration:2.2,repeat:1/0,ease:"easeInOut"}}),i.jsx("img",{src:"/icons/bardoctor-mark-v159.svg",alt:"","aria-hidden":!0,"data-bd-brand-mark":"cloche-pulse-v159",width:112,height:112,style:{position:"relative",zIndex:2,width:112,height:112,borderRadius:28,objectFit:"cover",boxShadow:"0 16px 44px rgba(0,0,0,0.34)"}})]}),i.jsxs("h1",{style:{fontSize:38,fontWeight:850,lineHeight:1,letterSpacing:"-0.045em",margin:0,color:"#FFFFFF"},children:[i.jsx("span",{style:{color:"#FFFFFF",textShadow:"0 0 22px rgba(255,255,255,0.16)"},children:"Bar"}),i.jsx("span",{style:{background:"linear-gradient(100deg, #9B8CFF 0%, #6F78FF 48%, #69E6D1 120%)",WebkitBackgroundClip:"text",backgroundClip:"text",color:"transparent"},children:"Doctor"})]}),i.jsx("p",{style:{fontSize:16,fontWeight:650,letterSpacing:"-0.01em",color:"rgba(255,255,255,0.78)",margin:"13px 0 0"},children:"Заведение под контролем"}),i.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginTop:34,color:"rgba(255,255,255,0.42)",fontSize:12,fontWeight:650,letterSpacing:"0.08em",textTransform:"uppercase"},children:[i.jsx("span",{children:"Готовим данные"}),i.jsx("div",{style:{display:"flex",gap:4},children:[0,1,2].map(e=>i.jsx(W.span,{style:{display:"block",width:4,height:4,borderRadius:"50%",background:"#8B7BFF"},animate:{opacity:[.2,1,.2],y:[0,-2,0]},transition:{duration:1,repeat:1/0,delay:e*.16}},e))})]})]})]})}`;

if (!source.includes('"data-bd-splash":"ai-pulse"')) {
  const loadingStart = source.indexOf("function ble(");
  const loadingEnd = source.indexOf("const j7=", loadingStart);
  if (loadingStart === -1 || loadingEnd === -1) {
    throw new Error("Loading splash component markers were not found.");
  }
  source =
    source.slice(0, loadingStart) + modernSplash + source.slice(loadingEnd);
  changed = true;
}

if (!source.includes('"data-bd-root-splash":"ai-pulse"')) {
  const rootStart = source.indexOf("function _le(){");
  const rootEnd = source.indexOf("const Ele=", rootStart);
  if (rootStart === -1 || rootEnd === -1) {
    throw new Error("Root splash component markers were not found.");
  }
  const rootSplash = String.raw`function _le(){const[,e]=bt(),[t,n]=S.useState(!1),[r]=S.useState(Cle);S.useEffect(()=>{const s=setTimeout(()=>n(!0),2700);return()=>clearTimeout(s)},[]);function a(){e(r)}return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse",style:{minHeight:"100dvh",width:"100%",background:"#070911"},initial:{opacity:1},animate:{opacity:t?0:1},transition:{duration:.4,ease:"easeInOut"},onAnimationComplete:()=>{t&&a()},children:i.jsx(ble,{})})}`;
  source = source.slice(0, rootStart) + rootSplash + source.slice(rootEnd);
  changed = true;
}

const previousTiming =
  'setTimeout(()=>n(!0),1500);return()=>clearTimeout(s)},[]);function a(){e(r)}return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse",style:{minHeight:"100dvh",width:"100%",background:"#070911"},initial:{opacity:1},animate:{opacity:t?0:1},transition:{duration:.38,ease:"easeInOut"}';
const extendedTiming =
  'setTimeout(()=>n(!0),2700);return()=>clearTimeout(s)},[]);function a(){e(r)}return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse",style:{minHeight:"100dvh",width:"100%",background:"#070911"},initial:{opacity:1},animate:{opacity:t?0:1},transition:{duration:.4,ease:"easeInOut"}';
if (source.includes(previousTiming)) {
  source = source.replace(previousTiming, extendedTiming);
  changed = true;
}

const fadedBarWordmark =
  'i.jsxs("h1",{style:{fontSize:38,fontWeight:850,lineHeight:1,letterSpacing:"-0.045em",margin:0},children:[i.jsx("span",{children:"Bar"})';
const visibleBarWordmark =
  'i.jsxs("h1",{style:{fontSize:38,fontWeight:850,lineHeight:1,letterSpacing:"-0.045em",margin:0,color:"#FFFFFF"},children:[i.jsx("span",{style:{color:"#FFFFFF",textShadow:"0 0 22px rgba(255,255,255,0.16)"},children:"Bar"})';
if (source.includes(fadedBarWordmark)) {
  source = source.replace(fadedBarWordmark, visibleBarWordmark);
  changed = true;
}

if (changed) {
  await writeFile(bundlePath, source);
  console.log("Modern splash patch applied.");
} else {
  console.log("Modern splash patch is already applied.");
}
