import {mkdirSync,copyFileSync} from 'node:fs';
import {exportSnapshot} from './db.mjs';
export function build(){mkdirSync('dist',{recursive:true});for(const f of ['index.html','app.js','styles.css'])copyFileSync('web/'+f,'dist/'+f);exportSnapshot();}
if(process.argv[1]?.endsWith('build.mjs'))build();
