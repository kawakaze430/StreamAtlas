/** Machine-readable offline gate inventory. This tool does not call a provider. */
import {openSearchDecision,parityReport,buildShadowCutoverPlan} from '../src/roadmap44-migration.js';
import {assessSecondaryRegion} from '../src/roadmap44-disaster-recovery.js';
import {devicePlaybackCapability,licensedOfflineEntitlement} from '../src/roadmap44-playback.js';
const notProven=['Reviewed real vendored hls.js browser bundle','Real ABR packet-loss playback','Cast/AirPlay hardware session','Approved offline DRM and revocation','Representative OpenSearch experiment','Node/Spring authenticated behavior parity','Production shadow read or rollback','Cross-zone and cross-region disaster recovery','Approved model service and human review operations','Payment provider contract/payouts'];
const evidence={checkpoint:44,productionApproved:false,publicAdultContentLaunchApproved:false,codePathsStarted:11,localFoundationOnly:true,notProven,
 baselineSearch:openSearchDecision({rows:72,queries:1000,p95Ms:2,p99Ms:4,errorRate:0}),
 parity:parityReport({}, {},{paths:['GET /api/videos','GET /api/categories']}),
 privateCanary:buildShadowCutoverPlan({parity:{compared:2,mismatches:0,notRun:2}}),
 dr:assessSecondaryRegion({p95LatencyMs:0,actualAvailability:0,monthlyActiveViewers:0}),
 remotePlayback:devicePlaybackCapability({protocol:'cast'}),offline:licensedOfflineEntitlement({})};
console.log(JSON.stringify(evidence,null,2));
