import { COST_WHY, type CostReason } from "../management-cost-contracts";
/** One background evaluation per authenticated app session and venue. Never persist across users. */
export function createCostRefresh<T>(io:{read:(venue:number,signal:AbortSignal)=>Promise<T>;evaluate:(venue:number,cursor:string|undefined,signal:AbortSignal)=>Promise<{nextCursor?:string|null;coverage?:string;reasons?:string[];completedAt?:string|null}>;current:()=>string}) {
  type State={data?:T;busy:boolean;error?:string;completedAt?:string};
  const entries=new Map<number,{state:State;job?:Promise<void>;controller:AbortController}>();
  const listeners=new Set<()=>void>();let identity=io.current();
  const emit=()=>listeners.forEach(fn=>fn());
  function reset(){for(const entry of entries.values())entry.controller.abort();entries.clear();identity=io.current();emit();}
  function sync(){if(identity!==io.current())reset();}
  function start(venue:number,retry=false){sync();let entry=entries.get(venue);if(entry?.job||entry&&!retry)return entry?.job;
    entry??={state:{busy:false},controller:new AbortController()};entries.set(venue,entry);const own=entry,session=identity;
    const valid=()=>identity===session&&io.current()===session&&entries.get(venue)===own&&!own.controller.signal.aborted;
    own.state={...own.state,busy:true,error:undefined};
    own.job=(async()=>{try{
      const saved=await io.read(venue,own.controller.signal);if(!valid())return;own.state={...own.state,data:saved};emit();
      let cursor:string|undefined,completedAt:string|undefined;const seen=new Set<string>();
      do {const page=await io.evaluate(venue,cursor,own.controller.signal);if(!valid())return;
        if(page.coverage==='UNAVAILABLE'){const reasons=[...new Set(page.reasons||[])].filter((reason):reason is CostReason=>Object.prototype.hasOwnProperty.call(COST_WHY,reason));throw Error('Обновление себестоимости не завершено. '+(reasons.length?reasons.map(reason=>COST_WHY[reason]).join(' '):'Не все источники доступны.'));}
        completedAt=page.completedAt||undefined;cursor=page.nextCursor||undefined;if(cursor&&seen.has(cursor))throw Error('Проверка не завершена. Повторите обновление.');if(cursor)seen.add(cursor);
      }while(cursor);
      if(!completedAt||!Number.isFinite(Date.parse(completedAt)))throw Error('Полная проверка не подтверждена сервером. Повторите обновление.');
      const fresh=await io.read(venue,own.controller.signal);if(valid())own.state={data:fresh,busy:true,completedAt};
    }catch(error){if(valid())own.state={...own.state,error:error instanceof Error?error.message:'Обновление недоступно.'};}
    finally{if(valid()){own.state={...own.state,busy:false};own.job=undefined;emit();}}})();emit();return own.job;
  }
  return {start,reset,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);}},get:(venue:number)=>{sync();return entries.get(venue)?.state;}};
}
