import {BrowserUse} from 'browser-use-sdk/v4';
import {records,runs,saveRun,saveFinding,exportSnapshot} from './db.mjs';
import {findingSchema,batchSchema,rules} from './schema.mjs';
const client=()=>new BrowserUse({apiKey:process.env.BROWSER_USE_API_KEY});
export async function submitBrowser(id){
 const row=records().find(r=>r.id===id);if(!row)throw Error('Unknown row ID');
 const prior=runs().find(r=>r.provider==='browser-use'&&r.payload.property_id===id&&!['completed','failed','cancelled'].includes(r.status));
 if(prior)throw Error('A browser run is already active for this property');
 const run=await client().runs.create({model:'gpt-6-luna',maxCostUsd:2,keepAlive:120,
 browserSettings:{proxyCountryCode:'us'},outputSchema:findingSchema,
 task:rules+'\nUse the live browser to search official county property records for this row. Begin with the suggested county portal; use its actual address search and inspect the property detail, not just a Google snippet. If blocked, record the exact obstacle and continue with state filings and official business websites. Do not create accounts, contact anybody, buy reports, or use people search sites. Return this single row using the schema.\n'+JSON.stringify({id:row.id,entity:row.entity,address:row.address,county:row.county,state:row.state,suggested_portals:row.routing,existing_research:row.finding})});
 saveRun(run.id,'browser-use',run.status,{...run,property_id:id});return {id:run.id,status:run.status,property_id:id,budget:2};
}
export async function pollBrowser(id){
 const c=client(),status=await c.runs.status(id);
 if(!['completed','failed','cancelled'].includes(status.status))return {id,status:status.status};
 const run=await c.runs.get(id),old=runs().find(r=>r.id===id);
 saveRun(id,'browser-use',run.status,{...run,property_id:old?.payload.property_id,property_ids:old?.payload.property_ids});
 if(run.status==='completed'){
  const output=run.output||(typeof run.result==='string'?JSON.parse(run.result):run.result);
  const findings=output.records||[output];
  const allowed=old?.payload.property_ids||[old?.payload.property_id];
  for(const f of findings){
   if(!allowed.includes(f.id))throw Error('Browser returned an unexpected property ID');
   const prior=records().find(r=>r.id===f.id)?.finding;
   if(prior?.ownership_status==='record_found'&&f.ownership_status==='unresolved'){
    saveFinding({...prior,summary:prior.summary+' Live portal follow-up: '+f.summary,evidence:[...prior.evidence,...f.evidence]},'browser-use');
   }else saveFinding(f,'browser-use');
  }
  exportSnapshot();
 }
 // Agent-managed browsers expire after keepAlive; stop an identified live browser now.
 if(run.browserId)await c.browsers.stop(run.browserId);
 return {id,status:run.status,cost:run.totalCostUsd,error:run.error};
}
export async function submitBrowserGroup(ids,budget=3,direct=false){
 const rows=records().filter(r=>ids.includes(r.id));
 if(rows.length!==ids.length)throw Error('Unknown row in browser group');
 const run=await client().runs.create({model:'gpt-6-luna',maxCostUsd:budget,keepAlive:120,browserSettings:{proxyCountryCode:direct?null:'us'},outputSchema:batchSchema,
 task:rules+'\nResearch every row using LIVE official county address/parcel searches, state filings and OpenCorporates, then official business sites. Do not stop after general web search. Open property details and retrieve recorded owners. Use county deed indexes for changed ownership. Return one record for EACH input row even if unresolved. Respect site access restrictions; do not buy reports, create accounts or contact anyone. A tenant operating at a property does not contradict the supplied owner name; they can coexist. A company project at a different address does not disprove another ownership. Explain actual conflicts in county data.'+(direct?'\nThis is a recovery pass after proxy connection failures. This browser uses a direct connection. For 8910 E San Victor use partial street/address searches without ZIP/city and the official GIS spatial parcel query; a full city/state string returning zero is inconclusive. For Denver try the two parcel leads already found. For Waterford distinguish the historical grantee from current owner, and look for a free Waterford assessor lookup. For Powell resolve the 380/394 shared-parcel address discrepancy. Preserve earlier useful evidence; do not turn a historical deed into confirmed current ownership.':'')+'\nINPUT ROWS:\n'+JSON.stringify(rows.map(({id,entity,address,note,county,state,routing,finding})=>({id,entity,address,note,county,state,suggested_portals:routing,existing_research:finding}))) });
 saveRun(run.id,'browser-use',run.status,{...run,property_ids:ids});return {id:run.id,status:run.status,rows:ids,budget};
}
