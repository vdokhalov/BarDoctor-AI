import fs from 'node:fs';
import ts from 'typescript';
const path='public/assets/index-BQGspy0I.js';let source=fs.readFileSync(path,'utf8');
const typescript=fs.readFileSync('lib/bardoctor/nomenclature-taxonomy.ts','utf8');
const readonlySource=typescript.slice(0,typescript.indexOf('export function materializeMenuTaxonomy('))+typescript.slice(typescript.indexOf('/** Resolve menu presentation'));
const compiled=ts.transpileModule(readonlySource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const shared='/* bd-menu-taxonomy-shared-start */\n(function(){const exports={};\n'+compiled+'\nwindow.bdMenuTaxonomy=exports;})();\n/* bd-menu-taxonomy-shared-end */\n';
source=source.replace(/\/\* bd-menu-taxonomy-shared-start \*\/[\s\S]*?\/\* bd-menu-taxonomy-shared-end \*\/\n?/,'');
source=source.replace(/function bdLegacyAssortmentHierarchyV171\([^\n]*\n/,'');
const legacySource=fs.readFileSync('scripts/fragments/assortment-command-v170.fragment.txt','utf8');
const legacy=legacySource.split(/\r?\n/).find(line=>line.startsWith('function bdAssortmentHierarchyV171('))?.replace('function bdAssortmentHierarchyV171(','function bdLegacyAssortmentHierarchyV171(');
if(!legacy)throw Error('Existing legacy hierarchy missing');
const start=source.indexOf('function bdAssortmentHierarchyV171('),end=source.indexOf('\n',start);
if(start<0||end<0)throw Error('Menu hierarchy anchor missing');
source=source.slice(0,start)+'function bdAssortmentHierarchyV171(e,t){const state=bdCatState(t);return bdCatArray(state.menuItems).some(item=>item.sectionId||item.taxonomyCategoryId||item.subcategoryId)?window.bdMenuTaxonomy.menuTaxonomyHierarchy(e,state):bdLegacyAssortmentHierarchyV171(e,state)}'+source.slice(end);
// Keep shared helpers outside legacy fragment rewrite boundaries.
source=shared+legacy+'\n'+source;
fs.writeFileSync(path,source);
console.log('Canonical Menu hierarchy applied');
