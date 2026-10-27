/** Currency label only; no conversion or default currency for incomplete profiles. */
export function bdFinanceFormCurrency(value: unknown): string {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (code === 'PMR_RUB') return 'руб. ПМР';
  if (code === 'RUB') return '₽';
  return ['MDL','EUR','USD','UAH','RON'].includes(code) ? code : 'валюта не указана';
}
