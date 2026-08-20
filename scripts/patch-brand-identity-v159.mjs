import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const splashPatchPath = new URL("./patch-modern-splash.mjs", import.meta.url);
let bundle = await readFile(bundlePath, "utf8");

const brandAsset = "/icons/bardoctor-mark-v159.svg";
const brandMarker = "cloche-pulse-v159";

const brandSplash = String.raw`function ble(){return i.jsxs("div",{"data-bd-splash":"ai-pulse","data-bd-brand-splash":"v159",style:{minHeight:"100dvh",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",background:"radial-gradient(circle at 50% 42%, #171B3D 0%, #0D1022 42%, #070911 100%)",color:"#FFFFFF"},children:[i.jsx(W.div,{"aria-hidden":!0,style:{position:"absolute",width:360,height:360,borderRadius:"50%",background:"rgba(91,92,235,0.18)",filter:"blur(90px)",top:"22%",left:"50%",marginLeft:-180},animate:{opacity:[.35,.65,.35],scale:[.9,1.08,.9]},transition:{duration:3.2,repeat:1/0,ease:"easeInOut"}}),i.jsx(W.div,{"aria-hidden":!0,style:{position:"absolute",width:260,height:260,borderRadius:"50%",background:"rgba(46,211,183,0.08)",filter:"blur(80px)",bottom:"8%",right:"-18%"},animate:{opacity:[.2,.5,.2],scale:[1,1.15,1]},transition:{duration:4,repeat:1/0,ease:"easeInOut"}}),i.jsxs(W.div,{initial:{opacity:0,y:12,scale:.97},animate:{opacity:1,y:0,scale:1},transition:{duration:.65,ease:[.22,1,.36,1]},style:{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:390,padding:"32px 28px",textAlign:"center"},children:[i.jsxs("div",{style:{position:"relative",width:164,height:164,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:30},children:[i.jsx(W.div,{"aria-hidden":!0,style:{position:"absolute",inset:0,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.10)",borderTopColor:"#8B7BFF",borderRightColor:"rgba(91,92,235,0.65)",boxShadow:"0 0 34px rgba(91,92,235,0.16)"},animate:{rotate:360},transition:{duration:2.4,repeat:1/0,ease:"linear"}}),i.jsx(W.div,{"aria-hidden":!0,style:{position:"absolute",inset:12,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.08)",background:"linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.015))",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 60px rgba(0,0,0,0.34)"},animate:{scale:[1,1.025,1]},transition:{duration:2.2,repeat:1/0,ease:"easeInOut"}}),i.jsx("img",{src:"${brandAsset}",alt:"","aria-hidden":!0,"data-bd-brand-mark":"${brandMarker}",width:112,height:112,style:{position:"relative",zIndex:2,width:112,height:112,borderRadius:28,objectFit:"cover",boxShadow:"0 16px 44px rgba(0,0,0,0.34)"}})]}),i.jsxs("h1",{style:{fontSize:38,fontWeight:850,lineHeight:1,letterSpacing:"-0.045em",margin:0,color:"#FFFFFF"},children:[i.jsx("span",{style:{color:"#FFFFFF",textShadow:"0 0 22px rgba(255,255,255,0.16)"},children:"Bar"}),i.jsx("span",{style:{background:"linear-gradient(100deg, #9B8CFF 0%, #6F78FF 48%, #69E6D1 120%)",WebkitBackgroundClip:"text",backgroundClip:"text",color:"transparent"},children:"Doctor"})]}),i.jsx("p",{style:{fontSize:16,fontWeight:650,letterSpacing:"-0.01em",color:"rgba(255,255,255,0.78)",margin:"13px 0 0"},children:"Заведение под контролем"}),i.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginTop:34,color:"rgba(255,255,255,0.42)",fontSize:12,fontWeight:650,letterSpacing:"0.08em",textTransform:"uppercase"},children:[i.jsx("span",{children:"Готовим данные"}),i.jsx("div",{style:{display:"flex",gap:4},children:[0,1,2].map(e=>i.jsx(W.span,{style:{display:"block",width:4,height:4,borderRadius:"50%",background:"#8B7BFF"},animate:{opacity:[.2,1,.2],y:[0,-2,0]},transition:{duration:1,repeat:1/0,delay:e*.16}},e))})]})]})]})}`;

