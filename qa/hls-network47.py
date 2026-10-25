#!/usr/bin/env python3
"""Real Chromium/HLS smoke against a running local synthetic StreamAtlas server.

Run with Playwright 1.56.0 and a local Chromium:
  CHROME_PATH=/usr/bin/chromium python3 qa/hls-network47.py
The test makes actual MSE decode and segment requests; it does not use a DOM shim.
"""
import argparse
import json
import os
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


def video_state(page):
    return page.locator('#video-player').evaluate(
        '(v)=>({time:v.currentTime,ready:v.readyState,src:v.currentSrc,error:v.error?.message||null})')


def playing(page, timeout=20):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        state=video_state(page)
        if state['error']:
            raise AssertionError('Browser reported a media decode error')
        if state['time']>0.2 and state['ready']>=2:
            return state
        time.sleep(.2)
    raise AssertionError('Real media playback did not advance')


def watch(page, base):
    page.goto(base+'/videos/after-hours-the-neon-edit-1',wait_until='domcontentloaded',timeout=15000)
    page.locator('#video-player').wait_for(timeout=10000)
    assert page.locator('#playback-quality option').all_text_contents()[-1]=='Auto adaptive HLS'
    page.locator('#playback-quality').select_option(label='Auto adaptive HLS')
    page.locator('#video-player').evaluate('(v)=>{v.muted=true;return v.play()}')


def run(base, browser_path):
    parsed=urlsplit(base)
    if parsed.scheme!='http' or parsed.hostname!='127.0.0.1' or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('','/'):
        raise ValueError('Only an explicit 127.0.0.1 HTTP origin is allowed')
    report={'suite':'real-hls-chromium-47','status':'FAIL','checks':[],
            'scope':'local synthetic media; Chromium only; no physical device/CDN acceptance'}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=browser_path)
        report['browserVersion']=browser.version
        try:
            first=browser.new_page()
            requests=[]
            first.on('response',lambda response:requests.append((response.status,response.url))
                     if '.m3u8' in response.url or '.ts' in response.url else None)
            watch(first,base)
            state=playing(first)
            assert state['src'].startswith('blob:'),'HLS media did not attach through MSE'
            assert any(code==200 and path.endswith('master.m3u8') for code,path in requests)
            assert any(code==200 and path.endswith('hi.m3u8') for code,path in requests)
            assert any(code==200 and path.endswith('hi_seg_000.ts') for code,path in requests)
            report['checks'].append('real master, variant and segment fetched; HLS decoded and played')
            before=state['time']
            first.locator('#playback-quality').select_option(label='Standard (MP4)')
            deadline=time.monotonic()+10
            while time.monotonic()<deadline:
                state=video_state(first)
                if 'sample-1.mp4' in state['src'] and state['time']>0.2:break
                time.sleep(.2)
            assert 'sample-1.mp4' in state['src'] and state['time']>=before-.25
            report['checks'].append('HLS to MP4 quality switch preserved play position')
            first.close()

            second=browser.new_page()
            fault={'injected':0,'attempts':0}
            def fail_once(route):
                fault['attempts']+=1
                if not fault['injected']:
                    fault['injected']=1
                    route.fulfill(status=503,body='Synthetic segment fault')
                else:
                    route.continue_()
            second.route('**/hi_seg_000.ts',fail_once)
            watch(second,base)
            state=playing(second,timeout=30)
            assert fault['injected']==1 and fault['attempts']>=2
            assert state['src'].startswith('blob:'),'Playback fell back before HLS segment recovered'
            report['checks'].append('injected 503 segment response retried and HLS playback recovered')
            second.close()
            report['status']='PASS'
        finally:
            browser.close()
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='http://127.0.0.1:3000')
    parser.add_argument('--browser',default=os.environ.get('CHROME_PATH','/usr/bin/chromium'))
    args=parser.parse_args()
    print(json.dumps(run(args.base,args.browser),indent=2))
