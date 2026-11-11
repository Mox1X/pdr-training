"""Read-only provenance/invalidation check. Never grants content review approval."""
import hashlib,json,re,html,sys
from pathlib import Path
from functools import lru_cache
ROOT=Path(__file__).resolve().parent.parent
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def paragraphs():
 text=(ROOT/'data/catalogue/source/rules-2026-10-14.html').read_text()
 return {m[1]:' '.join(html.unescape(re.sub('<[^>]+>','',m[2])).split()) for m in re.finditer(r'<p[^>]*><a name="(n\d+)"></a>(.*?)</p>',text,re.S)}
@lru_cache(None)
def load(name):return json.loads((ROOT/name).read_text())
def payload(sign):
 inventory=load('data/catalogue/inventory.json');supporting=load('data/catalogue/supporting.json');context=load('data/catalogue/review-context.json')
 return {'sign':sign,'official':inventory[sign['id']],'supporting':supporting[sign['id']],'groupContext':context.get(sign['id'][0],[])}

def check():
 inventory=json.loads((ROOT/'data/catalogue/inventory.json').read_text());catalogue=json.loads((ROOT/'src/data/catalogue.json').read_text());audit=json.loads((ROOT/'data/catalogue/content-review.json').read_text());source=json.loads((ROOT/'data/catalogue/source.json').read_text());ps=paragraphs();errors=[]
 if audit['sourceSha256']!=source['rulesSha256']:errors.append('Review source revision stale')
 if hashlib.sha256((ROOT/'data/catalogue/source/rules-2026-10-14.html').read_bytes()).hexdigest()!=source['rulesSha256']:errors.append('Snapshot hash changed')
 if set(inventory)!=set(audit['entries']) or set(inventory)!={s['id'] for s in catalogue}:errors.append('Incomplete inventory/review')
 for sign in catalogue:
  num=sign['id'];record=inventory[num];anchor=record['source'].split('#')[-1]
  header=record['ruleText'].split('“')[0]; covered=[]
  for match in re.finditer(r'([1-7]\.\d+(?:\.\d+)?)(?:\s*[-–]\s*([1-7]\.\d+(?:\.\d+)?))?',header):
   first,last=match.groups()
   if last and first.rsplit('.',1)[0]==last.rsplit('.',1)[0]:covered.extend(first.rsplit('.',1)[0]+'.'+str(i) for i in range(int(first.split('.')[-1]),int(last.split('.')[-1])+1))
   else:covered.append(first)
  # 5.96.2 shares a paragraph with its own later quoted name.
  if num not in covered and not re.search(r'(?<![\d.])'+re.escape(num)+r'(?![\d.])\s*[“]',record['ruleText']):errors.append(num+': number not defined by official heading')
  if ps.get(anchor)!=record['ruleText']:errors.append(num+': official paragraph mismatch')
  if record['source']!=sign['source'] or record['name']!=sign['name']:errors.append(num+': number/name/source mismatch')
  entry=audit['entries'].get(num,{})
  if entry.get('contentHash')!=digest(payload(sign)):errors.append(num+': content review stale')
  if entry.get('status')!='reviewed' or not entry.get('notes'):errors.append(num+': content not reviewed')
  for item in payload(sign)['supporting']:
   if ps.get(item['anchor'])!=item['text']:errors.append(num+': supporting paragraph mismatch')
 print(json.dumps({'positions':len(catalogue),'revision':source['revision'],'errors':errors},ensure_ascii=False,indent=2))
 return not errors
if __name__=='__main__':sys.exit(0 if check() else 1)
