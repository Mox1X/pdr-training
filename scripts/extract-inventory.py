"""Extract the independent numbered definitions from official HTML. Run from root with the print HTML path."""
import re,html,json,sys,hashlib
s=open(sys.argv[1]).read();s=s[s.index('33. ДОРОЖНІ ЗНАКИ'):s.index('34. ДОРОЖНЯ РОЗМІТКА')];out={}
for m in re.finditer(r'<p[^>]*><a name="(n\d+)"></a>(.*?)</p>',s,re.S):
 t=html.unescape(re.sub('<[^>]*>','',m[2]));t=' '.join(t.split())
 if not re.match(r'^[1-7]\.\d',t) or '“' not in t:continue
 # Names shared across ranges, or separate names within the same paragraph.
 cursor=0
 for q in re.finditer(r'“([^”]+)”',t):
  prefix=t[cursor:q.start()];cursor=q.end();nums=[]
  if not re.fullmatch(r'[\d.\s,і\-–]+',prefix):break
  for tok in re.finditer(r'([1-7]\.\d+(?:\.\d+)?)(?:\s*[-–]\s*([1-7]\.\d+(?:\.\d+)?))?',prefix):
   first,last=tok.groups()
   if last and first.rsplit('.',1)[0]==last.rsplit('.',1)[0]:nums.extend(first.rsplit('.',1)[0]+'.'+str(i) for i in range(int(first.split('.')[-1]),int(last.split('.')[-1])+1))
   else:nums.append(first)
  if not nums:break
  for num in nums:
   if num not in out:out[num]={'number':num,'name':q[1].strip(),'source':'https://zakon.rada.gov.ua/laws/show/1306-2001-%D0%BF#'+m[1],'ruleText':t}
# Limit to numbers actually defined by paragraph heading (subsequent quoted text is explanatory).
imgs=json.load(open('data/catalogue/image-map.json'));actual=set(imgs.values());print('rule only',set(out)-actual,'annex only',actual-set(out))
assert set(out)==actual, 'Rule/annex discrepancy requires review'
json.dump(out,open('data/catalogue/inventory.json','w'),ensure_ascii=False,indent=2)
