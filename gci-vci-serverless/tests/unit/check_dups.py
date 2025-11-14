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

#url = ''
#url = ''
#url = ''
#url = ''
#url=''
#url = ''
#url=''
#url=''
#url=''
#url=''

#url = ''

exList=['2bdc9ccd-364b-4810-833e-57f9872b62e6','c37d9a5a-eddf-4e12-9a6f-3c2c127fabe7']

urlbase = ''
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

