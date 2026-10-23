/** Validate a private demo gateway configuration BEFORE docker compose up.
 * Does not read or print credentials, nor contact AWS.
 */
import fs from 'node:fs';
export function parseEnvFile(content){
  const variables={};
  for(const line of content.split(/\r?\n/)){
    const trimmed=line.trim();if(!trimmed||trimmed.startsWith('#'))continue;
    const match=/^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(trimmed);
    if(!match)throw Error('Malformed .env.runtime line (expected KEY=value)');
    const raw=match[2].trim();
    variables[match[1]]=raw.length>=2&&raw[0]===raw.at(-1)&&["'",'"'].includes(raw[0])?raw.slice(1,-1):raw;
  }
  return variables;
}
export function validateEnv(e){
  const issues=[];
  const domain=e.SA_DEMO_DOMAIN||'';
  if(!/^(?!-)(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain)||domain.endsWith('.example.com'))issues.push('Set SA_DEMO_DOMAIN to an owned hostname.');
  if(e.SA_PUBLIC_ORIGIN!==`https://${domain}`)issues.push('SA_PUBLIC_ORIGIN must exactly match https://SA_DEMO_DOMAIN.');
  if(!/^[0-9a-f]{64,}$/i.test(e.SA_CSRF_SECRET||''))issues.push('Set a random SA_CSRF_SECRET (>=64 hex chars).');
  if(!/^[0-9a-f]{64}$/i.test(e.SA_MFA_KEY||''))issues.push('Set a random 64-hex SA_MFA_KEY.');
  if(!/^\$2[aby]\$\d\d\$/.test(e.SA_DEMO_AUTH_HASH||''))issues.push('Set a Caddy bcrypt SA_DEMO_AUTH_HASH.');
  if(e.SA_DEV_MAIL_OUTBOX==='1')issues.push('Disable development mail outbox on a remote host.');
  if(e.SA_REQUIRE_ADMIN_MFA!=='1')issues.push('Keep SA_REQUIRE_ADMIN_MFA=1.');
  if(e.SA_REQUIRE_EVIDENCE_REFS!=='1')issues.push('Require admin evidence references.');
  return issues;
}
if(import.meta.url===`file://${process.argv[1]}`){
  const file=process.argv[2]||new URL('./.env.runtime',import.meta.url).pathname;
  if(!fs.existsSync(file))throw Error('Create deployment/aws/.env.runtime from .env.runtime.example first');
  const problems=validateEnv(parseEnvFile(fs.readFileSync(file,'utf8')));
  if(problems.length){console.error('NOT READY:\n'+problems.map(s=>' - '+s).join('\n'));process.exitCode=1}
  else console.log('Configuration format checks PASSED. This does not confirm legality, DNS ownership, provider approval, or AWS deployment.');
}
