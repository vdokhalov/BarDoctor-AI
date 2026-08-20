import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const targets = [
  "public/assets/index-BQGspy0I.js",
  "scripts/fragments/procurement-command-v168.fragment.txt",
].map((file) => resolve(root, file));

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Could not patch ${label}`);
  return source.replaceAll(before, after);
}

function patch(source) {
  source = replaceRequired(
    source,
    "function bdProcPaymentStatusLabelV186(e)",
    'function bdProcPurchasePaymentV188(e,t=[]){const n=t.filter(r=>bdProcActivePaymentV186(r,e?.id)),a=n.length?n.reduce((r,s)=>r+bdProcNumberV168(s?.amount),0):bdProcNumberV168(e?.paidAmount),s=Math.max(0,bdProcNumberV168(e?.total)-a);return{paidAmount:a,balanceDue:s,paymentStatus:e?.documentType==="price_list"?"not_applicable":a<=0?"unpaid":s<=.005?"paid":"partial"}}\nfunction bdProcPaymentStatusLabelV186(e)',
    "shared payment summary",
  );
  source = replaceRequired(
    source,
    "function bdProcPurchasesV168({documents:e,analytics:t,query:n,onQuery:r,filter:a,onFilter:s,sort:l,onSort:u,onOpen:d})",
    "function bdProcPurchasesV168({documents:e,analytics:t,expenses:o=[],query:n,onQuery:r,filter:a,onFilter:s,sort:l,onSort:u,onOpen:d})",
    "purchase list payment input",
  );
  source = replaceRequired(
    source,
    "const f=bdProcNormV168(n),m=e.filter(v=>{const b=bdProcEffectiveStateV168(v,t),N=",
    "const f=bdProcNormV168(n),m=e.filter(v=>{const P=bdProcPurchasePaymentV188(v,o),b=bdProcEffectiveStateV168(v,t),N=",
    "purchase filter payment summary",
  );
  source = replaceRequired(
    source,
    "bdProcNumberV168(v?.balanceDue,bdProcNumberV168(v?.total)-bdProcNumberV168(v?.paidAmount))>.005",
    "P.balanceDue>.005",
    "purchase balance filter",
  );
  source = replaceRequired(
    source,
    "m.slice(0,bdProcVisibleDocs).map(v=>{const b=bdProcEffectiveStateV168(v,t)",
    "m.slice(0,bdProcVisibleDocs).map(v=>{const P=bdProcPurchasePaymentV188(v,o),b=bdProcEffectiveStateV168(v,t)",
    "purchase row payment summary",
  );
  source = replaceRequired(
    source,
    'v.status==="cancelled"?"Проведение отменено":v.paymentStatus==="paid"?"Оплачено":v.paymentStatus==="partial"?"Оплачено "+bdProcMoneyV168(v.paidAmount,v.currency||"RUB")+" · осталось "+bdProcMoneyV168(v.balanceDue,v.currency||"RUB"):"К оплате "+bdProcMoneyV168(v.balanceDue??v.total,v.currency||"RUB")',
    'v.status==="cancelled"?"Проведение отменено":P.paymentStatus==="paid"?"Оплачено":P.paymentStatus==="partial"?"Оплачено "+bdProcMoneyV168(P.paidAmount,v.currency||"RUB")+" · осталось "+bdProcMoneyV168(P.balanceDue,v.currency||"RUB"):"К оплате "+bdProcMoneyV168(P.balanceDue,v.currency||"RUB")',
    "purchase row payment label",
  );
  source = replaceRequired(
    source,
    "bdProcPurchasesV168,{documents:le,analytics:fe,query:E",
    "bdProcPurchasesV168,{documents:le,analytics:fe,expenses:m,query:E",
    "purchase list invocation",
  );
  source = replaceRequired(
    source,
    'z=e?.documentType==="price_list",L=bdProcNumberV168(e?.paidAmount,T.reduce((C,x)=>C+bdProcNumberV168(x?.amount),0)),q=Math.max(0,bdProcNumberV168(e?.balanceDue,bdProcNumberV168(e?.total)-L)),B=e?.paymentStatus||(L<=0?"unpaid":q<=.005?"paid":"partial"),U=',
    'z=e?.documentType==="price_list",P=bdProcPurchasePaymentV188(e,n),L=P.paidAmount,q=P.balanceDue,B=P.paymentStatus,U=',
    "purchase detail payment summary",
  );
  source = replaceRequired(
    source,
    "onPay:bdCanPay?()=>bdSetProcPaymentDocument(O):null",
    "onPay:bdCanPay?()=>bdSetProcPaymentDocument({...O,...bdProcPurchasePaymentV188(O,m)}):null",
    "payment editor current balance",
  );
  source = replaceRequired(
    source,
    'h&&s&&i.jsx("button",{type:"button",className:"secondary",onClick:s,disabled:v,children:"Редактировать"}),!z&&M&&g&&q>.005',
    'h&&s&&i.jsx("button",{type:"button",className:"secondary",onClick:s,disabled:v,children:"Редактировать"}),!z&&!M&&!D&&h&&s&&i.jsx("button",{type:"button",className:"primary",onClick:s,disabled:v,children:"Провести"}),!z&&M&&g&&q>.005',
    "draft conduct action",
  );
  return source;
}

for (const target of targets) {
  const source = await readFile(target, "utf8");
  await writeFile(target, patch(source));
}

console.log("Purchase payment list reconciliation v189 applied.");
