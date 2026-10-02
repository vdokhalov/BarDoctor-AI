import { hasPermission, type AuthenticatedAccount } from "./access-control";
import { canReadStore } from "./data-trust";

// Existing context blocks combine these sources. Restricted blocks are atomic:
// withholding a raw store alone must not leave its derived metric accessible.
export const VENUE_CONTEXT_SOURCES: Record<string, string[]> = {
  location: [], format: [], schedule: [],
  pricePosition: ["bd_assortment_v1"],
  performanceHistory: ["bd_finance_revenue", "bd_finance_expenses", "bd_payroll_entries", "bd_month_closings", "bd_sales_documents", "bd_assortment_v1"],
  menuAndRecipes: ["bd_assortment_v1", "bd_purchase_documents", "bd_sales_documents", "bd_sales_batches", "bd_finance_revenue"],
  salesAndCost: ["bd_assortment_v1", "bd_purchase_documents", "bd_sales_documents", "bd_sales_batches", "bd_finance_revenue", "bd_finance_expenses", "bd_payroll_entries", "bd_month_closings"],
  purchasesAndInventory: ["bd_purchase_documents", "bd_suppliers", "bd_inventory_snapshots", "bd_assortment_v1", "bd_stock_movements", "bd_finance_expenses", "bd_supplier_alternatives_v1", "bd_inventory_writeoffs"],
  team: ["bd_employees", "bd_payroll_entries"],
  guestFeedback: ["bd_guest_reviews"],
  seasonalityAndEvents: ["bd_opportunity_calendar_v1", "bd_finance_revenue"],
  market: ["bd_market_analysis_v1"],
};

export function canReadVenueSource(account: AuthenticatedAccount, key: string): boolean {
  if (key === "bd_market_analysis_v1") return hasPermission(account, "analysis.view");
  if (key === "bd_supplier_alternatives_v1" || key === "bd_inventory_writeoffs") return hasPermission(account, "inventory.view");
  return canReadStore(account, key);
}

export function canReadVenueBlock(account: AuthenticatedAccount, blockId: string): boolean {
  const sources = VENUE_CONTEXT_SOURCES[blockId];
  return Boolean(sources && sources.every(key => canReadVenueSource(account, key)));
}

export function canReadDiagnosisSources(account: AuthenticatedAccount): boolean {
  return Object.keys(VENUE_CONTEXT_SOURCES).every(key => canReadVenueBlock(account, key));
}

export function canReadSavedDiagnosis(account: AuthenticatedAccount): boolean {
  return canReadDiagnosisSources(account) && hasPermission(account, "tasks.view");
}

export function restrictedVenueContext(): Response {
  return Response.json({ success: false, code: "ACCESS_DENIED", availability: "RESTRICTED", error: "Недостаточно прав к источникам анализа." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
}
