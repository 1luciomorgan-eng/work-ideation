import Exa from 'exa-js';
import {batchSchema,rules} from './schema.mjs';
import {records,saveRun,saveFinding,runs,exportSnapshot} from './db.mjs';
const client=()=>new Exa(process.env.EXA_API_KEY);
export async function submit(ids,budget=5){
 if(!process.env.EXA_API_KEY)throw Error('EXA_API_KEY is not configured');
 if(!Number.isFinite(budget)||budget<1||budget>20)throw Error('Budget must be between $1 and $20');
 const pending=runs().find(r=>r.provider==='exa'&&!['completed','failed','cancelled'].includes(r.status));
 if(pending)throw Error(`Existing Exa run ${pending.id} is ${pending.status}; poll it before starting another.`);
 const rows=records().filter(r=>!ids||ids.includes(r.id));
 if(!rows.length)throw Error('No matching rows');
 const run=await client().agent.runs.create({query:rules+' Research every input row. Return one result per row. Do not omit unresolved rows.',input:{data:rows.map(({id,entity,address,note,county,state,routing})=>({id,entity,address,note,county,state,suggested_portals:routing}))},effort:'auto',budget:{maxCostDollars:budget},outputSchema:batchSchema});
 saveRun(run.id,'exa',run.status,run);return {id:run.id,status:run.status,rows:rows.length,budget};
}
export async function poll(id){
 const run=await client().agent.runs.get(id);saveRun(run.id,'exa',run.status,run);
 if(run.status==='completed'){
  const data=run.output?.structured;
  if(!Array.isArray(data?.records))throw Error('Completed Exa run has no structured records');
  const seen=new Set();for(const f of data.records){if(seen.has(f.id))throw Error('Duplicate row in Exa output');seen.add(f.id);saveFinding(f,'exa');}
  exportSnapshot();
 }
 return {id:run.id,status:run.status,stopReason:run.stopReason,cost:run.costDollars,rows:run.output?.structured?.records?.length,error:run.error};
}
