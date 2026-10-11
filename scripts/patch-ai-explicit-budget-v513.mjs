import fs from 'node:fs';
export function patchDiagnosisBudget(source) {
  if (source.includes('/* AI explicit budget v513 */')) return source;
  const before='A=S.useCallback(async()=>{setBdAiErrorMessage(""),b("loading");const k=5,O=5e3,M=await F7().catch(()=>null);';
  const after='A=S.useCallback(async()=>{/* AI explicit budget v513 */if(!window.confirm("Платный AI Doctor: один запрос, до 8000 выходных токенов. Финансовый и операционный контекст заведения отправляется AI-провайдеру. Денежный потолок не установлен. Продолжить?"))return;setBdAiErrorMessage(""),b("loading");const k=0,O=5e3,M=await F7().catch(()=>null);';
  if(source.split(before).length!==2) throw Error('Diagnosis budget anchor missing or ambiguous');
  return source.replace(before,after);
}
if(process.argv[1]?.endsWith('patch-ai-explicit-budget-v513.mjs')){
 const file=process.argv[2]||'public/assets/index-BQGspy0I.js';
 fs.writeFileSync(file,patchDiagnosisBudget(fs.readFileSync(file,'utf8')));
}
