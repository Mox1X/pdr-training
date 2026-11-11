"""Generate catalogue from reviewed rule inventory, labels and image manifest. Run from project root."""
import json,re
from difflib import SequenceMatcher
inventory=json.load(open('data/catalogue/inventory.json'));manifest=json.load(open('public/signs/sources.json'));old=json.load(open('data/catalogue/explanations.json'))
labels=json.load(open('data/catalogue/answer-labels.json'))
contexts=json.load(open('data/catalogue/review-context.json'))
categories=['warning','priority','prohibition','mandatory','information','service','plate'];result=[]
for num,record in sorted(inventory.items(),key=lambda pair:tuple(map(int,pair[0].split('.')))):
 images=['/signs/'+x['file'] for x in manifest if x['number']==num]
 name=record['name'];text=record['ruleText']
 exp=old[num] if num in old else text
 if len(exp)<45:exp+= ' Значення та умови застосування наведено у відповідному пункті ПДР за посиланням нижче.'
 result.append(dict(id=num,number=num,category=categories[int(num[0])-1],name=name,answerLabel=labels.get(num,name),image=images[0],images=images,explanation=exp,source=record['source']))
json.dump(result,open('src/data/catalogue.json','w'),ensure_ascii=False,indent=2)
