import importlib.util
import pathlib
import unittest
SCRIPT=pathlib.Path(__file__).resolve().parents[2]/'scripts'/'partial-acceptance-matrix45.py'
spec=importlib.util.spec_from_file_location('acceptance45',SCRIPT)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AcceptanceTests(unittest.TestCase):
    def test_preserves_all_117_and_initial_62_partials(self):
        r=m.make_report(m.load());self.assertEqual(r['initialPartialTasks'],62)
        self.assertEqual(sum(r['statuses'].values()),117)
    def test_external_completion_never_self_certified(self):
        r=m.make_report(m.load());self.assertFalse(r['productionLaunchApproved'])
        self.assertTrue(all(not x['externalProductionAcceptanceVerified'] for x in r['items']))
        self.assertEqual(len(set(x['taskId'] for x in r['items'])),62)
    def test_all_partials_have_remaining_acceptance(self):
        r=m.make_report(m.load());self.assertTrue(all(x['remainingAcceptance'] for x in r['items']))
