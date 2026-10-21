import fs from 'node:fs';import {parse} from 'acorn';import {build,transformSync} from 'esbuild';
const file='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(file,'utf8');const start='/* purchase-price-preview:start */',end='/* purchase-price-preview:end */';
if(s.includes(start)){const a=s.indexOf(start),b=s.indexOf(end,a);if(b<a)throw Error('Preview boundary missing');s=s.slice(0,a)+s.slice(b+end.length).replace(/^\n/,'');}
const domain=await build({entryPoints:['lib/bardoctor/purchase-price-preview.ts'],bundle:true,write:false,format:'iife',globalName:'bdPurchasePricePreviewDomain',platform:'browser'});
const component=transformSync(fs.readFileSync('scripts/fragments/purchase-price-preview.jsx','utf8'),{loader:'jsx',jsxFactory:'S.createElement',jsxFragment:'S.Fragment'}).code;
const old='e.documentType!=="price_list"&&i.jsxs("section",{className:"bd-receiving-totals-v357"';
const next='e.documentType!=="price_list"&&i.jsx(BdPurchasePricePreview,{draft:e}),'+old;
if(!s.includes(next)){if(!s.includes(old))throw Error('Purchase form anchor missing');s=s.replace(old,next);}
const review=parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='bdPurchaseReview');
if(!review)throw Error('Purchase review missing');
const body=s.slice(review.start,review.end);
const calls=(body.match(/(?:bdProcMoney|window\.bdFormatAccountingMoney)\(/g)||[]).length;
if(calls!==3)throw Error('Purchase review money anchors changed');
s=s.slice(0,review.start)+body.replaceAll('bdProcMoney(', 'window.bdFormatAccountingMoney(').replace('children:bdProcStockPreviewV221(line)}',String.raw`children:bdProcStockPreviewV221(line).replace(/\b(?:pcs|kg|ml|g|l)\b/g,unit=>bdAssortmentUnitLabelV293(unit))}`)+s.slice(review.end);
const overview=parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='bdProcOverviewV168');
if(!overview)throw Error('Procurement overview missing');
let overviewBody=s.slice(overview.start,overview.end);
if(!overviewBody.includes('const bdOverviewMoney=')){
 overviewBody=overviewBody.slice(0,overview.body.start-overview.start+1)+'const bdOverviewMoney=(amount,currency="RUB")=>window.bdFormatAccountingMoney(amount,currency);'+overviewBody.slice(overview.body.start-overview.start+1);
}
overviewBody=overviewBody.replaceAll('bdProcMoneyV168(', 'bdOverviewMoney(');
overviewBody=overviewBody.replace('i.jsx("strong",{children:bdOverviewMoney(e.kpi.purchaseTotal','i.jsx("strong",{style:{whiteSpace:"normal",overflow:"visible",textOverflow:"clip",overflowWrap:"anywhere",fontSize:"24px",lineHeight:1.2},children:bdOverviewMoney(e.kpi.purchaseTotal');
s=s.slice(0,overview.start)+overviewBody+s.slice(overview.end);
fs.writeFileSync(file,start+'\n'+domain.outputFiles[0].text+component+end+'\n'+s);
console.log('Read-only purchase price and dish preview applied');
