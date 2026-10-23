/** Fail-closed readiness inventory. A software green check NEVER grants permission to
 * distribute regulated media, and this script deliberately cannot waive external audits. */
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const checks=[
 ['Source tests','Run npm test and preserve CI result','local'],
 ['Visual verification','Networked Chromium, WebKit and mobile device E2E results','open'],
 ['Adaptive HLS','Review, pin and bundle hls.js; verify cross-browser ABR','open'],
 ['Database cutover','PostgreSQL migration, transaction tests and rollback rehearsal','open'],
 ['Cloud media storage','Private S3 delivery with authorization, CDN/cache invalidation','open'],
 ['Media safety','Worker sandbox, file scanner and quotas validated under load','open'],
 ['Identity','Production email, robust recovery, admin MFA and age assurance provider','open'],
 ['Legal/content rights','Independent lawful-jurisdiction, performer age, consent and copyright approval','external'],
 ['Operational readiness','Cloud monitoring, real recovery drill and security assessment','open']
];
const blocked=checks.filter(x=>x[2]!=='local');
console.log(JSON.stringify({release:'0.19.0',mode:'PRIVATE_SYNTHETIC_DEMO_ONLY',publicLaunchReady:false,checks:checks.map(([name,requirement,state])=>({name,requirement,state})),outstanding:blocked.length},null,2));
process.exitCode=1;
