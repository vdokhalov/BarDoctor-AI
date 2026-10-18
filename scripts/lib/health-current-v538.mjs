// Shared by the existing canonical Health client preparation step.
export function patchCurrentHealthClient(source) {
  const replaceFunction = (name, replacement) => {
    const start = source.indexOf(`function ${name}(`), end = source.indexOf('\n', start);
    if (start < 0 || end < 0) throw new Error(`Missing Health client function: ${name}`);
    source = source.slice(0, start) + replacement + source.slice(end);
  };
  replaceFunction('bdHealthLivePeriodV334', 'function bdHealthLivePeriodV334(e){const t=e?.livePeriod,c=e?.coverage,f=e?.periods?.closedFinance,coverage=c?.label||"",financial=c?.financeAvailable&&f?"Финансовая оценка: "+String(f.label||f.startDate||"закрытый период")+"; не прибыль текущего месяца":"";return{headline:String(t?.headline||"Недостаточно текущих данных для оценки"),periodLabel:[String(t?.periodLabel||"Текущий период").replace(/ · предварительно/g,""),coverage,financial].filter(Boolean).join(" · "),comparisonLabel:String(t?.comparisonLabel||""),direction:String(t?.direction||"insufficient"),factors:Array.isArray(t?.factors)?t.factors.map(String):[]}}');
  source = source.replace('livePeriod:n.livePeriod,dataQuality:', 'livePeriod:n.livePeriod,coverage:n.coverage,dataQuality:');
  source = source.replace('function bdHealthUiStatusV332(e,t){', 'function bdHealthUiStatusV332(e,t,s){');
  source = source.replace('key:"healthy",label:"Хорошее состояние",short:"хорошо",color:"#16A36A",soft:"#EAF8F2"', 'key:"healthy",label:s?.coverage?.financeAvailable===false?"Хорошо по доступным направлениям":"Хорошее состояние",short:"хорошо",color:"#16A36A",soft:"#EAF8F2"');
  for (const [before, after] of [
    ['const a=bdHealthUiStatusV332(e.score,e.status),s=bdHealthTrendV332(e)', 'const a=bdHealthUiStatusV332(e.score,e.status,e),s=bdHealthTrendV332(e)'],
    ['status=bdHealthUiStatusV332(score,e?.status)', 'status=bdHealthUiStatusV332(score,e?.status,e)'],
    ['status=bdHealthUiStatusV332(snapshot?.score,snapshot?.status)', 'status=bdHealthUiStatusV332(snapshot?.score,snapshot?.status,snapshot)'],
    ['d=l?bdHealthUiStatusV332(l.score,l.status):', 'd=l?bdHealthUiStatusV332(l.score,l.status,l):'],
    ['coveragePercent:t.dataQualityPercent', 'coveragePercent:t.coverage?.weightPercent??0'],
  ]) source = source.replace(before, after);
  source = source.replace('children:"Общее состояние"', 'children:"Текущее состояние"');
  return source;
}
