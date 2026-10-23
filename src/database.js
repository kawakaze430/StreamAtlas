import {DatabaseSync} from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {categories,networks,sites,performers,channels,videoSeeds,slug} from './seed.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dbFile=process.env.DB_PATH||path.join(root,'data','streamatlas.db');
fs.mkdirSync(path.dirname(dbFile),{recursive:true});
export const db=new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
const schema=`
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS networks(id INTEGER PRIMARY KEY,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,description TEXT);
CREATE TABLE IF NOT EXISTS sites(id INTEGER PRIMARY KEY,network_id INTEGER REFERENCES networks(id),name TEXT,slug TEXT UNIQUE,last_updated TEXT);
CREATE TABLE IF NOT EXISTS channels(id INTEGER PRIMARY KEY,site_id INTEGER REFERENCES sites(id),name TEXT,slug TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS performers(id INTEGER PRIMARY KEY,name TEXT,slug TEXT UNIQUE,country TEXT);
CREATE TABLE IF NOT EXISTS videos(id INTEGER PRIMARY KEY,title TEXT,slug TEXT UNIQUE,site_id INTEGER REFERENCES sites(id),channel_id INTEGER REFERENCES channels(id),poster TEXT,media_url TEXT,duration INTEGER,quality TEXT,views INTEGER DEFAULT 0,likes INTEGER DEFAULT 0,dislikes INTEGER DEFAULT 0,published_at TEXT,status TEXT DEFAULT 'PUBLISHED');
CREATE TABLE IF NOT EXISTS video_categories(video_id INTEGER REFERENCES videos(id),category_id INTEGER REFERENCES categories(id),PRIMARY KEY(video_id,category_id));
CREATE TABLE IF NOT EXISTS video_performers(video_id INTEGER REFERENCES videos(id),performer_id INTEGER REFERENCES performers(id),PRIMARY KEY(video_id,performer_id));
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE,password_hash TEXT,name TEXT,role TEXT DEFAULT 'MEMBER',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS favorites(user_id INTEGER REFERENCES users(id),video_id INTEGER REFERENCES videos(id),created_at TEXT NOT NULL,PRIMARY KEY(user_id,video_id));
CREATE TABLE IF NOT EXISTS watch_later(user_id INTEGER REFERENCES users(id),video_id INTEGER REFERENCES videos(id),created_at TEXT NOT NULL,PRIMARY KEY(user_id,video_id));
CREATE TABLE IF NOT EXISTS reactions(user_id INTEGER REFERENCES users(id),video_id INTEGER REFERENCES videos(id),type TEXT CHECK(type IN ('LIKE','DISLIKE')),PRIMARY KEY(user_id,video_id));
CREATE TABLE IF NOT EXISTS watch_progress(user_id INTEGER REFERENCES users(id),video_id INTEGER REFERENCES videos(id),position REAL DEFAULT 0,watched_at TEXT NOT NULL,PRIMARY KEY(user_id,video_id));
CREATE TABLE IF NOT EXISTS subscriptions(user_id INTEGER REFERENCES users(id),channel_id INTEGER REFERENCES channels(id),created_at TEXT,PRIMARY KEY(user_id,channel_id));
CREATE TABLE IF NOT EXISTS playlists(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),name TEXT NOT NULL,created_at TEXT);
CREATE TABLE IF NOT EXISTS playlist_videos(playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,video_id INTEGER REFERENCES videos(id),added_at TEXT,PRIMARY KEY(playlist_id,video_id));
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),video_id INTEGER REFERENCES videos(id),reason TEXT,details TEXT,status TEXT DEFAULT 'OPEN',created_at TEXT);
CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),video_id INTEGER REFERENCES videos(id),body TEXT,created_at TEXT,hidden INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS ix_videos_views ON videos(views DESC);
CREATE INDEX IF NOT EXISTS ix_videos_published ON videos(published_at DESC);
CREATE INDEX IF NOT EXISTS ix_videos_site ON videos(site_id);
CREATE INDEX IF NOT EXISTS ix_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS ix_comments_video ON comments(video_id,created_at DESC);
`;
db.exec(schema);
db.exec(`CREATE TABLE IF NOT EXISTS video_qoe_daily (
 video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 day TEXT NOT NULL,samples INTEGER NOT NULL DEFAULT 0,completions INTEGER NOT NULL DEFAULT 0,
 startup_failures INTEGER NOT NULL DEFAULT 0,startup_ms_total INTEGER NOT NULL DEFAULT 0,
 buffer_ms_total INTEGER NOT NULL DEFAULT 0,playback_ms_total INTEGER NOT NULL DEFAULT 0,
 errors_total INTEGER NOT NULL DEFAULT 0,switches_total INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL,PRIMARY KEY(video_id,day));
 CREATE INDEX IF NOT EXISTS ix_qoe_day ON video_qoe_daily(day);`);


