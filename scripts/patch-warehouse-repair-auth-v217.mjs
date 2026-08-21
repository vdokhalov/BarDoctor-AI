import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let bundle = await readFile(bundlePath, "utf8");

const oldRequest = 'async function bdWarehouseRepairProducts(){try{const B=await fetch("/api/inventory/products",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"repair"})})';
const newRequest = 'async function bdWarehouseRepairProducts(){try{const B=await fetch("/api/inventory/products",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({action:"repair"})})';

if (bundle.includes(oldRequest)) bundle = bundle.replace(oldRequest, newRequest);
else if (!bundle.includes(newRequest)) throw new Error("Warehouse repair request anchor not found");

await writeFile(bundlePath, bundle);
