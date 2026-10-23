import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-security09-'));
process.env.NODE_ENV='test';process.env.DB_PATH=path.join(dir,'app.db');process.env.PRIVATE_PATH=path.join(dir,'private');
process.env.SA_MFA_KEY='a'.repeat(64);
const {server}=await import('../src/server.js');
const {one,run}=await import('../src/database.js');
const {totp}=await import('../src/account-security.js');
let base,cookie1,cookie2,aliceId;
async function api(url,method='GET',body,token){const r=await fetch(base+url,{method,headers:{...(body?{'content-type':'application/json'}:{}),'x-requested-with':'StreamAtlas',...(token?{cookie:token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,json:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true})});
test('09: new tables and account registration',async()=>{
 const a=await api('/api/auth/register','POST',{name:'Alice',email:'alice09@example.test',password:'secret-password-1234'});assert.equal(a.status,201);cookie1=a.cookie;aliceId=a.json.user.id;
 const b=await api('/api/auth/register','POST',{name:'Bob',email:'bob09@example.test',password:'secret-password-5678'});assert.equal(b.status,201);cookie2=b.cookie;
 for(const table of ['account_tokens','user_mfa','email_verifications','closed_accounts','auth_security_events'])assert.ok(one('SELECT name FROM sqlite_master WHERE type=? AND name=?','table',table));
});
test('09: verification tokens scoped to account and single-use',async()=>{
 const issued=await api('/api/me/email/request-verification','POST',{},cookie1);assert.equal(issued.status,200);assert.ok(issued.json.developmentToken);
 const token=issued.json.developmentToken;
 assert.equal((await api('/api/me/email/confirm-verification','POST',{token},cookie2)).status,400);
 assert.equal((await api('/api/me/email/confirm-verification','POST',{token},cookie1)).status,200);
 assert.equal((await api('/api/me/email/confirm-verification','POST',{token},cookie1)).status,400);
 assert.equal((await api('/api/me/security','GET',undefined,cookie1)).json.emailVerified,true);
});
test('09: recovery generic response, one-use token and all-session revocation',async()=>{
 const reset=await api('/api/auth/password-reset/request','POST',{email:'alice09@example.test'});assert.equal(reset.status,200);
 const secret=reset.json.developmentToken;assert.ok(secret);
 const other=await api('/api/auth/password-reset/request','POST',{email:'missing09@example.test'});assert.equal(other.status,200);assert.equal(other.json.developmentToken,undefined);
 assert.equal((await api('/api/auth/password-reset/confirm','POST',{token:secret,password:'recovered-password-12345'})).status,200);
 assert.equal((await api('/api/auth/password-reset/confirm','POST',{token:secret,password:'recovered-password-12345'})).status,400);
 assert.equal((await api('/api/auth/me','GET',undefined,cookie1)).json.user,null);
 const login=await api('/api/auth/login','POST',{email:'alice09@example.test',password:'recovered-password-12345'});assert.equal(login.status,200);cookie1=login.cookie;
});
test('09: encrypted TOTP enrollment, wrong code rejected, MFA required at login',async()=>{
 const setup=await api('/api/me/mfa/enroll','POST',{password:'recovered-password-12345'},cookie1);assert.equal(setup.status,200);
 const {secret}=setup.json;const store=one('SELECT secret_encrypted FROM user_mfa WHERE user_id=?',aliceId).secret_encrypted;assert.ok(!store.includes(secret));
 assert.equal((await api('/api/me/mfa/confirm','POST',{code:'123abc'},cookie1)).status,401);
 const enrolledCode=totp(secret);
 assert.equal((await api('/api/me/mfa/confirm','POST',{code:enrolledCode},cookie1)).status,200);
 const denied=await api('/api/auth/login','POST',{email:'alice09@example.test',password:'recovered-password-12345'});assert.equal(denied.status,401);
 const replay=await api('/api/auth/login','POST',{email:'alice09@example.test',password:'recovered-password-12345',mfaCode:enrolledCode});assert.equal(replay.status,401);
 const next=totp(secret,Math.floor(Date.now()/30000)+1);
 const accepted=await api('/api/auth/login','POST',{email:'alice09@example.test',password:'recovered-password-12345',mfaCode:next});assert.equal(accepted.status,200);cookie1=accepted.cookie;
 const disabled=await api('/api/me/mfa/disable','POST',{password:'recovered-password-12345',code:totp(secret,Math.floor(Date.now()/30000)-1)},cookie1);
 assert.equal(disabled.status,401); // Replay/old step is rejected.
});
test('09: account closure removes personal library and blocks login',async()=>{
 const f=await api('/api/me/library/toggle','POST',{videoId:1,type:'favorite'},cookie2);assert.equal(f.status,200);
 const closed=await api('/api/me/close-account','POST',{password:'secret-password-5678'},cookie2);assert.equal(closed.status,200);
 assert.equal((await api('/api/auth/me','GET',undefined,cookie2)).json.user,null);
 assert.equal((await api('/api/auth/login','POST',{email:'bob09@example.test',password:'secret-password-5678'})).status,401);
 assert.equal(one('SELECT COUNT(*) AS n FROM favorites WHERE user_id=?',2).n,0);
});
test('09: member closure removes reactions and restores aggregate ratings',async()=>{
 const u=await api('/api/auth/register','POST',{name:'Delta',email:'delta09@example.test',password:'delta-long-password-09'});
 assert.equal(u.status,201);const token=u.cookie;
 const before=one('SELECT likes FROM videos WHERE id=?',1).likes;
 assert.equal((await api('/api/me/reaction','POST',{videoId:1,type:'LIKE'},token)).status,200);
 assert.equal(one('SELECT likes FROM videos WHERE id=?',1).likes,before+1);
 assert.equal((await api('/api/me/close-account','POST',{password:'delta-long-password-09'},token)).status,200);
 assert.equal(one('SELECT likes FROM videos WHERE id=?',1).likes,before);
});
test('09: creator applications cannot be closed without review',async()=>{
 const u=await api('/api/auth/register','POST',{name:'Producer',email:'producer09@example.test',password:'producer-password-09'});
 assert.equal(u.status,201);
 assert.equal((await api('/api/studio/apply','POST',{displayName:'Test Producer',agreePolicies:true},u.cookie)).status,201);
 assert.equal((await api('/api/me/close-account','POST',{password:'producer-password-09'},u.cookie)).status,409);
});
