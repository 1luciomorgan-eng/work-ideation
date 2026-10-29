import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {snapshot,records,runs,addProperty} from './db.mjs';
import {submit,poll} from './exa.mjs';
import {pollBrowser,submitBrowser} from './browser.mjs';
import {build} from './build.mjs';
const port=Number(process.env.PORT||4317),origin=`http://127.0.0.1:${port}`;
build();let ticking=false,submitting=false;
async function startResearch(ids){
 if(submitting)throw Error('Research submission already in progress');
 const pending=ids||records().filter(r=>!r.finding).map(r=>r.id);
 if(!pending.length)return {message:'All properties already have a research pass. Open a property to refresh it.'};
 submitting=true;try{return await submit(pending,5);}finally{submitting=false;}
}
async function tick(){
 if(ticking)return;ticking=true;
 try{
  for(const r of runs().filter(r=>!['completed','failed','cancelled'].includes(r.status))){
   try{if(r.provider==='exa')await poll(r.id);if(r.provider==='browser-use')await pollBrowser(r.id);}catch(e){console.error('Research poll:',e.message);}
  }
  if(!runs().some(r=>r.provider==='exa'&&!['completed','failed','cancelled'].includes(r.status))&&records().some(r=>!r.finding))await startResearch();
 }catch(e){console.error('Queue:',e.message);}finally{ticking=false;}
}
async function body(req){let b='';for await(const chunk of req){b+=chunk;if(b.length>100000)throw Error('Request too large');}return JSON.parse(b||'{}');}
const server=createServer(async(req,res)=>{
 const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))return json(403,{error:'Invalid host'});
  const path=new URL(req.url,origin).pathname;
  if(req.method==='GET'&&path==='/api/state')return json(200,{...snapshot(),mode:'local'});
  if(path.startsWith('/api/')&&req.method==='POST'){
   if(![origin,`http://localhost:${port}`].includes(req.headers.origin)||!req.headers['content-type']?.startsWith('application/json'))return json(403,{error:'Open the local research app to make changes'});
   const data=await body(req);
   if(path==='/api/properties'){const row=addProperty(data);setTimeout(tick,100);return json(201,row);}
   if(path==='/api/research')return json(202,await startResearch(data.ids));
   if(path==='/api/browser')return json(202,await submitBrowser(Number(data.id)));
   return json(404,{error:'Unknown API route'});
  }
  const file={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css','/results.json':'results.json'}[path];
  if(req.method!=='GET'||!file)return json(404,{error:'Not found'});
  const type={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json'}[file.split('.').at(-1)];
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(readFileSync('dist/'+file));
 }catch(e){json(400,{error:e.message});}
});
server.listen(port,'127.0.0.1',()=>{console.log(`Owner Research Desk: ${origin}`);tick();});
setInterval(tick,20000);
