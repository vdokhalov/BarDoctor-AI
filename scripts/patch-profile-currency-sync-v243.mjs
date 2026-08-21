import fs from "node:fs";
import path from "node:path";

const bundlePath = path.resolve("public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");
const from = 'function ZCe({open:e,profile:t,onClose:n,onSave:r}){const[a,s]=S.useState(()=>QCe(t)),{revenue:l,expenses:u}=Ur(),d=';
const to = 'function ZCe({open:e,profile:t,onClose:n,onSave:r}){const[a,s]=S.useState(()=>QCe(t));S.useEffect(()=>{e&&t&&s(QCe(t))},[e,t]);const{revenue:l,expenses:u}=Ur(),d=';
const count = source.split(from).length - 1;
if (count !== 1) throw new Error(`profile currency sync: expected one match, found ${count}`);
source = source.replace(from, to);
fs.writeFileSync(bundlePath, source);
console.log("Applied venue profile currency sync v243.");
