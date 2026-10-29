import {records,saveRun} from './db.mjs';
import {randomUUID} from 'node:crypto';
export async function searchTreg(id){
 const row=records().find(r=>r.id===id);if(!row)throw Error('Unknown row');
 const res=await fetch('https://treg.to/call/treg.web.search',{method:'POST',headers:{'Content-Type':'application/json','X-Treg-Token':process.env.TREG_TOKEN,'X-Treg-Route-Max-Cost':'0.01','X-Treg-Route-Waterfall':'0'},body:JSON.stringify({q:`${row.entity} ${row.address} county property owner official business website`})});
 const body=await res.json();if(!res.ok)throw Error(`treg ${res.status}: ${JSON.stringify(body)}`);
 const key=res.headers.get('X-Treg-Call-Id')||randomUUID();
 const result={property_id:id,cost_usd:Number(res.headers.get('X-Treg-Cost-Micro')||0)/1e6,leads:body.output?.results||body.results||[]};
 saveRun(key,'treg','completed',result);return result;
}
