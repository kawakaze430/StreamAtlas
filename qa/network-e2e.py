#!/usr/bin/env python3
"""Real network/browser QA. No offline DOM shims or production identities.
Run: python qa/network-e2e.py --engines chromium firefox webkit --strict
Install: python -m pip install playwright==1.56.0; python -m playwright install --with-deps chromium firefox webkit
Optional: npm install --no-save axe-core@4.10.3; SA_QA_REQUIRE_AXE=1
Failures/unavailable engines exit nonzero in strict mode. Does not simulate passing checks.
"""
import argparse
import json
import os
import platform
import re
from importlib import metadata
import pathlib
import socket
import subprocess
import tempfile
import time
import urllib.request
from urllib.parse import urlsplit
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]

def port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]

def ready(url):
    for _ in range(100):
        try:
            with urllib.request.urlopen(url+'/api/ready', timeout=.5) as r:
                if r.status == 200: return
        except Exception: time.sleep(.1)
    raise RuntimeError('Disposable API server did not become ready')

def context_options(engine, name, viewport):
    """Actual touch/mobile emulation where engine supports it.
    Firefox Playwright does not support is_mobile, so use touch and viewport.
    """
    if engine not in ('chromium','firefox','webkit') or name not in ('desktop','mobile'):
        raise ValueError('Unsupported browser/context')
    options={'viewport':viewport,'locale':'en-US','accept_downloads':False}
    if name=='mobile':
        options['has_touch']=True
        if engine!='firefox': options['is_mobile']=True
    return options

def verify_mobile_touch(page):
    """Verify real browser touch dispatch rather than unreliable maxTouchPoints.

    Firefox and WebKit may expose navigator.maxTouchPoints=0 while Playwright's
    has_touch context can emit functional touch/pointer input. Exercise the
    real Touchscreen API on an ephemeral overlay without navigating the app.
    """
    page.evaluate("""() => {
      const probe=document.createElement('div');
      probe.id='__sa_qa_touch_probe';
      Object.assign(probe.style, {
        position:'fixed',left:'0px',top:'0px',width:'36px',height:'36px',
        zIndex:'2147483647',pointerEvents:'auto',touchAction:'none'
      });
      window.__sa_qa_touch_observed=false;
      probe.addEventListener('touchstart', () => {window.__sa_qa_touch_observed=true;}, {passive:true});
      probe.addEventListener('pointerdown', e => {
        if(e.pointerType==='touch')window.__sa_qa_touch_observed=true;
      });
      document.body.appendChild(probe);
    }""")
    try:
        page.touchscreen.tap(18,18)
        assert page.evaluate('Boolean(window.__sa_qa_touch_observed)'), \
            'Touchscreen tap did not deliver an actual touch/pointer event'
    finally:
        page.evaluate("() => { document.getElementById('__sa_qa_touch_probe')?.remove(); delete window.__sa_qa_touch_observed; }")


def check_page(page, route, min_cards=0):
    page.goto(route, wait_until='domcontentloaded', timeout=15000)
    page.locator('#app').wait_for(timeout=10000)
    if min_cards: page.locator('.videocard').first.wait_for(timeout=15000)
    d=page.evaluate('''() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,
      title:document.title,main:document.querySelectorAll('main').length,
      h1:document.querySelectorAll('h1').length,cards:document.querySelectorAll('.videocard').length})''')
    assert d['scroll']<=d['width']+2, f'horizontal overflow: {d}'
    assert d['cards']>=min_cards, f'catalog cards missing: {d}'
    assert d['main']>=1, f'no main landmark: {d}'
    return d

def axe_check(page, source):
    # CI must install the pinned reviewed axe-core package; no remote script injection.
    if not source.exists():
        if os.environ.get('SA_QA_REQUIRE_AXE')=='1': raise AssertionError('axe-core is required but not installed')
        return {'status':'not-run','reason':'local axe-core package unavailable'}
    # Keep application CSP strict: inline Playwright script injection is blocked by
    # script-src 'self'. Route an ephemeral, same-origin QA-only URL to the local
    # pinned axe-core bytes. No application endpoint or unsafe-inline needed.
    parsed=urlsplit(page.url)
    test_url=f'{parsed.scheme}://{parsed.netloc}/__sa_qa_only__/axe.min.js'
    page.route(test_url, lambda route: route.fulfill(status=200,
        content_type='application/javascript', body=source.read_bytes()))
    page.add_script_tag(url=test_url)
    results=page.evaluate('''async()=>{
      const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
      return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,targets:v.nodes.slice(0,5).map(n=>n.target)}))
    }''')
    if results: raise AssertionError(f'axe WCAG violations: {results}')
    return {'status':'passed','violations':0}

