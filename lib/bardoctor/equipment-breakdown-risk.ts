/** Uses explicit catalogue names only. A department, comment or model number is not a functional type. */
export function equipmentBreakdownRisk(equipment: Record<string, unknown>) {
  const name = String(equipment.name || '').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е');
  const has = (pattern: string) => new RegExp('(?:^|[^\\p{L}\\p{N}])(?:' + pattern + ')(?:$|[^\\p{L}\\p{N}])', 'u').test(name);
  const rules = [
    ['refrigeration', 'холодильник|холодильная витрина|холодильная камера|холодильный шкаф|морозильник|морозильная камера|refrigerator|freezer', 'Риск порчи товара, дополнительных списаний и появления позиций в стоп-листе'],
    ['cooking', 'плита|печь|духовой шкаф|пароконвектомат|фритюрница|гриль|индукционная плита|cooking range|oven', 'Задержки приготовления и возможное появление блюд в стоп-листе'],
    ['coffee', 'кофемашина|кофеварка|кофемолка|coffee machine|espresso machine', 'Возможное появление кофейных напитков в стоп-листе'],
    ['ice', 'льдогенератор|генератор льда|ice maker', 'Нехватка льда и возможное появление напитков со льдом в стоп-листе'],
    ['dishwasher', 'посудомоечная машина|посудомойка|стаканомоечная машина|dishwasher', 'Нехватка чистой посуды и задержки обслуживания'],
    ['extraction', 'вытяжка|вытяжной зонт|вытяжная вентиляция|extractor hood', 'Дым, пар, запахи и ухудшение условий работы'],
    ['comfort', 'кондиционер|система кондиционирования|air conditioner', 'Нарушение температурного комфорта'],
    ['lighting', 'рабочий свет|рабочее освещение|светильник|светильники|освещение|work light', 'Затруднение работы в зоне освещения'],
    ['pos', 'касса|кассовый аппарат|кассовый терминал|pos terminal', 'Задержки при оформлении заказов и расчёте с гостями'],
    ['plumbing', 'раковина|мойка|смеситель|унитаз|сантехника|sink|toilet', 'Ограничения использования затронутой точки'],
  ];
  const found = rules.filter(([, pattern]) => has(pattern));
  const match = found.length === 1 && !has('не|без|кондиционер для волос') ? found[0] : null;
  return { version: 2, kind: match?.[0] || 'unknown', basis: 'equipment_name',
    source: { equipmentId: String(equipment.id || ''), name: String(equipment.name || ''), category: String(equipment.category || ''), zone: String(equipment.zone || equipment.area || '') },
    risk: match?.[2] || null };
}
