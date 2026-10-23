import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
test('20: monitoring templates cover worker stall, storage health, database and server error response',()=>{
 const rules=fs.readFileSync(path.join(root,'deployment/monitoring/streamatlas-alerts.yml'),'utf8');
 for(const name of ['StreamAtlasDatabaseUnavailable','StreamAtlasMediaWorkerStalled','StreamAtlasStorageUnavailable','StreamAtlasHighErrorRatio'])assert.ok(rules.includes(name));
 assert.ok(rules.includes('severity: critical'));assert.ok(!rules.includes('password:'));
});
