import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const shellPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdMenuNomenclatureLinkVersion="v352"';

function refreshShellCache() {
  for (const shellPath of shellPaths) {
    const current = readFileSync(shellPath, "utf8");
    const next = current.replaceAll(
      "20260829-menu-nomenclature-action-v351",
      "20260829-menu-nomenclature-action-v351-menu-link-v352",
    );
    if (next !== current) writeFileSync(shellPath, next);
  }
}

if (source.includes(marker)) {
  refreshShellCache();
  console.log("Menu nomenclature link v352 is already applied.");
  process.exit(0);
}
if (!source.includes('const bdMenuNomenclatureFlowVersion="v350"')) {
  throw new Error("Menu nomenclature flow v350 must be applied first.");
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

function replaceScopedOnce(scopeStart, before, after, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const index = source.indexOf(before, scopeIndex + scopeStart.length);
  if (index < 0) throw new Error(`${label}: marker not found inside scope`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  'const bdMenuNomenclatureFlowVersion="v350";',
  'const bdMenuNomenclatureFlowVersion="v350";\n' + marker + ';',
  "insert v352 marker",
);

replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  "async function M(D){let L=D;",
  "async function M(D,z){let L=D,Q=z;",
  "carry authoritative assortment through quick create",
);
replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  'q.assortment&&Kse("bd_assortment_v1",q.assortment),L=q.product||D',
  'q.assortment&&(Kse("bd_assortment_v1",q.assortment),Q=q.assortment),L=q.product||D',
  "carry restored assortment",
);
replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  "},L),n()}async function D",
  "},L,Q),n()}async function D",
  "return authoritative assortment to active workflow",
);
replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  "M(L.product)}catch(L)",
  "M(L.product,L.assortment)}catch(L)",
  "return created assortment",
);

replaceScopedOnce(
  "function bdCatMenuEditor",
  "products:bdMenuProducts=[],unitOptions:bdMenuUnitOptions})",
  "products:bdMenuProducts=[],unitOptions:bdMenuUnitOptions,onNomenclatureCreated:bdMenuOnNomenclatureCreatedV352})",
  "accept menu nomenclature state update",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  "bdMenuVisibleProductsV350=E.filter(P=>!bdMenuProductQueryV350.trim()||bdProcNorm(P.name).includes(bdProcNorm(bdMenuProductQueryV350))).slice(0,50),_=E.find",
  "bdMenuVisibleProductsV350=E.filter(P=>!bdMenuProductQueryV350.trim()||bdProcNorm(P.name).includes(bdProcNorm(bdMenuProductQueryV350))).slice(0,50),bdMenuExactProductsV352=!h.readyProduct?.productKey&&h.type===\"ready\"?E.filter(P=>bdProcNorm(P.name)===bdProcNorm(h.name)):[],_=E.find",
  "find one exact existing product",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  "T=bdMenuPackageLabelsV298(_),A=h.readyProduct?.packageLabel",
  "T=bdMenuPackageLabelsV298(_),bdMenuExactProductV352=bdMenuExactProductsV352.length===1?bdMenuExactProductsV352[0]:null;S.useEffect(()=>{if(!bdMenuExactProductV352)return;const P=bdMenuPackageLabelsV298(bdMenuExactProductV352);g(c=>({...c,sectionId:bdMenuExactProductV352.sectionId||c.sectionId,taxonomyCategoryId:bdMenuExactProductV352.taxonomyCategoryId||c.taxonomyCategoryId,subcategoryId:bdMenuExactProductV352.subcategoryId||c.subcategoryId,readyProduct:{nomenclatureItemId:bdMenuExactProductV352.id||bdMenuExactProductV352.key,productKey:bdMenuExactProductV352.key,packageLabel:P.length===1?P[0]:void 0,packagesPerSale:1}})),bdSetMenuProductQueryV350(bdMenuExactProductV352.name||\"\")},[bdMenuExactProductV352?.key]);const A=h.readyProduct?.packageLabel",
  "auto-link one exact existing product",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'i.jsx("button",{type:"button",className:"bd-menu-create-nomenclature-v350",onClick:()=>bdSetMenuQuickOpenV350(!0),children:"+ Создать «"+(h.name.trim()||"новую позицию")+"» в номенклатуре"}),i.jsx("small",{children:"Готовый товар создаётся один раз и сразу связывается с этой позицией меню."})',
  '!_&&i.jsx("button",{type:"button",className:"bd-menu-create-nomenclature-v350",onClick:()=>bdSetMenuQuickOpenV350(!0),children:"+ Создать «"+(h.name.trim()||"новую позицию")+"» в номенклатуре"}),i.jsx("small",{children:_?"Связано с номенклатурой: "+_.name:"Если товара ещё нет, создайте его один раз — связь сохранится автоматически."})',
  "hide duplicate create action after linking",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  "onCreated:(P,c)=>{const I={...c,...P,key:P.key||P.productKey,productKey:P.productKey||P.key};",
  "onCreated:(P,c,bdMenuAssortmentV352)=>{const I={...c,...P,key:P.key||P.productKey,productKey:P.productKey||P.key};bdMenuOnNomenclatureCreatedV352?.(bdMenuAssortmentV352,I);",
  "update parent after menu quick create",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'g(W=>({...W,type:"ready",readyProduct:',
  'g(W=>({...W,type:"ready",sectionId:I.sectionId||W.sectionId,taxonomyCategoryId:I.taxonomyCategoryId||W.taxonomyCategoryId,subcategoryId:I.subcategoryId||W.subcategoryId,readyProduct:',
  "return created product taxonomy to menu item",
);

replaceScopedOnce(
  "function bdCatalogPage",
  "const q=S.useMemo(()=>bdCatMatchingProductsV258(s,bdCatPurchaseProducts(u)),[u]),",
  "const q=S.useMemo(()=>bdCatMatchingProductsV258(s,bdCatPurchaseProducts(u)),[s,u]),",
  "refresh matching products with assortment state",
);
replaceScopedOnce(
  "function bdCatalogPage",
  "ie=async p=>{const c=bdCatState(s),",
  "ie=async p=>{const c=bdCatState(xr(bdCatalogStoreKey)||s),",
  "save menu item over freshest assortment",
);
replaceScopedOnce(
  "function bdCatalogPage",
  "products:q}),!1&&i.jsx(bdCatStructureManager",
  "products:q,onNomenclatureCreated:(p,c)=>{if(!p)return;const I=bdCatState(p);l(I),Kse(bdCatalogStoreKey,I)}}),!1&&i.jsx(bdCatStructureManager",
  "refresh parent assortment after quick create",
);

writeFileSync(bundlePath, source);
refreshShellCache();
console.log("Applied menu nomenclature link v352.");
