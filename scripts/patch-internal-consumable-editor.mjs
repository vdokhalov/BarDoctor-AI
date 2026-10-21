import fs from 'node:fs';
import { build, transform } from 'esbuild';
const file = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
const start = '/* internal-consumable-editor:start */', end = '/* internal-consumable-editor:end */';
if (source.includes(start)) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (b < a) throw Error('Incomplete consumable helpers');
  source = source.slice(0,a) + source.slice(b+end.length).replace(/^\n/,'');
}
const domain = await build({entryPoints:['lib/bardoctor/internal-consumable-editor.ts'],bundle:true,write:false,format:'iife',globalName:'bdInternalConsumable',platform:'browser',target:'es2022'});
const automatic = await transform(fs.readFileSync(new URL('./fragments/internal-consumable-editor.jsx',import.meta.url),'utf8'),{loader:'jsx',jsx:'automatic',target:'es2022'});
let component = automatic.code.replace(/^import \{[^\n]+\} from "react\/jsx-runtime";\n/, '');
// esbuild aliases are stable but resolve through the bundle's existing JSX runtime.
component = component.replace(/\bjsx\(/g,'i.jsx(').replace(/\bjsxs\(/g,'i.jsxs(');
const listStart=source.indexOf('function bdInternalConsumableList(');
if(listStart>=0){const listEnd=source.indexOf('\nfunction ',listStart+1);if(listEnd<listStart)throw Error('List boundary missing');source=source.slice(0,listStart)+source.slice(listEnd);}
const a=source.indexOf('function bdCatInternalEditor('), b=source.indexOf('\nfunction ',a+1);
if(a<0||b<a)throw Error('Consumable editor boundary missing');
source=source.slice(0,a)+component+'\n'+source.slice(b);
function patch(before,after){if(source.includes(before))source=source.replace(before,after);else if(!source.includes(after))throw Error('Missing save handler: '+before);}
patch('await Ne("Расходник сохранён",{...R,internalItems:P}),U(null)', 'return await Ne("Расходник сохранён",{...R,internalItems:P},!0)');
patch('await V("Расходник сохранён",{...c,internalItems:I})', 'return await V("Расходник сохранён",{...c,internalItems:I},!0)');
patch('function bdAssortmentNeedsV170({analytics:e,onHorizon:t,onSupplier:n,onInternal:r,canManage:a})', 'function bdAssortmentNeedsV170({analytics:e,onHorizon:t,onSupplier:n,onInternal:r,canManage:a,internalItems:bdInternalItems=[]})');
patch('i.jsx(bdAssortmentNeedsV170,{analytics:he,onHorizon:Me,', 'i.jsx(bdAssortmentNeedsV170,{analytics:he,internalItems:E.internalItems,onHorizon:Me,');
patch('i.jsx("p",{className:"bd-assortment-muted-v170",children:"Существующий контур расходников сохранён. Они рассчитываются отдельно от menu items и не смешиваются с техкартами."})', 'i.jsx(bdInternalConsumableList,{items:bdInternalItems,onEdit:r,canManage:a})');
source=start+'\n'+domain.outputFiles[0].text+end+'\n'+source;
fs.writeFileSync(file,source);
console.log('Consumable editor: units, signed balance, confirmed save');
