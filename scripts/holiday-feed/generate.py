"""Executed with -I and an isolated, hash-checked dependency directory. No app imports."""
import sys,json,hashlib,datetime
sys.path.insert(0,sys.argv[1])
import holidays
countries=('RU','BY','KZ','AM','AZ','KG','TJ','TM','UZ','MD')
years=[int(y) for y in sys.argv[2].split(',')]
result={'schemaVersion':1,'provider':'python-holidays','version':holidays.__version__,'license':'MIT','years':years,'countries':{}}
for code in countries:
    base=holidays.country_holidays(code,years=[],expand=False)
    languages=set(getattr(base,'supported_languages',()))
    language=next((lang for lang in sorted(languages) if lang=='ru' or lang.startswith('ru_')),None)
    language=language or ('en_US' if 'en_US' in languages else None)
    categories=sorted(set(getattr(base,'supported_categories',())) & {'public','workday'})
    rows=[]
    for category in categories:
        calendar=holidays.country_holidays(code,years=years,expand=False,observed=False,language=language or getattr(base,'default_language',None),categories=[category])
        for day in sorted(calendar):
            for name in calendar.get_list(day):
                # Snapshot identity only: never infer that a changed date is the same user event.
                key='|'.join((code,day.isoformat(),category,name))
                rows.append({'id':hashlib.sha256(key.encode()).hexdigest(),'date':day.isoformat(),'sourceName':name,'language':language or getattr(base,'default_language',None),'category':category,'needsReview':True})
    result['countries'][code]={'russianAvailable':bool(language and (language=='ru' or language.startswith('ru_'))),'categories':categories,'events':sorted(rows,key=lambda r:(r['date'],r['category'],r['sourceName']))}
print(json.dumps(result,ensure_ascii=False,sort_keys=True,separators=(',',':')))
