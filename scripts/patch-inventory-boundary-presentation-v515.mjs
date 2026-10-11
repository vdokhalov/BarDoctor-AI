import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url),fragment=fs.readFileSync(new URL('scripts/fragments/inventory-boundary-presentation-v515.fragment.txt',root),'utf8');
export function patchInventoryBoundaryPresentationV515(source){
 if(!source.includes('/* inventory-boundary-presentation-v515 */'))source=fragment+'\n'+source;
 else source=source.replace(/function bdInventoryBoundaryCardV515[^\n]*/,()=>fragment.match(/function bdInventoryBoundaryCardV515[^\n]*/)[0]);
 const before='children:V.map(B=>{const U=Array.isArray(B.items)?B.items.length:0',after='children:V.map(B=>{if(bdInventoryAccountingBoundaryV515(B))return i.jsx(bdInventoryBoundaryCardV515,{value:B},B.id);const U=Array.isArray(B.items)?B.items.length:0';
 if(!source.includes(after)&&!source.includes(before))throw Error('Inventory history boundary missing');source=source.replace(before,after);
 const sheet='function bdInventoryCountSheet({balances:e,settings:t,initial:n,startEditing:r=!1,onClose:a,onSaved:s}){';
 const guarded=sheet+'if(bdInventoryAccountingBoundaryV515(n))return i.jsx(bdInventoryBoundaryCardV515,{value:n,standalone:true,onClose:a});';
 if(!source.includes(guarded)&&!source.includes(sheet))throw Error('Inventory sheet boundary missing');source=source.replace(sheet,guarded).replace(guarded+guarded.slice(sheet.length),guarded);
 const deletion='function bdInventoryCanDeleteV270(e){';
 if(!source.includes(deletion+'if(bdInventoryAccountingBoundaryV515(e))return false;'))source=source.replace(deletion,deletion+'if(bdInventoryAccountingBoundaryV515(e))return false;');
 return source;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const path=new URL('public/assets/index-BQGspy0I.js',root);fs.writeFileSync(path,patchInventoryBoundaryPresentationV515(fs.readFileSync(path,'utf8')));console.log('Inventory accounting boundary presentation v515 applied');}
