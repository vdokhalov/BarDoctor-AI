"""Publish only generated public feed files. Never invoked by app; opt-in CI job only.
Requires short-lived job GITHUB_TOKEN with contents:write. No persistent credentials.
"""
import hashlib,json,os,pathlib,re,subprocess,sys
REPO='vdokhalov/BarDoctor-AI'
def plan(folder,run,attempt,sha):
    if not re.fullmatch(r'[1-9]\d*',run) or not re.fullmatch(r'[1-9]\d*',attempt) or not re.fullmatch(r'[a-f0-9]{40}',sha): raise ValueError('Invalid run identity')
    files=[]
    for name in ('holiday-source.json','holiday-source.sigstore.json'):
        p=pathlib.Path(folder)/name
        if p.is_symlink() or not p.is_file() or p.stat().st_size>1_000_000: raise ValueError('Invalid artifact file')
        data=p.read_bytes();json.loads(data)
        files.append({'name':name,'path':str(p),'digest':'sha256:'+hashlib.sha256(data).hexdigest()})
    return {'tag':f'holiday-feed-{run}-{attempt}','sha':sha,'files':files}
def publish(p,api,upload):
    # api returns None ONLY for404; errors fail closed. No force/clobber/delete.
    release=api('GET',f'repos/{REPO}/releases/tags/{p["tag"]}')
    if release is None: release=api('POST',f'repos/{REPO}/releases',{'tag_name':p['tag'],'target_commitish':p['sha'],'name':p['tag'],'draft':True,'prerelease':False,'make_latest':'false'})
    if release.get('tag_name')!=p['tag']: raise ValueError('Unexpected release')
    expected={f['name']:f for f in p['files']};assets={a['name']:a for a in release.get('assets',[])}
    if set(assets)-set(expected): raise ValueError('Unexpected existing asset')
    for name,f in expected.items():
        if name in assets:
            if assets[name].get('digest')!=f['digest']:raise ValueError('Immutable asset conflict')
        else:
            if not release.get('draft'):raise ValueError('Published release incomplete')
            upload(p['tag'],f['path'])
    checked=api('GET',f'repos/{REPO}/releases/{release["id"]}')
    assets={a['name']:a for a in checked.get('assets',[])}
    if set(assets)!=set(expected) or any(assets[n].get('digest')!=f['digest'] for n,f in expected.items()):raise ValueError('Asset integrity not confirmed')
    if checked.get('draft'):api('PATCH',f'repos/{REPO}/releases/{release["id"]}',{'draft':False,'make_latest':'false'})
    return {'status':'published','tag':p['tag'],'id':release['id']}
def gh_api(method,path,body=None):
    args=['gh','api','-X',method,path]
    if body is not None:args+=['--input','-']
    r=subprocess.run(args,input=json.dumps(body) if body is not None else None,text=True,capture_output=True)
    if r.returncode:
        if method=='GET' and '(HTTP 404)' in r.stderr:return None
        raise RuntimeError('GitHub API failed; no automatic retry')
    return json.loads(r.stdout)
def upload(tag,path):
    r=subprocess.run(['gh','release','upload',tag,path,'--repo',REPO],capture_output=True)
    if r.returncode:raise RuntimeError('Upload failed; inspect existing release before retry')
if __name__=='__main__':
    if os.environ.get('GITHUB_REPOSITORY')!=REPO or os.environ.get('GITHUB_REF')!='refs/heads/main':raise SystemExit('Unexpected repository/ref')
    p=plan(sys.argv[1],os.environ['GITHUB_RUN_ID'],os.environ['GITHUB_RUN_ATTEMPT'],os.environ['GITHUB_SHA'])
    print(json.dumps(publish(p,gh_api,upload)))
