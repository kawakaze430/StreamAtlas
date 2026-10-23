/** Operator cron job: expires previously recorded (not independently proven)
 * license reviews, hides affected videos and queues CDN revocation requests. */
import {expireLicenseReviews} from '../src/license-lifecycle.js';
if(process.env.SA_LICENSE_EXPIRY_JOB_ACK!=='YES'){
 console.error('SA_LICENSE_EXPIRY_JOB_ACK=YES required; no database changes made.');process.exit(2);
}
console.log(JSON.stringify({expired:expireLicenseReviews(),notice:'Expiry holds applied; CDN revocation requests may need operator processing.'}));
