import fs from 'node:fs';
import {parse} from 'acorn';
const path='public/assets/index-BQGspy0I.js';let source=fs.readFileSync(path,'utf8');
const replacements={
 bdProcCompareV168:[
 ['Сравниваются только подтверждённые product key, валюта и нормализованная единица. Прайс-лист остаётся предложением, а не фактом закупки.','Сравниваем один и тот же товар в одной валюте, с пересчётом на одинаковое количество. Цена из прайса — предложение, а не совершённая закупка.'],
 ['"Цена за "+l.unit+" · "+l.currency','"Цена за "+l.unit'],
 ['Для сравнения нужны подтверждённые цены одного товара минимум у двух поставщиков в одной валюте и нормализованной единице.','Для сравнения нужны цены одного товара у двух поставщиков в одной валюте и с понятной фасовкой.'],
 ['Подтвердите закупочные документы и mapping. Неподтверждённые позиции не участвуют в сравнении.','Проверьте закупки и связь строк с товарами. Неподтверждённые позиции не участвуют в сравнении.']
 ],
 bdProcComparisonDetailV168:[
 ['copy:"Нормализованная цена за "+e.unit+" · "+e.currency','copy:"Цены за одинаковое количество: 1 "+e.unit'],
 ['children:[l&&i.jsxs("div",{className:"bd-proc-review-callout-v168 neutral"','children:[i.jsxs("div",{className:"bd-proc-review-callout-v168 neutral"'],
 ['Сравнение выполнено только по цене','Разница в цене — ещё не вся выгода'],
 ['Минимальный заказ, доставка, наличие и оплата не заполнены у обоих поставщиков. Более низкая цена не означает автоматически лучшие условия.','Доставка и минимальный заказ не входят в сумму экономии. Проверьте условия ниже; если данных нет, итоговая выгода пока неизвестна.'],
 ['children:m?"Текущий поставщик":h?"Потенциальная альтернатива":d.sourceKind==="price_list"?"Прайс-лист":"Подтверждённая закупка"','children:(m?"Текущий поставщик":h?"Возможная альтернатива":"Поставщик")+" · "+(d.sourceKind==="price_list"?"Цена из прайса":"Цена из прошлой закупки")'],
 ['label:"Актуальность"','label:"Дата цены"'],
 ['children:"Подтверждённая разница"','children:"Разница только в цене товара"'],
 ['"Оценка "+bdProcMoneyV168(e.estimatedMonthlySaving,e.currency)+" в месяц построена по "+e.estimateBasis.actualPurchaseDocuments+" фактическим документам за "+e.estimateBasis.actualMonths+" периода."','"Средняя разница: "+bdProcMoneyV168(e.estimatedMonthlySaving,e.currency)+" за месяц с закупками. Расчёт: "+bdProcMoneyV168(e.priceDifference,e.currency)+" × "+(e.estimateBasis.observedBaseAmount/(e.baseUnit==="g"||e.baseUnit==="ml"?1000:1)/e.estimateBasis.actualMonths).toLocaleString("ru",{maximumFractionDigits:3})+" "+e.unit+" в среднем. Основа: "+e.estimateBasis.actualPurchaseDocuments+" закупки за "+e.estimateBasis.actualMonths+" мес. с закупками."'],
 ['Месячный эффект не рассчитан: фактической истории объёма пока недостаточно.','Пока недостаточно закупок, чтобы оценить экономию за месяц.'],
 ['Действие: проверить условия альтернативы. Проверка результата: сравнить фактическую итоговую стоимость после следующей закупки.','Это оценка по сохранённым ценам, не обещание экономии. Уточните текущую цену и условия перед заказом.']
 ]
};
for(const [name,rules]of Object.entries(replacements)){
 const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);if(!node)throw Error(name+' missing');let body=source.slice(node.start,node.end);
 for(const [from,to]of rules)body=body.replace(from,to);
 body=body.replaceAll('bdProcMoneyV168(', 'window.bdFormatAccountingMoney(');
 source=source.slice(0,node.start)+body+source.slice(node.end);
}
fs.writeFileSync(path,source);console.log('Supplier comparison: factual prices, conditions and volume basis');
