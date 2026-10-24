#!/usr/bin/env python3
"""Strict non-self-certifying gate for the 62 Checkpoint-44 partial tasks.
The CSV rows are user-owned roadmap data; do not convert implementation notes
into PASS or silently reduce external acceptance requirements.
"""
from __future__ import annotations
import csv
import json
import pathlib
import sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
TRACKER=ROOT/'AUDIT_AND_HANDOFF'/'UPDATED_117_TASK_STATUS_45.csv'
EXT={
    'A':'Hosted/browser/operator verification',
    'B':'Licensed players and physical device/network testing',
    'C':'Multi-session, account and privacy review',
    'D':'Representative dataset, ranking/SEO and source permissions',
    'E':'Private upload/storage, worker and moderator acceptance',
    'F':'Disposable then staged migration, authenticated parity and recovery',
    'G':'Private cloud edge, entitlement, revocation and regional approvals',
    'H':'External age/identity/consent and legal-region audit',
    'I':'Qualified rights, legal and staffed moderation review',
    'J':'Infrastructure/operations security, load, restore and signoff',
    'K':'Device/provider/license/finance/legal acceptance',
}

def load():
    with TRACKER.open(encoding='utf-8',newline='') as handle:
        rows=list(csv.DictReader(handle))
    ids=[row['task_id'] for row in rows]
    if len(rows)!=117 or len(set(ids))!=117:
        raise ValueError('Must preserve exactly 117 distinct roadmap IDs')
    required={'task_id','priority','requirement','remaining_acceptance','checkpoint_44_status','checkpoint_45_status','checkpoint_45_change','checkpoint_45_verification'}
    if not required.issubset(rows[0]):raise ValueError('Checkpoint metadata is incomplete')
    for row in rows:
        if row['checkpoint_44_status']=='PARTIAL' and not row['remaining_acceptance'].strip():
            raise ValueError('Partial task missing external acceptance: '+row['task_id'])
        if row['checkpoint_45_status'] not in {'LOCAL','PARTIAL','BLOCKED','PREPARED','NOT_STARTED'}:
            raise ValueError('Invalid task status: '+row['task_id'])
    return rows

def make_report(rows):
    initial=[r for r in rows if r['checkpoint_44_status']=='PARTIAL']
    if len(initial)!=62:raise ValueError('Checkpoint-44 partial count unexpectedly changed')
    items=[{'taskId':r['task_id'],'priority':r['priority'],'requirement':r['requirement'],
            'checkpoint44Status':r['checkpoint_44_status'],'checkpoint45Status':r['checkpoint_45_status'],
            'localEngineering':r['checkpoint_45_change'],'localEvidence':r['checkpoint_45_verification'],
            'remainingAcceptance':r['remaining_acceptance'],
            'acceptanceAuthority':EXT[r['task_id'][0]],
            'externalProductionAcceptanceVerified':False}
           for r in initial]
    from collections import Counter
    return {'source':'117-task tracker v0.45.0','initialPartialTasks':len(initial),
        'statuses':dict(Counter(r['checkpoint_45_status'] for r in rows)),
        'productionLaunchApproved':False,'autoApproveTasks':False,'items':items}

def main():
    rows=load();result=make_report(rows)
    output=ROOT/'qa'/'partial-acceptance45.json'
    output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({'initialPartialTasks':result['initialPartialTasks'],
                     'stillPartial':sum(i['checkpoint45Status']=='PARTIAL' for i in result['items']),
                     'productionLaunchApproved':False,'report':str(output.relative_to(ROOT))}))
    return 0
if __name__=='__main__':sys.exit(main())
