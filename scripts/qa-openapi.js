/** Explicitly reviewed API contract list; inspect additions before publishing. */
import fs from 'node:fs';import path from 'node:path';
const ROOT=path.resolve(import.meta.dirname,'..');
const operations=[
// Checkpoint 38: upload pipeline regex routes reviewed against src/uploads.js.
['put','/api/studio/uploads/{id}/chunk','writeResumablePrivateUploadChunk',200,'UploadChunkReceipt'],
['post','/api/studio/uploads/{id}/finalize','finalizePrivateUpload',202,'Object'],
['get','/api/studio/uploads/{id}','getPrivateUploadStatus',200,'Object'],
['delete','/api/studio/uploads/{id}','cancelIncompletePrivateUpload',200,'Object'],
['post','/api/studio/uploads/{id}/retry','retryFailedPrivateProcessing',202,'Object'],
['get','/api/studio/uploads/{id}/events','privateUploadProcessingEvents',200,'Items'],
['get','/api/studio/uploads/{id}/metadata','privateUploadMetadata',200,'Object'],
['patch','/api/studio/uploads/{id}/metadata','updatePrivateUploadMetadata',200,'Object'],
['get','/api/admin/uploads/{id}/evidence','reviewUploadEvidenceReferences',200,'Items'],
['patch','/api/admin/uploads/{id}/evidence','recordUploadEvidenceReferences',200,'Object'],
['patch','/api/admin/uploads/{id}/decision','humanReviewUploadDecision',200,'Object'],
// Checkpoint 37: reviewed literal routes previously omitted from OpenAPI.
['get','/api/admin/audit','adminModerationAudit',200,'Items'],
['get','/api/admin/catalog/duplicate-candidates','adminDuplicateCandidates',200,'Items'],
['get','/api/admin/compliance/cases','adminComplianceCases',200,'Items'],
['get','/api/admin/creators','adminCreatorApplications',200,'Items'],
['get','/api/admin/diagnostics','adminDiagnostics',200,'Object'],
['get','/api/admin/holds','adminContentHolds',200,'Items'],
['get','/api/admin/jobs','adminProcessingJobs',200,'Items'],
['get','/api/admin/media/revocations','adminMediaRevocations',200,'Items'],
['get','/api/admin/reports','adminReports',200,'Items'],
['get','/api/admin/uploads','adminUploads',200,'Items'],
['get','/api/admin/videos','adminCatalogVideos',200,'Items'],
['post','/api/auth/password-reset/confirm','confirmPasswordReset',200,'Ok'],
['post','/api/auth/password-reset/request','requestPasswordReset',200,'Ok'],
['post','/api/compliance/cases','createComplianceCase',201,'ComplianceCaseCreated'],
['post','/api/integrations/age-verification/callback','signedAgeVerificationCallback',202,'Object'],
['get','/api/internal/metrics','internalPrometheusMetrics',200,'Object'],
['post','/api/me/assurance/start','initiatePrivateAssurance',201,'Object'],
['post','/api/me/close-account','closeAccount',200,'Ok'],
['get','/api/me/compliance/cases','reporterComplianceCases',200,'Items'],
['post','/api/me/email/confirm-verification','confirmEmailVerification',200,'Ok'],
['post','/api/me/email/request-verification','requestEmailVerification',200,'Ok'],
['delete','/api/me/library','clearLibraryCollection',200,'Ok'],
['post','/api/me/mfa/confirm','confirmMfa',200,'Ok'],
['post','/api/me/mfa/disable','disableMfa',200,'Ok'],
['post','/api/me/mfa/enroll','enrollMfa',200,'MfaEnrollment'],
['patch','/api/me/password','changeAccountPassword',200,'Ok'],
['post','/api/me/playlists/items','appendPlaylistVideo',200,'Ok'],
['post','/api/me/sessions/revoke','revokeAccountSession',200,'Ok'],
['post','/api/me/sessions/revoke-others','revokeOtherAccountSessions',200,'Ok'],
['get','/api/studio/analytics','creatorStudioAnalytics',200,'Object'],
['get','/api/studio/compliance/cases','uploaderComplianceCases',200,'Items'],
['post','/api/studio/uploads/initiate','initiateStudioUpload',201,'Object'],
['get','/api/health','health',200,'Health'],['get','/api/ready','ready',200,'Ready'],
['get','/api/security/csrf','csrfToken',200,'Object'],['get','/api/auth/me','whoAmI',200,'Me'],
['post','/api/auth/demo','demoSignIn',201,'Me'],['post','/api/auth/register','register',201,'Me'],['post','/api/auth/login','login',200,'Me'],['post','/api/auth/logout','logout',200,'Object'],
['post','/api/player/qoe','consentedPlaybackDiagnostics',202,'Object'],['get','/api/studio/analytics/qoe','creatorAggregatePlaybackQuality',200,'Object'],
['get','/api/home','home',200,'Object'],['get','/api/home/feed','homeFeed',200,'VideoList'],['get','/api/videos','listVideos',200,'VideoList'],
['get','/api/videos/{slug}','videoDetails',200,'Video'],['get','/api/videos/{slug}/related','relatedVideos',200,'VideoList'],
['get','/api/search/suggest','suggest',200,'Suggestions'],
['get','/api/search','unifiedSearch',200,'Object'],['get','/api/search/videos','paginatedSearch',200,'VideoList'],['get','/api/search/cursor','keysetSearch',200,'Object'],
['get','/api/search/titles','indexedTitleSearch',200,'Object'],['get','/api/search/facets','searchFacets',200,'Object'],
['get','/api/search/alternatives','typoAlternatives',200,'Object'],['get','/api/search/previews','safePreviews',200,'Object'],
['get','/api/admin/search/aliases','adminSearchAliases',200,'Object'],['post','/api/admin/search/aliases','createSearchAlias',201,'Object'],
['delete','/api/admin/search/aliases/{id}','deleteSearchAlias',200,'Object'],['get','/api/admin/catalog/duplicates','catalogDuplicates',200,'Object'],
['get','/api/me/entity-follows','myEntityFollows',200,'Object'],['post','/api/me/entity-follows','followCatalogEntity',200,'Object'],['delete','/api/me/entity-follows/{kind}/{id}','unfollowCatalogEntity',200,'Object'],
['get','/api/me/saved-filters','savedFilters',200,'Object'],['post','/api/me/saved-filters','saveFilter',201,'Object'],['delete','/api/me/saved-filters/{id}','removeSavedFilter',200,'Object'],
['get','/api/studio/collaborators','studioCollaborators',200,'Object'],['post','/api/studio/collaborators','inviteStudioCollaborator',201,'Object'],
['post','/api/studio/collaborators/accept','acceptStudioInvite',200,'Object'],['delete','/api/studio/collaborators/{id}','revokeStudioCollaborator',200,'Object'],
['get','/api/studio/collaboration/{id}/insights','delegatedStudioInsights',200,'Object'],
['patch','/api/studio/uploads/batch-metadata','batchUploadMetadata',200,'Object'],
['post','/api/studio/uploads/bulk-initiate','bulkInitiatePrivateUploads',201,'Object'],

['patch','/api/studio/uploads/{id}/schedule','planUploadRelease',200,'Object'],
['patch','/api/studio/uploads/{id}/poster','selectUploadPoster',200,'Object'],
['get','/api/studio/analytics/retention','studioProgressAnalytics',200,'Object'],
['get','/api/studio/analytics/playback-trends','privacySuppressedPlaybackTrends',200,'PlaybackTrends'],
['patch','/api/studio/collaborators/{id}/role','changeStudioCollaboratorRole',200,'Object'],
['get','/api/admin/processing/dead-letters','adminDeadLetters',200,'Object'],
['get','/api/admin/licenses/renewals','adminLicenseRenewals',200,'Object'],
['get','/api/admin/licenses/{id}/history','adminLicenseHistory',200,'Object'],
['get','/api/admin/media/revocations/{id}/status','adminRevocationStatus',200,'Object'],
['get','/api/me/compliance/appeals','myComplianceAppeals',200,'Object'],
['get','/api/admin/compliance/sla','adminComplianceSla',200,'Object'],
['patch','/api/admin/compliance/cases/{id}/assign','assignComplianceCase',200,'Object'],
['post','/api/admin/compliance/cases/{id}/signoff','signoffSensitiveCase',200,'Object'],
['get','/api/studio/profile','studioProfile',200,'Object'],['patch','/api/studio/profile','updateStudioProfile',200,'Object'],
['get','/api/studio/insights','studioInsights',200,'Object'],['get','/api/studio/uploads/catalog','studioUploadCatalog',200,'Object'],
['get','/api/studio/uploads/{id}/readiness','studioUploadReadiness',200,'Object'],
['get','/api/studio/uploads/{id}/notes','studioPrivateNotes',200,'Object'],['patch','/api/studio/uploads/{id}/notes','updateStudioPrivateNotes',200,'Object'],

...['categories','performers','sites','networks','channels'].flatMap(x=>[['get',`/api/${x}`,`list${x}`,200,'Array'],['get',`/api/${x}/{slug}`,`get${x}`,200,'Object']]),
['get','/api/me/queue','viewQueue',200,'VideoList'],['post','/api/me/queue','enqueueVideo',201,'Object'],['delete','/api/me/queue','clearQueue',200,'Object'],['patch','/api/me/queue/order','reorderQueue',200,'Object'],
['get','/api/me/continue-watching','continueWatching',200,'VideoList'],
['get','/api/me/notifications','myNotifications',200,'Object'],['post','/api/me/notifications/read-all','readAllNotifications',200,'Object'],
['get','/api/me/export','accountDataExport',200,'Object'],['get','/api/me/sessions','activeAccountSessions',200,'Object'],
['patch','/api/me/preferences','saveAccountPreferences',200,'Object'],
['get','/api/search/advanced-facets','advancedSearchFacets',200,'Object'],
['get','/api/admin/comments','adminComments',200,'Object'],['get','/api/admin/comment-reports','adminCommentReports',200,'Object'],
['get','/api/admin/comment-abuse-flags','adminCommentAbuseFlags',200,'Object'],
['get','/api/admin/recommendations/cold-start-evaluation','adminColdStartEvaluation',200,'Object'],
['post','/api/videos/view','countQualifiedVideoView',200,'Object'],
['get','/api/me/library','myLibrary',200,'VideoList'],['delete','/api/me/library/items','bulkRemoveSavedItems',200,'Object'],['post','/api/me/library/toggle','toggleLibrary',200,'Object'],
['get','/api/me/history','history',200,'VideoList'],['get','/api/me/watch-stats','watchStats',200,'Object'],['get','/api/me/search-history','savedSearches',200,'Object'],['post','/api/me/search-history','recordSearch',200,'Object'],['delete','/api/me/search-history','clearSearches',200,'Object'],['delete','/api/me/history','clearHistory',200,'Object'],
['get','/api/me/playlists','playlists',200,'Object'],['get','/api/public/playlists/{id}','sharedPlaylist',200,'Object'],['delete','/api/me/playlists/{id}/videos','bulkRemovePlaylistItems',200,'Object'],['post','/api/me/playlists','createPlaylist',201,'Object'],
['get','/api/me/subscriptions','subscriptions',200,'Object'],['patch','/api/me/subscriptions/{id}/notifications','notificationMode',200,'Object'],['post','/api/me/subscriptions/toggle','toggleSubscription',200,'Object'],
['get','/api/me/feed','subscriptionFeed',200,'VideoList'],['get','/api/me/queue/navigation','queueNavigation',200,'Object'],['get','/api/me/recommendations','myRecommendations',200,'Object'],
['get','/api/me/security','securityStatus',200,'Object'],['get','/api/me/preferences','preferences',200,'Object'],['get','/api/me/category-preferences','myCategoryInterests',200,'Object'],['put','/api/me/category-preferences','saveCategoryInterests',200,'Object'],
['post','/api/me/progress','watchProgress',200,'Object'],['post','/api/me/reaction','react',200,'Object'],
['post','/api/comments','addComment',201,'Object'],['post','/api/comments/report','reportComment',201,'Object'],['patch','/api/admin/comments/{id}/pin','pinComment',200,'Object'],['post','/api/reports','reportVideo',201,'Object'],
['get','/api/studio/overview','studioOverview',200,'Object'],['post','/api/studio/apply','creatorApplication',201,'Object'],
['get','/api/admin/operations/readiness-findings','adminReadinessFindings',200,'Object'],
['get','/api/admin/operations/recovery-plan','adminRecoveryPlan',200,'Object'],
['get','/api/admin/operations/media-removal-plan/{id}','adminMediaRemovalPlan',200,'Object'],
['get','/api/admin/compliance/triage','adminHumanTriage',200,'Object'],
['patch','/api/admin/compliance/cases/{id}/priority','setHumanCasePriority',200,'Object'],
['get','/api/studio/upload-health','creatorUploadHealth',200,'Object'],
['get','/api/studio/rights-reminders','creatorRightsReviewReminders',200,'Object'],
['get','/api/me/privacy/summary','accountPrivacySummary',200,'Object'],
['get','/api/admin/overview','adminOverview',200,'Object'],['get','/api/admin/operations','adminOperations',200,'Object'],
['post','/api/private-preview/media/{id}/cookies','privateMediaCookies',200,'Object'],
['get','/api/me/access-status','accessStatus',200,'Object'],
['get','/api/catalog/shorts','syntheticShortClips',200,'Object'],
['get','/api/catalog/canonical','canonicalNoindexMetadata',200,'Object'],
['get','/api/catalog/related-categories','relatedEligibleCategories',200,'Object'],
['get','/api/localization/dictionary','navigationDictionary',200,'Object'],
['get','/api/me/sync-summary','privateSyncSummary',200,'Object'],
['get','/api/me/entity-follows/summary','privateEntityFollowSummary',200,'Object'],
['get','/api/studio/metadata-suggestions','creatorReviewMetadataSuggestions',200,'Object'],
['get','/api/studio/analytics/privacy-overview','creatorPrivateQualityOverview',200,'Object'],
['get','/api/admin/recommendations/offline-evaluation','offlineRankingEvaluation',200,'Object'],
['get','/api/admin/launch/readiness-preview','failClosedLaunchPreview',200,'Object'],
['get','/api/compliance/intake-guidance','complaintIntakeGuidance',200,'Object'],
['get','/api/compliance/appeal-guidance','appealGuidance',200,'Object']];
const schemas={Items:{type:'object',required:['items'],properties:{items:{type:'array',items:{$ref:'#/components/schemas/Object'}}},additionalProperties:true},Ok:{type:'object',required:['ok'],properties:{ok:{const:true}},additionalProperties:true},ComplianceCaseCreated:{type:'object',required:['id','priority','status','notice'],properties:{id:{type:'integer',minimum:1},priority:{type:'string',enum:['URGENT','STANDARD']},status:{const:'OPEN'},notice:{type:'string'}},additionalProperties:false},MfaEnrollment:{type:'object',required:['secret','uri','warning'],properties:{secret:{type:'string'},uri:{type:'string'},warning:{type:'string'}},additionalProperties:false},PlaybackTrends:{type:'object',required:['ownerId','days','items','privacyThreshold','source','disclaimer'],properties:{ownerId:{type:'integer'},days:{type:'integer'},privacyThreshold:{const:5},items:{type:'array',items:{type:'object',required:['videoId','title','privacySuppressed'],properties:{videoId:{type:'integer'},title:{type:'string'},privacySuppressed:{type:'boolean'}}}},source:{type:'string'},disclaimer:{type:'string'}}},Object:{type:'object',additionalProperties:true},Array:{type:'array',items:{$ref:'#/components/schemas/Object'}},Health:{type:'object',required:['ok','product','checkpoint','db'],properties:{ok:{type:'boolean'},product:{const:'StreamAtlas'},checkpoint:{type:'integer'},db:{type:'string'}}},Ready:{type:'object',required:['ready','databaseOk','storageOk'],properties:{ready:{type:'boolean'},databaseOk:{type:'boolean'},storageOk:{type:'boolean'}}},Video:{type:'object',required:['id','title','slug','categories','performers'],properties:{id:{type:'integer'},slug:{type:'string'},title:{type:'string'},categories:{type:'array',items:{type:'string'}},performers:{type:'array',items:{type:'string'}}},additionalProperties:true},VideoList:{type:'object',required:['items'],properties:{items:{type:'array',items:{$ref:'#/components/schemas/Video'}},total:{type:'integer'},page:{type:'integer'},limit:{type:'integer'}},additionalProperties:true},Suggestions:{type:'object',required:['categories','channels','performers','sites','networks','videos'],properties:Object.fromEntries(['categories','channels','performers','sites','networks','videos'].map(k=>[k,{type:'array',items:{$ref:'#/components/schemas/Object'}}]))},Me:{type:'object',properties:{user:{anyOf:[{$ref:'#/components/schemas/Object'},{type:'null'}]}},additionalProperties:true}};
const paths={};
const commonErrors={'400':{description:'Invalid request'},'401':{description:'Sign-in required'},'403':{description:'Forbidden'},'404':{description:'Not found'},'429':{description:'Rate limited'}};
const unauth=new Set(['/api/health','/api/ready','/api/security/csrf','/api/auth/me','/api/auth/demo','/api/auth/register','/api/auth/login','/api/player/qoe','/api/home','/api/home/feed','/api/public/playlists/{id}','/api/videos','/api/videos/{slug}','/api/videos/{slug}/related','/api/search/suggest','/api/search','/api/search/videos','/api/search/cursor','/api/search/titles','/api/search/facets','/api/search/alternatives','/api/search/previews','/api/catalog/shorts','/api/catalog/canonical','/api/catalog/related-categories','/api/localization/dictionary','/api/compliance/intake-guidance','/api/compliance/appeal-guidance','/api/auth/password-reset/request','/api/auth/password-reset/confirm','/api/integrations/age-verification/callback','/api/internal/metrics',...['categories','performers','sites','networks','channels'].flatMap(x=>[`/api/${x}`,`/api/${x}/{slug}`])]);
for(const [method,route,id,status,schema] of operations){const paramNames=[...route.matchAll(/{([^}]+)}/g)].map(x=>x[1]);const op={operationId:id,summary:id.replace(/([a-z])([A-Z])/g,'$1 $2'),tags:[route.split('/')[2]||'core'],responses:{[String(status)]:{description:'Success',content:{'application/json':{schema:{$ref:`#/components/schemas/${schema}`}}}},...commonErrors}};
if(!unauth.has(route))op.security=[{sessionCookie:[]}];
if(paramNames.length)op.parameters=paramNames.map(name=>({name,in:'path',required:true,schema:{type:'string'}}));
if(['post','patch','put'].includes(method)&&!['/api/auth/demo','/api/auth/logout'].includes(route)){op.requestBody={required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/Object'}}}};}
(paths[route]??={})[method]=op;
}
schemas.UploadChunkReceipt={type:'object',additionalProperties:false,required:['id','receivedBytes','expectedBytes','complete','idempotent','recoveredBytes'],properties:{id:{type:'string',format:'uuid'},receivedBytes:{type:'integer',minimum:0},expectedBytes:{type:'integer',minimum:1},complete:{type:'boolean'},idempotent:{type:'boolean'},recoveredBytes:{type:'integer',minimum:0}}};
// Binary chunk upload is not JSON. Requires authenticated creator session and CSRF protection.
const chunkUpload=paths['/api/studio/uploads/{id}/chunk'].put;
chunkUpload.requestBody={required:true,content:{'application/octet-stream':{schema:{type:'string',format:'binary',description:'Private, at most 2 MiB per chunk'}}}};
chunkUpload.parameters.push({name:'X-Upload-Offset',in:'header',required:true,schema:{type:'integer',minimum:0},description:'Byte offset. Replays at an already committed offset are safe only if bytes match.'});
chunkUpload.parameters.push({name:'Content-Length',in:'header',required:true,schema:{type:'integer',minimum:1,maximum:2097152}});
chunkUpload.responses['409']={description:'Incorrect offset, mismatched retry bytes, corrupted spool or concurrent upload'};
chunkUpload.responses['413']={description:'Excessive size or chunk crossing file boundary'};
chunkUpload.responses['415']={description:'Content type must be application/octet-stream'};
chunkUpload.description='The private single-writer SQLite upload spool is synced before progress is committed. A crash may leave extra spool bytes; only byte-identical replay can repair them. This does not provide distributed locking or S3 multipart resumability.';
schemas.QoeSample={type:'object',additionalProperties:false,required:['consent','videoId','startupMs','startupFailure','rebufferMs','playbackMs','errors','qualitySwitches','completed'],properties:{consent:{const:true},videoId:{type:'integer',minimum:1},startupMs:{type:'integer',minimum:0,maximum:600000},startupFailure:{type:'boolean'},rebufferMs:{type:'integer',minimum:0,maximum:36000000},playbackMs:{type:'integer',minimum:0,maximum:36000000},errors:{type:'integer',minimum:0,maximum:100},qualitySwitches:{type:'integer',minimum:0,maximum:100},completed:{type:'boolean'}}};
// Contract overrides for sensitive endpoints. These are *not* verified external-provider integrations.
schemas.PasswordResetRequest={type:'object',required:['email'],additionalProperties:false,properties:{email:{type:'string',format:'email'}}};
schemas.PasswordResetConfirm={type:'object',required:['token','password'],additionalProperties:false,properties:{token:{type:'string',minLength:1},password:{type:'string',minLength:12,maxLength:128}}};
schemas.ComplianceCaseInput={type:'object',required:['videoId','category','details'],properties:{videoId:{type:'integer',minimum:1},category:{type:'string',enum:['COPYRIGHT','CONSENT','AGE','PRIVACY','OTHER']},details:{type:'string',minLength:25,maxLength:2000},evidenceReference:{type:'string',minLength:8,maxLength:120}},additionalProperties:false};
schemas.UploadInitiateInput={type:'object',required:['title','size','filename','mime','categoryId','rightsDeclaration','adultsDeclaration','consentDeclaration'],properties:{title:{type:'string',minLength:8,maxLength:150},size:{type:'integer',minimum:1024,maximum:26214400},filename:{type:'string'},mime:{type:'string',enum:['video/mp4','video/webm','video/quicktime','application/octet-stream']},categoryId:{type:'integer',minimum:1},rightsDeclaration:{const:true},adultsDeclaration:{const:true},consentDeclaration:{const:true},description:{type:'string'}},additionalProperties:true};
for(const [route,schema] of [['/api/auth/password-reset/request','PasswordResetRequest'],['/api/auth/password-reset/confirm','PasswordResetConfirm'],['/api/compliance/cases','ComplianceCaseInput'],['/api/studio/uploads/initiate','UploadInitiateInput']])paths[route].post.requestBody={required:true,content:{'application/json':{schema:{$ref:`#/components/schemas/${schema}`}}}};
for(const route of ['/api/auth/password-reset/request','/api/auth/password-reset/confirm','/api/me/assurance/start','/api/me/email/request-verification'])paths[route].post.responses['503']={description:'External integration not configured or unavailable'};
paths['/api/auth/password-reset/request'].post.description='Development outbox only; returns 503 when no verified delivery provider is configured. No account enumeration.';
paths['/api/integrations/age-verification/callback'].post.requestBody={required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/Object'}}}};
paths['/api/integrations/age-verification/callback'].post.description='Signed vendor callback: raw request body, authenticated by configured HMAC headers and secret, otherwise 503/401. Cookie login is not accepted as proof.';
paths['/api/integrations/age-verification/callback'].post.security=[{verificationWebhookSignature:[]}];
paths['/api/internal/metrics'].get.responses['200'].content={'text/plain':{schema:{type:'string',description:'Prometheus exposition format'}}};
paths['/api/internal/metrics'].get.security=[{metricsBearer:[]}];
paths['/api/internal/metrics'].get.description='Opt-in, server-to-server Bearer token; unavailable without a >=32 character configured secret.';
for(const route of ['/api/me/assurance/start','/api/me/email/request-verification','/api/me/sessions/revoke-others'])delete paths[route].post.requestBody;
paths['/api/me/library'].delete.parameters=[{name:'type',in:'query',required:true,schema:{type:'string',enum:['favorites','watchLater']}}];
paths['/api/me/mfa/enroll'].post.description='Returns a private TOTP enrollment secret. Never log or cache response.';
paths['/api/player/qoe'].post.requestBody={required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/QoeSample'}}}};delete paths['/api/player/qoe'].post.security;
const spec={openapi:'3.1.0',info:{title:'StreamAtlas prototype contracts',version:JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version,description:'Node/SQLite source-of-truth endpoint contract subset. Literal route coverage is checked with strict inventory; regex/dynamic handler and media binary contract review remains incomplete. NOT a production publishing approval.'},servers:[{url:'http://127.0.0.1:3000',description:'Private/local development only'}],paths,components:{schemas,securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'sa_session'},metricsBearer:{type:'http',scheme:'bearer'},verificationWebhookSignature:{type:'apiKey',in:'header',name:'x-sa-event-signature',description:'Signed raw-body webhook; additional vendor headers apply'}}}};
fs.mkdirSync(path.join(ROOT,'contracts'),{recursive:true});fs.writeFileSync(path.join(ROOT,'contracts/openapi.json'),JSON.stringify(spec,null,2)+'\n');console.log(`OpenAPI: ${operations.length} reviewed operations`);
