/** Local reviewer coordination only. No legal adjudication or automated publication. */
import {all,one,run,now} from './database.js';
const bad=(message,status=400)=>{const e=new Error(message);e.status=status;throw e};
const reply=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));return true};
async function read(req){let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>16384)bad('Request too large',413);chunks.push(b)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{bad('Invalid JSON')}}
export function dualReviewRequired(caseId,status){
 if((process.env.SA_REQUIRE_DUAL_REVIEW!=='1'&&process.env.NODE_ENV!=='production')||!['RESOLVED','REJECTED','CLOSED'].includes(status))return false;
 const c=one('SELECT category FROM compliance_cases WHERE id=?',caseId);
 if(!c||!['AGE','CONSENT'].includes(c.category))return false;
 return one('SELECT COUNT(DISTINCT reviewer_id) AS n FROM compliance_review_signoffs WHERE case_id=?',caseId).n<2;
}
export async function complianceOperationsApi(req,res,url,{requireAdmin}){
 const p=url.pathname,m=req.method;
 if(m==='GET'&&p==='/api/admin/compliance/sla'){
  requireAdmin(req);const items=all(`SELECT id,category,priority,status,assigned_to AS assignedTo,created_at AS createdAt
   FROM compliance_cases WHERE status NOT IN ('RESOLVED','REJECTED','CLOSED') ORDER BY (priority='URGENT') DESC,created_at ASC LIMIT 200`).map(x=>{
   const hours=x.priority==='URGENT'?4:72,dueAt=new Date(Date.parse(x.createdAt)+hours*3600000).toISOString();return {...x,targetHours:hours,dueAt,overdue:Date.parse(dueAt)<Date.now()};
  });return reply(res,{items,notice:'Internal target timers only; not legal SLA certification.'});
 }
 const assign=p.match(/^\/api\/admin\/compliance\/cases\/(\d+)\/assign$/);
 if(m==='PATCH'&&assign){const admin=requireAdmin(req),b=await read(req),id=Number(assign[1]),reviewerId=Number(b.reviewerId);
  if(!Number.isSafeInteger(reviewerId)||reviewerId<1||!one("SELECT 1 FROM users WHERE id=? AND role='ADMIN'",reviewerId))bad('Assigned reviewer must be an administrator');
  const c=one('SELECT id,status FROM compliance_cases WHERE id=?',id);if(!c)bad('Case not found',404);
  if(['RESOLVED','REJECTED','CLOSED'].includes(c.status))bad('Closed case cannot be reassigned',409);
  run('UPDATE compliance_cases SET assigned_to=?,updated_at=? WHERE id=?',reviewerId,now(),id);
  run('INSERT INTO compliance_case_events(case_id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)',id,admin.id,'ASSIGNED',`Assigned to reviewer #${reviewerId}`,now());
  return reply(res,{ok:true,assignedTo:reviewerId});
 }
 const sign=p.match(/^\/api\/admin\/compliance\/cases\/(\d+)\/signoff$/);
 if(m==='POST'&&sign){const reviewer=requireAdmin(req),b=await read(req),id=Number(sign[1]),note=String(b.note||'').trim();
  if(note.length<15||note.length>500)bad('Signoff requires 15–500 characters of rationale');
  const c=one('SELECT category,status FROM compliance_cases WHERE id=?',id);if(!c)bad('Case not found',404);
  if(!['AGE','CONSENT'].includes(c.category))bad('Dual-review signoff only for age/consent cases',409);
  if(['RESOLVED','REJECTED','CLOSED'].includes(c.status))bad('Case already closed',409);
  if(one('SELECT 1 FROM compliance_review_signoffs WHERE case_id=? AND reviewer_id=?',id,reviewer.id))bad('Reviewer already signed off',409);
  run('INSERT INTO compliance_review_signoffs(case_id,reviewer_id,note,created_at) VALUES(?,?,?,?)',id,reviewer.id,note,now());
  run('INSERT INTO compliance_case_events(case_id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)',id,reviewer.id,'REVIEW_SIGNOFF','Reviewer signoff recorded; no content status change',now());
  return reply(res,{ok:true,signoffs:one('SELECT COUNT(*) AS n FROM compliance_review_signoffs WHERE case_id=?',id).n});
 }
 return false;
}
