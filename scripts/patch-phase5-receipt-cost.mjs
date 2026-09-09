import fs from "node:fs";
const file = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(file, "utf8");
const marker = "bd-phase5-receipt-only-cost";
if (!source.includes(marker)) {
  const start = source.indexOf("function bdTechCostManualPointV409(");
  const end = source.indexOf("function bdTechCostResolvedAmountV385", start);
  if (start < 0 || end <= start || source.indexOf("function bdTechCostManualPointV409(", start + 1) !== -1) throw new Error("Phase 5: unique legacy manual cost function required");
  // Preserve the compatibility entry point but prohibit inventing receipt provenance.
  source = source.slice(0, start) + `/* ${marker} */\nfunction bdTechCostManualPointV409(){return null}\n` + source.slice(end);
  const label = 'children:"Последняя цена, если известна"';
  if (source.split(label).length !== 2) throw new Error("Phase 5: unique manual price field required");
  source = source.replace(label, 'children:"Справочная цена (не себестоимость)"');
  source = source.replace('"Цена сохранится как справочная; документ закупки остаётся authoritative источником стоимости."', '"Справочная цена не участвует в себестоимости. Начальную оценку остатков можно указать в разделе «Начальные остатки / импорт»."');
  fs.writeFileSync(file, source);
}
console.log("Phase 5: receipt-only operational costing applied");
