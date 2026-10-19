// Never return/log raw exception text, SQL, binds, rows, or stack/cause objects.
const patterns:readonly [string,RegExp][]=[
 ['QUERY_LIMIT',/too many (?:api requests|subrequests|queries)|maximum.*queries per invocation/i],
 ['SQL_VARIABLE_LIMIT',/too many sql variables|too many bound parameters/i],
 ['SQL_LENGTH_LIMIT',/statement too long|sql.*(?:too long|too large)/i],
 ['VALUE_SIZE_LIMIT',/string or blob too big|SQLITE_TOOBIG|row.*too large/i],
 ['RESULT_SIZE_LIMIT',/response.*too (?:large|big)|result.*too (?:large|big)/i],
 ['MEMORY_LIMIT',/out of memory|memory limit|SQLITE_NOMEM/i],
 ['TIMEOUT',/timed out|timeout|time limit|duration limit/i],
 ['OVERLOADED',/overloaded|SQLITE_BUSY|database is locked/i],
 ['MISSING_COLUMN',/no such column|D1_COLUMN_NOTFOUND/i],['MISSING_TABLE',/no such table/i],
 ['NOT_NULL_CONSTRAINT',/NOT NULL constraint|SQLITE_CONSTRAINT_NOTNULL/i],
 ['FOREIGN_KEY_CONSTRAINT',/FOREIGN KEY constraint|SQLITE_CONSTRAINT_FOREIGNKEY/i],
 ['UNIQUE_CONSTRAINT',/UNIQUE constraint|SQLITE_CONSTRAINT_UNIQUE/i],
 ['CHECK_CONSTRAINT',/CHECK constraint|SQLITE_CONSTRAINT_CHECK/i],
 ['PAUSE_GUARD',/QA_POS_BACKUP_PAUSED|JOURNAL_MIGRATION_PAUSED/],
 ['SQL_SYNTAX',/syntax error|SQLITE_MISUSE/i],
 ['BIND_TYPE',/D1_TYPE_ERROR|type.*not supported/i],
 ['D1_RESET',/reset.*database|database.*reset|D1 DB reset|D1_RESET/i],
 ['STORAGE_LIMIT',/maximum account storage limit|maximum DB size/i],
 ['DAILY_READ_LIMIT',/daily row read limit/i],['DAILY_WRITE_LIMIT',/daily row write limit/i],
 ['NETWORK_LOST',/network connection lost/i],
 ['D1_GENERIC',/D1_ERROR|D1_EXEC_ERROR/]
];
export function classifyCaptureFailure(error:unknown){const texts:string[]=[];const seen=new Set<unknown>();let current=error,reportedStatementIndex:number|null=null;
 for(let depth=0;depth<4&&current!=null&&!seen.has(current);depth++){seen.add(current);if(typeof current==='string'){texts.push(current.slice(0,8192));break}if(typeof current!=='object')break;try{const e=current as {message?:unknown;code?:unknown;cause?:unknown;statementIndex?:unknown};if(typeof e.message==='string')texts.push(e.message.slice(0,8192));if(typeof e.code==='string')texts.push(e.code.slice(0,128));if(typeof e.statementIndex==='number'&&Number.isInteger(e.statementIndex)&&e.statementIndex>=0&&e.statementIndex<128)reportedStatementIndex=e.statementIndex;current=e.cause}catch{break}}
 const category=patterns.find(([,pattern])=>texts.some(text=>pattern.test(text)))?.[0]??'UNKNOWN';
 return {category,reportedStatementIndex,indexBasis:'provider-unspecified' as const};
}
export type CaptureStatementKind='OWNER_GUARD'|'RUN_GUARD'|'BUSINESS_ROWS'|'EMPTY_COUNT'|'PROFILE';
export class QaCaptureBatchError extends Error {
 readonly diagnostic:{stage:'CAPTURE_BATCH';runId:string;phase:string;statementCount:number;statements:{ordinal:number;kind:CaptureStatementKind}[];category:string;reportedStatementIndex:number|null;indexBasis:'provider-unspecified';cleanup:'NOT_ATTEMPTED'|'ABORTED'|'UNCONFIRMED';cleanupCategory?:string};
 constructor(error:unknown,runId:string,phase:string,kinds:CaptureStatementKind[]){super('QA_POS_BACKUP_CAPTURE_BATCH_FAILED');this.name='QaCaptureBatchError';this.diagnostic={stage:'CAPTURE_BATCH',runId:/^[a-f0-9-]{36}$/.test(runId)?runId:'INVALID',phase:['CAPTURE','BACKED_UP','REHEARSED','COPYING','CUTOVER','COMPLETE','ABORTED'].includes(phase)?phase:'UNKNOWN',statementCount:kinds.length,statements:kinds.map((kind,i)=>({ordinal:i+1,kind})),...classifyCaptureFailure(error),cleanup:'NOT_ATTEMPTED'};}
}
