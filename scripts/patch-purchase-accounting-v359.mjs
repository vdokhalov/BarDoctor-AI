import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const assetPath = path.join(root, "public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(assetPath, "utf8");

const marker = "bd-purchase-accounting-v359";

source = source.replace(
  /\/\* bd-purchase-articles-v358 \*\/[\s\S]*?(?=\/\* bd-purchase-accounting-v359 \*\/)/,
  "",
);

source = source.replace(
  "function function bdNomenclatureInitialFormV237",
  "function bdNomenclatureInitialFormV237",
);
source = source.replace(
  'function bdExpenseArea(e){return e.area||({products:"Складские запасы",alcohol:"Складские запасы",food:"Складские запасы",consumables:"Складские запасы",hookah:"Складские запасы",household:"Складские запасы",equipment:"Оборудование и инвентарь",repairs:"Ремонт и обслуживание",marketing:"Маркетинг и реклама",other:"Прочее"})[e.category]||"Не распределено"}',
  'function bdExpenseArea(e){return e.area||({products:"Продукты",alcohol:"Алкоголь",food:"Кухня и напитки",consumables:"Расходники",hookah:"Кальяны",household:"Хоз.товары",equipment:"Оборудование",repairs:"Ремонт",marketing:"Маркетинг",other:"Прочее"})[e.category]||"Не распределено"}',
);

function replaceEither(searches, replacement, expected, label) {
  if (source.includes(replacement)) return;
  const count = searches.reduce((total, search) => total + source.split(search).length - 1, 0);
  if (count !== expected) {
    throw new Error(`${label}: expected ${expected} replacement target(s), found ${count}`);
  }
  for (const search of searches) source = source.split(search).join(replacement);
}

if (!source.includes(marker)) {
  const nomenclatureAnchor = "function bdNomenclatureInitialFormV237";
  if (!source.includes(nomenclatureAnchor)) throw new Error("Nomenclature editor anchor not found");
  source = source.replace(nomenclatureAnchor, `/* ${marker} */
const bdProcStockArticleKeysV359=new Set(["products","alcohol","food","consumables","hookah","household"]);
const bdProcNonStockLabelsV359={equipment:"Оборудование и инвентарь",repairs:"Ремонт и обслуживание",marketing:"Маркетинг и реклама",other:"Прочая услуга"};
function bdServiceExpenseOptionsV359(current){
  const value=String(current||"other"),options=[["equipment","Оборудование и инвентарь"],["repairs","Ремонт и обслуживание"],["marketing","Маркетинг и реклама"],["other","Прочая услуга"]];
  return options.some(([key])=>key===value)?options:[[value,"Прочая услуга"],...options];
}
function bdProcLineAccountingV359(line){
  const category=String(line?.category||"products"),stock=bdProcStockArticleKeysV359.has(category);
  return{stock,label:stock?"Складской приход":bdProcNonStockLabelsV359[category]||"Расход без склада",summary:stock?bdProcStockPreviewV221(line):bdProcNonStockLabelsV359[category]||"Без складского прихода"};
}
function bdProcAccountingSummaryV359(items){
  const lines=Array.isArray(items)?items:[],stock=lines.filter(line=>bdProcStockArticleKeysV359.has(String(line?.category||"products"))).length,nonStock=lines.length-stock;
  if(!lines.length)return{label:"Учет по позициям",detail:"Добавьте позиции — BarDoctor определит складской приход автоматически"};
  if(stock===lines.length)return{label:"Складской приход",detail:"Все позиции увеличат остатки; раздел и категория берутся из номенклатуры"};
  if(nonStock===lines.length){const labels=[...new Set(lines.map(line=>bdProcNonStockLabelsV359[String(line?.category||"")]||"Расход без склада"))];return{label:labels.length===1?labels[0]:"Расход без склада",detail:"Складские остатки не изменятся"}}
  return{label:"Смешанная закупка",detail:"На склад: "+stock+" · без склада: "+nonStock};
}
function bdProcAccountingAutoV359({items}){const summary=bdProcAccountingSummaryV359(items);return i.jsxs("p",{className:"bd-receiving-accounting-note-v357","data-bd-purchase-accounting":"automatic-v359",children:[i.jsx("strong",{children:summary.label})," · ",summary.detail]})}
function bdProcLineAccountingNoticeV359({line}){const accounting=bdProcLineAccountingV359(line);return i.jsxs("div",{className:"bd-procurement-stock-preview-v221","data-bd-line-accounting":accounting.stock?"stock":"non-stock",children:[i.jsx("span",{children:accounting.stock?"На склад поступит":"Учет без склада"}),i.jsx("strong",{children:accounting.summary})]})}
function bdProcDocumentAccountingLabelV359(items){return bdProcAccountingSummaryV359(items).label}
${nomenclatureAnchor}`);

  const legacyOptions = 'N=[["products","Продукты"],["alcohol","Алкоголь"],["food","Кухня и напитки"],["consumables","Расходники"],["hookah","Кальян"],["household","Хозтовары"],["equipment","Оборудование"],["repairs","Ремонт"],["marketing","Маркетинг"],["other","Прочее"]]';
  replaceEither(
    [legacyOptions, "N=bdNomenclaturePurchaseArticleOptionsV358(u.kind,u.category)"],
    "N=bdServiceExpenseOptionsV359(u.category)",
    2,
    "service accounting options",
  );

  const fieldA = (label) => `i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"${label}"}),i.jsx("select",{value:u.category,onChange:P=>A("category",P.target.value),children:N.map(([P,C])=>i.jsx("option",{value:P,children:C},P))})]})`;
  replaceEither(
    [fieldA("Статья покупки"), fieldA("Учет покупки")],
    'u.kind==="service"&&i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Что покупаем"}),i.jsx("select",{value:u.category,onChange:P=>A("category",P.target.value),children:N.map(([P,C])=>i.jsx("option",{value:P,children:C},P))})]})',
    1,
    "modern nomenclature accounting field",
  );

  const fieldE = (label) => `i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"${label}"}),i.jsx("select",{value:u.category,onChange:P=>E("category",P.target.value),children:N.map(([P,C])=>i.jsx("option",{value:P,children:C},P))})]})`;
  replaceEither(
    [fieldE("Статья покупки"), fieldE("Учет покупки")],
    'u.kind==="service"&&i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Что покупаем"}),i.jsx("select",{value:u.category,onChange:P=>E("category",P.target.value),children:N.map(([P,C])=>i.jsx("option",{value:P,children:C},P))})]})',
    1,
    "legacy nomenclature accounting field",
  );

  replaceEither(
    ['if(P==="kind"&&C==="service")return{...D,kind:C,itemType:"other",unit:"pcs",packageSize:"1 усл.",category:"other",purchaseMode:"document",displayUnit:"auto"};'],
    'if(P==="kind")return C==="service"?{...D,kind:C,itemType:"other",unit:"pcs",packageSize:"1 усл.",unitPackageSize:"1 усл.",category:"other",purchaseMode:"document",displayUnit:"auto"}:{...D,kind:C,itemType:"product",unit:"pcs",packageSize:"1 шт.",unitPackageSize:"1 шт.",category:"products",purchaseMode:"document",displayUnit:"auto"};',
    1,
    "modern kind transition",
  );
  replaceEither(
    ['if(P==="kind"&&C==="service")return{...D,kind:C,unit:"pcs",packageSize:"1 усл.",category:"other"};'],
    'if(P==="kind")return C==="service"?{...D,kind:C,unit:"pcs",packageSize:"1 усл.",category:"other"}:{...D,kind:C,unit:"pcs",packageSize:"1 шт.",category:"products"};',
    1,
    "legacy kind transition",
  );

  replaceEither(
    ['children:"Товар — учитывать на складе"'],
    'children:"Товар — поступает на склад"',
    2,
    "stock type copy",
  );
  replaceEither(
    ['children:"Услуга — без склада"'],
    'children:"Без склада — услуга или имущество"',
    2,
    "non-stock type copy",
  );

  const categoryLabels = 'const bdProcCategoryLabels={products:"Продукты",alcohol:"Алкоголь",food:"Кухня и напитки",consumables:"Расходники",hookah:"Кальян",household:"Хозтовары",equipment:"Оборудование",repairs:"Ремонт",marketing:"Маркетинг",other:"Прочее"};';
  replaceEither(
    [categoryLabels],
    'const bdProcCategoryLabels={products:"Складские запасы",alcohol:"Складские запасы",food:"Складские запасы",consumables:"Складские запасы",hookah:"Складские запасы",household:"Складские запасы",equipment:"Оборудование и инвентарь",repairs:"Ремонт и обслуживание",marketing:"Маркетинг и реклама",other:"Прочее"};',
    source.includes(categoryLabels) ? 1 : 0,
    "procurement display labels",
  );

  const originalReviewField = 'i.jsx(bdProcField,{label:"Категория закупки",children:i.jsx("select",{value:e.expenseCategory||"auto",onChange:g=>l("expenseCategory",g.target.value),children:[i.jsx("option",{value:"auto",children:"Определить автоматически"}),...Object.entries(bdProcCategoryLabels).map(([key,label])=>i.jsx("option",{value:key,children:label},key))]})})';
  const v358ReviewField = 'i.jsx(bdProcField,{label:"Учет закупки",children:i.jsx("select",{value:e.expenseCategory||"auto",onChange:g=>l("expenseCategory",g.target.value),children:[i.jsx("option",{value:"auto",children:"Определить автоматически"}),...bdProcCategoryOptionsV358(e.expenseCategory).map(([key,label])=>i.jsx("option",{value:key,children:label},key))]})})';
  replaceEither(
    [originalReviewField, v358ReviewField],
    'i.jsx(bdProcAccountingAutoV359,{items:e.items})',
    1,
    "automatic purchase accounting",
  );

  replaceEither(
    ['category:e.expenseCategory||"products"'],
    'category:"products"',
    1,
    "new line stock default",
  );
  replaceEither(
    ['a({purchaseProductKey:k.key,nomenclatureId:k.id,nomenclatureName:k.name,name:e.rawName||e.name,requiresReview:!1,mappingSource:"manual",confidence:1,confidenceLevel:"high"})'],
    'a({purchaseProductKey:k.key,nomenclatureId:k.id,nomenclatureName:k.name,name:e.rawName||e.name,category:k.category||e.category||"products",requiresReview:!1,mappingSource:"manual",confidence:1,confidenceLevel:"high"})',
    1,
    "line accounting from canonical item",
  );
  replaceEither(
    ['i.jsx("small",{children:bdProcStockPreviewV221(line)})'],
    'i.jsx("small",{children:bdProcLineAccountingV359(line).summary})',
    1,
    "line accounting summary",
  );
  replaceEither(
    ['i.jsxs("div",{className:"bd-procurement-stock-preview-v221",children:[i.jsx("span",{children:"На склад поступит"}),i.jsx("strong",{children:bdProcStockPreviewV221(line)})]})'],
    'i.jsx(bdProcLineAccountingNoticeV359,{line})',
    1,
    "line accounting notice",
  );

  replaceEither(
    ['i.jsx(bdDetailFact,{label:"Категория",value:bdProcCategoryLabels[n.expenseCategory]||"Закупка"})'],
    'i.jsx(bdDetailFact,{label:"Учет",value:bdProcDocumentAccountingLabelV359(n.items)})',
    1,
    "document detail accounting label",
  );
  replaceEither(
    ['i.jsx("span",{className:"bd-procurement-chip",children:bdProcCategoryLabels[p.expenseCategory]||"Закупка"})'],
    'i.jsx("span",{className:"bd-procurement-chip",children:bdProcDocumentAccountingLabelV359(p.items)})',
    1,
    "document card accounting label",
  );
  replaceEither(
    ['children:"Перед сохранением вы проверите магазин, товары, цены, категорию и итог. После подтверждения закупка попадёт в расходы и историю цен."'],
    'children:"Перед сохранением вы проверите поставщика, позиции, фасовки и итог. Складской учет определится по связанным позициям номенклатуры."',
    1,
    "procurement hero copy",
  );
}

fs.writeFileSync(assetPath, source);

for (const relativePath of [
  "app/bar-doctor-response.ts",
  "public/app.html",
  "public/bardoctor-preview.js",
]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(/-bd-purchase-articles-v358/g, "");
  contents = contents.replace(/index-BQGspy0I\.js\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : `index-BQGspy0I.js?v=${version}-${marker}`
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
