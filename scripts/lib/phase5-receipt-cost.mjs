function replaceState(source, before, after, label) {
  const oldCount = source.split(before).length - 1;
  const newCount = source.split(after).length - 1;
  if (oldCount + newCount !== 1) throw new Error(`Phase 5: unique ${label} required`);
  return oldCount === 1 ? source.replace(before, after) : source;
}
/** Independently regenerated segments require independent, strict state checks. */
export function patchReceiptCost(input) {
  let source = input.replaceAll("/* bd-phase5-receipt-only-cost */\n", "");
  const start = source.indexOf("function bdTechCostManualPointV409(");
  const end = source.indexOf("function bdTechCostResolvedAmountV385", start);
  if (start < 0 || end <= start || source.indexOf("function bdTechCostManualPointV409(", start + 1) !== -1) throw new Error("Phase 5: unique legacy manual cost function required");
  source = source.slice(0, start) + "/* bd-phase5-receipt-only-cost */\nfunction bdTechCostManualPointV409(){return null}\n" + source.slice(end);
  source = replaceState(source, 'children:"Последняя цена, если известна"', 'children:"Справочная цена (не себестоимость)"', "manual price field");
  return replaceState(source,
    '"Цена сохранится как справочная; документ закупки остаётся authoritative источником стоимости."',
    '"Справочная цена не участвует в себестоимости. Начальную оценку остатков можно указать в разделе «Начальные остатки / импорт»."',
    "manual price explanation");
}
