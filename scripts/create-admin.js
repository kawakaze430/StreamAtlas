/** Local development admin provisioning. Never commit real passwords to source control. */
import {one,run,now,hashPassword} from '../src/database.js';
const email=String(process.env.SA_ADMIN_EMAIL||'').trim().toLowerCase();
const password=String(process.env.SA_ADMIN_PASSWORD||'');
if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||password.length<14){
 console.error('Provide SA_ADMIN_EMAIL and a unique SA_ADMIN_PASSWORD with >=14 characters as environment variables.');process.exit(1);
}
const old=one('SELECT id FROM users WHERE email=?',email);
if(old){run('UPDATE users SET password_hash=?,role=? WHERE id=?',hashPassword(password),'ADMIN',old.id);console.log('Existing local account promoted to ADMIN:',email)}
else{run('INSERT INTO users(email,password_hash,name,role,created_at) VALUES(?,?,?,?,?)',email,hashPassword(password),'Local Admin','ADMIN',now());console.log('Local ADMIN account created:',email)}
