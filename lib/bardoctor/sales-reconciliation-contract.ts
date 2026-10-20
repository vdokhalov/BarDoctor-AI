/** A dedicated server-written ledger, never accepted by generic store mutations. */
export const SALES_RECONCILIATION_KEY = 'bd_sales_reconciliations_v1';
export {canonicalReconciliationValue, reconciliationRevenueFacts, validReconciliationEvidence} from './financial-reconciliation';
