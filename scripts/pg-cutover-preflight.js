/** Evidence-based, fail-closed cutover inventory. Does not change DB or traffic. */
import fs from 'node:fs';import path from 'node:path';
import {migrationFiles,validateMigrations} from './pg-migrations.js';
import {inspect} from './spring-contract-gap.js';
import {inspectSchema} from './pg-schema-parity.js';
export function preflight(sqlitePath){
 const migration=validateMigrations(migrationFiles());
 const parity=inspect();
 const schema=sqlitePath&&fs.existsSync(sqlitePath)?inspectSchema(path.resolve(sqlitePath)):null;
 const gates={migrationManifestGenerated:true,postgres16MigrationExecutionVerified:false,sqlitePgSchemaColumnsCovered:!!schema&&!schema.missingTables.length&&!Object.keys(schema.missingColumns).length,fullAccountImportRehearsed:false,secureMfaSessionMigrationValidated:false,springBehavioralAndDenialParity:parity.unimplementedNodeOperations.length===0&&parity.behavioralParityVerified,shadowReadMismatchRateAccepted:false,pointInTimeRestoreRehearsed:false,managedDatabaseApproved:false,operatorCutoverAndRollbackApproved:false};
 return {format:'streamatlas-pg-cutover-preflight-v1',migrationCount:migration.files.length,nodeApiOperations:parity.nodeContractOperations,springApiOperations:parity.springOperations,gates,readyForCutover:Object.values(gates).every(Boolean),note:'Local inventory only; manual independent evidence required. No cutover performed.'};
}
if(process.argv[1]?.endsWith('pg-cutover-preflight.js'))console.log(JSON.stringify(preflight(process.argv[2]),null,2));
