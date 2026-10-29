import unittest,importlib.util,tempfile,pathlib,json,hashlib
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('updater',pathlib.Path(__file__).with_name('update.py'));u=importlib.util.module_from_spec(spec);spec.loader.exec_module(u)
def fixture():
    countries={}
    for code in u.COUNTRIES:
        name='Праздник';date='2027-01-01';category='public';key='|'.join((code,date,category,name))
        countries[code]={'events':[{'id':hashlib.sha256(key.encode()).hexdigest(),'date':date,'category':category,'sourceName':name,'needsReview':True}]}
    return {'schemaVersion':1,'version':'0.107','license':'MIT','years':[2026,2027],'countries':countries}
class Tests(unittest.TestCase):
    def test_hosts(self):
        for url in ['http://pypi.org/a','https://evil.test/a','https://pypi.org.evil/a','https://user@pypi.org/a','https://pypi.org:4430/a']:
            with self.assertRaises(u.FeedError):u.validate_url(url)
        u.validate_url('https://files.pythonhosted.org/packages/file.whl')
    def test_prerelease_and_ambiguous(self):
        row={'filename':'holidays-0.107-py3-none-any.whl','packagetype':'bdist_wheel','url':'https://files.pythonhosted.org/a','digests':{'sha256':'a'*64}}
        self.assertEqual(u.select_wheel({'info':{'version':'0.107'},'urls':[row]}),row)
        for version,rows in [('0.108.dev1',[row]),('0.107',[row,row]),('0.107',[])]:
            with self.assertRaises(u.FeedError):u.select_wheel({'info':{'version':version},'urls':rows})
    def test_validation(self):
        data=fixture();u.validate_feed(data,[2026,2027],'0.107')
        data['countries']['RU']['events'][0]['date']='2027-02-30'
        with self.assertRaises(ValueError):u.validate_feed(data,[2026,2027],'0.107')
    def test_duplicate_and_unreviewed(self):
        data=fixture();data['countries']['RU']['events']*=2
        with self.assertRaises(u.FeedError):u.validate_feed(data,[2026,2027],'0.107')
        data=fixture();data['countries']['RU']['events'][0]['needsReview']=False
        with self.assertRaises(u.FeedError):u.validate_feed(data,[2026,2027],'0.107')
    def test_atomic_repeat_and_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            root=pathlib.Path(directory);data=fixture();first=u.publish_candidate(root,data,'first',[])
            self.assertEqual(first,u.publish_candidate(root,data,'second',[]));self.assertEqual(len(list((root/'versions').iterdir())),1)
            before=(root/'candidate.json').read_bytes()
            with patch.object(u.os,'replace',side_effect=OSError('disk failure')):
                with self.assertRaises(OSError):u.atomic(root/'candidate.json',{'bad':1})
            self.assertEqual(before,(root/'candidate.json').read_bytes());self.assertEqual(list(root.glob('.pending-*')),[])
    def test_date_change_not_identity_guess(self):
        data=fixture();old=data['countries']['RU']['events'][0]['id'];key='RU|2027-01-02|public|Праздник';self.assertNotEqual(old,hashlib.sha256(key.encode()).hexdigest())
    def test_source_failure_preserves_pointer(self):
        with tempfile.TemporaryDirectory() as directory:
            root=pathlib.Path(directory);u.publish_candidate(root,fixture(),'first',[]);before=(root/'candidate.json').read_bytes()
            with patch.object(u,'download',side_effect=OSError('offline')):
                with self.assertRaises(OSError):u.run(root,[2026,2027])
            self.assertEqual(before,(root/'candidate.json').read_bytes())
    def test_corrupt_immutable_version(self):
        with tempfile.TemporaryDirectory() as directory:
            root=pathlib.Path(directory);data=fixture();digest=u.publish_candidate(root,data,'first',[]);before=(root/'candidate.json').read_bytes()
            (root/'versions'/(digest+'.json')).write_text('{}')
            with self.assertRaises(u.FeedError):u.publish_candidate(root,data,'second',[])
            self.assertEqual(before,(root/'candidate.json').read_bytes())
if __name__=='__main__':unittest.main()
