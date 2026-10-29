import {records,runs,addProperty,exportSnapshot} from './db.mjs';
import {submit,poll} from './exa.mjs';
import {readFileSync} from 'node:fs';
const [action,...args]=process.argv.slice(2);
try{
 let result;
 switch(action){
 case 'research':result=await submit(args.filter(a=>/^\d+$/.test(a)).map(Number).length?args.filter(a=>/^\d+$/.test(a)).map(Number):null,Number(process.env.RESEARCH_BUDGET||5));break;
 case 'poll':result=await poll(args[0]||runs().find(r=>r.provider==='exa')?.id);break;
 case 'list':result=records();break;
 case 'runs':result=runs().map(({id,provider,status,updated,payload})=>({id,provider,status,updated,cost:payload.costDollars,stopReason:payload.stopReason}));break;
 case 'export':result={path:exportSnapshot()};break;
 case 'import':{const rows=JSON.parse(readFileSync(args[0],'utf8'));result=(Array.isArray(rows)?rows:[rows]).map(addProperty);break;}
 case 'browser':{const {submitBrowser}=await import('./browser.mjs');result=await submitBrowser(Number(args[0]));break;}
 case 'browser-poll':{const {pollBrowser}=await import('./browser.mjs');result=await pollBrowser(args[0]);break;}
 case 'county-batch':{const {submitBrowserGroup}=await import('./browser.mjs');result=[];for(const [ids,budget] of [[[439,512,26],3],[[478,524],2],[[521,41],2],[[549,553,559],3],[[2,29,42],3]])result.push(await submitBrowserGroup(ids,budget));break;}
 case 'poll-browsers':{const {pollBrowser}=await import('./browser.mjs');result=[];for(const r of runs().filter(r=>r.provider==='browser-use'&&r.status!=='completed'))result.push(await pollBrowser(r.id));break;}
 case 'rescue':{const {submitBrowserGroup}=await import('./browser.mjs');result=await submitBrowserGroup([439,29,521,42],3,true);break;}
 case 'treg':{const {searchTreg}=await import('./treg.mjs');result=await searchTreg(Number(args[0]));break;}
 case 'hosting-info':{const r=await fetch('https://here.now/api/v1/me',{headers:{Authorization:`Bearer ${process.env.HERENOW_API_KEY}`,'X-HereNow-Client':'codex/owner-research'}});const j=await r.json();result={status:r.status,fields:Object.keys(j)};break;}
 default:throw Error('Commands: research [IDs], poll [runID], list, runs, export, import file.json, browser ID, browser-poll runID, treg ID, hosting-info');
 }
 console.log(JSON.stringify(result,null,2));
}catch(e){console.error(JSON.stringify({error:e.message}));process.exitCode=1;}
