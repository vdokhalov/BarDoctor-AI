import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import {repairOwnerUatV493} from './owner-uat-v493.mjs';

/** Restore only the three owner-selected presentation functions, never domain/API code. */
export function restoreStableUiV485(source, repair = true){
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/stable-ui-v485.json',import.meta.url),'utf8'));
 // The only retained addition is correction confirmation after an explicit
 // checkedAction return. It has no priority queue or Doctor-question controls.
 const anchor='i.jsx(bdCostHealthPhase4a,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),';
 if(repair)fixture.functions.c_e=fixture.functions.c_e.replace(anchor,anchor+'i.jsx(bdManagementVerificationPhase4b,{venue:Number(bdCostHealthVenue.activeVenueId)}),');
 const retired=new Set(['bdManagementHomePhase4','bdManagementQueuePhase4b']);
 const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(node=>node.type==='FunctionDeclaration'&&(Object.hasOwn(fixture.functions,node.id.name)||retired.has(node.id.name)));
 if(nodes.filter(node=>Object.hasOwn(fixture.functions,node.id.name)).length!==3)throw Error('Exactly three stable UI anchors required');
 for(const node of nodes.sort((a,b)=>b.start-a.start))source=source.slice(0,node.start)+(fixture.functions[node.id.name]??'')+source.slice(node.end);
 return repair ? repairOwnerUatV493(source) : source;
}
