const origin='http://127.0.0.1:4317';
const checks=[];
for(const path of ['/','/app.js','/styles.css','/api/state']){const r=await fetch(origin+path);if(r.status!==200)throw Error(path+' HTTP '+r.status);checks.push(path+': 200');}
const privateFile=await fetch(origin+'/.local/secrets.clixml');if(privateFile.status!==404)throw Error('Private path is exposed');checks.push('Private files: 404');
const cross=await fetch(origin+'/api/properties',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:'{}'});if(cross.status!==403)throw Error('Cross-origin write accepted');checks.push('Cross-origin write: 403');
const invalid=await fetch(origin+'/api/properties',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:'{}'});if(invalid.status!==400)throw Error('Invalid property accepted');checks.push('Invalid row: 400');
const state=await fetch(origin+'/api/state').then(r=>r.json());console.log(JSON.stringify({checks,rows:state.records.length},null,2));