const splashStart = bundle.indexOf("function ble(){");
const splashEnd = bundle.indexOf("const j7=", splashStart);
if (splashStart === -1 || splashEnd === -1) {
  throw new Error("Splash component markers were not found.");
}
bundle = bundle.slice(0, splashStart) + brandSplash + bundle.slice(splashEnd);

const desktopBrandBefore = 'i.jsx("span",{children:"BD"})';
const desktopBrandAfter = `i.jsx("img",{src:"${brandAsset}",alt:"","aria-hidden":!0,"data-bd-brand-mark":"${brandMarker}"})`;
if (!bundle.includes(desktopBrandBefore) && !bundle.includes(desktopBrandAfter)) {
  throw new Error("Desktop brand marker was not found.");
}
bundle = bundle.replace(desktopBrandBefore, desktopBrandAfter);

const authBrandBefore = 'i.jsx("span",{className:"bd-auth-brand-mark",children:"BD"})';
const authBrandAfter = `i.jsx("img",{className:"bd-auth-brand-mark",src:"${brandAsset}",alt:"","aria-hidden":!0,"data-bd-brand-mark":"${brandMarker}"})`;
if (!bundle.includes(authBrandBefore) && !bundle.includes(authBrandAfter)) {
  throw new Error("Authentication brand marker was not found.");
}
bundle = bundle.replace(authBrandBefore, authBrandAfter);

const welcomeStart = bundle.indexOf("function Wle({onStart:e})");
const welcomeMarkStart = bundle.indexOf(
  'i.jsx(W.div,{initial:{opacity:0,scale:.88}',
  welcomeStart,
);
const welcomeMarkEnd = bundle.indexOf(",i.jsxs(W.h1", welcomeMarkStart);
const welcomeMarkAfter = String.raw`i.jsx(W.div,{initial:{opacity:0,scale:.88},animate:{opacity:1,scale:1},transition:{duration:.6,ease:[.22,1,.36,1]},className:"mb-8",style:{width:72,height:72,borderRadius:20,overflow:"hidden",boxShadow:"0 4px 24px rgba(22,27,46,0.18), 0 1px 4px rgba(22,27,46,0.10)"},children:i.jsx("img",{src:"${brandAsset}",alt:"","aria-hidden":!0,"data-bd-brand-mark":"${brandMarker}",width:72,height:72,style:{display:"block",width:72,height:72,objectFit:"cover"}})})`;
if (welcomeStart === -1 || welcomeMarkStart === -1 || welcomeMarkEnd === -1) {
  if (!bundle.includes('width:72,height:72,objectFit:"cover"')) {
    throw new Error("Onboarding brand marker was not found.");
  }
} else {
  bundle =
    bundle.slice(0, welcomeMarkStart) +
    welcomeMarkAfter +
    bundle.slice(welcomeMarkEnd);
}

await writeFile(bundlePath, bundle);

let splashPatch = await readFile(splashPatchPath, "utf8");
const definitionStart = splashPatch.indexOf("const modernSplash = String.raw`");
const definitionEnd = splashPatch.indexOf("\n\nif (!source.includes", definitionStart);
if (definitionStart === -1 || definitionEnd === -1) {
  throw new Error("Modern splash patch definition markers were not found.");
}
splashPatch =
  splashPatch.slice(0, definitionStart) +
  `const modernSplash = String.raw\`${brandSplash}\`;` +
  splashPatch.slice(definitionEnd);
await writeFile(splashPatchPath, splashPatch);

console.log("Applied BarDoctor cloche + pulse brand identity v159.");
