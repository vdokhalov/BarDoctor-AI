// Bundled offline entry: no external packages or production connections at runtime.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync,existsSync,chmodSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {rehearseQaSnapshot} from './lib/rehearse-qa-pos-backup';
import {backupDigest} from '../lib/bardoctor/qa-pos-backup';
const [input,expectedHash,target]=process.argv.slice(2);
if(!input||!target||!/^[a-f0-9]{64}$/.test(expectedHash??''))throw Error('Usage: node recovery.mjs PRIVATE_BACKUP.json SERVER_SHA256 NEW_PRIVATE_DIRECTORY');
const dir=resolve(target);if(existsSync(dir))throw Error('Target must not exist; use a NEW private directory');
globalThis.fetch=async()=>{throw Error('Offline rehearsal forbids network requests')};
chmodSync(input,0o600);
const wrapped=JSON.parse(readFileSync(input,'utf8')),snapshot=wrapped.snapshot??wrapped;
if(snapshot.scope?.venueId!==3389||snapshot.scope?.accountId!==148)throw Error('Wrong scope');
mkdirSync(dir,{mode:0o700});const sqlite=new DatabaseSync(join(dir,'restored.sqlite'));chmodSync(join(dir,'restored.sqlite'),0o600);sqlite.exec('PRAGMA foreign_keys=ON');
// Frozen schema from the same local native D1 fixture. Exact schema hash is checked before restoration.
const schema=JSON.parse(readFileSync(new URL('./schema.json',import.meta.url),'utf8')) as {sql:string}[];
for(const row of schema)sqlite.exec(row.sql);
function prepare(sql:string){let args:any[]=[];const statement={bind(...values:any[]){args=values;return statement},async all(){return {results:sqlite.prepare(sql).all(...args),success:true,meta:{}}},async first(column?:string){const row=sqlite.prepare(sql).get(...args);return column?row?.[column]??null:row??null},async run(){const result=sqlite.prepare(sql).run(...args);return {results:[],success:true,meta:{changes:Number(result.changes)}}}};return statement}
const db={prepare,async batch(statements:ReturnType<typeof prepare>[]){sqlite.exec('BEGIN IMMEDIATE');try{const rows=[];for(const s of statements)rows.push(await s.all());sqlite.exec('COMMIT');return rows}catch(e){sqlite.exec('ROLLBACK');throw e}}} as unknown as D1Database;
const files={async put(key:string,value:Uint8Array){if(!/^(venues|purchases|sales|catalog|employees)\/148\//.test(key))throw Error('Invalid asset scope');const path=join(dir,'files',await backupDigest(key));mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,value,{mode:0o600,flag:'wx'});},async get(key:string){const path=join(dir,'files',await backupDigest(key));if(!existsSync(path))return null;return {async arrayBuffer(){return new Uint8Array(readFileSync(path)).buffer}}}};
try{const receipt={...await rehearseQaSnapshot(db,snapshot,expectedHash,files),engine:'node-sqlite-file-r2',runtime:process.version};
const index=[];for(const asset of snapshot.assets)index.push({key:asset.key,file:join('files',await backupDigest(asset.key)),hash:asset.hash,bytes:asset.bytes});writeFileSync(join(dir,'asset-index.json'),JSON.stringify(index,null,2),{mode:0o600});writeFileSync(join(dir,'receipt.json'),JSON.stringify(receipt,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(receipt));}catch(e){console.error('Rehearsal failed; no valid receipt produced. '+(e instanceof Error?e.message:'Unknown error'));process.exitCode=1;}finally{sqlite.close()}
