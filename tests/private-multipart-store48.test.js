import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {planMultipartUpload,prepareMultipartCompletion,MIN_PART_BYTES} from '../src/multipart-contract.js';
import {PrivateMultipartStore} from '../src/private-multipart-store.js';

const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fixture(t,{bytes=MIN_PART_BYTES+1024,expectedDigest}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sa-private-multipart48-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const payload=crypto.randomBytes(bytes),context={ownerId:47,uploadId:crypto.randomUUID()};
 const plan=planMultipartUpload({...context,expectedBytes:bytes,expectedWholeFileSha256:expectedDigest||digest(payload)});
 const store=new PrivateMultipartStore(root);
 const part=(number)=>{
  const {offset,bytes}=plan.parts[number-1];return payload.subarray(offset,offset+bytes);
 };
 const directory=path.join(root,String(context.ownerId),context.uploadId);
 return {root,payload,context,plan,store,part,directory};
}

test('private multipart parts survive restart and exact whole-file completion is idempotent',t=>{
 const {root,payload,context,plan,store,part,directory}=fixture(t);
 assert.deepEqual(store.resume(plan,context).missing,[1,2]);
 const second=store.putPart(plan,context,2,part(2));
 assert.equal(second.sha256,digest(part(2)));
 assert.deepEqual(new PrivateMultipartStore(root).resume(plan,context),{
  ownerId:47,uploadId:context.uploadId,verified:[2],missing:[1],providerVerified:false,
 });
 const resumed=new PrivateMultipartStore(root);
 const first=resumed.putPart(plan,context,1,part(1));
 assert.throws(()=>prepareMultipartCompletion(plan,[first,second],context),/ETag/,
  'Local receipts cannot be used as cloud provider completion receipts');
 assert.deepEqual(resumed.resume(plan,context).verified,[1,2]);
 const completed=resumed.complete(plan,context);
 assert.deepEqual(fs.readFileSync(completed.sourcePath),payload);
 assert.equal(completed.wholeFileSha256,digest(payload));
 assert.equal(completed.localWholeFileVerified,true);
 assert.equal(completed.wholeFileVerified,false);
 assert.equal(completed.providerVerified,false);
 assert.equal(completed.publicationAuthorized,false);
 assert.equal(completed.format,'streamatlas-private-local-multipart-v1');
 assert.equal(Object.hasOwn(completed,'parts'),false);
 assert.deepEqual(new PrivateMultipartStore(root).complete(plan,context),completed);
 assert.equal(fs.statSync(completed.sourcePath).mode&0o077,0);
 assert.equal(fs.statSync(path.join(directory,'parts','1.part')).mode&0o077,0);
});

test('missing receipt after a completed part write can be repaired only by the same bytes',t=>{
 const {context,plan,store,part,directory}=fixture(t);
 store.putPart(plan,context,1,part(1));
 fs.unlinkSync(path.join(directory,'parts','1.json'));
 assert.deepEqual(store.resume(plan,context).missing,[1,2]);
 assert.throws(()=>store.putPart(plan,context,1,Buffer.alloc(part(1).length,0x7a)),/Conflicting private multipart state/);
 const receipt=store.putPart(plan,context,1,part(1));
 assert.equal(receipt.sha256,digest(part(1)));
 assert.deepEqual(store.resume(plan,context).verified,[1]);
});

test('owner, upload, plan and part boundaries are enforced before reading private data',t=>{
 const {context,plan,store,part}=fixture(t);
 assert.throws(()=>store.resume(plan,{...context,ownerId:48}),/authenticated upload/);
 assert.throws(()=>store.putPart(plan,{...context,uploadId:crypto.randomUUID()},1,part(1)),/authenticated upload/);
 assert.throws(()=>store.putPart({...plan,objectKey:'public/out'},context,1,part(1)),/changed|invalid/);
 assert.throws(()=>store.putPart(plan,context,1,part(1).subarray(1)),/reviewed multipart boundary/);
 assert.throws(()=>store.putPart(plan,context,3,Buffer.alloc(1024)),/reviewed multipart boundary/);
 store.putPart(plan,context,1,part(1));
 assert.throws(()=>store.putPart(plan,context,1,Buffer.alloc(part(1).length,0x42)),/Conflicting private multipart state/);
});

