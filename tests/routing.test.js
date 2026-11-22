const test=require('node:test');
const assert=require('node:assert/strict');
const {routeOffice,officeAliases,sameRegionalOffice,setBoundariesForTest}=require('../src/utils/routing');
const {reportInput}=require('../src/utils/validation');
const {sendCitizenUpdate,statusMessage}=require('../src/services/email');

setBoundariesForTest({type:'FeatureCollection',features:[
  {type:'Feature',properties:{County:'Kisumu'},geometry:{type:'Polygon',coordinates:[[[34.4,-0.5],[35.0,-0.5],[35.0,0.1],[34.4,0.1],[34.4,-0.5]]]}},
  {type:'Feature',properties:{County:'Busia'},geometry:{type:'Polygon',coordinates:[[[33.9,0.2],[34.4,0.2],[34.4,0.8],[33.9,0.8],[33.9,0.2]]]}}
]});

test('routes Kisumu reports to the KeNHA Kisumu office',()=>assert.deepEqual(routeOffice(-0.30,34.70),{county:'Kisumu',office:'KeNHA Kisumu Regional Office',studyArea:'Kisumu-Busia road corridor'}));
test('routes Busia reports to the KeNHA Busia office',()=>assert.deepEqual(routeOffice(0.45,34.10),{county:'Busia',office:'KeNHA Busia Regional Office',studyArea:'Kisumu-Busia road corridor'}));
test('matches existing regional office names to the KeNHA route office',()=>{assert.ok(sameRegionalOffice('Kisumu Regional Office','KeNHA Kisumu Regional Office'));assert.ok(sameRegionalOffice('Busia','KeNHA Busia Regional Office'));assert.ok(officeAliases('KeNHA Busia Regional Office').includes('Busia Regional Office'));});
test('rejects a point outside the study corridor',()=>assert.throws(()=>routeOffice(-1.2,37.8)));
test('rejects malformed report inputs',()=>{const result=reportInput({category:'Wrong',severity:'Extreme',latitude:120,longitude:'x'});assert.ok(result.errors.length>=3)});
test('requires consent before accepting contact details',()=>assert.ok(reportInput({category:'Pothole',severity:'High',latitude:-0.3,longitude:34.7,contactEmail:'citizen@example.com'}).errors.length>0));
test('accepts valid citizen report inputs',()=>assert.equal(reportInput({category:'Pothole',severity:'High',latitude:-0.3,longitude:34.7,description:'A pothole',contactConsent:true,contactEmail:'citizen@example.com'}).errors.length,0));
test('formats citizen progress updates in Kenya time',()=>{const report={reference:'RDRP-1234',category:'Pothole',office:'KeNHA Kisumu Regional Office',status:'In progress',createdAt:'2025-01-15T00:30:00.000Z',updatedAt:'2025-01-15T00:30:00.000Z'};const expected=new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'}).format(new Date(report.updatedAt));const text=statusMessage(report,'status_changed');assert.ok(text.includes(expected),`Expected email text to include ${expected} but got: ${text}`);});
test('sends a clear progress confirmation email through the Resend API',async()=>{const report={reference:'RDRP-1234',category:'Pothole',office:'KeNHA Kisumu Regional Office',status:'In progress',contact:{consent:true,email:'citizen@example.com'}};const originalKey=process.env.RESEND_API_KEY;const originalFrom=process.env.MAIL_FROM;const originalFetch=global.fetch;let captured=null;process.env.RESEND_API_KEY='test-api-key';process.env.MAIL_FROM='Road Defect Platform <no-reply@example.org>';global.fetch=async(url,options)=>{captured={url,options,body:JSON.parse(options.body)};return{ok:true};};try{await sendCitizenUpdate(report,'status_changed');assert.equal(captured.url,'https://api.resend.com/emails');assert.equal(captured.options.headers.Authorization,'Bearer test-api-key');assert.equal(captured.body.from,process.env.MAIL_FROM);assert.equal(captured.body.to,'citizen@example.com');assert.match(captured.body.subject,/RDRP-1234/);assert.match(captured.body.text,/started working on it/i);}finally{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=originalKey;if(originalFrom===undefined)delete process.env.MAIL_FROM;else process.env.MAIL_FROM=originalFrom;}});
