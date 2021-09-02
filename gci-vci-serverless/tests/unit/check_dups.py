import uuid
import simplejson as json
import os
import glob
import traceback
import requests
from requests_aws4auth import AWS4Auth
from decimal import Decimal

auth=AWS4Auth(os.getenv('AWS_ACCESS_KEY_ID'), \
    os.getenv('AWS_SECRET_ACCESS_KEY'),'us-west-2', \
      'execute-api')

#url = 'https://l8tinaadxa.execute-api.us-west-2.amazonaws.com/vpt/vpt/search/getids'
#url = 'https://l8tinaadxa.execute-api.us-west-2.amazonaws.com/vpt/vpt/search?hgnc=PAH&ExclusiveStartKey=fc0b4c3c-344e-46a8-9652-bf8b599e5573'
#url = 'https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search?hgnc=PAH&ExclusiveStartKey=c12f984c-e7a8-41e2-aa21-5b99cd1423e6'
#url = 'https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search?hgnc=PAH'
#url='https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search/getids?hgnc=PAH'
#url = 'https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search?hgnc=PAH&ExclusiveStartKey=33d96779-2e31-4ed0-80ce-ffd0ad4e74d6'
#url='https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search/getids?hgnc=PTEN'
#url='https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search/getids?hgnc=CDH1'
#url='https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search/getids?hgnc=RUNX1'
#url='https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search/getids?hgnc=GAA'

#url = 'https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search?event=Add&hgnc=PTEN&ExclusiveStartKey=first_set'

exList=['2bdc9ccd-364b-4810-833e-57f9872b62e6','c37d9a5a-eddf-4e12-9a6f-3c2c127fabe7']

urlbase = 'https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search?hgnc=PTEN&ExclusiveStartKey='
pkList=[]
for pk in exList:
    url = urlbase + pk
    x = requests.get(url, auth=auth)
    print(url)
    vpRecs=json.loads(x.text, parse_float=Decimal)
    for vp in vpRecs['data']:
        pkList.append(vp['PK'])
len_set=len(set(pkList))
len_list=len(pkList)
print ('Set numer = %s List = %s' %(len_set,len_list))

