import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'public/assets/index-BQGspy0I.js');
const start='/* stock-basis-phase3a7:start */',end='/* stock-basis-phase3a7:end */';
let source=fs.readFileSync(file,'utf8');
const from=source.indexOf(start);
if(from>=0){const to=source.indexOf(end,from);if(to<from||source.indexOf(start,from+start.length)>=0)throw new Error('Unique Phase3a7 boundary required');source=source.slice(0,from)+source.slice(to+end.length).replace(/^\n/,'');}
if(process.argv.includes('--restore')){fs.writeFileSync(file,source);process.exit(0);}
const domain=await build({entryPoints:[path.join(root,'lib/bardoctor/valuation.ts')],bundle:true,format:'iife',globalName:'bdStockBasisPhase3a7',platform:'browser',write:false,minify:true});
const client=`
bdWarehouseInventoryValueSummary=function(balances,currency){const result=bdStockBasisPhase3a7.summarizeInventoryValuation({balances,accountingCurrency:currency,venueId:bdMonthlyVenueIdPhase7(null,null),stockMovements:bdProcArray("bd_stock_movements")});return{...result,baseCurrency:result.accountingCurrency,unresolved:result.unvaluedCount,total:result.complete?result.total:result.valuedCount?result.knownSubtotal:null}};
bdWarehouseInventoryValueLine=function(balance,currency){if(balance?.archived===true||balance?.deleted===true||balance?.active===false)return{status:"excluded",value:0};const result=bdStockBasisPhase3a7.summarizeInventoryValuation({balances:[balance],accountingCurrency:currency,venueId:bdMonthlyVenueIdPhase7(null,null),stockMovements:bdProcArray("bd_stock_movements")}),line=result.lines[0];return line?{...line,status:line.status==="excluded_zero_stock"?"zero":line.status}: {status:"unvalued",value:null,reason:"invalid_quantity"}};
const bdWarehouseMoneyBeforePhase3a7=bdWarehouseMoney;
bdWarehouseMoney=function(value,currency){return value==null?"Неизвестно":bdWarehouseMoneyBeforePhase3a7(value,currency)};
`;
const anchor='function bdShiftDateLabelV156(';
if(source.split(anchor).length!==2)throw new Error('Unique stock basis insertion anchor required');
source=source.replace(anchor,`${start}\n${domain.outputFiles[0].text}\n${client}\n${end}\n${anchor}`);
fs.writeFileSync(file,source);console.info('Phase3a7 warehouse uses shared LAST PURCHASE PRICE valuation; UNKNOWN remains null.');
