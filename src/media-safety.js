/** Optional external antivirus gate BEFORE FFprobe/FFmpeg. Never shell-executes
 * user-supplied strings. A production uploader must configure a reviewed scanner
 * and isolated worker; this hook alone is not a security certification. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs';
const execFileAsync=promisify(execFile);
export async function scanUploadedFile(file,{required=process.env.SA_REQUIRE_MALWARE_SCAN==='1',scanner=process.env.SA_CLAMSCAN_PATH||'clamscan'}={}){
 if(!required&&process.env.NODE_ENV!=='production')return {checked:false};
 const st=fs.statSync(file,{throwIfNoEntry:false});
 if(!st?.isFile())throw Error('Antivirus scan refused: source is not a regular file.');
 try{
  await execFileAsync(scanner,['--no-summary','--stdout','--infected',file],{timeout:45000,maxBuffer:128000});
  return {checked:true,clean:true};
 }catch(e){
  // ClamAV exits 1 for infected input, 2 for engine failures.
  if(e.code===1||e.code==='1')throw Error('Upload rejected by antivirus scan.');
  throw Error('Antivirus scanning unavailable or failed; media stays private.');
 }
}
