#!/usr/bin/env python3
"""Checkpoint 14 visual smoke: Chromium DOM injection and real local API proxy.

This DOES NOT replace a real browser navigation test. The environment may block
Chromium navigation entirely. It renders the unmodified app.js and styles.css
inside an about:blank page with a virtual location, and forwards its fetches
through Python to a disposable local Node server. Only synthetic seed media.

Requires Python playwright and a local Chromium executable.
"""
from __future__ import annotations
import base64
import json
import os
import pathlib
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import http.cookiejar
import urllib.request
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = pathlib.Path(os.environ.get('SA_AUDIT_OUTPUT', ROOT / 'audit-output')).resolve()
CHROMIUM = os.environ.get('CHROME_PATH', '/usr/bin/chromium')

def reserve_port():
    sock = socket.socket()
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
    sock.close()
    return port

def run():
    port = reserve_port()
    with tempfile.TemporaryDirectory(prefix='streamatlas-offline-browser-') as tmp:
        env = {**os.environ, 'PORT': str(port), 'DB_PATH': str(pathlib.Path(tmp) / 'test.sqlite'),
               'PRIVATE_PATH': str(pathlib.Path(tmp) / 'private'), 'SA_DISABLE_WORKER': '1',
               'NODE_ENV': 'development'}
        server = subprocess.Popen(['node', 'src/server.js'], cwd=ROOT, env=env,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        base = 'http://127.0.0.1:%d' % port
        try:
            for _ in range(60):
                try:
                    with urllib.request.urlopen(base+'/api/health', timeout=.5) as r:
                        if r.status == 200: break
                except Exception: time.sleep(.1)
            else: raise RuntimeError('Node test server could not start')
            jar=http.cookiejar.CookieJar()
            opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
            def backend(path, options=None):
                options = options or {}
                assert isinstance(path, str) and path.startswith('/') and not path.startswith('//')
                method = str(options.get('method', 'GET'))
                headers = {'X-Requested-With': 'StreamAtlas'}
                body = options.get('body')
                if body: headers['Content-Type'] = 'application/json'
                for key, value in options.get('headers', {}).items():
                    if key.lower() in ('x-csrf-token','x-requested-with'): headers[key]=str(value)
                request = urllib.request.Request(base+path, data=body.encode() if body else None,
                                                 headers=headers, method=method)
                try:
                    with opener.open(request, timeout=8) as response:
                        return {'ok': True, 'status': response.status,
                                'body': response.read().decode('utf8')}
                except urllib.error.HTTPError as e:
                    return {'ok': False, 'status': e.code, 'body': e.read().decode('utf8')}
            OUT.mkdir(parents=True, exist_ok=True)
            a11y_reports = {}
            html = (ROOT/'public/index.html').read_text()
            html = html.replace('<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css">',
                        '<style>'+ (ROOT/'public/styles.css').read_text() +'</style>')
            html = html.replace('<script type="module" src="/app.js"></script>', '')
            bootstrap = '''
              const location = {pathname:'/', search:'',href:'https://streamatlas.invalid/'};
              const localStorage = {getItem(k){return this[k]||null},setItem(k,v){this[k]=String(v)}};
              const history = {
               pushState(_state,_title,path){this.replaceState(_state,_title,path)},
               replaceState(_state,_title,path){const u=new URL(path,'https://streamatlas.invalid');location.pathname=u.pathname;location.search=u.search;location.href=u.href}
              };
              const fetch = async (path,options={}) => {const r=await window.saBackend(path,options);return {ok:r.ok,status:r.status,json:async()=>JSON.parse(r.body)}};
            '''
            def inline_images(page):
                paths=page.locator('img').evaluate_all('els=>[...new Set(els.map(e=>e.getAttribute("src")))]')
                pictures={}
                for asset in paths:
                    if not asset or not asset.startswith('/assets/'): continue
                    actual=(ROOT/'public'/asset.lstrip('/')).resolve()
                    if not actual.is_relative_to(ROOT/'public') or not actual.exists(): continue
                    mime='image/jpeg' if actual.suffix.lower() in ('.jpg','.jpeg') else 'image/png'
                    pictures[asset]='data:'+mime+';base64,'+base64.b64encode(actual.read_bytes()).decode('ascii')
                page.evaluate('p=>{document.querySelectorAll("img").forEach(img=>{const s=img.getAttribute("src");if(p[s])img.src=p[s]})}',pictures)
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(executable_path=CHROMIUM, headless=True,
                     args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote'])
                try:
                    for name, width, height in [('desktop', 1440, 900), ('tablet', 820, 1180), ('mobile', 390, 844)]:
                        page = browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
                        page.expose_function('saBackend', backend)
                        page.set_content(html)
                        errors=[]
                        page.on('pageerror', lambda e: errors.append(str(e)))
                        page.add_script_tag(content='(function(){\n'+bootstrap + (ROOT/'public/app.js').read_text()+'\nwindow.__saRoute=route;window.__saHistory=history;})()')
                        
                        try: page.locator('.videocard').first.wait_for(timeout=8000)
                        except Exception:
                            print('PAGE ERRORS',errors); print('APP HTML',page.locator('#app').inner_text()[:1700]); raise
                        assert page.locator('.videocard').count()>=8, 'homepage thumbnails missing'
                        # Catalog screenshots are private outputs; do not bundle into release ZIP.
                        inline_images(page)
                        if name=='desktop':
                            preview=page.locator('.videocard img.thumb[data-preview^="/assets/"]').first
                            assert preview.count()>0, 'Synthetic preview source missing'
                            original=preview.get_attribute('src')
                            preview.hover()
                            page.wait_for_timeout(100)
                            assert preview.get_attribute('src')!=original, 'Hover did not activate synthetic preview'
                            page.mouse.move(0,0)
                            page.wait_for_timeout(100)
                            assert preview.get_attribute('src')==preview.get_attribute('data-original'), 'Hover preview did not restore poster'
                            inline_images(page)
                            print('CP25 browser: safe hover thumbnail preview and restore passed')
                        page.screenshot(path=str(OUT/(name+'-home.png')), full_page=True)
                        metrics=page.evaluate('''() => ({scrollWidth:document.documentElement.scrollWidth, viewport:innerWidth,
                            videos:document.querySelectorAll('.videocard').length, nav:!!document.querySelector('.headernav')})''')
                        assert metrics['scrollWidth'] <= width+2, f'{name}: horizontal overflow {metrics}'
                        # Checkpoint 24 homepage feed switching with the real client UI.
                        if name=='desktop':
                            assert page.locator('.feed-tab').count() >= 3
                            page.locator('a.feed-tab[href="/?feed=trending"]').click()
                            page.locator('.feed-tab.selected').wait_for(timeout=8000)
                            assert page.locator('.feed-tab.selected').inner_text() == 'Trending'
                            page.evaluate("window.__saHistory.pushState({},'', '/'); window.__saRoute()")
                            page.locator('.feed-tab').first.wait_for(timeout=8000)
                            print('CP24 browser: homepage feed tabs switched and rendered')
                        # Exercise the actual JS autocomplete and account-library navigation.
                        if name=='desktop':
                            page.locator('#global-search').fill('ama')
                            page.locator('.suggest-item').first.wait_for(timeout=8000)
                            assert page.locator('.suggest-item').count()>0
                            page.locator('[data-action="auth"]').first.click()
                            page.locator('[data-action="demo"]').click()
                            page.locator('.toast').first.wait_for(timeout=8000)
                            assert 'Demo' in page.locator('.toast').first.inner_text()
                            page.evaluate("window.__saHistory.pushState({},'', '/favorites'); window.__saRoute()")
                            
                            try: page.locator('#main-content h1').wait_for(timeout=7000)
                            except Exception:
                                print('FAV DEBUG',page.locator('#app').inner_text()[:500]);print('ERRORS',errors);raise
                            assert 'Favorites' in page.locator('#main-content h1').inner_text()
                            assert page.locator('#library-filter').count()==1
                            page.locator('#library-filter').select_option('unwatched')
                            page.wait_for_timeout(300)
                            assert page.locator('#library-filter').input_value() == 'unwatched'
                            print('CP24 browser: library filters rendered and changed')
                            # Checkpoint 25: unified multi-entity search, saved filters and actions.
                            page.evaluate("window.__saHistory.pushState({},'', '/search?q=ama');window.__saRoute()")
                            page.locator('#search-filters').wait_for(timeout=10000)
                            assert page.locator('[data-action="saved-filter-save"]').count()==1
                            assert page.locator('#main-content h1').inner_text().startswith('Search results')
                            page.once('dialog', lambda dialog: dialog.accept('QA Search Filter'))
                            page.locator('[data-action="saved-filter-save"]').click()
                            page.locator('[data-action="saved-filter-apply"]').first.wait_for(timeout=8000)
                            assert 'QA Search Filter' in page.locator('#main-content').inner_text()
                            page.locator('[data-action="saved-filter-apply"]').first.click()
                            page.locator('#search-filters').wait_for(timeout=8000)
                            page.locator('[data-action="saved-filter-remove"]').first.click()
                            page.wait_for_timeout(300)
                            assert page.locator('[data-action="saved-filter-apply"]').count()==0
                            inline_images(page)
                            page.screenshot(path=str(OUT/(name+'-search.png')),full_page=True)
                            print('CP25 browser: unified search and saved-filter create/apply/delete passed')
                        page.evaluate("window.__saHistory.pushState({},'', '/categories'); window.__saRoute()")
                        page.locator('.cat-section').first.wait_for(timeout=10000)
                        inline_images(page)
                        page.screenshot(path=str(OUT/(name+'-categories.png')),full_page=True)
                        page.evaluate("window.__saHistory.pushState({},'', '/videos/after-hours-the-neon-edit-1'); window.__saRoute()")
                        page.locator('#video-player').wait_for(timeout=10000)
                        assert page.locator('#playback-speed').count()==1
                        assert page.locator('#player-scrubber').count()==1
                        assert page.locator('#player-captions option').count()>=2
                        assert page.locator('#player-volume').count()==1
                        assert page.locator('#up-next').count()==1
                        # Real Chromium video decode/playback, using the original generated local sample.
                        # The app still loads with offline API routing; only the video src is
                        # replaced by a data URI so the sandbox's network restriction is avoided.
                        if name=='desktop':
                            clip=(ROOT/'public/assets/videos/sample-1.mp4').read_bytes()
                            media='data:video/mp4;base64,'+base64.b64encode(clip).decode('ascii')
                            page.locator('#video-player').evaluate('(v,src)=>{v.src=src;v.muted=true;v.load()}',media)
                            page.locator('#video-player').evaluate('(v)=>v.play()')
                            page.wait_for_timeout(1400)
                            playback=page.locator('#video-player').evaluate('(v)=>({duration:v.duration,time:v.currentTime,readyState:v.readyState,error:v.error?.message||null})')
                            assert playback['duration']>=7.5, f'Unexpected sample duration: {playback}'
                            assert playback['time']>0.3 and playback['readyState']>=2 and not playback['error'], f'Media did not decode/play: {playback}'
                            page.locator('#playback-speed').select_option('1.5')
                            assert page.locator('#video-player').evaluate('(v)=>v.playbackRate')==1.5
                            page.locator('#player-volume').fill('0.3')
                            assert abs(page.locator('#video-player').evaluate('(v)=>v.volume')-0.3)<.06
                            page.locator('#player-scrubber').evaluate('(e)=>{e.value="2.1";e.dispatchEvent(new Event("input",{bubbles:true}))}')
                            assert page.locator('#timeline-preview').is_visible(), 'Timeline thumbnail overlay missing'
                            page.locator('#player-scrubber').dispatch_event('change')
                            assert abs(page.locator('#video-player').evaluate('(v)=>v.currentTime')-2.1)<.25
                            captions=(ROOT/'public/assets/hls-demo/sample-1/captions.vtt').read_bytes()
                            capuri='data:text/vtt;base64,'+base64.b64encode(captions).decode('ascii')
                            page.locator('#video-player track').first.evaluate('(t,src)=>t.src=src',capuri)
                            page.locator('#player-captions').select_option('en')
                            page.wait_for_timeout(350)
                            track=page.locator('#video-player').evaluate('(v)=>({length:v.textTracks.length,cues:v.textTracks[0]?.cues?.length,mode:v.textTracks[0]?.mode})')
                            assert track['length']>=1 and track['mode']=='showing' and track['cues']>=2, f'Captions not parsed/displayable: {track}'
                            assert page.locator('#player-qoe').inner_text().startswith('Startup ')
                            page.locator('#caption-size').select_option('extra')
                            page.locator('#caption-contrast').select_option('high')
                            assert page.locator('#video-player').evaluate("v=>v.classList.contains('captions-extra')&&v.classList.contains('captions-high')"), 'caption preference was not applied'
                            assert page.locator('#qoe-optin').is_checked() is False, 'playback telemetry must default to off'
                            assert page.locator('.videocard img.thumb[srcset]').count()>=1, 'responsive thumbnails not rendered'
                            print('Chromium: sample MP4, playback speed, seek preview, volume, caption toggle and QoE UI passed')
                            # Verify the actual public-report UI and API with the signed-in
                            # synthetic demo account (created earlier in the desktop flow).
                            page.locator('[data-action="report"]').first.click()
                            page.locator('#compliance-case-form textarea[name="details"]').fill(
                                'A formal synthetic copyright concern requiring review and evidence.')
                            page.locator('#compliance-case-form button[type="submit"]').click()
                            page.wait_for_timeout(500)
                            assert page.locator('#compliance-case-form').count()==0, 'Case form did not submit successfully'
                            print('Formal complaint browser form submitted from signed-in demo account')

                        assert page.locator('#related-grid').count()==1
                        if name=='desktop':
                            # Browser-exercised CP23 queue through real frontend event listeners.
                            page.locator('[data-action="queue-add"]').first.click()
                            page.wait_for_timeout(250)
                            page.evaluate("window.__saHistory.pushState({},'', '/queue');window.__saRoute()")
                            page.locator('#queue-grid .videocard').first.wait_for(timeout=8000)
                            assert 'Watch Queue' in page.locator('#main-content h1').inner_text()
                            page.locator('[data-action="queue-remove"]').first.click()
                            page.wait_for_timeout(200)
                            assert page.locator('#queue-grid .videocard').count()==0
                            page.evaluate("window.__saHistory.pushState({},'', '/continue-watching');window.__saRoute()")
                            page.locator('#main-content h1').wait_for(timeout=8000)
                            assert 'Continue Watching' in page.locator('#main-content h1').inner_text()
                            print('CP23 browser: add/remove Watch Queue and Continue Watching navigation passed')
                            page.evaluate("window.__saHistory.pushState({},'', '/videos/after-hours-the-neon-edit-1');window.__saRoute()")
                            page.locator('#video-player').wait_for(timeout=8000)
                        inline_images(page)
                        page.screenshot(path=str(OUT/(name+'-watch.png')),full_page=True)
                        page.keyboard.press('Tab')
                        keyboard_focus = page.evaluate('''() => ({tag:document.activeElement?.tagName||null, name:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim().slice(0,60)||''})''')
                        a11y_reports[name] = page.evaluate((ROOT/'qa/a11y-audit.js').read_text())
                        a11y_reports[name]['keyboardFocus'] = keyboard_focus
                        if keyboard_focus['tag'] in (None, 'BODY', 'HTML'):
                            a11y_reports[name]['failures'].append({'rule':'keyboard-focus','sample':str(keyboard_focus)})
                        assert not errors, f'{name} javascript errors: {errors}'
                        print(f'{name}: OK, {metrics["videos"]} video cards; width={metrics["scrollWidth"]} / {width}')
                        page.close()
                finally:
                    (OUT/'accessibility-heuristic.json').write_text(json.dumps(a11y_reports,indent=2)+'\n')
                    browser.close()
        finally:
            server.terminate()
            try: server.communicate(timeout=3)
            except subprocess.TimeoutExpired: server.kill();server.communicate()

if __name__=='__main__': run()
