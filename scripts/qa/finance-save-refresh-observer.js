/* QA-only observer, evaluated as plain JavaScript to avoid tsx closure helpers. */
(() => {
  const state = { pending: ['bd_finance_revenue', 'bd_cases', 'bd_assortment_v1', 'bd_stock_movements', 'bd_inventory_writeoffs', 'bd_finance_expenses'] };
  Object.assign(window, { __bdFinanceSaveRefresh: state });
  const refresh = event => {
    const detail = event.detail;
    if (!detail || typeof detail !== 'object' || typeof detail.storeKey !== 'string') return;
    state.pending = state.pending.filter(key => key !== detail.storeKey);
    if (!state.pending.length) window.removeEventListener('bd:store-updated', refresh);
  };
  window.addEventListener('bd:store-updated', refresh);
})();
