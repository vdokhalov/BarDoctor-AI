import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import runtime from './browser-runtime.cjs';
import { patchPayrollConfirmation } from './patch-payroll-confirmation-v513.mjs';

// Isolated React fixture: actual production sheet, ledger row and calculation.
// No server, API, credentials, production data or external requests are involved.
const source = patchPayrollConfirmation(fs.readFileSync('public/assets/index-BQGspy0I.js', 'utf8'));
const functions = ['bdPayrollEntrySheet', 'bdPayrollLedgerRow', 'bdPayrollEntryTotals', 'bdPayrollApplyLedger'].map(name => {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf('\n', start));
}).join('\n');
const fixture = `import * as S from 'react';import * as i from 'react/jsx-runtime';import {createRoot} from 'react-dom/client';
const W={div:'div'},bdFieldLabel='label',bdPayrollDefaultDate=()=> '2026-09-30',bdPayrollDeductionTypes=['order','fine','dishware','other_deduction'],bdPayrollEntryOptions=['bonus',...bdPayrollDeductionTypes,'payment'],bdPayrollEntryLabels={other_deduction:'Другое удержание'},Mn=String,sg=String;
${functions}
function Fixture(){const[row,setRow]=S.useState({id:'deduction25',employeeId:'dina',type:'other_deduction',amount:25,date:'2026-09-30',confirmationStatus:'pending'}),[open,setOpen]=S.useState(false);return i.jsxs('main',{children:[i.jsx('output',{children:'Остаток: '+bdPayrollApplyLedger(3650,[row,{type:'payment',amount:300}]).balance}),i.jsx(bdPayrollLedgerRow,{entry:row,onEdit:()=>setOpen(true),onDelete:()=>{throw Error('Deletion not tested')}}),open&&i.jsx(bdPayrollEntrySheet,{employees:[{id:'dina',name:'QA Дина'}],initial:row,onClose:()=>setOpen(false),onSave:value=>{window.saved=value;setRow(value);setOpen(false)}})]})}createRoot(document.getElementById('root')).render(i.jsx(Fixture,{}));`;
const built = await build({ stdin: { contents: fixture, resolveDir: process.cwd(), loader: 'js' }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } });
const browser = await chromium.launch({ headless: true, executablePath: process.env.BD_QA_BROWSER || await runtime.resolveBrowserExecutable(chromium.executablePath()) });
try {
  for (const width of [390, 820]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    await page.setContent('<html><body><div id="root"></div></body></html>');
    await page.addStyleTag({ content: fs.readFileSync('public/assets/index-D0AhgpbR.css', 'utf8') });
    await page.addScriptTag({ content: built.outputFiles[0].text });
    await page.getByRole('button', { name: /Другое удержание/ }).click();
    const checkbox = page.getByRole('checkbox', { name: 'Подтвердить удержание' });
    assert.equal(await checkbox.isChecked(), false);
    await checkbox.check();
    fs.mkdirSync('outputs/payroll-confirmation-v513', { recursive: true });
    await page.screenshot({ path: `outputs/payroll-confirmation-v513/${width}-confirmation-editor.png` });
    await page.getByRole('button', { name: 'Сохранить и подтвердить удержание' }).click();
    assert.equal(await page.locator('output').textContent(), 'Остаток: 3325');
    assert.deepEqual(await page.evaluate(() => [window.saved.id, window.saved.amount, window.saved.confirmationStatus]), ['deduction25', 25, 'confirmed']);
    await page.getByRole('button', { name: /Другое удержание/ }).click();
    assert.equal(await checkbox.isChecked(), true);
    await page.getByRole('button', { name: 'Закрыть форму' }).click();
    assert.equal(await page.locator('output').textContent(), 'Остаток: 3325');
    await page.screenshot({ path: `outputs/payroll-confirmation-v513/${width}-confirmed.png` });
    await context.close();
    console.log(`PASS actual payroll editor ${width}: pending→confirmed, unchanged ID, 3325 balance, reopen/cancel`);
  }
} finally { await browser.close(); }
