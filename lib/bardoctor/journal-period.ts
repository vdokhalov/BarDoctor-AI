/** Internal read selection only. Never a replacement journal or a write operand. */
export type JournalPeriod = { start: string; endExclusive: string };
export function validateJournalPeriod(period: JournalPeriod) {
  if (![period.start, period.endExclusive].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0,10) === value) || period.start >= period.endExclusive) throw Error('INVALID_JOURNAL_PERIOD');
}
export function journalMonth(month: string): JournalPeriod {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('INVALID_JOURNAL_PERIOD');
  return { start: month+'-01', endExclusive: new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),1)).toISOString().slice(0,10) };
}

export function belongsToJournalPeriod(value: unknown, period: JournalPeriod) {
  const date=typeof value==='string'?value.slice(0,10):'';
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date && date>=period.start && date<period.endExclusive;
}
