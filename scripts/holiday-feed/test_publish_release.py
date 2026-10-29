import unittest,copy
from publish_release import publish
class Tests(unittest.TestCase):
 def setUp(self):
  self.release=None;self.calls=[];self.p={'tag':'holiday-feed-1-1','sha':'a'*40,'files':[{'name':'holiday-source.json','path':'feed','digest':'sha256:1'},{'name':'holiday-source.sigstore.json','path':'bundle','digest':'sha256:2'}]}
 def api(self,method,path,body=None):
  self.calls.append(method)
  if method=='POST':self.release={'id':1,'tag_name':body['tag_name'],'draft':True,'assets':[]}
  if method=='PATCH':self.release['draft']=False
  return copy.deepcopy(self.release)
 def upload(self,tag,path):
  f=next(f for f in self.p['files'] if f['path']==path);self.release['assets'].append({'name':f['name'],'digest':f['digest']})
 def test_publish_pair_then_repeat_no_mutation(self):
  publish(self.p,self.api,self.upload);self.assertFalse(self.release['draft']);self.calls=[];publish(self.p,self.api,self.upload);self.assertEqual(self.calls,['GET','GET'])
 def test_partial_failure_remains_draft_and_resumes(self):
  def fail(tag,path):
   if path=='bundle':raise OSError('network')
   self.upload(tag,path)
  with self.assertRaises(OSError):publish(self.p,self.api,fail)
  self.assertTrue(self.release['draft']);publish(self.p,self.api,self.upload);self.assertFalse(self.release['draft'])
 def test_conflict_never_overwrites(self):
  publish(self.p,self.api,self.upload);self.release['assets'][0]['digest']='wrong';self.calls=[]
  with self.assertRaises(ValueError):publish(self.p,self.api,self.upload)
  self.assertEqual(self.calls,['GET'])
if __name__=='__main__':unittest.main()
