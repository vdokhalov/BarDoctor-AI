import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

const start = source.indexOf("function bdPurchaseReview");
const end = source.indexOf("const bdImageUploadVersion", start);
if (start < 0 || end < 0) throw new Error("Missing purchase review section");

let section = source.slice(start, end);

const helpers = String.raw`
const bdProcPackageGroupsV209=[{label:"Штучная и упаковки",options:["1 шт.","10 шт.","12 шт.","20 шт.","24 шт.","1 уп.","1 пачка","1 коробка","1 усл."]},{label:"Объём",options:["50 мл","100 мл","200 мл","250 мл","330 мл","500 мл","700 мл","750 мл","0,25 л","0,33 л","0,5 л","0,7 л","0,75 л","0,9 л","1 л","1,5 л","2 л","5 л","10 л","20 л"]},{label:"Вес",options:["50 г","100 г","200 г","250 г","400 г","500 г","1 кг","2 кг","5 кг","10 кг","25 кг"]}],bdProcPackagePresetsV209=bdProcPackageGroupsV209.flatMap(e=>e.options);
function bdProcCurrentPackageV209(e){const t=String(e?.packageSize||e?.unit||"").trim();return/^(?:1\s*)?шт\.?$/i.test(t)?"1 шт.":t}
function bdProcPackageUnitV209(e){const t=String(e||"").toLocaleLowerCase("ru");return/мл/.test(t)?"мл":/(?:^|\s)л(?:\s|\.|$)|литр/.test(t)?"л":/кг/.test(t)?"кг":/(?:^|\s)г(?:\s|\.|$)|грамм/.test(t)?"г":/усл/.test(t)?"усл.":"шт."}
function bdProcPackageUpdateV209(e){return{packageSize:e,unit:bdProcPackageUnitV209(e)}}
function bdProcSuggestedPackageV209(e,t){const n=String(t||"").trim(),r=/^(?:1\s*)?шт\.?$/i.test(n)?"1 шт.":n;if(r&&r!=="1 шт.")return r;const a=String(e||"").toLocaleLowerCase("ru").replace(/ё/g,"е");return/молок|кефир|ряженк|айран|питьев.*йогурт/.test(a)?"1 л":/мука|сахар|рис|гречк|крупа|соль\b/.test(a)?"1 кг":r||"1 шт."}
`;

section = helpers + section;

const oldName = 'i.jsx(bdProcField,{label:"Товар или услуга",children:i.jsx("input",{value:g.name,onChange:j=>u(g.id,{name:j.target.value}),placeholder:"Название товара"})})';
const newName = 'i.jsx(bdProcField,{label:"Товар или услуга",children:i.jsx("input",{value:g.name,onChange:j=>{const v=j.target.value,b=bdProcSuggestedPackageV209(v,bdProcCurrentPackageV209(g));u(g.id,{name:v,...b!==bdProcCurrentPackageV209(g)?bdProcPackageUpdateV209(b):{}})},placeholder:"Название товара"})})';
if (!section.includes(oldName)) throw new Error("Missing purchase item name input");
section = section.replace(oldName, newName);

const oldPackage = 'i.jsx(bdProcField,{label:"Единица / фасовка",children:i.jsx("input",{value:g.packageSize||g.unit||"",onChange:j=>u(g.id,{packageSize:j.target.value}),placeholder:"1 л, 500 г, шт."})})';
const newPackage = 'i.jsx(bdProcField,{label:"Фасовка одной единицы",children:i.jsxs("div",{className:"bd-procurement-package-editor-v209",children:[i.jsxs("select",{"aria-label":"Выбрать стандартную фасовку",value:bdProcPackagePresetsV209.includes(bdProcCurrentPackageV209(g))?bdProcCurrentPackageV209(g):"",onChange:j=>{const v=j.target.value;v&&u(g.id,bdProcPackageUpdateV209(v))},children:[i.jsx("option",{value:"",children:"Выбрать фасовку"}),...bdProcPackageGroupsV209.map(j=>i.jsx("optgroup",{label:j.label,children:j.options.map(v=>i.jsx("option",{value:v,children:v},v))},j.label))]}),i.jsx("input",{"aria-label":"Своя фасовка",value:bdProcCurrentPackageV209(g),onChange:j=>u(g.id,bdProcPackageUpdateV209(j.target.value)),placeholder:"Или введите свою: 0,9 л"})]})})';
if (!section.includes(oldPackage)) throw new Error("Missing package input");
section = section.replace(oldPackage, newPackage);

source = source.slice(0, start) + section + source.slice(end);
await writeFile(bundlePath, source);
