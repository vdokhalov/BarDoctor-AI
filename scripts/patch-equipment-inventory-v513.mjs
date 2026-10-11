import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = new URL('../', import.meta.url);
export function patchEquipmentInventoryV513(source) {
  const fragment = fs.readFileSync(new URL('scripts/fragments/equipment-command-v167.fragment.txt', root), 'utf8');
  const start = fragment.indexOf('function bdEquipmentCostsV167(');
  const end = fragment.indexOf('function bdEquipmentIssuesV167(', start);
  const targetStart = source.indexOf('function bdEquipmentCostsV167(');
  const targetEnd = source.indexOf('function bdEquipmentIssuesV167(', targetStart);
  if (targetStart < 0 || targetEnd < 0) throw new Error('Equipment cost boundary missing');
  source = source.slice(0,targetStart) + fragment.slice(start,end) + source.slice(targetEnd);
  source = source.replace('O=bdEquipmentCostsV167(m,T,d.filter(M=>M.equipmentId===b.id))','O=bdEquipmentCostsV167(m.filter(I=>I.equipmentId===b.id),T,d.filter(M=>M.equipmentId===b.id))');
  source = source.replace('i.jsx("strong",{children:"ID: "+(b.internalId||b.id)})','i.jsx("strong",{children:b.name}),i.jsx(bdEquipmentStatusBadgeV167,{status:E,label:_.label})');
  const oldDisplay = 'function bdInventoryCountDisplayValue(e,t){if(t===null||t===void 0)return"—";const n=Math.max(.000001,bdWarehouseNumber(e?.entryFactor)||1);return bdWarehouseDecimal(bdWarehouseNumber(t)/n,3)+" "+String(e?.entryUnit||bdWarehouseUnit(e?.unit))}';
  const newDisplay = 'function bdInventoryCountDisplayValue(e,t){if(t===null||t===void 0)return"—";return bdWarehouseDecimal(bdWarehouseNumber(t),3)+" "+bdWarehouseUnit(e?.unit)}';
  if (!source.includes(newDisplay) && !source.includes(oldDisplay)) throw new Error('Inventory display boundary missing');
  source = source.replace(oldDisplay,newDisplay);
  // A layout effect resets only this sheet's global baseline after React commits a
  // successfully persisted document/phase, never on input changes or failed saves.
  const lifecycle = 'const bdInventorySurfaceV513=S.useRef(null);S.useLayoutEffect(()=>{if(!dirty&&bdInventorySurfaceV513.current)window.bdMarkNavigationClean?.(bdInventorySurfaceV513.current)},[doc,phase,dirty]);\n';
  if (!source.includes('const bdInventorySurfaceV513=')) {
    const anchor = 'function syncDocument(o){setDoc(o);';
    if (!source.includes(anchor)) throw new Error('Inventory lifecycle boundary missing');
    source = source.replace(anchor,lifecycle+anchor);
  }
  source = source.replace('className:"bd-inventory-sheet bd-inventory-sheet-v245 bd-inventory-sheet-v246 bg-white','ref:bdInventorySurfaceV513,className:"bd-inventory-sheet bd-inventory-sheet-v245 bd-inventory-sheet-v246 bg-white');
  // Make replay idempotent even when a previous invocation already attached ref.
  source = source.replace('ref:bdInventorySurfaceV513,ref:bdInventorySurfaceV513,','ref:bdInventorySurfaceV513,');
  if (!source.includes('ref:bdInventorySurfaceV513,className:"bd-inventory-sheet')) throw new Error('Inventory surface ref missing');
  return source;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = new URL('public/assets/index-BQGspy0I.js',root);
  fs.writeFileSync(path,patchEquipmentInventoryV513(fs.readFileSync(path,'utf8')));
  console.log('Equipment/inventory v513 applied');
}
