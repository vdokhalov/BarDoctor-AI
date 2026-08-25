export const LEGACY_REPLIT_ORIGIN =
  "https://1a6d791c-3bfe-4494-9a87-25b76a4934c4-00-18t2t9bv5wmr5.janeway.replit.dev";

export const ALLOWED_STORE_KEYS = [
  "bd_employees",
  "bd_finance_revenue",
  "bd_finance_expenses",
  "bd_finance_gap_reasons",
  "bd_inventory_snapshots",
  "bd_finance_settings",
  "bd_equipment",
  "bd_equipment_history",
  "bd_equipment_work_orders",
  "bd_payroll_rules",
  "bd_payroll_entries",
  "bd_cases",
  "bd_events",
  "bd_tasks",
  "bd_action_plans",
  "bd_action_tasks",
  "bd_decisions",
  "bd_ai_diagnosis_v3",
  "bd_ai_diagnosis_v4",
  "bd_ai_diagnosis_v5",
  "bd_ai_diagnosis_v6",
  "bd_ai_diagnosis_v7",
  "bd_ai_diagnosis_v8",
  "bd_ai_diagnosis_v9",
  "bd_guest_reviews",
  "bd_month_closings",
  "bd_opportunity_calendar_v1",
  "bd_access_roles",
  "bd_import_history",
  "bd_suppliers",
  "bd_purchase_documents",
  "bd_assortment_v1",
  "bd_stock_movements",
  "bd_sales_documents",
  "bd_sales_batches",
  "bd_sales_mappings",
  "bd_sales_warehouse_routes",
  "bd_warehouses",
] as const;

export type StoreKey = (typeof ALLOWED_STORE_KEYS)[number];

export function isAllowedStoreKey(value: string): value is StoreKey {
  return (ALLOWED_STORE_KEYS as readonly string[]).includes(value);
}