// Checkpoint 02 migrations: safe to run on existing Checkpoint 01 databases.
db.exec(`
CREATE TABLE IF NOT EXISTS creator_profiles(
 user_id INTEGER PRIMARY KEY REFERENCES users(id), channel_id INTEGER REFERENCES channels(id),
 display_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')),
 applied_at TEXT NOT NULL, reviewed_at TEXT, reviewed_by INTEGER REFERENCES users(id), review_note TEXT
);
CREATE TABLE IF NOT EXISTS upload_sessions(
 id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), video_id INTEGER NOT NULL REFERENCES videos(id),
 original_filename TEXT NOT NULL, declared_type TEXT NOT NULL, expected_bytes INTEGER NOT NULL CHECK(expected_bytes>0),
 received_bytes INTEGER NOT NULL DEFAULT 0, sha256 TEXT, status TEXT NOT NULL DEFAULT 'UPLOADING', attempts INTEGER NOT NULL DEFAULT 0,
 description TEXT, rights_declaration INTEGER NOT NULL DEFAULT 0, adults_declaration INTEGER NOT NULL DEFAULT 0,
 consent_declaration INTEGER NOT NULL DEFAULT 0, processed_duration REAL, error TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, reviewed_at TEXT, reviewed_by INTEGER REFERENCES users(id), review_note TEXT
);
CREATE TABLE IF NOT EXISTS moderation_audit(
 id INTEGER PRIMARY KEY, actor_id INTEGER NOT NULL REFERENCES users(id), object_type TEXT NOT NULL,
 object_id TEXT NOT NULL, action TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_upload_user ON upload_sessions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ix_upload_status ON upload_sessions(status,created_at ASC);
CREATE INDEX IF NOT EXISTS ix_audit_time ON moderation_audit(created_at DESC);
CREATE TABLE IF NOT EXISTS video_chapters(
 video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 start_seconds REAL NOT NULL CHECK(start_seconds>=0),
 title TEXT NOT NULL,
 PRIMARY KEY(video_id,start_seconds)
);
CREATE INDEX IF NOT EXISTS ix_chapter_video ON video_chapters(video_id,start_seconds);
CREATE TABLE IF NOT EXISTS processing_events(
 id INTEGER PRIMARY KEY, upload_id TEXT NOT NULL REFERENCES upload_sessions(id),
 state TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_processing_events_upload ON processing_events(upload_id,id DESC);
CREATE TABLE IF NOT EXISTS auth_rate_limits(
 bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_ends INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS review_evidence(
 upload_id TEXT NOT NULL REFERENCES upload_sessions(id), kind TEXT NOT NULL CHECK(kind IN ('LICENSE','ADULTHOOD','CONSENT')),
 reference TEXT NOT NULL, checked_by INTEGER REFERENCES users(id), checked_at TEXT,
 PRIMARY KEY(upload_id,kind)
);
CREATE TABLE IF NOT EXISTS notifications(
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
 channel_id INTEGER REFERENCES channels(id),video_id INTEGER REFERENCES videos(id),
 type TEXT NOT NULL DEFAULT 'NEW_VIDEO', read_at TEXT, created_at TEXT NOT NULL,
 UNIQUE(user_id,video_id,type)
);
CREATE INDEX IF NOT EXISTS ix_notifications_user ON notifications(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS video_captions(
 video_id INTEGER PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
 vtt TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'en'
);
-- Checkpoint 06 user-controlled local viewing privacy settings.
CREATE TABLE IF NOT EXISTS user_preferences(
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 pause_history INTEGER NOT NULL DEFAULT 0 CHECK(pause_history IN (0,1)),
 autoplay_next INTEGER NOT NULL DEFAULT 0 CHECK(autoplay_next IN (0,1)),
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_watch_progress_user_time ON watch_progress(user_id,watched_at DESC);
CREATE INDEX IF NOT EXISTS ix_video_categories_category ON video_categories(category_id,video_id);
CREATE INDEX IF NOT EXISTS ix_video_performers_performer ON video_performers(performer_id,video_id);
CREATE INDEX IF NOT EXISTS ix_upload_sessions_status_updated ON upload_sessions(status,updated_at);



`);

