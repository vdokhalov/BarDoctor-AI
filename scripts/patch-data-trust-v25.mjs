import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected one match, found ${count}`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  'const bdPayrollEntriesKey="bd_payroll_entries",bdPayrollDeductionTypes=',
  'const bdPayrollConfirmationVersion="approval-v25",bdPayrollEntriesKey="bd_payroll_entries",bdPayrollDeductionTypes=',
  "payroll trust marker",
);

replaceOnce(
  'function bdPayrollEntryTotals(e){const t={bonus:0,order:0,fine:0,dishware:0,otherDeduction:0,deductions:0,paid:0};for(const n of e){const r=Math.max(0,Number(n.amount)||0);n.type==="bonus"?t.bonus+=r:n.type==="order"?t.order+=r:n.type==="fine"?t.fine+=r:n.type==="dishware"?t.dishware+=r:n.type==="other_deduction"?t.otherDeduction+=r:n.type==="payment"&&(t.paid+=r)}return t.deductions=t.order+t.fine+t.dishware+t.otherDeduction,t}',
  'function bdPayrollEntryTotals(e){const t={bonus:0,order:0,fine:0,dishware:0,otherDeduction:0,deductions:0,paid:0};for(const n of e){const a=bdPayrollDeductionTypes.includes(n.type);if(a&&n.confirmationStatus&&n.confirmationStatus!=="confirmed")continue;const r=Math.max(0,Number(n.amount)||0);n.type==="bonus"?t.bonus+=r:n.type==="order"?t.order+=r:n.type==="fine"?t.fine+=r:n.type==="dishware"?t.dishware+=r:n.type==="other_deduction"?t.otherDeduction+=r:n.type==="payment"&&(t.paid+=r)}return t.deductions=t.order+t.fine+t.dishware+t.otherDeduction,t}',
  "deduction approval totals",
);

replaceOnce(
  'u=S.useCallback(d=>{const f=new Date().toISOString(),m={...d,id:d.id||Dz(),venueId:a,createdAt:d.createdAt||f,updatedAt:f},h=[m,...s.filter(g=>g.id!==m.id)];return l(h),m},[s,l,a])',
  'u=S.useCallback(d=>{const f=new Date().toISOString(),p=bdPayrollDeductionTypes.includes(d.type),m={...d,confirmationStatus:p?(d.confirmationStatus||"pending"):d.confirmationStatus,id:d.id||Dz(),venueId:a,createdAt:d.createdAt||f,updatedAt:f},h=[m,...s.filter(g=>g.id!==m.id)];return l(h),m},[s,l,a])',
  "new deduction approval status",
);

writeFileSync(bundlePath, source);
console.log("Applied data trust patch v25");
