import fs from 'node:fs';import{transformSync}from'esbuild';
const path='public/assets/index-BQGspy0I.js',restore=process.argv.includes('--restore');let s=fs.readFileSync(path,'utf8');
const original='async function Ce(w){const R=d.some(P=>P.id===w.id)?d.map(P=>P.id===w.id?w:P):[w,...d];f(R),await qr(bdProcurementSupplierStoreV168,R),A&&k({...A,supplierId:w.id,supplierName:w.name,supplierType:w.type||A.supplierType,currency:A.status==="confirmed"?A.currency:bdCurrentAccountingCurrencyV243()||A.currency||"RUB"}),U(null),z(null),a({variant:"success",title:"Поставщик сохранён",description:w.name})}function xe()';
const replacement=`async function Ce(w){if(bdSupplierSaveBusy.current)return;const scope=String(s.activeVenueId)+"|"+Ot()+"|"+gz(),current=()=>scope===String(localStorage.getItem("bd_active_venue_id"))+"|"+Ot()+"|"+gz();bdSupplierSaveBusy.current=true;try{const rows=await bdSaveSupplierConfirmed({supplier:w,base:d,venue:s.activeVenueId,headers:ca(Ot())});if(!current())return;Kse(bdProcurementSupplierStoreV168,rows);f(rows);A&&k({...A,supplierId:w.id,supplierName:w.name,supplierType:w.type||A.supplierType,currency:A.status==="confirmed"?A.currency:bdCurrentAccountingCurrencyV243()||A.currency||"RUB"});U(null);z(null);a({variant:"success",title:"Поставщик сохранён",description:w.name})}catch(error){if(current())a({variant:"error",title:"Поставщик не сохранён",description:"Повторите попытку."})}finally{bdSupplierSaveBusy.current=false}}function xe()`;
const changes=[
 [original,replacement],
 ['[B,U]=S.useState(null),[H,I]','[B,U]=S.useState(null),bdSupplierSaveBusy=S.useRef(false),[H,I]'],
 ['f=(t.supplierMetrics||[]).filter(m=>','f=bdSupplierListMetrics(e,t,bdProcFallbackAnalyticsV168(o,e,t.period?.key||"" )).filter(m=>']
];
for(const[a,b]of changes)s=s.replace(b,a);
s=s.replace(/\/\* supplier-create-refresh:start \*\/[\s\S]*?\/\* supplier-create-refresh:end \*\//g,'');
if(!restore){for(const[a,b]of changes){if(!s.includes(a))throw Error('Missing supplier anchor '+a.slice(0,70));s=s.replace(a,b)}s+='\n/* supplier-create-refresh:start */\n'+fs.readFileSync('scripts/fragments/supplier-create-refresh.js','utf8')+'\n/* supplier-create-refresh:end */\n'}
transformSync(s,{loader:'js',logLevel:'silent'});fs.writeFileSync(path,s);
