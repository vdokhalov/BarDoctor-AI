import {parse} from 'acorn';

// Functional repair of the owner's confirmed legacy flow. Reuse the existing
// Health/Doctor components and ring styles; no V1.2 or Phase 4B/C presentation.
export function repairOwnerUatV493(source) {
 const helpers=String.raw`function bdLegacyHealthRingV493({snapshot:e}){const score=e?.score,status=bdHealthUiStatusV332(score,e?.status);return i.jsxs("span",{className:"bd-home-health-ring",role:"img","aria-label":"Индекс состояния бизнеса: "+(score??"не рассчитан")+" из 100",style:{"--bd-health-score-color":status.color},children:[i.jsxs("svg",{viewBox:"0 0 100 100","aria-hidden":!0,children:[i.jsx("circle",{className:"bd-home-health-ring-track",cx:50,cy:50,r:44}),score!==null&&score!==undefined&&i.jsx("circle",{className:"bd-home-health-ring-progress",cx:50,cy:50,r:44,pathLength:100,transform:"rotate(-90 50 50)",style:{strokeDasharray:Math.max(0,Math.min(100,score))+" 100"}})]}),i.jsxs("span",{className:"bd-home-health-value",children:[i.jsx("strong",{children:score??"—"}),i.jsx("small",{children:"/100"})]})]})}
function bdLegacyDoctorEntryV493({onNavigate:e}){if(!bdMoreHasPermissionV166("analysis.view")||bdAnalysisContextRestrictedPhase3a5())return null;return i.jsxs("section",{className:"bd-home-ai bd-home-ai-v196","data-bd-legacy-doctor-entry":"v493-repair",children:[i.jsx("p",{className:"bd-home-ai-kicker",children:"AI Doctor"}),i.jsx("button",{type:"button",className:"bd-home-ai-action",onClick:()=>e("/analysis"),children:"Открыть AI Doctor"})]})}
`;
 // Preparation runs repeatedly, so remove only our own helpers before insert.
 let nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body;
 for(const node of nodes.filter(n=>n.type==='FunctionDeclaration'&&['bdLegacyHealthRingV493','bdLegacyDoctorEntryV493'].includes(n.id.name)).sort((a,b)=>b.start-a.start))source=source.slice(0,node.start)+source.slice(node.end+(source[node.end]==='\n'?1:0));
 nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body;
 const edits=[];
 for(const node of nodes.filter(n=>n.type==='FunctionDeclaration')){
  let text=source.slice(node.start,node.end);
  if(node.id.name==='bdHomeDaily'){
   const start=text.indexOf('i.jsxs("section",{className:"bd-home-management-phase4a');
   const end=text.indexOf('i.jsx(bdHomeAttention,',start);
   if(start<0||end<start)throw Error('Legacy Home management boundary required');
   text=text.slice(0,start)+'i.jsx(bdHomeHealthIndexV200,{snapshot:bdHealthSnapshot,diagnosis:f,loading:bdHealthLoading,onNavigate:g}),'+text.slice(end);
   text=text.replace('/* phase4a-home-ai-entry-retained-in-more */','i.jsx(bdLegacyDoctorEntryV493,{onNavigate:g}),');
  }
  if(node.id.name==='bdHomeHealthIndexV200'){
   const number='i.jsxs("span",{className:"bd-home-health-score-number-v332",children:[i.jsx("strong",{children:e.score===null?"—":e.score}),i.jsx("small",{children:"/100"}),';
   text=text.replace(number,'i.jsxs("span",{className:"bd-home-health-score-number-v332",children:[i.jsx(bdLegacyHealthRingV493,{snapshot:e}),');
   text=text.replace('onClick:()=>r("/smart")','onClick:()=>bdRefreshLiveBusinessHealthV335().catch(()=>{})');
   text=text.replace('Актуальный server snapshot для этого заведения ещё не сформирован.','Не удалось получить актуальную оценку с сервера. Повторите проверку.');
  }
  if(node.id.name==='c_e'){
   const cost='i.jsx(bdCostHealthPhase4a,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),';
   text=text.replace(cost,'');
   // The shared header replaces its right-hand slot with the venue switcher.
   // Keep the Doctor action outside that managed slot so it remains reachable.
   text=text.replace('i.jsx("span",{"aria-hidden":!0})]}),','i.jsx("span",{"aria-hidden":!0})]}),bdMoreHasPermissionV166("analysis.view")&&!bdAnalysisContextRestrictedPhase3a5()?i.jsx("button",{type:"button",className:"bd-home-text-action","data-bd-health-doctor-entry":"v493-repair",onClick:()=>e("/analysis"),children:"AI Doctor"}):null,');
   text=text.replace('i.jsxs("p",{className:"bd-health-detail-score-v332",children:[i.jsx("strong",{children:l.score===null?"—":l.score}),i.jsx("small",{children:"/100"})]})','i.jsx(bdLegacyHealthRingV493,{snapshot:l})');
   text=text.replace('Актуальный server snapshot ещё не сформирован. Старое локальное значение не используется.','Не удалось получить актуальную оценку с сервера. Старое локальное значение не используется.');
   text=text.replace('onClick:()=>bdRefreshLiveBusinessHealthV335()','onClick:()=>bdRefreshLiveBusinessHealthV335().catch(()=>{})');
   // Cost remains available below Health, even when the snapshot read fails.
   const ast=parse(text,{ecmaVersion:'latest',sourceType:'module'}).body[0];
   const returned=ast.body.body.find(n=>n.type==='ReturnStatement').argument;
   const child=returned.arguments[1].properties.find(p=>p.key.name==='children').value;
   const elements=child.arguments[1].properties.find(p=>p.key.name==='children').value;
   text=text.slice(0,elements.end-1)+','+cost+text.slice(elements.end-1);
  }
  if(node.id.name==='t_e'&&!text.includes('key:"ai-doctor"')){
   const anchor='A=[m&&';
   if(!text.includes(anchor))throw Error('Native More management anchor required');
   text=text.replace(anchor,'A=[bdMoreHasPermissionV166("analysis.view")&&!bdAnalysisContextRestrictedPhase3a5()&&{key:"ai-doctor",icon:Of,title:"AI Doctor",description:"Диагностика и рекомендации",onClick:()=>e("/analysis")},bdMoreHasPermissionV166("analysis.view")&&{key:"business-health",icon:Of,title:"Состояние бизнеса",description:"Индекс и зоны Business Health",onClick:()=>e("/health")},m&&');
  }
  if(text!==source.slice(node.start,node.end))edits.push({start:node.start,end:node.end,text});
 }
 for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
 const anchor='function bdHomeDaily(';
 if(source.split(anchor).length!==2)throw Error('Single legacy Home required');
 source=source.replace(anchor,helpers+anchor);
 parse(source,{ecmaVersion:'latest',sourceType:'module'});
 return source;
}
