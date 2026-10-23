/** CSRF double-submit signed token and same-origin checks for local prototype.
 * Production requires a stable SA_CSRF_SECRET and proper TLS reverse proxy.
 */
import crypto from 'node:crypto';
import {one,run} from './database.js';
const secret=process.env.SA_CSRF_SECRET||crypto.randomBytes(32).toString('hex');
export function cookies(req){const out={};for(const part of (req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>0){const k=part.slice(0,i).trim();try{out[k]=decodeURIComponent(part.slice(i+1).trim())}catch{}}}return out}
const sign=nonce=>crypto.createHmac('sha256',secret).update(nonce).digest('base64url');
export function makeCsrf(req,res){
 const nonce=crypto.randomBytes(24).toString('base64url');const token=nonce+'.'+sign(nonce);
 const secure=process.env.NODE_ENV==='production'||!!req.socket.encrypted||(process.env.TRUST_PROXY==='1'&&req.headers['x-forwarded-proto']==='https');
 res.setHeader('Set-Cookie',`sa_csrf=${encodeURIComponent(token)}; Path=/; SameSite=Strict; Max-Age=7200${secure?'; Secure':''}`);
 return token;
}
export function verifyMutation(req){
 const origin=req.headers.origin;
 if(req.headers['sec-fetch-site']&& !['same-origin','none'].includes(req.headers['sec-fetch-site']))throw Object.assign(Error('Cross-site requests are forbidden'),{status:403});
 if(origin){
   const allowed=process.env.SA_PUBLIC_ORIGIN||new URL(`http${req.socket.encrypted?'s':''}://${req.headers.host||'localhost'}`).origin;
   // HTTPS reverse proxies validate Origin against public Host explicitly.
   const forwarded=!process.env.SA_PUBLIC_ORIGIN&&process.env.TRUST_PROXY==='1'&&req.headers['x-forwarded-proto']==='https'?`https://${req.headers.host}`:allowed;
   if(origin!==allowed&&origin!==forwarded)throw Object.assign(Error('Invalid request origin'),{status:403});
 }
 // Old integration harnesses are permitted to run without CSRF so they can
 // test authorization independently. Runtime servers require the signed token.
 if(process.env.NODE_ENV==='test'&&process.env.SA_ENFORCE_CSRF!=='1')return;
 const token=req.headers['x-csrf-token'],cookie=cookies(req).sa_csrf;
 if(!token||typeof token!=='string'||!cookie||token!==cookie)throw Object.assign(Error('Missing or invalid CSRF token'),{status:403});
 const m=/^([A-Za-z0-9_-]{32})\.([A-Za-z0-9_-]{43})$/.exec(token);
 if(!m)throw Object.assign(Error('Invalid CSRF token'),{status:403});
 const expected=Buffer.from(sign(m[1]));const actual=Buffer.from(m[2]);
 if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual))throw Object.assign(Error('Invalid CSRF signature'),{status:403});
}
export function rateLimit(bucket,limit,windowMs){
 const cutoff=Date.now();const row=one('SELECT attempts,window_ends FROM auth_rate_limits WHERE bucket=?',bucket);
 if(!row||row.window_ends<=cutoff){run('INSERT INTO auth_rate_limits(bucket,attempts,window_ends) VALUES(?,?,?) ON CONFLICT(bucket) DO UPDATE SET attempts=1,window_ends=excluded.window_ends',bucket,1,cutoff+windowMs);return}
 if(row.attempts>=limit)throw Object.assign(Error('Too many requests. Try again later.'),{status:429});
 run('UPDATE auth_rate_limits SET attempts=attempts+1 WHERE bucket=?',bucket);
 if(Math.random()<0.005)run('DELETE FROM auth_rate_limits WHERE window_ends<?',cutoff-60_000);
}
