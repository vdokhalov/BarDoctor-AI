import type {historicalPeriodCost} from './financial-reconciliation';

type Cost = ReturnType<typeof historicalPeriodCost>;
// These capabilities exist only inside a verified server calculation. JSON from
// a request, persisted business row or browser cannot declare itself verified.
const costs = new WeakMap<object, {monthKey:string;value:Cost}>();
const counts = new WeakMap<object,number>();
export function verifiedPeriodCost(monthKey:string,value:Cost):object {
  const proof={}; costs.set(proof,{monthKey,value});return proof;
}
export function periodCostProof(proof:object|undefined,monthKey:string):Cost|undefined {
  const known=proof&&costs.get(proof);return known&&known.monthKey===monthKey?known.value:undefined;
}
export function bindFinancialEventCount<T extends object>(event:T,count:number):T {
  if(!Number.isSafeInteger(count)||count<1)throw Error('FINANCIAL_EVENT_COUNT');
  counts.set(event,count);return event;
}
export function financialEventCount(event:object){return counts.get(event)??1;}
