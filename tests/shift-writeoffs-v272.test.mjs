import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "acorn";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);

test("shift close uses the shared canonical picker, quantity, units, reasons and cost preview", async () => {
  const bundle = await readFile(bundlePath, "utf8");
  assert.match(bundle, /bdShiftWriteoffVersionV272="canonical-shift-writeoff-v272"/);
  assert.match(bundle, /data-bd-shift-writeoffs":"canonical-v272/);
  assert.match(bundle, /data-bd-internal-step-navigation":"back/);
  assert.match(bundle, /e\?\.id\?"Редактирование смены":"Ежедневное закрытие смены"/);
  assert.match(bundle, /bdWriteoffPickerV271/);
  assert.match(bundle, /bdWriteoffLineV271/);
  assert.match(bundle, /bdShiftCloseApiV272/);
  assert.match(bundle, /r\.writeOffs&&Vm\("bd_inventory_writeoffs",r\.writeOffs\)/);
  assert.match(bundle, /setTimeout\(\(\)=>\["bd_assortment_v1","bd_stock_movements","bd_inventory_writeoffs","bd_finance_expenses"\]/);
  assert.match(bundle, /try\{d\(je\.revenueRecord\)\}catch\{\}.*u\(\)/);
  assert.match(bundle, /Товар, количество и причина сформируют обычный складской документ/);
  const ast = parse(bundle, { ecmaVersion: "latest", sourceType: "module" });
  const node = ast.body.find((entry) => entry.type === "FunctionDeclaration" && entry.id?.name === "PAe");
  assert.ok(node);
  const form = bundle.slice(node.start, node.end);
  assert.doesNotMatch(form, /placeholder:"Сумма/);
  assert.doesNotMatch(form, /Что списано и почему/);
  assert.doesNotMatch(form, /addExpense:xe/);
  assert.doesNotMatch(form, /category:"writeoff",amount:Number/);
});

test("shift close endpoint atomically persists the shift and canonical stock chain", async () => {
  const route = await readFile(new URL("../app/api/shifts/close/route.ts", import.meta.url), "utf8");
  assert.match(route, /closeShiftWithCanonicalWriteOffs/);
  assert.match(route, /database\.batch\(statements\)/);
  assert.match(route, /writeOffs: result\.writeOffs/);
  assert.match(route, /REVENUE_STORE_KEY/);
  assert.match(route, /WRITE_OFF_STORE_KEY/);
  assert.match(route, /ASSORTMENT_STORE_KEY/);
  assert.match(route, /STOCK_MOVEMENT_STORE_KEY/);
  assert.match(route, /EXPENSE_STORE_KEY/);
  assert.match(route, /hasPermission\(account, "shifts\.manage"\)/);
  assert.match(route, /hasPermission\(account, "inventory\.manage"\)/);
  assert.match(route, /SHIFT_VENUE_MISMATCH/);
  assert.match(route, /write_off\.posted_from_shift/);
});

test("integration write-offs use the same canonical service instead of a parallel stock writer", async () => {
  const writer = await readFile(new URL("../lib/bardoctor/integrations/domain-writer.ts", import.meta.url), "utf8");
  assert.match(writer, /async function writeCanonicalWriteOff/);
  assert.match(writer, /postWriteOffDocument\(/);
  assert.match(writer, /syncWriteOffExpense\(/);
  assert.match(writer, /source: "integration"/);
  assert.doesNotMatch(writer, /writeInventoryDocument\(input: WriterInput & \{ kind: "write_off"/);
});

test("warehouse write-off detail exposes the shift relationship and deep link", async () => {
  const bundle = await readFile(bundlePath, "utf8");
  assert.match(bundle, /Связано со сменой/);
  assert.match(bundle, /\/shifts\?shift=/);
  assert.match(bundle, /linkedShift=params\.get\("shift"\)/);
  assert.match(bundle, /source === "shift_close"|e\.source==="shift_close"|Закрытие смены/);
});

test("Finance routes new write-offs to the canonical Warehouse flow and keeps legacy records read-only", async () => {
  const bundle = await readFile(bundlePath, "utf8");
  assert.match(bundle, /children:"Создать списание"/);
  assert.match(bundle, /\/warehouse\?tab=writeoffs&writeoff=new&returnTo=finance/);
  assert.match(bundle, /key:"writeoff",label:"Создать списание"/);
  assert.match(bundle, /noe=Object\.keys\(Lg\)\.filter\(e=>!roe\.has\(e\)&&e!=="writeoff"\)/);
  assert.match(bundle, /canManageFinance&&documentView\.record\?\.category!=="writeoff"/);
  const ast = parse(bundle, { ecmaVersion: "latest", sourceType: "module" });
  const expenseForm = ast.body.find((entry) => entry.type === "FunctionDeclaration" && entry.id?.name === "RAe");
  assert.ok(expenseForm);
  const form = bundle.slice(expenseForm.start, expenseForm.end);
  assert.doesNotMatch(form, /Что списано и почему|Причина списания|Раздел списания/);
});