def load_playwright():
    # Import after report initialization so a missing dependency has evidence too.
    from playwright.sync_api import sync_playwright
    return sync_playwright


def runtime_metadata():
    def command(args):
        try:
            result=subprocess.run(args,cwd=ROOT,capture_output=True,text=True,timeout=5)
            return result.stdout.strip() if result.returncode==0 else None
        except (OSError,subprocess.SubprocessError):
            return None
    commit=command(['git','rev-parse','HEAD'])
    commit_source='git'
    if not commit or not re.fullmatch(r'[0-9a-fA-F]{40}',commit):
        commit=os.environ.get('GITHUB_SHA','')
        commit_source='GITHUB_SHA'
    if not re.fullmatch(r'[0-9a-fA-F]{40}',commit):
        commit=None
        commit_source=None
    try: playwright_version=metadata.version('playwright')
    except metadata.PackageNotFoundError: playwright_version=None
    tracked_changes=command(['git','status','--porcelain','--untracked-files=no'])
    return {'commit':commit,'commit_source':commit_source,'python':platform.python_version(),
        'tracked_worktree_dirty':bool(tracked_changes) if tracked_changes is not None else None,
        'node':command(['node','--version']),'playwright':playwright_version}


def credential_values(value):
    if isinstance(value,dict):
        return [text for item in value.values() for text in credential_values(item)]
    if isinstance(value,list):
        return [text for item in value for text in credential_values(item)]
    return [value] if isinstance(value,str) and len(value)>=4 else []


def sanitized_error(exc,redactions=()):
    # Do not include fixture stdout/stderr: it can contain account data.
    if isinstance(exc,subprocess.CalledProcessError):
        return f'Subprocess exited with code {exc.returncode}; captured output omitted'
    message=str(exc).splitlines()[0] if str(exc) else type(exc).__name__
    for value in sorted(redactions,key=len,reverse=True):
        message=message.replace(value,'<redacted>')
    message=re.sub(r'(https?://)[^/\s@]+@',r'\1<redacted>@',message)
    message=re.sub(r'(?i)(password|secret|token|authorization|cookie)([\s:=]+)[^\s,;]+',
        r'\1\2<redacted>',message)
    return message[:1000]


