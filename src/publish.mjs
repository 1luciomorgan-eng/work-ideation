import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
const statePath='.local/hosting.json';
const headers=()=>({Authorization:`Bearer ${process.env.HERENOW_API_KEY}`,'X-HereNow-Client':'codex/owner-research','Content-Type':'application/json'});
async function api(path,method='GET',body){
 const url=path.startsWith('https://here.now/')?path:'https://here.now'+path;
 if(new URL(url).origin!=='https://here.now')throw Error('Unexpected hosting API origin');
 const r=await fetch(url,{method,headers:headers(),body:body?JSON.stringify(body):undefined});
 const j=await r.json();if(!r.ok)throw Error(`here.now ${r.status}: ${JSON.stringify(j)}`);return j;
}
export async function publish(){
 if(!process.env.HERENOW_API_KEY)throw Error('HERENOW_API_KEY is not configured');
 build();
 let state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):null;
 const names=['index.html','styles.css','app.js','results.json'];
 const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',json:'application/json'};
 const files=names.map(path=>{const b=readFileSync('dist/'+path);return {path,size:b.length,hash:createHash('sha256').update(b).digest('hex'),contentType:types[path.split('.').at(-1)]};});
 async function upload(pending,bytes){
  for(const target of pending.uploads){
   const url=new URL(target.url);if(!url.hostname.endsWith('.r2.cloudflarestorage.com'))throw Error('Unexpected upload host');
   const response=await fetch(url,{method:'PUT',headers:target.headers,body:bytes(target.path)});
   if(!response.ok)throw Error(`Upload failed for ${target.path}: ${response.status}`);
  }
 }
 // The access endpoint requires a finalized Site. Bootstrap with a data-free holding page.
 if(!state?.versionId){
  const blank=Buffer.from('<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><title>Research workspace</title></head><body><p>Private research workspace is being prepared.</p></body></html>');
  const blankFiles=[{path:'index.html',size:blank.length,hash:createHash('sha256').update(blank).digest('hex'),contentType:types.html}];
  const first=await api(state?'/api/v1/publish/'+state.slug:'/api/v1/publish',state?'PUT':'POST',{files:blankFiles,displayName:'Owner Research Desk'});
  state={slug:first.slug,siteUrl:first.siteUrl,pending:first.upload};writeFileSync(statePath,JSON.stringify(state,null,2));
  await upload(first.upload,()=>blank);
  const boot=await api(first.upload.finalizeUrl,'POST',{versionId:first.upload.versionId});
  if(!boot.success)throw Error('Holding page finalization failed');
  state={slug:first.slug,siteUrl:boot.siteUrl,versionId:boot.currentVersionId};writeFileSync(statePath,JSON.stringify(state,null,2));
 }
 if(state?.versionId){const live=await api('/api/v1/publish/'+state.slug);if(live.currentVersionId!==state.versionId)throw Error('Hosted site changed elsewhere; reconcile before publishing');}
 // Restrict the finalized holding page before staging any prospect data. No invitations are sent.
 const access=await api('/api/v1/publish/'+state.slug+'/access','PATCH',{mode:'restricted',allowedEmails:[],allowedDomains:[],notify:false});
 if(access.access?.mode!=='restricted')throw Error('Owner-only access was not applied');
 if(!state?.pending){
  const pending=await api(state?'/api/v1/publish/'+state.slug:'/api/v1/publish',state?'PUT':'POST',{files,displayName:'Owner Research Desk',displayDescription:'Commercial property ownership research with evidence and public business contacts',...(state?.versionId?{baseVersionId:state.versionId}:{})});
  state={...state,slug:pending.slug,siteUrl:pending.siteUrl,pending:pending.upload};
  writeFileSync(statePath,JSON.stringify(state,null,2));
 }
 await upload(state.pending,path=>readFileSync('dist/'+path));
 const done=await api(state.pending.finalizeUrl,'POST',{versionId:state.pending.versionId});
 if(!done.success)throw Error('Finalize did not confirm publication');
 state={slug:state.slug,siteUrl:done.siteUrl,versionId:done.currentVersionId,publishStatus:done.publishStatus,access:'restricted'};
 writeFileSync(statePath,JSON.stringify(state,null,2));return state;
}
if(process.argv[1]?.endsWith('publish.mjs')){try{console.log(JSON.stringify(await publish(),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
