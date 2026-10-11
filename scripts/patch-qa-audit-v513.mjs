import fs from 'node:fs';
import { patchPayrollConfirmation } from './patch-payroll-confirmation-v513.mjs';
import { patchDataControlNavigation } from './patch-data-control-navigation-v513.mjs';
import { patchEquipmentInventoryV513 } from './patch-equipment-inventory-v513.mjs';
import { patchMonthlyReportV513 } from './patch-monthly-report-v513.mjs';
import { patchDiagnosisBudget } from './patch-ai-explicit-budget-v513.mjs';
import { patchAccountingBoundaryV514 } from './patch-accounting-boundary-v514.mjs';

const file = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
for (const patch of [patchPayrollConfirmation, patchDataControlNavigation, patchEquipmentInventoryV513, patchMonthlyReportV513, patchDiagnosisBudget, patchAccountingBoundaryV514]) source = patch(source);
fs.writeFileSync(file, source);
console.log('QA audit v513 client fixes applied');
