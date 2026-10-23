import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-lease09-'));process.env.NODE_ENV='test';process.env.DB_PATH=path.join(tmp,'lease.db');
const {acquireWorkerLease,renewWorkerLease,releaseWorkerLease}=await import('../src/worker-lease.js');
const {run}=await import('../src/database.js');
test('09: SQLite singleton worker lease cannot be stolen before expiry',()=>{
 const a='worker-aaaaaaaaaaaaaaaa',b='worker-bbbbbbbbbbbbbbbb';
 assert.equal(acquireWorkerLease(a),true);assert.equal(acquireWorkerLease(b),false);
 assert.equal(renewWorkerLease(a),true);assert.equal(releaseWorkerLease(b),false);
 run('UPDATE worker_lease SET expires_at=? WHERE name=?',Date.now()-1000,'transcoder');
 assert.equal(acquireWorkerLease(b),true);assert.equal(renewWorkerLease(a),false);assert.equal(releaseWorkerLease(b),true);
 fs.rmSync(tmp,{recursive:true,force:true});
});