def run(argv=None):
    a=argparse.ArgumentParser();a.add_argument('--engines', nargs='+', choices=['chromium','firefox','webkit'], default=['chromium','firefox','webkit']);a.add_argument('--strict',action='store_true');a.add_argument('--output',default='reports/qa-browser-results.json');args=a.parse_args(argv)
    report={'suite':'network-real-browser-v1','mode':'actual localhost navigation (not offline injection)',
        'results':{name:{'status':'not-run','checks':[]} for name in args.engines},
        'success':False,'utc':datetime.now(timezone.utc).isoformat(),'runtime':runtime_metadata()}
    output=ROOT/args.output if not pathlib.Path(args.output).is_absolute() else pathlib.Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    stage='playwright-import'
    redactions=[]
    try:
        playwright_factory=load_playwright()
        with tempfile.TemporaryDirectory(prefix='streamatlas-network-e2e-') as tmp:
            env={**os.environ,'NODE_ENV':'test','SA_QA_FIXTURES':'YES'}
            stage='fixtures'
            fixture=subprocess.run(['node','scripts/qa-fixtures.js',tmp],cwd=ROOT,env=env,capture_output=True,text=True,check=True)
            stage='fixture-output'
            paths=json.loads(fixture.stdout.strip())
            accounts=json.loads(pathlib.Path(paths['credentialsPath']).read_text())
            redactions=credential_values(accounts)
            p=port();base=f'http://127.0.0.1:{p}'
            env.update({'NODE_ENV':'development','PORT':str(p),'DB_PATH':paths['dbPath'],'PRIVATE_PATH':str(pathlib.Path(tmp)/'private'),'SA_DISABLE_WORKER':'1'})
            stage='server-start'
            server=subprocess.Popen(['node','src/server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            try:
                stage='server-ready'
                ready(base)
                stage='playwright-start'
                with playwright_factory() as pw:
                    report['bootstrap']={'status':'passed'}
                    stage='engines'
                    for engine in args.engines:
                        entry=report['results'][engine]
                        browser=None
                        try:
                            options={'headless':True}
                            if engine=='chromium' and os.environ.get('CHROME_PATH'): options['executable_path']=os.environ['CHROME_PATH']
                            entry['stage']='launch'
                            browser=getattr(pw,engine).launch(**options)
                            entry['version']=browser.version
                            entry['stage']='checks'
                            for name,viewport in [('desktop',{'width':1440,'height':900}),('mobile',{'width':390,'height':844})]:
                                context=browser.new_context(**context_options(engine,name,viewport))
                                page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                                entry['checks'].append({'name':name+'-home','result':check_page(page,base+'/',8)})
                                if name=='mobile':
                                    verify_mobile_touch(page)
                                    entry['checks'].append({'name':'mobile-touch-event','status':'passed'})
                                entry['checks'].append({'name':name+'-categories','result':check_page(page,base+'/categories')})
                                page.goto(base+'/search?q=neon',wait_until='domcontentloaded',timeout=15000)
                                page.locator('#search-filters').wait_for(timeout=15000)
                                entry['checks'].append({'name':name+'-search','status':'passed'})
                                page.goto(base+'/videos/after-hours-the-neon-edit-1',wait_until='domcontentloaded',timeout=15000)
                                page.locator('#video-player').wait_for(timeout=15000)
                                assert page.locator('#playback-speed').count()==1
                                entry['checks'].append({'name':name+'-watch','status':'passed'})
                                # Same-origin login via browser request context; sessions kept in browser cookie jar.
                                if name=='desktop':
                                    csrf=page.request.get(base+'/api/security/csrf');assert csrf.ok
                                    token=csrf.json()['token']
                                    login=page.request.post(base+'/api/auth/login',headers={'X-Requested-With':'StreamAtlas','X-CSRF-Token':token},data=accounts['viewer']|{'_test':'synthetic'})
                                    assert login.status==200, f'viewer login failed HTTP {login.status}'
                                    page.goto(base+'/favorites',wait_until='domcontentloaded',timeout=15000)
                                    page.locator('#main-content').wait_for(timeout=15000)
                                    entry['checks'].append({'name':'viewer-login-favorites','status':'passed'})
                                    # Role boundary verification, still using private test credentials.
                                    anon=page.request.get(base+'/api/admin/overview');assert anon.status==403
                                    entry['checks'].append({'name':'viewer-admin-denied','status':'passed'})
                                    page.goto(base+'/',wait_until='domcontentloaded',timeout=15000)
                                    axe=axe_check(page,ROOT/'node_modules/axe-core/axe.min.js')
                                    entry['checks'].append({'name':'axe-wcag-home','result':axe})
                                # Basic keyboard focus progression (not a substitute for a full screen-reader audit).
                                page.keyboard.press('Tab');focus=page.evaluate('document.activeElement?.tagName||null')
                                assert focus not in [None,'BODY'],f'keyboard focus not reachable: {focus}'
                                entry['checks'].append({'name':name+'-keyboard','status':'passed'})
                                assert not errors, f'uncaught JS errors: {errors}'
                                context.close()
                            entry.update({'status':'passed','stage':'complete'})
                        except Exception as exc:
                            message=sanitized_error(exc,redactions)
                            entry.update({'status':'unavailable' if 'Executable doesn\'t exist' in message or 'BrowserType.launch' in message and 'install' in str(exc).lower() else 'failed','error':message})
                        finally:
                            if browser:
                                try: browser.close()
                                except Exception as exc:
                                    entry.update({'status':'failed','stage':'cleanup','error':sanitized_error(exc,redactions)})
            finally:
                server.terminate()
                try:server.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait(timeout=4)
    except Exception as exc:
        report['bootstrap']={'status':'unavailable' if isinstance(exc,ImportError) else 'failed',
            'stage':stage,'error':sanitized_error(exc,redactions)}
    report['success']=report.get('bootstrap',{}).get('status')=='passed' and bool(report['results']) and all(r['status']=='passed' for r in report['results'].values())
    output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'success':report['success'],'engines':{k:v['status'] for k,v in report['results'].items()},'report':str(output)},indent=2))
    if report.get('bootstrap',{}).get('status')!='passed' or args.strict and not report['success']:return 1
    return 0

if __name__=='__main__':raise SystemExit(run())
