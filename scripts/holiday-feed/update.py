"""Periodic runner: one invocation per scheduler tick. Writes candidates, never app data.
Network only PyPI metadata and Python-hosted wheels; no AI, credentials, Git writes or deployment.
"""
import argparse,datetime,fcntl,hashlib,json,os,pathlib,re,subprocess,sys,tempfile,urllib.request,urllib.parse
COUNTRIES={'RU','BY','KZ','AM','AZ','KG','TJ','TM','UZ','MD'}
class FeedError(Exception): pass
class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        validate_url(newurl)
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def validate_url(url):
    p=urllib.parse.urlparse(url)
    if p.scheme!='https' or p.hostname not in {'pypi.org','files.pythonhosted.org'} or p.username or p.password or p.port not in (None,443): raise FeedError('Unexpected package host')
def download(url,limit):
    validate_url(url)
    with urllib.request.build_opener(SafeRedirect).open(url,timeout=30) as r:
        body=r.read(limit+1)
        if len(body)>limit: raise FeedError('Source exceeds size limit')
        return body

def select_wheel(metadata):
    version=metadata['info']['version']
    if not re.fullmatch(r'\d+\.\d+(?:\.\d+)?',version): raise FeedError('Prerelease/invalid version rejected')
    candidates=[r for r in metadata['urls'] if r.get('packagetype')=='bdist_wheel' and r['filename'].endswith('-py3-none-any.whl') and not r.get('yanked')]
    if len(candidates)!=1: raise FeedError('No unambiguous pure Python wheel')
    row=candidates[0];validate_url(row['url'])
    if pathlib.Path(row['filename']).name!=row['filename'] or not re.fullmatch(r'[a-f0-9]{64}',row['digests']['sha256']): raise FeedError('Invalid wheel identity')
    return row

def validate_feed(data,years,version):
    if data.get('schemaVersion')!=1 or data.get('version')!=version or data.get('license')!='MIT' or data.get('years')!=years or set(data.get('countries',{}))!=COUNTRIES: raise FeedError('Invalid generated envelope')
    for code,country in data['countries'].items():
        rows=country['events']
        if not rows or len(rows)>3000: raise FeedError('Missing/oversized country')
        seen=set()
        for row in rows:
            date=datetime.date.fromisoformat(row['date'])
            if date.year not in years or row['category'] not in {'public','workday'} or not isinstance(row['sourceName'],str) or not 1<=len(row['sourceName'])<=500 or row.get('needsReview') is not True: raise FeedError('Invalid candidate')
            expected=hashlib.sha256('|'.join((code,row['date'],row['category'],row['sourceName'])).encode()).hexdigest()
            if row['id']!=expected or expected in seen: raise FeedError('Invalid/duplicate snapshot identity')
            seen.add(expected)
    return data

def atomic(path,data):
    path=pathlib.Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    fd,name=tempfile.mkstemp(prefix='.pending-',dir=path.parent)
    try:
        with os.fdopen(fd,'w') as f: json.dump(data,f,ensure_ascii=False,sort_keys=True,separators=(',',':'));f.flush();os.fsync(f.fileno())
        os.replace(name,path)
    finally:
        if os.path.exists(name):os.unlink(name)

