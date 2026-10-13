import assert from 'node:assert/strict';
import {normalized, reportLinks, releasedEntries, reportMasterLabel, releasedReportAction, assertSalesEntry,releasedViewport} from './released-reports-more-parity.mjs';

// Only the deterministic owner fixture at WebKit 390/820/1280. Source provenance and
// independently captured before/after records are pinned by the unit fixtures.
export const releasedModulePaths = new Set([
  '/finance','/opportunities','/reviews','/warehouse','/month-closing',
  '/cashier','/sales-entry','/sales-import','/supplier-alternatives','/shifts',
  '/warehouse?writeoff=new','/warehouse?inventory=new','/warehouse?product=qa-stock',
  '/finance?repairEquipmentId=qa-equipment','/finance?closeShift=1',
  '/shifts?closeShift=1','/reports?closeMonth=1',
]);
export const releasedModuleScope = (path, before, engine, width) => releasedViewport(engine,width) && !!before.contract.type && releasedModulePaths.has(path);
const control = (label, extra = {}) => ({label: normalized(label), tag:'BUTTON', href:null, disabled:false, nav:false, ...extra});
function position(entries, expected, count=1) {
  const matches=entries.flatMap((entry,index)=>entry.label===expected.label && entry.frame===expected.frame ? [index] : []);
  assert.equal(matches.length,count,'exact historical control count: '+expected.label);
  for(const index of matches)assert.deepEqual(entries[index],expected,'historical control semantics: '+expected.label);
  return matches[0];
}
function remove(entries, expected) { entries.splice(position(entries,expected),1); }
const wizardSteps=['Закрыть мастер','Проверка всех смен','Оплаты и остальные расходы','Начальные остатки','Конечные остатки','Списания','ФОТ, налоги и коммунальные услуги','Финальная прибыль','Подтверждение и закрытие периода'];
export function releasedModuleEntries(path, historical, venue, width=390) {
  let entries=structuredClone(historical);
  if(path==='/finance'||path.startsWith('/finance?')) {
    const at=position(entries,control('Продолжить закрытие'),2);
    entries.splice(at,0,...reportLinks(venue));
    remove(entries,control('Есть расхождение остатков'));
  } else if(path==='/warehouse'||path.startsWith('/warehouse?')) {
    remove(entries,control('Импортировать продажиСписать по техкартам'));
    remove(entries,control('Продажи'));
  } else if(path==='/month-closing'||path==='/reports?closeMonth=1') {
    entries=releasedEntries('/reports',entries,venue);
    const at=position(entries,control(reportMasterLabel));
    entries.splice(at+1,0,...wizardSteps.map(label=>control(label)),...reportLinks(venue),control('Открыть закрытие смены'),control('Далее'));
  } else if(path==='/reviews') {
    const at=position(entries,control('Настроить в Интеграциях',{frame:'/reviews'}));
    entries.splice(at,0,control('Запустить AI-анализ отзывов',{frame:'/reviews'}));
  } else if(path==='/supplier-alternatives') {
    const matches=entries.flatMap((entry,index)=>entry.label==='Запустить поиск'&&entry.frame===path?[index]:[]);
    assert.equal(matches.length,2,'historical supplier selector and actual search remain distinct');
    assert.deepEqual(entries[matches[0]],control('Запустить поиск',{frame:path}));
    entries[matches[0]].label='Выбрать группу для поиска';
  } else if(path==='/shifts'||path==='/shifts?closeShift=1') {
    const at=position(entries,control('Более ранний месяц'));
    entries.splice(at,0,control('Касса · столы, заказы и оплата'),control('Выбрать сотрудников по должностям',{tag:'SUMMARY'}),control('Без должности /',{tag:'SUMMARY'}),control('Открыть смену',{disabled:true}));
  } else if(path==='/sales-entry'||path==='/sales-import') {
    // DOM order: shared shell controls precede every native iframe control.
    const nav=[['Главная','/home'],['Смены','/shifts'],['Финансы','/finance'],...(width===1280?[['Отзывы','/reviews']]:[]),['Добавить',null],['Команда','/employees'],['Ещё','/more']].map(([label,href])=>control(label,{tag:href?'A':'BUTTON',href,nav:true}));
    if(path==='/sales-import') {
      remove(entries,control('Вернуться в Ещё',{tag:'A',href:'/more',frame:path}));
      nav.unshift(control('Вернуться назад'),control('Переключить заведение'));
    }
    entries.unshift(...nav);
  }
  return entries;
}
export function releasedModuleContract(contract) {
  if(contract.path==='/cashier'&&contract.type==='create'&&contract.shell==='fullscreen') {
    assert.equal(contract.title,'Касса');assert.equal(contract.parent,'/sales-import');
    assert.equal(contract.bottomNav,false);assert.equal(contract.headerMode,'owned');
    return {...contract,type:'module',title:'Продажи · Касса',shell:'standard',bottomNav:true,headerMode:'back'};
  }
  if(contract.path==='/sales-import'&&contract.type==='wizard'&&contract.shell==='fullscreen') {
    assert.equal(contract.title,'Импорт продаж');assert.equal(contract.parent,'/warehouse');
    assert.equal(contract.bottomNav,false);assert.equal(contract.headerMode,'back');
    return {...contract,type:'module',title:'Продажи',parent:'/more',shell:'standard',bottomNav:true};
  }
  return contract;
}
function replaceOnce(text, before, after) {
  assert.equal(text.split(before).length,2,'unique historical copy: '+before);
  return text.replace(before,after);
}
export function releasedModuleFrame(path, text) {
  if(path==='/opportunities') {
    // Exactly the two observed historical notices, never arbitrary AI errors.
    if(text.includes('Не удалось актуализировать · показаны сохранённые данные')) {
      text=replaceOnce(text,'Не удалось актуализировать · показаны сохранённые данные','Данные сохранены · обновлено сегодня в :');
      return replaceOnce(text,'Не удалось завершить актуализацию Показаны последние сохранённые данные','Показан сохранённый календарь Для платного AI-поиска нажмите «Обновить»');
    }
    return replaceOnce(text,'AI временно недоступен: серверное подключение OpenAI ещё не настроено','Показан сохранённый календарь Для платного AI-поиска нажмите «Обновить»');
  }
  if(path==='/reviews') return replaceOnce(replaceOnce(text,'ИСТОЧНИКИ ОТЗЫВОВ','Запустить AI-анализ отзывов ИСТОЧНИКИ ОТЗЫВОВ'),'проходят тот же AI-анализ','доступны для AI-анализа');
  if(path==='/supplier-alternatives') return replaceOnce(text,'Сохранённых результатов пока нет Запустить поиск','Сохранённых результатов пока нет Выбрать группу для поиска');
  if(path==='/sales-import') {
    assert.ok(text.startsWith('Продажи Журнал и касса '),'fresh historical native Sales document required');
    return text.slice('Продажи Журнал и касса '.length);
  }
  return text;
}
export function releasedRemoval(item) {
  if(['context:/warehouse:Импортировать продажиСписать по техкартам','context:/warehouse:Продажи'].includes(item.id)) return 'MOVED: Sales is enabled in More; actual click/reload/venue measured';
  if(item.id==='context:/finance:Есть расхождение остатков') return 'REMOVED: UNKNOWN profit is not proof of stock discrepancy; exact canonical month-boundary link required';
  return null;
}
export function assertReleasedPlacement(path, candidate, versions) {
  if(path==='/warehouse'||path.startsWith('/warehouse?')) {
    const record=candidate.salesEntry?candidate:versions.candidate['/more']?.salesEntry?versions.candidate['/more']:versions.candidate['/warehouse'];
    assert.ok(record,'measured More Sales destination required');assertSalesEntry(record,candidate.before.venue);
  }
}
export function releasedModuleAction(item, original, candidate, record, versions, canonical) {
  if(item.id==='context:/finance:Мастер закрытия месяца') {
    assert.equal(canonical(original?.url),canonical('/finance?month=2026-10&venue='+record.before.venue),'exact old Finance master destination');
    assert.deepEqual({...original.contract,url:canonical(original.contract.url)},{...record.before.contract,url:canonical(record.before.contract.url)},'old Finance master keeps its root contract');
    assert.equal(original.reloaded,undefined,'historical Finance master did not navigate');
    return releasedReportAction({id:'context:/reports:Продолжить закрытие'},original,candidate,record.before.venue,canonical);
  }
  if(!releasedRemoval(item)) return original;
  assert.ok(original&&!original.absent&&!original.disabled&&original.url,'historical removed action evaluated');
  assert.deepEqual(candidate,{absent:true},'only the specific released action is absent');
  const oldUrl=(item.from==='/warehouse'?'/sales-import?venue=':'/warehouse?add=inventory&venue=')+record.before.venue;
  assert.equal(canonical(original.url),canonical(oldUrl),'exact old removed action destination');
  assert.equal(canonical(original.reloaded?.url),canonical(oldUrl),'old removed action reload measured');
  if(item.from==='/warehouse') assertReleasedPlacement('/warehouse',record,versions);
  else {
    const expected=reportLinks(record.before.venue).find(entry=>entry.label==='Проверить границы месяца');
    const links=record.before.entries.filter(entry=>entry.label===expected.label);
    assert.equal(links.length,1,'exact canonical boundary capability');
    const actual={...links[0]};delete actual.index;
    assert.deepEqual(actual,expected,'enabled canonical month/venue boundary link');
  }
  return {absent:true};
}
