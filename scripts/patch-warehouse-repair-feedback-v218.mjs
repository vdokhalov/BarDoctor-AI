import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let bundle = await readFile(bundlePath, "utf8");

const oldRepairs = [
  'async function bdWarehouseRepairProducts(){try{const B=await fetch("/api/inventory/products",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({action:"repair"})}),U=await B.json();if(B.ok&&U?.ok&&U.assortment){Kse("bd_assortment_v1",U.assortment);const Q=bdWarehouseCanonicalBalances(U.assortment);E(Q)}}catch{}}',
  'async function bdWarehouseRepairProducts(){try{const B=await fetch("/api/inventory/products",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({action:"repair"})}),U=await B.json();if(!B.ok||!U?.ok)throw new Error(U?.error||"Сервер не выполнил очистку");if(U.assortment){Kse("bd_assortment_v1",U.assortment);const Q=bdWarehouseCanonicalBalances(U.assortment);E(Q)}U.duplicateRepair?.changed&&l({variant:"success",title:"Дубли объединены",description:"Склад и номенклатура обновлены."})}catch(B){l({variant:"error",title:"Очистка дублей не выполнена",description:B instanceof Error?B.message:"Повторите попытку позже."})}}',
];
const newRepair = 'async function bdWarehouseRepairProducts(){try{const B=await fetch("/api/inventory/products",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({action:"repair"})}),U=await B.text();let Q={};try{Q=U?JSON.parse(U):{}}catch{}if(!B.ok||!Q?.ok)throw new Error(Q?.error||"Ошибка сервера "+B.status);if(Q.assortment){Kse("bd_assortment_v1",Q.assortment);const H=bdWarehouseCanonicalBalances(Q.assortment);E(H)}Q.duplicateRepair?.changed&&l({variant:"success",title:"Дубли объединены",description:"Склад и номенклатура обновлены."})}catch(B){l({variant:"error",title:"Очистка дублей не выполнена",description:B instanceof Error?B.message:"Повторите попытку позже."})}}';

const oldRepair = oldRepairs.find((candidate) => bundle.includes(candidate));
if (oldRepair) bundle = bundle.replace(oldRepair, newRepair);
else if (!bundle.includes(newRepair)) throw new Error("Warehouse repair feedback anchor not found");

await writeFile(bundlePath, bundle);
