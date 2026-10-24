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