test('damaged part, wrong whole digest and partial upload cannot be completed',t=>{
 const {context,plan,store,part,directory}=fixture(t);
 assert.throws(()=>store.complete(plan,context),/Missing verified private part/);
 store.putPart(plan,context,1,part(1));store.putPart(plan,context,2,part(2));
 fs.writeFileSync(path.join(directory,'parts','2.part'),Buffer.alloc(part(2).length,0x53));
 assert.throws(()=>store.complete(plan,context),/differs from its verified receipt/);
 assert.equal(fs.existsSync(path.join(directory,'source.bin')),false);
});

test('whole-file digest is mandatory and cannot be inferred from opaque part receipts',t=>{
 const {context,plan,store,part,directory}=fixture(t,{bytes:1024,expectedDigest:'a'.repeat(64)});
 store.putPart(plan,context,1,part(1));
 assert.throws(()=>store.complete(plan,context),/whole-file checksum differs/);
 assert.equal(fs.existsSync(path.join(directory,'source.bin')),false);
 const noWhole=planMultipartUpload({...context,expectedBytes:1024});
 const next=new PrivateMultipartStore(fs.mkdtempSync(path.join(os.tmpdir(),'sa-no-whole48-')));
 t.after(()=>fs.rmSync(next.root,{recursive:true,force:true}));
 next.putPart(noWhole,context,1,part(1));
 assert.throws(()=>next.complete(noWhole,context),/whole-file SHA-256 is required/);
});

test('symlinked private namespace or part is refused without touching its target',t=>{
 const {root,context,plan,store,part,directory}=fixture(t);
 store.resume(plan,context);
 const external=path.join(root,'external');fs.writeFileSync(external,'safe-target');
 const partFile=path.join(directory,'parts','1.part');fs.symlinkSync(external,partFile);
 assert.throws(()=>store.putPart(plan,context,1,part(1)));
 assert.equal(fs.readFileSync(external,'utf8'),'safe-target');
 fs.unlinkSync(partFile);
 const other=fixture(t,{bytes:1024});
 fs.mkdirSync(path.join(root,String(other.context.ownerId)),{recursive:true});
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'sa-external48-'));
 t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
 fs.symlinkSync(outside,path.join(root,String(other.context.ownerId),other.context.uploadId));
 assert.throws(()=>store.resume(other.plan,other.context),/owner-only and not a link/);
 assert.equal(fs.readdirSync(outside).length,0);
 const linkedParent=path.join(root,'linked-parent');fs.symlinkSync(outside,linkedParent);
 assert.throws(()=>new PrivateMultipartStore(path.join(linkedParent,'new-store')),/unsafe parent/);
 assert.equal(fs.readdirSync(outside).length,0);
});

test('two processes racing a part cannot replace the winner or create false receipts',async t=>{
 const {root,context,plan,directory,store}=fixture(t,{bytes:1024});
 store.resume(plan,context);
 const moduleUrl=new URL('../src/private-multipart-store.js',import.meta.url).href;
 const program=`import {PrivateMultipartStore} from ${JSON.stringify(moduleUrl)};
  const [root,planText,contextText,fill]=process.argv.slice(1);
  const plan=JSON.parse(planText),context=JSON.parse(contextText);
  new PrivateMultipartStore(root).putPart(plan,context,1,Buffer.alloc(1024,Number(fill)));`;
 const run=fill=>new Promise(resolve=>{
  const child=spawn(process.execPath,['--input-type=module','--eval',program,root,
   JSON.stringify(plan),JSON.stringify(context),String(fill)],{stdio:'ignore'});
  child.on('error',()=>resolve(-1));child.on('close',resolve);
 });
 const codes=(await Promise.all([run(0x41),run(0x42)])).sort();
 assert.deepEqual(codes,[0,1]);
 const data=fs.readFileSync(path.join(directory,'parts','1.part'));
 assert.ok(data.equals(Buffer.alloc(1024,0x41))||data.equals(Buffer.alloc(1024,0x42)));
 const receipt=JSON.parse(fs.readFileSync(path.join(directory,'parts','1.json'),'utf8'));
 assert.equal(receipt.sha256,digest(data));
 assert.deepEqual(new PrivateMultipartStore(root).resume(plan,context).verified,[1]);
});
