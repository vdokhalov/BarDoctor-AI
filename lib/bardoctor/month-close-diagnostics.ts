import {normalizeAccountingCurrency} from "./currency";
import {validExpenseDate} from "./expense-date";
import {activeBusinessRow,scopedBusinessRows,finiteBusinessNumber} from "./business-day-rows";
import { derivedInputBelongs } from './derived-input-scope';
import { businessRecord as row } from './business-day-rows';

type Row = Record<string, unknown>;
type Scope = { venueId: number; workspaceId: number; dataAccountId: number };
export type MonthCloseReasonDetail = { code: string; sourceKey?: string; recordId?: string | null; date?: string | null; href?: string; scopeField?: string; scopeKind?: 'legacy_text' | 'foreign_marker'; outsidePeriod?: boolean; expenseLabel?: string; expenseAmount?: number; expenseCurrency?: string };
function scopeIssue(value: unknown, scope: Scope): { field: string; kind: 'legacy_text' | 'foreign_marker' } | null {
  if (!value || typeof value !== 'object') return null;
  if (!Array.isArray(value)) {
    const item = row(value);
    for (const [field, expected] of Object.entries(scope)) {
      if (item[field] == null || field === 'venueId' && item[field] === 'primary' || Number(item[field]) === expected) continue;
      return { field, kind: typeof item[field] === 'string' && !Number.isFinite(Number(item[field])) ? 'legacy_text' : 'foreign_marker' };
    }
  }
  for (const child of Object.values(value)) { const issue = scopeIssue(child, scope); if (issue) return issue; }
  return null;
}
function rootForeign(item: Row, scope: Scope) {
  return Object.entries(scope).some(([field, expected]) => item[field] != null && !(field === 'venueId' && item[field] === 'primary') && Number.isFinite(Number(item[field])) && Number(item[field]) !== expected);
}
function href(sourceKey: string, monthKey: string, date?: string | null) {
  const query = '?month=' + encodeURIComponent(monthKey);
  if (sourceKey === 'bd_payroll_entries') return '/salaries' + query;
  if (['bd_finance_revenue', 'bd_operational_reports_v1'].includes(sourceKey)) return '/shifts' + query + (date ? '&workday=' + encodeURIComponent(date) : '');
  if (['bd_sales_events_v1', 'bd_sales_documents', 'bd_sales_batches'].includes(sourceKey)) return '/sales-import';
  if (['bd_inventory_snapshots', 'bd_inventory_writeoffs', 'bd_stock_movements', 'bd_opening_stock_v1'].includes(sourceKey)) return '/warehouse';
  if (sourceKey === 'bd_purchase_documents') return '/suppliers';
  if (sourceKey === 'bd_finance_settings') return '/finance/settings';
  return '/finance' + query;
}

/** Scoped references; invalid-date expenses also expose a bounded display label and original money.
 * Called after month-close's existing complete source authorization. */
export function monthCloseReasonDetails(input: { reasons: string[]; stores: Record<string, Row[]>; scope: Scope; monthKey: string; payrollByDay: { businessDate: string; amount: number | null }[]; days: { businessDate: string; revenue: { status: string } }[]; excluded: { id: unknown; kind: string }[] }) {
  const result: MonthCloseReasonDetail[] = [];
  const add = (code: string, sourceKey: string, value?: Row, explicitDate?: string) => {
    const foreign = value && rootForeign(value, input.scope);
    const candidate = String(explicitDate ?? value?.businessDate ?? value?.date ?? '');
    const date = !foreign && /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
    result.push({ code, sourceKey, recordId: !foreign && value?.id != null ? String(value.id).slice(0, 180) : null, date, href: href(sourceKey, input.monthKey, date), ...(date ? { outsidePeriod: date.slice(0, 7) !== input.monthKey } : {}) });
  };
  for (const code of input.reasons) {
    const start = result.length;
    if (code === 'NESTED_INPUT_SCOPE_MISMATCH') {
      for (const [sourceKey, values] of Object.entries(input.stores)) for (const value of values) {
        if (derivedInputBelongs(value, input.scope)) continue;
        add(code, sourceKey, value);
        const issue = scopeIssue(value, input.scope);
        if (issue) Object.assign(result[result.length - 1], { scopeField: issue.field, scopeKind: issue.kind });
      }
    } else if (code === 'EXPENSE_DATE_UNKNOWN') {
      for(const value of scopedBusinessRows((input.stores.bd_finance_expenses??[]).map(value=>value.venueId==='primary'?{...value,venueId:input.scope.venueId}:value),input.scope))if(activeBusinessRow(value)&&!validExpenseDate(value.date)){
        add(code,'bd_finance_expenses',value);
        const labels:Record<string,string>={rent:'Аренда',payroll:'Зарплата',taxes:'Налоги',utilities:'Коммунальные услуги',repairs:'Ремонт',marketing:'Реклама',equipment:'Оборудование',other:'Прочий расход',writeoff:'Списание',inventory:'Закупка'};
        const description=typeof value.description==='string'?value.description.trim().slice(0,180):'';
        const amount=finiteBusinessNumber(value.amount),currency=normalizeAccountingCurrency(value.currency);
        Object.assign(result[result.length-1],{expenseLabel:description||labels[String(value.category)]||undefined,...(amount!=null&&currency?{expenseAmount:amount,expenseCurrency:currency}:{})});
      }
    } else if (code === 'PAYROLL') {
      for (const day of input.payrollByDay.filter(day => day.amount == null)) add(code, 'bd_operational_reports_v1', undefined, day.businessDate);
    } else if (code === 'REVENUE_NOT_FINAL') {
      for (const day of input.days.filter(day => day.revenue.status !== 'FINAL')) add(code, 'bd_finance_revenue', undefined, day.businessDate);
    } else if (code === 'REVENUE_OR_CURRENCY') {
      for (const excluded of input.excluded) add(code, 'bd_finance_revenue', input.stores.bd_finance_revenue?.find(value => value.id === excluded.id));
    }
    if (result.length === start) {
      const sourceKey = code === 'PAYROLL' ? 'bd_payroll_entries' : code === 'INVENTORY_BOUNDARY_UNKNOWN' ? 'bd_inventory_snapshots'
        : code === 'PURCHASE_AMOUNT_UNKNOWN' ? 'bd_purchase_documents' : code === 'RECURRING_INPUT_UNKNOWN' ? 'bd_finance_settings'
        : ['BUSINESS_DAY_COVERAGE_INCOMPLETE', 'REVENUE_NOT_FINAL', 'REVENUE_OR_CURRENCY'].includes(code) ? 'bd_finance_revenue'
        : /SALES|BATCH|LINE|INGREDIENT|CAPTURE/.test(code) ? 'bd_sales_events_v1' : 'bd_finance_expenses';
      add(code, sourceKey);
    }
  }
  const unique = [...new Map(result.map(value => [JSON.stringify(value), value])).values()];
  return { reasonDetails: unique.slice(0, 100), reasonDetailsTruncated: unique.length > 100 };
}
