"""Select only the hash-checked generator candidate for signing; no network."""
import hashlib,json,pathlib,re,sys
from update import validate_feed
root=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);p=json.loads((root/'candidate.json').read_text());sha=p['sha256']
if not re.fullmatch('[a-f0-9]{64}',sha) or p['path']!='versions/'+sha+'.json':raise ValueError('Invalid candidate path')
raw=(root/p['path']).read_bytes()
if hashlib.sha256(raw).hexdigest()!=sha:raise ValueError('Candidate digest mismatch')
f=json.loads(raw);validate_feed(f,f['years'],p['version']);out.mkdir(parents=True,exist_ok=True);(out/'holiday-source.json').write_bytes(raw)
