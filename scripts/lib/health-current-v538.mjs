// Shared by the existing canonical Health client preparation step.
export function patchCurrentHealthClient(source) {
  const replaceFunction = (name, replacement) => {
    const start = source.indexOf(`function ${name}(`), end = source.indexOf('\n', start);
    if (start < 0 || end < 0) throw new Error(`Missing Health client function: ${name}`);
    source = source.slice(0, start) + replacement + source.slice(end);
  };
  replaceFunction('bdHealthLivePeriodV334', 'function bdHealthLivePeriodV334(e){const t=e?.livePeriod;return{headline:String(t?.headline||"Недостаточно текущих данных для оценки"),periodLabel:String(t?.periodLabel||"Текущий период").replace(/ · предварительно/g,""),comparisonLabel:String(t?.comparisonLabel||""),direction:String(t?.direction||"insufficient"),factors:Array.isArray(t?.factors)?t.factors.map(String):[]}}');
  const explanation = 'function bdHealthExplanationV539({snapshot:e,onNavigate:n}){const a=e?.assessment;if(!a)return null;return i.jsxs("div",{className:"bd-health-explanation-v539",style:{marginTop:10,fontSize:13,lineHeight:1.5,textAlign:"left",overflowWrap:"anywhere"},children:[i.jsx("small",{style:{display:"block",color:"#667085"},children:a.note}),a.hint&&typeof n==="function"&&i.jsx("button",{type:"button",style:{display:"block",width:"100%",marginTop:8,padding:"10px 12px",border:"1px solid #DCE3EE",borderRadius:12,background:"#F5F8FC",color:"#2455A4",textAlign:"left",font:"inherit",cursor:"pointer"},onClick:()=>n(a.hint.path),children:a.hint.label+" →"}),i.jsxs("details",{style:{marginTop:8},children:[i.jsx("summary",{style:{cursor:"pointer",color:"#667085",padding:"6px 0"},children:"Как рассчитано"}),i.jsx("p",{children:bdHealthLivePeriodV334(e).periodLabel}),i.jsx("ul",{style:{paddingLeft:18,margin:"6px 0"},children:(a.details||[]).map((v,k)=>i.jsx("li",{children:v},k))})]})]})}';
  if(source.includes('function bdHealthExplanationV539(')) replaceFunction('bdHealthExplanationV539', explanation);
  else source = source.replace('function bdHealthLivePeriodV334(', explanation+'\nfunction bdHealthLivePeriodV334(');

  source = source.replace('livePeriod:n.livePeriod,dataQuality:', 'livePeriod:n.livePeriod,coverage:n.coverage,dataQuality:');
  source = source.replace('coverage:n.coverage,dataQuality:', 'coverage:n.coverage,assessment:n.assessment,dataQuality:');
  source = source.replace('function bdHealthUiStatusV332(e,t){', 'function bdHealthUiStatusV332(e,t,s){');
  source = source.replace('key:"healthy",label:"Хорошее состояние",short:"хорошо",color:"#16A36A",soft:"#EAF8F2"', 'key:"healthy",label:s?.assessment?.partial===true?"Хорошо по доступным направлениям":"Хорошее состояние",short:"хорошо",color:"#16A36A",soft:"#EAF8F2"');
  source = source.replace("s?.coverage?.financeAvailable===false?", "s?.assessment?.partial===true?");
  for (const [before, after] of [
    ['const a=bdHealthUiStatusV332(e.score,e.status),s=bdHealthTrendV332(e)', 'const a=bdHealthUiStatusV332(e.score,e.status,e),s=bdHealthTrendV332(e)'],
    ['status=bdHealthUiStatusV332(score,e?.status)', 'status=bdHealthUiStatusV332(score,e?.status,e)'],
    ['status=bdHealthUiStatusV332(snapshot?.score,snapshot?.status)', 'status=bdHealthUiStatusV332(snapshot?.score,snapshot?.status,snapshot)'],
    ['d=l?bdHealthUiStatusV332(l.score,l.status):', 'd=l?bdHealthUiStatusV332(l.score,l.status,l):'],
    ['coveragePercent:t.dataQualityPercent', 'coveragePercent:t.coverage?.weightPercent??0'],
  ]) source = source.replace(before, after);
  source = source.replace('children:"Общее состояние"', 'children:"Текущее состояние"');
  source = source.replace('i.jsx("small",{className:"bd-cost-home-period",children:period.periodLabel})]})}', 'i.jsx("small",{className:"bd-cost-home-period",children:period.periodLabel}),i.jsx(bdHealthExplanationV539,{snapshot:snapshot,onNavigate:r})]})}');
  source = source.replace('i.jsx("p",{children:m.periodLabel}),m.comparisonLabel', 'i.jsx("p",{children:m.periodLabel}),i.jsx(bdHealthExplanationV539,{snapshot:l,onNavigate:e}),m.comparisonLabel');
  return source;
}
