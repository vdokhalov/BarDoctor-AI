import fs from 'node:fs';import {build,transformSync} from 'esbuild';
const file='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(file,'utf8');const start='/* purchase-price-preview:start */',end='/* purchase-price-preview:end */';
if(s.includes(start)){const a=s.indexOf(start),b=s.indexOf(end,a);if(b<a)throw Error('Preview boundary missing');s=s.slice(0,a)+s.slice(b+end.length).replace(/^\n/,'');}
const domain=await build({entryPoints:['lib/bardoctor/purchase-price-preview.ts'],bundle:true,write:false,format:'iife',globalName:'bdPurchasePricePreviewDomain',platform:'browser'});
const component=transformSync(fs.readFileSync('scripts/fragments/purchase-price-preview.jsx','utf8'),{loader:'jsx',jsxFactory:'S.createElement',jsxFragment:'S.Fragment'}).code;
const old='e.documentType!=="price_list"&&i.jsxs("section",{className:"bd-receiving-totals-v357"';
const next='e.documentType!=="price_list"&&i.jsx(BdPurchasePricePreview,{draft:e}),'+old;
if(!s.includes(next)){if(!s.includes(old))throw Error('Purchase form anchor missing');s=s.replace(old,next);}
fs.writeFileSync(file,start+'\n'+domain.outputFiles[0].text+component+end+'\n'+s);
console.log('Read-only purchase price and dish preview applied');
