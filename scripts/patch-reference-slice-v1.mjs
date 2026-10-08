import fs from 'node:fs';
import path from 'node:path';
import {repairPayrollMonthInitializers} from './lib/payroll-month-initializers.mjs';

const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'public/assets/index-BQGspy0I.js');
const start='/* reference-slice-v1:start */',end='/* reference-slice-v1:end */';

/** Rollback guard: always remove V1.2 renders, including repeated release preparation. */
export async function patchReferenceSlice(restore=true) {
 let source=repairPayrollMonthInitializers(fs.readFileSync(file,'utf8'));
 source=source.replace(/\/\* bd-reference-render:([A-Za-z\d+/=]+) \*\/[\s\S]*?\/\* bd-reference-render:end \*\//g,(_,original)=>Buffer.from(original,'base64').toString('utf8'));
 const at=source.indexOf(start);if(at>=0){const to=source.indexOf(end,at);if(to<0)throw Error('Incomplete reference slice boundary');source=source.slice(0,at)+source.slice(to+end.length).replace(/^\n/,'');}
 if(restore){fs.writeFileSync(file,source);return;}
 fs.writeFileSync(file,source);
}

if(process.argv[1]===fileURLToPath(import.meta.url))await patchReferenceSlice(process.argv.includes('--restore'));

function fileURLToPath(url){return new URL(url).pathname;}
