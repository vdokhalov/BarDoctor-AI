import assert from 'node:assert/strict';

// Narrow v517 expectations for the October owner fixture, WebKit 390/820/1280 only.
// These transform historical expectations, never filter candidate controls.
export const reportDayLabel = '2 окт.Выручка 200,00 MDL · Себестоимость — · ФОТ Неизвестно · Постоянные 3,00 MDLНеизвестно';
export const reportMasterLabel = 'Мастер закрытия месяца8 последовательных проверок→';
export function releasedActionLabel(path, label) {
  if (path !== '/reports') return label;
  if (label === 'Продолжить закрытие') return reportMasterLabel;
  if (label === reportDayLabel) return label.replace('MDLНеизвестно', 'MDLДо себестоимости: Неизвестно');
  return label;
}
export const normalized = value => value.replace(/[\d.,]+/g, '').trim().replace(/\s+/g, ' ');
export const releasedViewport = (engine,width) => engine === 'webkit' && [390,820,1280].includes(width);
export function releasedScope(path, before, engine, width) {
  return releasedViewport(engine,width) &&
    ((path === '/reports' && before.contract.type === 'report') ||
     (path === '/more' && before.contract.type === 'root'));
}
export function reportLinks(venue) {
  return [
    ['Проверить зарплаты', '/salaries'],
    ['Открыть источник', '/shifts?workday=2026-10-02'],
    ['Сверить оплаченные продажи', '/sales-import'],
    ['Открыть источник', '/sales-import'],
    ['Проверить пакет продаж', '/sales-import'],
    ['Открыть источник', '/sales-import'],
    ['Посмотреть выбранный период', '/reports'],
    ['Открыть источник', '/finance'],
    ['Проверить границы месяца', '/reports?closeMonth=1'],
    ['Открыть источник', '/warehouse'],
  ].map(([label, path]) => ({label, tag: 'A', href: path + (path.includes('?') ? '&' : '?') + 'month=2026-10&venue=' + venue, disabled: false, nav: false}));
}
export function releasedEntries(path, entries, venue) {
  const result = structuredClone(entries);
  const anchor = path === '/more' ? 'Оборудование' : 'Продолжить закрытие';
  const positions = result.flatMap((entry, index) => entry.label === normalized(anchor) ? [index] : []);
  assert.equal(positions.length, 1, 'released historical anchor must be unique');
  const index = positions[0];
  assert.deepEqual(result[index], {label: normalized(anchor), tag: 'BUTTON', href: null, disabled: false, nav: false}, 'historical anchor semantics');
  if (path === '/more') result.splice(index, 0, {label: 'Продажи', tag: 'BUTTON', href: null, disabled: false, nav: false});
  else {
    assert.equal(result.filter(entry => entry.label === normalized(reportDayLabel)).length, 1, 'exact historical fixture day');
    result[index].label = normalized(reportMasterLabel);
    for (const entry of result) if (entry.label === normalized(reportDayLabel)) entry.label = normalized(releasedActionLabel(path, reportDayLabel));
    result.splice(index, 0, ...reportLinks(venue));
  }
  return result;
}
export function releasedReportContract(contract) {
  if (!contract || contract.type !== 'report' || contract.path !== '/reports' || contract.parent !== '/finance') return contract;
  const url = new URL(contract.url, 'http://isolated.test'), parent = new URL('/finance', url.origin);
  for (const key of ['month', 'venue']) if (url.searchParams.has(key)) parent.searchParams.set(key, url.searchParams.get(key));
  return {...contract, parent: parent.pathname + parent.search};
}
export function assertSalesEntry(record, venue) {
  assert.deepEqual(record.salesEntry, {visible: true, destination: '/sales-import', reload: '/sales-import', venue}, 'More Sales click and reload must be measured');
}
export function reportWizardContract(venue) {
  return {type: 'wizard', title: 'Закрытие периода', parent: '/reports?month=2026-10&venue=' + venue, headerMode: 'underlay', path: '/reports', url: '/reports?month=2026-10&closeMonth=1&venue=' + venue, shell: 'standard', bottomNav: true};
}
export function releasedReportAction(item, original, candidate, venue, canonical) {
  if (item.id !== 'context:/reports:Продолжить закрытие') return original;
  assert.ok(original && !original.absent && !original.disabled && original.url, 'historical Reports action evaluated');
  assert.ok(candidate && !candidate.absent && !candidate.disabled, 'released Reports action must be actionable');
  const expected = reportWizardContract(venue);
  assert.equal(canonical(candidate.url), canonical(expected.url), 'Reports master destination');
  assert.deepEqual({...candidate.contract, url: canonical(candidate.contract.url), parent: canonical(candidate.contract.parent)}, {...expected, url: canonical(expected.url), parent: canonical(expected.parent)}, 'Reports master exact contract');
  assert.ok(candidate.reloaded, 'Reports master reload measured');
  assert.equal(candidate.reloaded.venue, venue, 'Reports master reload venue');
  assert.equal(canonical(candidate.reloaded.url), canonical(expected.url), 'Reports master reload route');
  assert.deepEqual({...candidate.reloaded.contract, url: canonical(candidate.reloaded.contract.url), parent: canonical(candidate.reloaded.contract.parent)}, {...expected, url: canonical(expected.url), parent: canonical(expected.parent)}, 'Reports master reload contract');
  // Every new wizard control is required; this does not excuse missing old controls.
  const controls = ['Закрыть мастер', 'Проверка всех смен', 'Оплаты и остальные расходы', 'Начальные остатки', 'Конечные остатки', 'Списания', 'ФОТ, налоги и коммунальные услуги', 'Финальная прибыль', 'Подтверждение и закрытие периода', 'Открыть закрытие смены', 'Далее'];
  for (const label of controls) assert.equal(candidate.opened.filter(entry => normalized(entry.label) === normalized(label) && entry.tag === 'BUTTON' && entry.href === null).length, 1, 'wizard control: ' + label);
  for (const [label, href] of new Map(reportLinks(venue).map(entry => [entry.label + '\n' + entry.href, [entry.label, entry.href]])).values()) {
    const count = reportLinks(venue).filter(entry => entry.label === label && entry.href === href).length;
    assert.equal(candidate.opened.filter(entry => entry.label === label && entry.href === href && entry.tag === 'A').length, count * 2, 'report and wizard source links');
  }
  return {...original, url: expected.url, contract: expected, reloaded: {...original.reloaded, url: expected.url}};
}
