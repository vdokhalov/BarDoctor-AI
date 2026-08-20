import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

function replaceRequired(before, after, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`Expected ${expected} occurrence(s), found ${count}: ${before.slice(0, 120)}`);
  }
  source = source.split(before).join(after);
}

replaceRequired(
  'function qce({onRetry:e}){return i.jsxs("div",{className:"px-6 py-8 flex flex-col items-center text-center",children:[i.jsx("div",{className:"w-14 h-14 rounded-[18px] bg-destructive/10 flex items-center justify-center mb-4",children:i.jsx(Fn,{size:24,className:"text-destructive"})}),i.jsx("h3",{className:"text-[18px] font-bold text-foreground mb-2",children:"Ошибка диагностики"}),i.jsx("p",{className:"text-[14px] text-muted-foreground mb-6 max-w-[240px] leading-relaxed",children:"Не удалось получить диагноз. Проверьте подключение и попробуйте снова."}),i.jsxs("button",{type:"button",onClick:e,className:"flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all",children:[i.jsx($r,{size:14}),"Попробовать снова"]})]})}',
  'function qce({onRetry:e,message:t}){return i.jsxs("div",{className:"px-6 py-8 flex flex-col items-center text-center",children:[i.jsx("div",{className:"w-14 h-14 rounded-[18px] bg-destructive/10 flex items-center justify-center mb-4",children:i.jsx(Fn,{size:24,className:"text-destructive"})}),i.jsx("h3",{className:"text-[18px] font-bold text-foreground mb-2",children:"Ошибка диагностики"}),i.jsx("p",{className:"text-[14px] text-muted-foreground mb-6 max-w-[320px] leading-relaxed",role:"alert",children:t||"Не удалось получить диагноз. Попробуйте снова."}),i.jsxs("button",{type:"button",onClick:e,className:"flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all",children:[i.jsx($r,{size:14}),"Попробовать снова"]})]})}',
);

replaceRequired(
  '[N,E]=S.useState(j),_=t.length+n.length;',
  '[N,E]=S.useState(j),[bdAiErrorMessage,setBdAiErrorMessage]=S.useState(""),_=t.length+n.length;',
);

replaceRequired(
  'A=S.useCallback(async()=>{b("loading");const k=5,O=5e3,M=await F7().catch(()=>null);',
  'A=S.useCallback(async()=>{setBdAiErrorMessage(""),b("loading");const k=5,O=5e3,M=await F7().catch(()=>null);',
);

replaceRequired(
  'const z={...T(),competitorBenchmark:M?.benchmark?{...M.benchmark,refreshedAt:M.refreshedAt}:null},L=await fetch("/api/ai/diagnosis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(z)});if(L.status>=500&&D<k){console.warn(`[AI Doctor] HTTP ${L.status} — retry ${D+1}/${k} in ${O/1e3}s`),await new Promise(U=>setTimeout(U,O));continue}if(!L.ok)throw new Error(`HTTP ${L.status}`);const q=await L.json();if(!q.success)throw new Error("API returned failure");',
  'const z={...T(),competitorBenchmark:M?.benchmark?{...M.benchmark,refreshedAt:M.refreshedAt}:null},L=await fetch("/api/ai/diagnosis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(z)}),q=await L.json().catch(()=>null);if(L.status>=500&&L.status!==503&&D<k){console.warn(`[AI Doctor] HTTP ${L.status} — retry ${D+1}/${k} in ${O/1e3}s`),await new Promise(U=>setTimeout(U,O));continue}if(!L.ok)throw new Error(q?.error||`HTTP ${L.status}`);if(!q?.success)throw new Error(q?.error||"AI не вернул результат диагностики.");',
);

replaceRequired(
  '}catch(z){console.error("[AI Doctor]",z),b("error");return}},[T,h,y]);',
  '}catch(z){console.error("[AI Doctor]",z),setBdAiErrorMessage(z instanceof Error&&z.message?z.message:"Не удалось получить диагноз. Попробуйте снова."),b("error");return}},[T,h,y]);',
);

replaceRequired(
  'children:i.jsx(qce,{onRetry:A})},"error")',
  'children:i.jsx(qce,{onRetry:A,message:bdAiErrorMessage})},"error")',
);

replaceRequired("rc-v65", "rc-v66");

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v66");
