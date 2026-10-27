/** Display only: amounts already use the row's unit, not purchase package counts. */
export function bdAssortmentAmountV170(amount: unknown, unit: unknown): string {
  if (amount == null || typeof amount === 'boolean' || amount === '' || !Number.isFinite(Number(amount))) return 'Не определено';
  const value = Number(amount);
  const labels: Record<string, string> = {kg:'кг',кг:'кг',g:'г',г:'г',l:'л',л:'л',ml:'мл',мл:'мл',pcs:'шт.',шт:'шт.','шт.':'шт.'};
  const key = String(unit ?? '').trim().toLowerCase();
  let shown = value, label = labels[key];
  if ((key === 'g' || key === 'г') && Math.abs(value) >= 1000) { shown = value / 1000; label = 'кг'; }
  if ((key === 'ml' || key === 'мл') && Math.abs(value) >= 1000) { shown = value / 1000; label = 'л'; }
  const number = new Intl.NumberFormat('ru-RU', {maximumFractionDigits:3}).format(shown);
  return label ? number + ' ' + label : number + ' · единица не указана';
}
