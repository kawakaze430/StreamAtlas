/** Single-active-worker coordination for one shared SQLite database.
 * TTL heartbeat prevents concurrent workers resetting each other's jobs.
 * Not a replacement for a broker and per-job leases in distributed production.
 */
import {db,one,run} from './database.js';
const TTL_MS=20_000;
export function acquireWorkerLease(id){
 if(typeof id!=='string'||id.length<16)throw Error('Worker ID must be unique');
 const expires=Date.now()+TTL_MS;
 db.exec('BEGIN IMMEDIATE');
 try{
  const row=one('SELECT owner,expires_at FROM worker_lease WHERE name=?','transcoder');
  if(row&&row.owner!==id&&row.expires_at>Date.now()){db.exec('COMMIT');return false;}
  run('INSERT INTO worker_lease(name,owner,expires_at) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at','transcoder',id,expires);
  db.exec('COMMIT');return true;
 }catch(e){db.exec('ROLLBACK');throw e}
}
export function renewWorkerLease(id){const r=run('UPDATE worker_lease SET expires_at=? WHERE name=? AND owner=? AND expires_at>?',Date.now()+TTL_MS,'transcoder',id,Date.now());return !!r.changes}
export function releaseWorkerLease(id){return !!run('DELETE FROM worker_lease WHERE name=? AND owner=?','transcoder',id).changes}
