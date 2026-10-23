import fs from 'node:fs';
const path=new URL('../public/assets/index-BQGspy0I.js',import.meta.url);let source=fs.readFileSync(path,'utf8');
const before='else if(U){const X=A.find(Z=>String(Z.id)===String(U));X?g({initial:X,startEditing:!["completed","confirmed"].includes(String(X.status||""))}):window.bdNavigateBack(bdWarehouseNavigationUrlV247({inventory:null,add:null}))}';
const after='else if(U){/* inventory-search-hydration */if(!t){g(null);return}const X=bdWarehouseArray("bd_inventory_snapshots").find(Z=>String(Z.id)===String(U));X?g({initial:X,startEditing:!["completed","confirmed"].includes(String(X.status||""))}):g(null)}';
if(!source.includes(after)){if(source.split(before).length!==2)throw Error('Unique inventory hydration anchor required');source=source.replace(before,after);fs.writeFileSync(path,source);}
console.log('Inventory document URL retained during hydration; missing documents stay closed');
