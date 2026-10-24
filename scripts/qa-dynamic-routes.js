/**
 * Checkpoint 39: source-level inventory of dynamic API route matchers.
 * These are candidates, NOT a complete runtime route graph and NOT proof of
 * HTTP-method, OpenAPI schema or authorization parity. Changes require review.
 */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const files = [
  'src/server.js', 'src/uploads.js', 'src/studio-operations.js',
  'src/discovery.js', 'src/compliance-operations.js',
  'src/roadmap32.js', 'src/operational-controls34.js'
];
const matches = [];
for (const file of files) {
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
  lines.forEach((line, idx) => {
    // Match source regex literals, not request data. Includes match() and test().
    // This is intentionally conservative and avoids incorrectly inferring verbs.
    const fragments = [...line.matchAll(/\/\^\\\/api.*?(?<!\\)\/[gimsuy]*/g)].map(m => m[0]);
    for (const expr of fragments) {
      if (!line.includes('p.match(') && !line.includes('.test(p)')) continue;
      // Strip line number so unrelated edits do not invalidate source review.
      matches.push({file, expression:expr, line:idx+1});
    }
  });
}
const dedup = [...new Map(matches.map(x => [`${x.file}\u0000${x.expression}`, x])).values()]
  .sort((a,b)=>a.file.localeCompare(b.file)||a.expression.localeCompare(b.expression));
const baselineFile=path.join(root,'qa/dynamic-route-reviewed-baseline.json');
const baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));
const expected=new Set(baseline.matchers.map(x=>`${x.file}\u0000${x.expression}`));
const newlyIntroduced=dedup.filter(x=>!expected.has(`${x.file}\u0000${x.expression}`));
const now=new Set(dedup.map(x=>`${x.file}\u0000${x.expression}`));
const removed=baseline.matchers.filter(x=>!now.has(`${x.file}\u0000${x.expression}`));
const report={format:'streamatlas-dynamic-route-source-audit-v1', totalCandidates:dedup.length,
  existingBaselineCount:baseline.matchers.length, newOrModifiedMatchers:newlyIntroduced,
  removedOrModifiedMatchers:removed, matchers:dedup,
  caveat:'A matcher is not necessarily an endpoint. This audit does not infer HTTP methods, API completeness, authorization or OpenAPI schema correctness.'};
const reportPath=path.join(root,'qa/dynamic-route-report.json');
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(`Dynamic API regex candidates: ${dedup.length}; new/modified: ${newlyIntroduced.length}; removed/modified: ${removed.length}`);
if(process.argv.includes('--strict')&&(newlyIntroduced.length||removed.length)){
  console.error('Dynamic route source changed; inspect and update reviewed baseline explicitly after auditing:',
    [...newlyIntroduced.map(x=>`NEW ${x.file}:${x.line} ${x.expression}`),...removed.map(x=>`REMOVED ${x.file} ${x.expression}`)].join('\n'));
  process.exitCode=1;
}
