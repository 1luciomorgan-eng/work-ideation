import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {seeds,routing} from './seed.mjs';
import {normalizeFinding} from './schema.mjs';
mkdirSync('data',{recursive:true});mkdirSync('.local',{recursive:true});
const db=new DatabaseSync(resolve(process.env.OWNER_DB||'data/owners.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS properties(id INTEGER PRIMARY KEY,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS findings(id INTEGER PRIMARY KEY,payload TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,provider TEXT NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audits(id INTEGER PRIMARY KEY,property_id INTEGER,action TEXT,payload TEXT,created TEXT);
`);
for(const row of seeds)db.prepare('INSERT OR IGNORE INTO properties VALUES(?,?)').run(row.id,JSON.stringify({...row,routing:routing(row)}));
export function records(){return db.prepare('SELECT p.id,p.payload,f.payload AS finding,f.updated FROM properties p LEFT JOIN findings f ON f.id=p.id ORDER BY CASE WHEN json_extract(p.payload,\'$.priority\')=\'High\' THEN 0 ELSE 1 END,p.id').all().map(r=>({...JSON.parse(r.payload),finding:r.finding?JSON.parse(r.finding):null,researched_at:r.updated||null}));}
export function addProperty(row){
 const id=row.id||Number(db.prepare('SELECT COALESCE(MAX(id),0)+1 AS id FROM properties').get().id);
 if(!row.entity?.trim()||!row.address?.trim())throw Error('Entity and address are required');
 if(db.prepare('SELECT id FROM properties WHERE id=?').get(id))throw Error('Row ID already exists');
 const p={id,entity:row.entity.trim(),address:row.address.trim(),priority:row.priority==='High'?'High':'Medium',note:row.note||'',status:'To Research',state:row.state||'',county:row.county||''};
 db.prepare('INSERT INTO properties VALUES(?,?)').run(id,JSON.stringify(p));return p;
}
export function saveFinding(value,provider){
 if(!records().some(r=>r.id===value.id))throw Error('Research returned an unknown row ID');
 const f=normalizeFinding(value),now=new Date().toISOString();
 db.prepare('INSERT INTO findings VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').run(f.id,JSON.stringify(f),now);
 db.prepare('INSERT INTO audits(property_id,action,payload,created) VALUES(?,?,?,?)').run(f.id,'research:'+provider,JSON.stringify(f),now);
 return f;
}
export function saveRun(id,provider,status,payload){db.prepare('INSERT INTO runs VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,payload=excluded.payload,updated=excluded.updated').run(id,provider,status,JSON.stringify(payload),new Date().toISOString());}
export function runs(){return db.prepare('SELECT * FROM runs ORDER BY updated DESC').all().map(r=>({...r,payload:JSON.parse(r.payload)}));}
export function snapshot(){return {generated_at:new Date().toISOString(),records:records(),runs:runs().map(({id,provider,status,updated,payload})=>({id,provider,status,updated,cost:payload.costDollars||(payload.totalCostUsd?{total:Number(payload.totalCostUsd)}:null),stop_reason:payload.stopReason||null})),mode:'snapshot'};}
export function exportSnapshot(){mkdirSync('dist',{recursive:true});const p=resolve('dist/results.json');writeFileSync(p+'.tmp',JSON.stringify(snapshot(),null,2));renameSync(p+'.tmp',p);return p;}