// Checkpoint 08 account-lifecycle migrations (safe on existing SQLite databases).
db.exec(`
CREATE TABLE IF NOT EXISTS account_tokens(
 token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('EMAIL_VERIFY','PASSWORD_RESET')),
 expires_at TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_account_tokens_user_kind ON account_tokens(user_id,kind);
CREATE TABLE IF NOT EXISTS email_verifications(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,verified_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_mfa(
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 secret_encrypted TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
 last_totp_step INTEGER NOT NULL DEFAULT -1,created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS closed_accounts(user_id INTEGER PRIMARY KEY REFERENCES users(id),closed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS worker_lease(name TEXT PRIMARY KEY,owner TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_security_events(
 id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 kind TEXT NOT NULL,created_at TEXT NOT NULL
);
`);
// Checkpoint 17: auditable emergency hold cases. An active hold prevents re-publication.
db.exec(`
CREATE TABLE IF NOT EXISTS content_holds(
 id INTEGER PRIMARY KEY,video_id INTEGER NOT NULL REFERENCES videos(id),
 reason TEXT NOT NULL CHECK(reason IN ('CONSENT','AGE','COPYRIGHT','RIGHTS_EXPIRED','OTHER')),
 details TEXT NOT NULL,opened_by INTEGER NOT NULL REFERENCES users(id),opened_at TEXT NOT NULL,
 closed_by INTEGER REFERENCES users(id),closed_at TEXT,closure_note TEXT
);
CREATE INDEX IF NOT EXISTS ix_content_holds_open ON content_holds(video_id,closed_at);
`);
// Checkpoint 19: rights complaints and appeals are distinct from ordinary comments/reports.
// Every status change adds an audit event; a case disposition NEVER republishes a video.
db.exec(`
CREATE TABLE IF NOT EXISTS compliance_cases(
 id INTEGER PRIMARY KEY,
 video_id INTEGER NOT NULL REFERENCES videos(id),
 reporter_id INTEGER NOT NULL REFERENCES users(id),
 category TEXT NOT NULL CHECK(category IN ('COPYRIGHT','CONSENT','AGE','PRIVACY','OTHER')),
 details TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_REVIEW','AWAITING_EVIDENCE','RESOLVED','REJECTED','CLOSED')),
 priority TEXT NOT NULL DEFAULT 'STANDARD' CHECK(priority IN ('STANDARD','URGENT')),
 assigned_to INTEGER REFERENCES users(id),
 decision_note TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_compliance_cases_priority ON compliance_cases(priority,status,created_at);
CREATE INDEX IF NOT EXISTS ix_compliance_cases_reporter ON compliance_cases(reporter_id,created_at DESC);
CREATE TABLE IF NOT EXISTS compliance_case_events(
 id INTEGER PRIMARY KEY,
 case_id INTEGER NOT NULL REFERENCES compliance_cases(id),
 actor_id INTEGER REFERENCES users(id),
 action TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_compliance_case_events_case ON compliance_case_events(case_id,id);
CREATE TABLE IF NOT EXISTS compliance_appeals(
 id INTEGER PRIMARY KEY,
 case_id INTEGER NOT NULL REFERENCES compliance_cases(id),
 appellant_id INTEGER NOT NULL REFERENCES users(id),
 details TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','ACCEPTED','DECLINED')),
 created_at TEXT NOT NULL, decided_at TEXT,
 UNIQUE(case_id,appellant_id)
);
`);
// Checkpoint 19: privacy-minimized signed verification receipts, not legal proof.
db.exec(`
CREATE TABLE IF NOT EXISTS signed_verification_events(
 event_id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),
 decision TEXT NOT NULL,received_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS age_assurance_receipts(
 user_id INTEGER PRIMARY KEY REFERENCES users(id),provider_ref TEXT NOT NULL,
 expires_at TEXT NOT NULL,verified_at TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('VERIFIED','REVOKED'))
);
CREATE TABLE IF NOT EXISTS verification_challenges(
 challenge_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT
);
CREATE TABLE IF NOT EXISTS media_revocation_jobs(
 id INTEGER PRIMARY KEY,upload_id TEXT NOT NULL,
 video_id INTEGER NOT NULL REFERENCES videos(id),
 reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',
 requested_at TEXT NOT NULL,processed_at TEXT,provider_request_id TEXT,
 error TEXT
);
CREATE INDEX IF NOT EXISTS ix_revocation_status ON media_revocation_jobs(status,requested_at);
CREATE TABLE IF NOT EXISTS media_license_reviews(
 upload_id TEXT PRIMARY KEY REFERENCES upload_sessions(id),
 reference TEXT NOT NULL,expires_at TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('VERIFIED','REVOKED','EXPIRED')),
 reviewed_by INTEGER NOT NULL REFERENCES users(id),reviewed_at TEXT NOT NULL,
 decision_note TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_verification_challenges_user ON verification_challenges(user_id,expires_at);
`);
function insert(sql,args){return db.prepare(sql).run(...args)}
if(db.prepare('SELECT COUNT(*) AS n FROM videos').get().n===0){
 db.exec('BEGIN');
 try{
  for(const c of categories) insert('INSERT INTO categories(name,slug) VALUES(?,?)',[c,slug(c)]);
  for(const n of networks)insert('INSERT INTO networks(name,slug,description) VALUES(?,?,?)',[n.name,n.slug,n.detail]);
  for(let i=0;i<sites.length;i++)insert('INSERT INTO sites(network_id,name,slug,last_updated) VALUES(?,?,?,?)',[sites[i].network+1,sites[i].name,slug(sites[i].name),new Date(Date.now()-i*86400000).toISOString()]);
  for(const p of performers)insert('INSERT INTO performers(name,slug,country) VALUES(?,?,?)',[p.name,slug(p.name),p.country]);
  for(const ch of channels)insert('INSERT INTO channels(site_id,name,slug) VALUES(?,?,?)',[ch.site+1,ch.name,slug(ch.name)]);
  for(let i=0;i<videoSeeds.length;i++){
   const v=videoSeeds[i]; const videoId=i+1;
   insert('INSERT INTO videos(title,slug,site_id,channel_id,poster,media_url,duration,quality,views,likes,dislikes,published_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
   [v.title,v.slug,v.site+1,v.channel+1,v.poster,v.video,v.length,v.quality,v.views,v.upvotes,v.downvotes,new Date(Date.now()-v.published*7200000).toISOString(),'PUBLISHED']);
   for(const c of v.categories)insert('INSERT INTO video_categories(video_id,category_id) VALUES(?,?)',[videoId,c+1]);
   for(const p of v.performers)insert('INSERT INTO video_performers(video_id,performer_id) VALUES(?,?)',[videoId,p+1]);
  }
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
// Checkpoint 23 additive schema: account-owned ordering, queue and notification controls.
db.exec(`
CREATE TABLE IF NOT EXISTS watch_queue(
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 position INTEGER NOT NULL, added_at TEXT NOT NULL,
 PRIMARY KEY(user_id, video_id)
);
CREATE INDEX IF NOT EXISTS ix_watch_queue_order ON watch_queue(user_id,position);
`);
function ensureColumn(table,column,declaration){
 const fields=db.prepare(`PRAGMA table_info(${table})`).all().map(r=>r.name);
 if(!fields.includes(column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration}`);
}
ensureColumn('playlist_videos','position','INTEGER NOT NULL DEFAULT 0');
ensureColumn('subscriptions','notify','INTEGER NOT NULL DEFAULT 1 CHECK(notify IN (0,1))');
// Checkpoint 24: member experience. All personal controls default to private/opt-in.
ensureColumn('playlists','visibility',"TEXT NOT NULL DEFAULT 'PRIVATE' CHECK(visibility IN ('PRIVATE','UNLISTED'))");
ensureColumn('user_preferences','theme',"TEXT NOT NULL DEFAULT 'dark'");
ensureColumn('user_preferences','locale',"TEXT NOT NULL DEFAULT 'English'");
ensureColumn('user_preferences','save_searches','INTEGER NOT NULL DEFAULT 0');
ensureColumn('subscriptions','notify_mode',"TEXT NOT NULL DEFAULT 'ALL' CHECK(notify_mode IN ('ALL','HIGHLIGHTS','OFF'))");
ensureColumn('comments','parent_id','INTEGER REFERENCES comments(id)');
ensureColumn('comments','pinned','INTEGER NOT NULL DEFAULT 0');
db.exec(`
CREATE TABLE IF NOT EXISTS search_history(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 query TEXT NOT NULL, searched_at TEXT NOT NULL, PRIMARY KEY(user_id,query));
CREATE INDEX IF NOT EXISTS ix_search_history_recent ON search_history(user_id,searched_at DESC);
CREATE TABLE IF NOT EXISTS comment_reports(id INTEGER PRIMARY KEY,
 comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
 reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reason TEXT NOT NULL,created_at TEXT NOT NULL,handled_at TEXT,
 UNIQUE(comment_id,reporter_id));
`);
// Checkpoint 31: advisory signals only. An administrator must explicitly decide;
// pattern detectors never remove, shadow-ban or change published content by themselves.
db.exec(`
CREATE TABLE IF NOT EXISTS comment_abuse_flags(
 id INTEGER PRIMARY KEY, comment_id INTEGER NOT NULL UNIQUE REFERENCES comments(id) ON DELETE CASCADE,
 signals_json TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','CONFIRMED','DISMISSED')),
 created_at TEXT NOT NULL,reviewed_at TEXT,reviewed_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ix_comment_flags_pending ON comment_abuse_flags(state,created_at);
CREATE TABLE IF NOT EXISTS catalog_duplicate_reviews(
 video_a INTEGER NOT NULL REFERENCES videos(id),video_b INTEGER NOT NULL REFERENCES videos(id),
 decision TEXT NOT NULL CHECK(decision IN ('DUPLICATE','DISTINCT')),
 reviewed_by INTEGER NOT NULL REFERENCES users(id),reviewed_at TEXT NOT NULL,
 PRIMARY KEY(video_a,video_b),CHECK(video_a<video_b)
);
`);
// Previous subscriptions used a simple binary notification flag; preserve that choice.
db.exec("UPDATE subscriptions SET notify_mode='OFF' WHERE notify=0 AND notify_mode='ALL'");
// Backfill older playlists deterministically; explicit position is retained after upgrades.
db.exec('UPDATE playlist_videos SET position=rowid WHERE position=0');
// Checkpoint 25: additive local catalog/creator enhancements; never publishes media.
ensureColumn('creator_profiles','bio',"TEXT NOT NULL DEFAULT ''");
db.exec(`
CREATE TABLE IF NOT EXISTS catalog_aliases(id INTEGER PRIMARY KEY,alias TEXT NOT NULL UNIQUE COLLATE NOCASE,kind TEXT NOT NULL CHECK(kind IN ('categories','performers','sites','networks','channels')),target_slug TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS saved_search_filters(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,filters_json TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ix_saved_filters_owner ON saved_search_filters(user_id,id DESC);
CREATE TABLE IF NOT EXISTS creator_upload_notes(upload_id TEXT PRIMARY KEY REFERENCES upload_sessions(id) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,notes TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS entity_follows(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL CHECK(kind IN ('performers','sites','networks')),entity_id INTEGER NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,kind,entity_id));
CREATE INDEX IF NOT EXISTS ix_videos_status_published ON videos(status,published_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS ix_videos_status_views ON videos(status,views DESC,id DESC);
CREATE INDEX IF NOT EXISTS ix_videos_status_duration ON videos(status,duration DESC,id DESC);
CREATE INDEX IF NOT EXISTS ix_videos_status_channel ON videos(status,channel_id,id DESC);
`);
// Checkpoint 35: explicit, optional per-account catalog interest profile.
// A missing row means no personalization preference; never inferred from sensitive traits.
db.exec(`CREATE TABLE IF NOT EXISTS user_category_preferences(
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL,PRIMARY KEY(user_id,category_id));
 CREATE INDEX IF NOT EXISTS ix_user_category_pref_cat ON user_category_preferences(category_id,user_id);`);

// Checkpoint 26: additive creator operations and reviewer safety controls.
ensureColumn('upload_sessions','planned_release_at','TEXT');
ensureColumn('upload_sessions','selected_poster',"TEXT NOT NULL DEFAULT 'poster.jpg'");
db.exec(`
CREATE TABLE IF NOT EXISTS processing_dead_letters(
 upload_id TEXT PRIMARY KEY REFERENCES upload_sessions(id) ON DELETE CASCADE,
 attempt_count INTEGER NOT NULL, failure_reason TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS creator_collaborators(
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 collaborator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('ANALYST','EDITOR','UPLOADER')),
 status TEXT NOT NULL DEFAULT 'INVITED' CHECK(status IN ('INVITED','ACCEPTED','REVOKED')),
 invited_at TEXT NOT NULL, accepted_at TEXT,
 PRIMARY KEY(owner_id,collaborator_id), CHECK(owner_id<>collaborator_id)
);
CREATE INDEX IF NOT EXISTS ix_creator_collab_invitee ON creator_collaborators(collaborator_id,status);
CREATE TABLE IF NOT EXISTS license_review_events(
 id INTEGER PRIMARY KEY,upload_id TEXT NOT NULL REFERENCES upload_sessions(id),
 actor_id INTEGER NOT NULL REFERENCES users(id),action TEXT NOT NULL,
 note TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_license_review_events_upload ON license_review_events(upload_id,id DESC);
CREATE TABLE IF NOT EXISTS compliance_case_evidence_refs(
 case_id INTEGER NOT NULL REFERENCES compliance_cases(id) ON DELETE CASCADE,
 submitted_by INTEGER NOT NULL REFERENCES users(id),reference TEXT NOT NULL,
 created_at TEXT NOT NULL,PRIMARY KEY(case_id,reference)
);
CREATE TABLE IF NOT EXISTS compliance_review_signoffs(
 case_id INTEGER NOT NULL REFERENCES compliance_cases(id) ON DELETE CASCADE,
 reviewer_id INTEGER NOT NULL REFERENCES users(id),note TEXT NOT NULL,created_at TEXT NOT NULL,
 PRIMARY KEY(case_id,reviewer_id)
);
CREATE INDEX IF NOT EXISTS ix_compliance_case_assignee ON compliance_cases(assigned_to,priority,status);
CREATE INDEX IF NOT EXISTS ix_revocation_pending_lookup ON media_revocation_jobs(upload_id,reason,status);
`);
// Checkpoint 33: independent human-reviewed tag taxonomy. No automatic publishing.
db.exec(`CREATE TABLE IF NOT EXISTS catalog_tags(
 id INTEGER PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,
 created_by INTEGER REFERENCES users(id),created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS video_tag_links(
 video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 tag_id INTEGER NOT NULL REFERENCES catalog_tags(id) ON DELETE CASCADE,
 PRIMARY KEY(video_id,tag_id)
);
CREATE INDEX IF NOT EXISTS ix_video_tag_links_tag ON video_tag_links(tag_id,video_id);`);
const hadFts=!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='video_title_fts'").get();
db.exec(`
CREATE VIRTUAL TABLE IF NOT EXISTS video_title_fts USING fts5(title,content='videos',content_rowid='id',tokenize='unicode61');
CREATE TRIGGER IF NOT EXISTS video_fts_insert AFTER INSERT ON videos BEGIN INSERT INTO video_title_fts(rowid,title) VALUES(new.id,new.title); END;
CREATE TRIGGER IF NOT EXISTS video_fts_delete AFTER DELETE ON videos BEGIN INSERT INTO video_title_fts(video_title_fts,rowid,title) VALUES('delete',old.id,old.title); END;
CREATE TRIGGER IF NOT EXISTS video_fts_update AFTER UPDATE OF title ON videos BEGIN
 INSERT INTO video_title_fts(video_title_fts,rowid,title) VALUES('delete',old.id,old.title);
 INSERT INTO video_title_fts(rowid,title) VALUES(new.id,new.title);
END;
`);
if(!hadFts)db.exec("INSERT INTO video_title_fts(video_title_fts) VALUES('rebuild')");
export const all=(sql,...params)=>db.prepare(sql).all(...params);
export const one=(sql,...params)=>db.prepare(sql).get(...params);
export const run=(sql,...params)=>db.prepare(sql).run(...params);
export const now=()=>new Date().toISOString();
export const createToken=()=>crypto.randomBytes(32).toString('base64url');
export const tokenHash=t=>crypto.createHash('sha256').update(t).digest('hex');
export function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex'); return salt+':'+crypto.scryptSync(password,salt,64).toString('hex')}
export function verifyPassword(password,hash){if(!hash)return false;const [salt,expected]=hash.split(':');if(!salt||!expected)return false;const actual=crypto.scryptSync(password,salt,64);const b=Buffer.from(expected,'hex');return b.length===actual.length&&crypto.timingSafeEqual(actual,b)}
