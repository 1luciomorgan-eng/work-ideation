import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFinding} from '../src/schema.mjs';
test('a search lead cannot become a county-supported ownership match',()=>{
 const f=normalizeFinding({id:1,ownership_status:'record_found',evidence:[{kind:'other',url:'https://example.com',quote:'An owner name'}],business_contacts:[]});
 assert.equal(f.ownership_status,'candidate');assert.equal(f.review_status,'Needs review');
});
test('unsafe links and unpublished contacts are excluded',()=>{
 const f=normalizeFinding({ownership_status:'unresolved',evidence:[{url:'javascript:alert(1)'}],business_contacts:[{source_url:'https://example.com',is_published_business_contact:false,publication_context:'unknown'},{source_url:'javascript:alert(1)',is_published_business_contact:true,publication_context:'unknown'},{source_url:'https://example.com',is_published_business_contact:true,publication_context:''}]});
 assert.deepEqual(f.evidence,[]);assert.deepEqual(f.business_contacts,[]);
});
test('tenant contacts retain their role and do not confirm ownership',()=>{
 const f=normalizeFinding({ownership_status:'unresolved',evidence:[],business_contacts:[{name:'Operating tenant',role:'tenant',phone:'555-0100',source_url:'https://example.com',is_published_business_contact:true,publication_context:'Official location page'}]});
 assert.equal(f.business_contacts[0].role,'tenant');assert.equal(f.ownership_status,'unresolved');
});
