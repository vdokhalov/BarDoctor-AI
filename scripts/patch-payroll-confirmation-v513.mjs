import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Keep the existing approval gate: an unconfirmed deduction must never lower pay.
// This supplies the previously missing explicit confirmation action to the editor.
export function patchPayrollConfirmation(source) {
  function editFunction(name, edit) {
    const start = source.indexOf(`function ${name}(`);
    const end = source.indexOf('\n', start);
    if (start < 0 || end < 0) throw Error(`Missing payroll boundary: ${name}`);
    let part = source.slice(start, end);
    if (part.includes('bdPayrollConfirmationV513')) return;
    const once = (before, after) => {
      if (part.split(before).length !== 2) throw Error(`Ambiguous payroll anchor: ${name}: ${before}`);
      part = part.replace(before, after);
    };
    edit(once);
    source = source.slice(0, start) + part + source.slice(end);
  }
  editFunction('bdPayrollEntrySheet', once => {
    once('[j,v]=S.useState(r?.note||""),b=', '[j,v]=S.useState(r?.note||""),[bdPayrollConfirmationV513,bdSetPayrollConfirmationV513]=S.useState(!!r&&(!r.confirmationStatus||r.confirmationStatus==="confirmed")),bdIsDeductionV513=bdPayrollDeductionTypes.includes(d),b=');
    once('amount:Number(g),note:j.trim()||void 0}', 'amount:Number(g),note:j.trim()||void 0,confirmationStatus:bdIsDeductionV513?(bdPayrollConfirmationV513?"confirmed":r?.confirmationStatus&&r.confirmationStatus!=="confirmed"?r.confirmationStatus:"pending"):r?.confirmationStatus}');
    once('i.jsx("button",{type:"button",disabled:!b,onClick:N', 'bdIsDeductionV513&&i.jsxs("label",{className:"flex items-start gap-3 text-[13px] leading-relaxed",children:[i.jsx("input",{type:"checkbox",checked:bdPayrollConfirmationV513,onChange:event=>bdSetPayrollConfirmationV513(event.target.checked),"aria-label":"Подтвердить удержание",className:"mt-1"}),i.jsxs("span",{children:["Подтверждаю удержание из зарплаты",i.jsx("small",{className:"block text-muted-foreground mt-1",children:bdPayrollConfirmationV513?"После сохранения сумма уменьшит остаток к выплате.":"Без подтверждения операция сохранится, но не уменьшит зарплату."})]})]}),i.jsx("button",{type:"button",disabled:!b,onClick:N');
    once('children:"Сохранить операцию"', 'children:bdIsDeductionV513&&bdPayrollConfirmationV513?"Сохранить и подтвердить удержание":"Сохранить операцию"');
  });
  editFunction('bdPayrollLedgerRow', once => {
    once('const r=e.type===', 'const bdPayrollConfirmationV513=bdPayrollDeductionTypes.includes(e.type),bdPayrollPendingV513=bdPayrollConfirmationV513&&!!e.confirmationStatus&&e.confirmationStatus!=="confirmed";const r=e.type===');
    once('children:bdPayrollEntryLabels[e.type]||e.type}),', 'children:bdPayrollEntryLabels[e.type]||e.type}),bdPayrollConfirmationV513&&i.jsx("p",{className:"text-[12px] mt-1",children:bdPayrollPendingV513?"Не подтверждено · не учтено в удержаниях. Откройте для подтверждения.":"Подтверждено · учтено в удержаниях"}),');
  });
  return source;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
  fs.writeFileSync(file, patchPayrollConfirmation(fs.readFileSync(file, 'utf8')));
  console.log('Payroll explicit deduction confirmation v513 applied');
}
