import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let bundle = await readFile(bundlePath, "utf8");

const oldOptions = 'children:[i.jsx("option",{value:"sections",children:"По разделам"}),i.jsx("option",{value:"categories",children:"По категориям"}),i.jsx("option",{value:"list",children:"Списком"})]';
const newOptions = 'children:[i.jsx("option",{value:"sections",children:"Разделы и подразделы"}),i.jsx("option",{value:"categories",children:"По категориям"}),i.jsx("option",{value:"subcategories",children:"По подразделам"}),i.jsx("option",{value:"list",children:"Списком"})]';

if (bundle.includes(oldOptions)) bundle = bundle.replace(oldOptions, newOptions);
else if (!bundle.includes(newOptions)) throw new Error("Warehouse group options anchor not found");

await writeFile(bundlePath, bundle);
