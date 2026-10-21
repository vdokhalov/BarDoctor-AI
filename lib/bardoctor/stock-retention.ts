/** Retention of the existing canonical movement store, never a second ledger. */
export const MAX_STOCK_MOVEMENTS = 20_000;
// Leave room below the native D1 single-value limit; row count alone cannot
// bound nested conversion/recipe snapshots or UTF-8 names.
export const MAX_STOCK_MOVEMENT_BYTES = 1_900_000;
export class StockEvidenceCapacityError extends Error {
  readonly code = "STOCK_EVIDENCE_CAPACITY_REACHED";
  constructor() { super("Required stock evidence cannot fit the bounded canonical movement store"); this.name = "StockEvidenceCapacityError"; }
}

/** Legacy JSON is all-or-nothing. Capacity never authorizes deleting history. */
const normalizedHistories = new WeakSet<object>();
export function markNormalizedStockHistory<T>(values:T[]):T[]{normalizedHistories.add(values);return values;}
export function isNormalizedStockHistory(values:unknown):boolean{return !!values&&typeof values==='object'&&normalizedHistories.has(values);}
export function retainStockMovements<T>(values: T[], _assortment?: unknown, sourceHistory?:unknown): T[] {
  if(isNormalizedStockHistory(sourceHistory))return markNormalizedStockHistory(values);
  if(values.length>MAX_STOCK_MOVEMENTS)throw new StockEvidenceCapacityError();
  const encoder=new TextEncoder();let bytes=2;
  for(const value of values){
    bytes+=encoder.encode(JSON.stringify(value)).byteLength+1;
    if(bytes>MAX_STOCK_MOVEMENT_BYTES)throw new StockEvidenceCapacityError();
  }
  return values;
}

export function stockCapacityResponse(error: unknown): Response | null {
  if (!(error instanceof StockEvidenceCapacityError)) return null;
  return Response.json({ ok: false, code: error.code, retryable: false,
    error: "Недостаточно места для сохранения обязательной истории склада. Операция не выполнена; существующие данные сохранены." }, { status: 409 });
}

export function inheritStockHistory<T>(source:unknown,values:T[]):T[]{return isNormalizedStockHistory(source)?markNormalizedStockHistory(values):values;}
