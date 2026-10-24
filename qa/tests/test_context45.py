import pathlib
import importlib.util
import unittest
p=pathlib.Path(__file__).resolve().parents[1]/'network-e2e.py'
spec=importlib.util.spec_from_file_location('streamatlas_network_e2e45',p)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
class ContextTests(unittest.TestCase):
    def test_mobile_chromium_and_webkit_have_real_mobile_mode(self):
        for engine in ['chromium','webkit']:
            with self.subTest(engine=engine):
                options=mod.context_options(engine,'mobile',{'width':390,'height':844})
                self.assertTrue(options['has_touch']);self.assertTrue(options['is_mobile'])
    def test_firefox_mobile_preserves_touch_but_avoids_unsupported_is_mobile(self):
        x=mod.context_options('firefox','mobile',{'width':390,'height':844})
        self.assertTrue(x['has_touch']);self.assertNotIn('is_mobile',x)
    def test_desktop_does_not_advertise_mobile_mode(self):
        for engine in ['chromium','firefox','webkit']:
            opts=mod.context_options(engine,'desktop',{'width':1440,'height':900})
            self.assertNotIn('is_mobile',opts);self.assertNotIn('has_touch',opts)
    def test_reject_invalid_engine(self):
        with self.assertRaises(ValueError):mod.context_options('unsupported','mobile',{'width':390,'height':844})

class MobileTouchDispatchTests(unittest.TestCase):
    class StubTouchscreen:
        def __init__(self, page):self.page=page
        def tap(self, x, y):
            self.page.taps.append((x,y))
            self.page.observed=self.page.dispatch_success
    class StubPage:
        def __init__(self, success):
            self.dispatch_success=success;self.observed=False;self.taps=[];self.evaluated=[]
            self.touchscreen=MobileTouchDispatchTests.StubTouchscreen(self)
        def evaluate(self, script):
            self.evaluated.append(script)
            if script=='Boolean(window.__sa_qa_touch_observed)':return self.observed
            return None
    def test_actual_touch_event_passes_independently_of_max_touch_points(self):
        page=self.StubPage(True)
        mod.verify_mobile_touch(page)
        self.assertEqual(page.taps,[(18,18)])
        self.assertTrue(any('__sa_qa_touch_probe' in script for script in page.evaluated))
    def test_missing_touch_event_fails_and_removes_probe(self):
        page=self.StubPage(False)
        with self.assertRaisesRegex(AssertionError,'actual touch/pointer event'):
            mod.verify_mobile_touch(page)
        self.assertTrue(any('remove()' in script for script in page.evaluated))