def publish_candidate(root,data,now,provenance,generator_hash=None):
    encoded=json.dumps(data,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode();digest=hashlib.sha256(encoded).hexdigest()
    target=root/'versions'/(digest+'.json')
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()!=digest:raise FeedError('Immutable candidate corrupted')
    if not target.exists(): atomic(target,data)
    # Pointer changes last; previous validated candidates remain recoverable.
    atomic(root/'candidate.json',{'schemaVersion':1,'sha256':digest,'path':'versions/'+digest+'.json','version':data['version'],'checkedAt':now,'provenance':provenance,'applicationReady':False,'generatorHash':generator_hash})
    return digest

def run(root,years):
    root=pathlib.Path(root);root.mkdir(parents=True,exist_ok=True)
    with (root/'.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: return {'status':'busy'}
        metadata=json.loads(download('https://pypi.org/pypi/holidays/json',5_000_000))
        if metadata['info'].get('license_expression')!='MIT':raise FeedError('License changed: review required')
        deps=metadata['info'].get('requires_dist',[])
        if deps!=['python-dateutil<3,>=2.9.0.post0']:raise FeedError('Dependency contract changed: review required')
        wheel=select_wheel(metadata);version=metadata['info']['version']
        generator_hash=hashlib.sha256(pathlib.Path(__file__).read_bytes()+pathlib.Path(__file__).with_name('generate.py').read_bytes()).hexdigest()
        pointer=root/'candidate.json'
        if pointer.exists():
            previous=json.loads(pointer.read_text()); digest=previous.get('sha256','')
            if re.fullmatch(r'[a-f0-9]{64}',digest) and previous.get('generatorHash')==generator_hash and previous.get('version')==version and previous.get('provenance',[{}])[0].get('sha256')==wheel['digests']['sha256']:
                content=(root/'versions'/(digest+'.json')).read_bytes()
                if hashlib.sha256(content).hexdigest()!=digest:raise FeedError('Stored candidate hash mismatch')
                saved=json.loads(content)
                if saved.get('years')==years:
                    validate_feed(saved,years,version)
                    previous['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();atomic(pointer,previous)
                    return {'status':'unchanged','version':version,'sha256':digest,'applicationReady':False}
        provenance=[]
        with tempfile.TemporaryDirectory(prefix='holiday-generator-') as temp:
            temp=pathlib.Path(temp);wheels=temp/'wheels';wheels.mkdir();target=temp/'packages'
            # Dependencies are pinned independently of a new holidays release.
            packages=[metadata]
            for name,v in [('python-dateutil','2.9.0.post0'),('six','1.17.0')]:
                packages.append(json.loads(download(f'https://pypi.org/pypi/{name}/{v}/json',5_000_000)))
            paths=[]
            for package in packages:
                # Dependency wheel tags allow py2.py3; dependency versions are fixed above.
                if package is metadata: row=wheel
                else:
                    choices=[r for r in package['urls'] if r.get('packagetype')=='bdist_wheel' and r['filename'].endswith('none-any.whl') and not r.get('yanked')]
                    if len(choices)!=1:raise FeedError('Ambiguous dependency wheel')
                    row=choices[0]
                body=download(row['url'],20_000_000)
                if hashlib.sha256(body).hexdigest()!=row['digests']['sha256']:raise FeedError('Wheel hash mismatch')
                path=wheels/pathlib.Path(row['filename']).name;path.write_bytes(body);paths.append(str(path));provenance.append({'file':path.name,'sha256':row['digests']['sha256']})
            env={'PATH':os.defpath,'LANG':'C.UTF-8','PIP_NO_CACHE_DIR':'1','PIP_CONFIG_FILE':os.devnull,'PYTHONNOUSERSITE':'1'}
            subprocess.run([sys.executable,'-I','-m','pip','install','--no-index','--no-deps','--disable-pip-version-check','--target',str(target),*paths],check=True,timeout=120,env=env,cwd=temp,stdout=subprocess.DEVNULL)
            output=subprocess.run([sys.executable,'-I',str(pathlib.Path(__file__).resolve().with_name('generate.py')),str(target),','.join(map(str,years))],check=True,timeout=60,env=env,cwd=temp,capture_output=True).stdout
            if len(output)>5_000_000:raise FeedError('Generated output too large')
            data=validate_feed(json.loads(output),years,version)
        now=datetime.datetime.now(datetime.timezone.utc).isoformat()
        digest=publish_candidate(root,data,now,provenance,generator_hash)
        return {'status':'generated','version':version,'sha256':digest,'countries':{c:len(v['events']) for c,v in data['countries'].items()},'applicationReady':False}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--year',type=int,default=datetime.date.today().year);args=p.parse_args()
    if not 2026<=args.year<=2100:p.error('Year outside supported generator bounds')
    try:print(json.dumps(run(args.output,[args.year,args.year+1]),ensure_ascii=False))
    except Exception as e:print(json.dumps({'status':'failed','error':type(e).__name__,'message':str(e)[:250]}));sys.exit(1)
