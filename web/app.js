const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=u=>{try{const x=new URL(u);return ['https:','http:'].includes(x.protocol)?x.href:'#';}catch{return '#';}};
const ownership={record_found:'County record found',candidate:'Candidate · verify',unresolved:'Unresolved',conflict:'Conflicting evidence'};
const roleNames={owner_company:'Owner / parent company',property_manager:'Property manager',tenant:'Operating business · tenant lead',registered_agent:'Registered agent',unconfirmed_business:'Unconfirmed business link'};
let state,view='all',local=false,selectedId,visible=[];
let notes={};try{notes=JSON.parse(localStorage.getItem('owner-desk-notes')||'{}');}catch{}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,4500);}
const ownerChannels=r=>(r.finding?.business_contacts||[]).filter(c=>['owner_company','property_manager'].includes(c.role)&&(c.phone||c.email));
async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j;}
async function load(){
 try{
  let r=await fetch('/api/state',{cache:'no-store'});if(r.ok&&r.headers.get('Content-Type')?.includes('application/json')){state=await r.json();local=true;}else{r=await fetch('results.json',{cache:'no-store'});if(!r.ok)throw Error('Research data is unavailable');state=await r.json();}
  $('#mode-label').textContent=local?'Desktop research app · connected':'Hosted results · saved snapshot';
  $('#desktop-link').hidden=local;$('#research').hidden=!local;
  $('#add-note').textContent=local?'Saved to the database. New properties enter the next research batch (up to $5 per batch).':'This hosted view shows saved results. You can download a new-property queue, then import it in the desktop research app.';
  $('#add-submit').textContent=local?'Add & research property':'Download research queue';
  const date=new Date(state.generated_at);$('#updated').textContent=(local?'Database updated ':'Snapshot published ')+date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  $('#stat-total').textContent=state.records.length;$('#nav-total').textContent=state.records.length;
  $('#stat-states').textContent=new Set(state.records.map(r=>r.state).filter(Boolean)).size;
  $('#stat-records').textContent=state.records.filter(r=>r.finding?.ownership_status==='record_found').length;
  $('#stat-contacts').textContent=state.records.filter(r=>ownerChannels(r).length).length;
  $('#stat-unresolved').textContent=state.records.filter(r=>!r.finding||r.finding.ownership_status!=='record_found').length;
  $('#nav-review').textContent=state.records.filter(r=>r.finding?.review_status!=='Reviewed').length;
  const keep=$('#state').value;$('#state').innerHTML='<option value="">All states</option>'+[...new Set(state.records.map(r=>r.state).filter(Boolean))].sort().map(s=>`<option ${s===keep?'selected':''}>${esc(s)}</option>`).join('');
  const active=state.runs.filter(r=>!['completed','failed','cancelled'].includes(r.status));
  $('#research-status').hidden=!active.length;
  $('#research-status').textContent=active.length?`${active.length} research ${active.length===1?'run is':'runs are'} in progress. ${local?'Results save automatically.':'This snapshot was captured while research was running.'}`:'';
  render();if(selectedId)openDetail(selectedId,false);
 }catch(e){toast(e.message);$('#updated').textContent='Could not load the latest research';}
}
function render(){
 const query=$('#search').value.toLowerCase(),priority=$('#priority').value,st=$('#state').value;
 visible=state.records.filter(r=>{
  if(priority&&r.priority!==priority||st&&r.state!==st)return false;
  if(view==='records'&&r.finding?.ownership_status!=='record_found')return false;
  if(view==='contacts'&&!ownerChannels(r).length)return false;
  if(view==='review'&&r.finding?.review_status==='Reviewed')return false;
  return JSON.stringify([r.id,r.entity,r.address,r.finding?.recorded_owner,r.finding?.parcel_id,r.finding?.principal]).toLowerCase().includes(query);
 });
 $('#view-title').innerHTML=({all:'Property pipeline',review:'Needs review',records:'County records',contacts:'Owner business contacts'}[view])+` <span>${visible.length}</span>`;
 $('#rows').innerHTML=visible.map(r=>{
  const f=r.finding,contact=ownerChannels(r)[0];
  return `<tr class="property-row" tabindex="0" role="button" aria-label="Open research for ${esc(r.entity)}" data-id="${r.id}"><td><div class="row-id">ROW ${r.id} <span>· ${esc(r.state)}</span></div><div class="entity">${esc(r.entity)}</div><span class="address"><span class="location-icon">⌖</span>${esc(r.address)}</span></td><td>${f?.recorded_owner?`<div class="owner-name">${esc(f.recorded_owner)}</div>`:''}<span class="status ${esc(f?.ownership_status||'unresolved')}">${ownership[f?.ownership_status]||'Queued for research'}</span></td><td>${contact?`<div class="contact-name">${esc(contact.name)}</div><span class="contact-phone">${esc(contact.phone||contact.email)}</span>`:'<span class="no-contact">No owner channel established</span>'}</td><td><span class="priority ${esc(r.priority)}">${esc(r.priority)}</span></td><td class="chevron">›</td></tr>`;
 }).join('');
 $('#showing').textContent=`Showing ${visible.length} of ${state.records.length} properties`;$('#empty').hidden=!!visible.length;
 for(const row of document.querySelectorAll('.property-row')){row.onclick=()=>openDetail(Number(row.dataset.id));row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail(Number(row.dataset.id));}};}
}
function openDetail(id,focus=true){
 const r=state.records.find(r=>r.id===id);if(!r)return;selectedId=id;const f=r.finding;
 $('#drawer-id').textContent=`PROPERTY RESEARCH / ROW ${id}`;
 $('#detail').innerHTML=`<h2>${esc(r.entity)}</h2><p class="detail-address">⌖ ${esc(r.address)}</p><span class="priority ${esc(r.priority)}">${esc(r.priority)} priority</span>
 <section><h3>Ownership findings</h3><div class="data-pair"><span>Recorded owner</span><b>${esc(f?.recorded_owner||'Not established')}</b></div><div class="data-pair"><span>Parcel ID</span><b>${esc(f?.parcel_id||'Not established')}</b></div><div class="data-pair"><span>Research status</span><b>${esc(ownership[f?.ownership_status]||'Queued')}</b></div><div class="data-pair"><span>Principal / parent</span><b>${esc(f?.principal||'Not established')}${f?.principal_role?'<br><small>'+esc(f.principal_role)+'</small>':''}</b></div>${f?.entity_number?`<div class="data-pair"><span>Entity number</span><b>${esc(f.entity_number)}</b></div>`:''}<p>${esc(f?.summary||'Research has not run for this property yet.')}</p></section>
 <section><h3>Next action</h3><div class="next-action">${esc(f?.next_action||r.note||'Search the county property record and official entity filings.')}</div>${local?`<div class="portal-links" style="margin-top:12px"><button class="button" id="rerun">Refresh research · up to $5</button><button class="button" id="county-run">Verify county · up to $2</button></div>`:''}</section>
 <section><h3>Published business channels</h3>${(f?.business_contacts||[]).length?f.business_contacts.map(c=>`<article class="contact-card"><span class="role">${esc(roleNames[c.role]||c.role)}</span><h4>${esc(c.name)}</h4>${c.phone?`<a href="tel:${esc(c.phone.replace(/[^+\d]/g,''))}">${esc(c.phone)}</a>`:''}${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:''}<a href="${esc(url(c.source_url))}" target="_blank" rel="noopener noreferrer">Official source ↗</a><p>${esc(c.publication_context)}</p></article>`).join(''):'<p>No published owner business contact established.</p>'}</section>
 <section><h3>Evidence trail · ${(f?.evidence||[]).length} sources</h3>${(f?.evidence||[]).map(e=>`<article class="evidence-card"><div class="source-meta">${esc(e.kind.replaceAll('_',' ').toUpperCase())}${e.record_date?' · '+esc(e.record_date):''}</div><a href="${esc(url(e.url))}" target="_blank" rel="noopener noreferrer">${esc(e.title)} ↗</a><blockquote>${esc(e.quote)}</blockquote><p>${esc(e.supports)}</p></article>`).join('')||'<p>No source documents saved yet.</p>'}</section>
 <section><h3>Continue in official records</h3><div class="portal-links">${r.routing?.county?`<a class="button" href="${esc(url(r.routing.county))}" target="_blank" rel="noopener noreferrer">County portal ↗</a>`:''}${r.routing?.registry?`<a class="button" href="${esc(url(r.routing.registry))}" target="_blank" rel="noopener noreferrer">State registry ↗</a>`:''}<a class="button" href="https://opencorporates.com/companies?q=${encodeURIComponent(f?.recorded_owner||r.entity)}" target="_blank" rel="noopener noreferrer">OpenCorporates ↗</a></div></section>
 <section><h3>Original assignment</h3><div class="data-pair"><span>Supplied status</span><b>${esc(r.status)}</b></div><p class="original-note">${esc(r.note)}</p><p class="note-caption">The supplied status is preserved separately from research findings.</p></section>
 <section><h3>Your review notes</h3><textarea id="notes" class="note-area" rows="4" placeholder="Call outcomes, corrections, or next steps…">${esc(notes[id]||'')}</textarea><p class="note-caption" id="note-saved">Notes save in this browser and are included in CSV exports.</p></section>`;
 $('#drawer').hidden=false;$('#scrim').hidden=false;
 if(focus)$('#close').focus();
 $('#notes').oninput=e=>{notes[id]=e.target.value;try{localStorage.setItem('owner-desk-notes',JSON.stringify(notes));$('#note-saved').textContent='Saved in this browser · included in CSV exports';}catch{$('#note-saved').textContent='Browser storage unavailable; export your notes before closing.';}};
 if(local){$('#rerun').onclick=()=>runResearch([id]);$('#county-run').onclick=async()=>{try{const res=await api('/api/browser',{id});toast('County verification started');await load();}catch(e){toast(e.message);}};}
}
function closeDetail(){$('#drawer').hidden=true;$('#scrim').hidden=true;const id=selectedId;selectedId=undefined;document.querySelector(`[data-id="${id}"]`)?.focus();}
function download(name,content,type){const blob=new Blob([content],{type}),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
const cell=s=>'"'+String(s??'').replace(/^([=+@\-\t\r])/,'\'$1').replaceAll('"','""')+'"';
$('#csv').onclick=()=>{
 const headings=['row_id','priority','supplied_entity','property_address','supplied_status','recorded_owner','parcel_id','ownership_status','principal','owner_business_phone','owner_business_email','owner_contact_sources','all_business_contacts','summary','next_action','evidence_urls','researched_at','review_notes'];
 const rows=visible.map(r=>{const f=r.finding,c=ownerChannels(r);return [r.id,r.priority,r.entity,r.address,r.status,f?.recorded_owner,f?.parcel_id,f?.ownership_status,f?.principal,c.map(c=>c.phone).filter(Boolean).join('; '),c.map(c=>c.email).filter(Boolean).join('; '),c.map(c=>c.source_url).join('; '),JSON.stringify(f?.business_contacts||[]),f?.summary,f?.next_action,(f?.evidence||[]).map(e=>e.url).join('; '),r.researched_at,notes[r.id]||''];});
 download('owner-research.csv','\uFEFF'+[headings,...rows].map(row=>row.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');toast('Filtered results exported with evidence links and review notes');
};
async function runResearch(ids){try{$('#research').disabled=true;const result=await api('/api/research',{ids});toast(result.message||'Research started');await load();}catch(e){toast(e.message);}finally{$('#research').disabled=false;}}
$('#research').onclick=()=>runResearch();$('#refresh').onclick=load;
for(const el of ['#search','#priority','#state'])$(el).addEventListener(el==='#search'?'input':'change',render);
$('#clear').onclick=()=>{$('#search').value='';$('#priority').value='';$('#state').value='';render();};
for(const button of document.querySelectorAll('.nav'))button.onclick=()=>{view=button.dataset.view;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b===button));render();};
$('#close').onclick=closeDetail;$('#scrim').onclick=closeDetail;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail();if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
$('#add-open').onclick=()=>$('#add-dialog').showModal();$('#add-close').onclick=()=>$('#add-dialog').close();
$('#add-form').onsubmit=async e=>{e.preventDefault();const row=Object.fromEntries(new FormData(e.target));row.state=row.state.toUpperCase();try{if(local){await api('/api/properties',row);toast('Property saved to the research queue');await load();}else{download('new-property-queue.json',JSON.stringify([row],null,2),'application/json');toast('Queue downloaded for the desktop research app');}$('#add-dialog').close();e.target.reset();}catch(error){toast(error.message);}};
await load();setInterval(()=>{if(local&&!$('#drawer').hidden)return;if(local)load();},15000);
