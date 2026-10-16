/** Capability is server-local; a client JSON field cannot disable legacy bounds. */
const normalized=new WeakSet<object>();
export function markSalesEventHistory<T extends object>(events:T):T{normalized.add(events);return events;}
export function isNormalizedSalesEventHistory(events:object){return normalized.has(events);}

export type SalesEventTotal={id:string;currency:string|null;cents:number;receipts:number};
const totals=new WeakMap<object,SalesEventTotal>();
export function bindSalesEventTotal(events:object,total:SalesEventTotal){totals.set(events,total);}
export function salesEventTotal(events:object){return totals.get(events);}
const paidOrders=new WeakMap<object,Set<string>>();
export function bindPaidOrders(events:object,ids:Set<string>){paidOrders.set(events,ids);}
export function paidOrderIds(events:object){return paidOrders.get(events)??new Set<string>();}
