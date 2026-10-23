/** Strictly ephemeral QA fixture builder. Never run against production databases. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export async function createQaFixtures({dir,writeCredentials=false}={}) {
  if(process.env.NODE_ENV!=='test'||process.env.SA_QA_FIXTURES!=='YES') throw Error('QA fixtures require NODE_ENV=test and SA_QA_FIXTURES=YES');
  const root=fs.realpathSync(dir||fs.mkdtempSync(path.join(os.tmpdir(),'sa-qa-')));
  const safe=fs.realpathSync(os.tmpdir());
  if(root===safe||!root.startsWith(safe+path.sep)) throw Error('Fixture location must be an isolated temporary directory');
  const dataPath=path.join(root,'qa.sqlite');
  if(fs.existsSync(dataPath)) throw Error('Refusing to overwrite any existing fixture database');
  process.env.DB_PATH=dataPath;
  process.env.PRIVATE_PATH=path.join(root,'private');
  process.env.SA_DISABLE_WORKER='1';
  const {run,one,now,hashPassword,db}=await import('../src/database.js');
  const accounts={};
  for(const role of ['VIEWER','CREATOR','MODERATOR','ADMIN']){
    const password='Qa-'+crypto.randomBytes(24).toString('base64url');
    const email=`qa-${role.toLowerCase()}-${crypto.randomBytes(5).toString('hex')}@example.invalid`;
    const dbRole=role==='VIEWER'?'MEMBER':role==='CREATOR'?'MEMBER':role;
    const id=Number(run('INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)',`Ephemeral ${role}`,email,hashPassword(password),dbRole,now()).lastInsertRowid);
    accounts[role.toLowerCase()]={id,email,password,role:dbRole};
    if(role==='CREATOR')run("INSERT INTO creator_profiles(user_id,channel_id,display_name,status,applied_at) VALUES(?,?,?,'APPROVED',?)",id,1,'QA Fixture Channel',now());
  }
  if(writeCredentials){const file=path.join(root,'credentials.json');fs.writeFileSync(file,JSON.stringify(accounts,null,2),{mode:0o600});}
  db.close();
  return {dir:root,dbPath:dataPath,accounts};
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){
  createQaFixtures({dir:process.argv[2],writeCredentials:true}).then(x=>console.log(JSON.stringify({dbPath:x.dbPath,credentialsPath:path.join(x.dir,'credentials.json')}))).catch(e=>{console.error(e.message);process.exitCode=1});
}
