import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  'function bdProcSuggestedPackageV209(e,t){const n=String(t||"").trim(),r=/^(?:1\\s*)?шт\\.?$/i.test(n)?"1 шт.":n;if(r&&r!=="1 шт.")return r;const a=String(e||"").toLocaleLowerCase("ru").replace(/ё/g,"е");return/молок|кефир|ряженк|айран|питьев.*йогурт/.test(a)?"1 л":/мука|сахар|рис|гречк|крупа|соль\\b/.test(a)?"1 кг":r||"1 шт."}',
  'function bdProcSuggestedPackageV209(e,t){const n=String(t||"").trim(),r=/^(?:1\\s*)?шт\\.?$/i.test(n)?"1 шт.":n;if(r&&r!=="1 шт.")return r;const a=String(e||"").toLocaleLowerCase("ru").replace(/ё/g,"е");return/реклам|smm|продвиж|таргет|маркетинг|ремонт|монтаж|установк|настройк|обслуживан|диагност|аренд|коммунал|доставк|перевоз|обучен|консультац|подписк|лицензи|услуг/.test(a)?"1 усл.":/молок|кефир|ряженк|айран|питьев.*йогурт/.test(a)?"1 л":/мука|сахар|рис|гречк|крупа|соль\\b/.test(a)?"1 кг":r||"1 шт."}',
  "service package inference",
);

replaceOnce(
  'd=e.items.reduce((f,m)=>f+(Number(m.lineTotal)||0),0),f=()=>',
  'd=e.items.reduce((f,m)=>f+(Number(m.lineTotal)||0),0);S.useEffect(()=>{if(e.source!=="manual"||e.documentType==="price_list")return;const f=Math.round(d*100)/100;Number(e.total)!==f&&l("total",f)},[d,e.documentType,e.source]);const f=()=>',
  "manual total synchronization",
);

replaceOnce(
  'p>0&&oe?p+" позиций поставлено на приход, оплата отражена в расходах.":p>0?p+" позиций поставлено на приход. Покупка сохранена как долг поставщику.":oe?"Покупка отражена в расходах без изменения склада.":"Покупка сохранена как долг поставщику без изменения склада."',
  'p>0&&oe?bdProcPluralV168(p,"1 позиция поставлена","позиции поставлены","позиций поставлено")+" на приход, оплата отражена в расходах.":p>0?bdProcPluralV168(p,"1 позиция поставлена","позиции поставлены","позиций поставлено")+" на приход. Покупка сохранена как долг поставщику.":oe?"Покупка отражена в расходах без изменения склада.":"Покупка сохранена как долг поставщику без изменения склада."',
  "purchase result pluralization",
);

source += '\nconst bdPurchasePracticalQaV211="v211";\n';
await writeFile(bundlePath, source);
