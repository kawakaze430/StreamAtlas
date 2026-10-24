/** Integrity-verified offline installation only. Independent security/license review still required. */
import path from 'node:path';
import {verifiedVendorInstall} from '../src/roadmap44-vendor.js';
const root=path.resolve(import.meta.dirname,'..');
const packageDir=path.join(root,'node_modules','hls.js');
const destination=path.join(root,'public','assets','vendor');
const expectedBundleSha256=process.env.SA_HLS_BUNDLE_SHA256;
if(!expectedBundleSha256)throw Error('Set SA_HLS_BUNDLE_SHA256 to independently reviewed 64-digit SHA-256. Do not trust an unreviewed download.');
const result=verifiedVendorInstall({packageDir,destination,expectedBundleSha256});
console.log(JSON.stringify(result,null,2));
