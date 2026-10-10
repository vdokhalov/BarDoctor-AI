import { hasPermission, type AuthenticatedAccount } from "./access-control";
import { finiteBusinessNumber, scopedBusinessRows } from "./business-day-rows";
import { operationalDay } from "./operational-day";

type Row = Record<string, unknown>;
const record = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
export function canReadManagementWorkday(account: AuthenticatedAccount) {
  return ["owner", "manager", "shift_manager"].includes(account.role)
    && hasPermission(account, "shifts.view") && hasPermission(account, "team.view");
}

/** A view of the existing daily report, never a second accrual or a POS allocation. */
export function managementWorkday(day: ReturnType<typeof operationalDay>, employees: unknown[], rules: unknown[], scope: { venueId: number; workspaceId?: number; dataAccountId?: number }) {
  const team = scopedBusinessRows(employees, scope), payrollRules = scopedBusinessRows(rules, scope);
  const report = record(day.report), breakdown = record(report.payrollBreakdown), perEmployee = record(breakdown.perEmployee);
  const staffing = Array.isArray(report.staffing) ? report.staffing.map(record) : [];
  const people = staffing.map(staff => {
    const employee = team.find(item => item.id === staff.employeeId);
    const rule = payrollRules.find(item => item.id === employee?.payrollRuleId);
    const blocks = Array.isArray(rule?.blocks) ? rule.blocks.map(record).filter(block => block.enabled) : [];
    const missing: string[] = [];
    const notes = day.payroll.amount != null && employee && !rule ? ["Текущее правило оплаты не задано; сохранённый ФОТ не пересчитывается"] : [];
    // Current rule requirements guide missing input only. They cannot invalidate
    // an already recorded historical amount after a later salary rule edit.
    if (day.payroll.amount == null) {
      if (!employee) missing.push("Карточка сотрудника недоступна");
      else if (!rule) missing.push("Не указано правило оплаты");
      for (const [kind, field, label] of [["hourly_rate", "hours", "Не указаны часы"], ["personal_sales_percent", "personalSales", "Не указаны личные продажи"], ["per_unit", "units", "Не указано количество единиц"]]) {
        if (blocks.some(block => block.type === kind) && finiteBusinessNumber(staff[field]) == null) missing.push(label);
      }
      if (blocks.some(block => block.type === "venue_sales_percent") && finiteBusinessNumber(report.shiftVenueSales) == null) missing.push("Не указана база процента от продаж заведения");
      if (blocks.some(block => block.type === "department_sales_percent" && finiteBusinessNumber(record(report.shiftDepartmentSales)[String(block.department || employee?.department || "")]) == null)) missing.push("Не указана база процента от продаж отдела");
    }
    return { employeeId: staff.employeeId, name: String(employee?.name || "Сотрудник недоступен"), hours: finiteBusinessNumber(staff.hours), recordedPayroll: finiteBusinessNumber(perEmployee[String(staff.employeeId)]), missing, notes };
  });
  return { grain: "BUSINESS_DAY" as const, people,
    missing: [...(!staffing.length ? ["Не указан состав команды"] : []), ...(day.payroll.amount == null ? ["ФОТ не сохранён"] : [])],
  };
}
