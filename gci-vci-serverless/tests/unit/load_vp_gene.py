import uuid
import os
import simplejson as json
import glob
import traceback
import requests
from requests_aws4auth import AWS4Auth
from decimal import Decimal

auth=AWS4Auth(os.getenv('AWS_ACCESS_KEY_ID'), \
    os.getenv('AWS_SECRET_ACCESS_KEY'),'us-west-2', \
      'execute-api')
with open('/Users/lmadhavr/devl/stats/PTEN_clean.json', 'r') as myfile:
    data=json.loads(myfile.read(),parse_float=Decimal)
count=0
for vpt in data:
    post_data={}
    if ('caId' in vpt):
        vpt['carId']=vpt['caId']
        vpt['hgnc']= 'PTEN'
        post_data['body']=vpt
        post_data = json.dumps(post_data)
        url = 'http://0.0.0.0:3000/vpt/'
        #print ('Count and Post data size %s %s' %(count,len(post_data)))
        #url = "https://7guo11x2kh.execute-api.us-west-2.amazonaws.com/vpt/vpt"
        #x = requests.post(url, auth=auth, data = post_data)
        x = requests.post(url, data = post_data)
        if count%3000==0:
            print ('Count and Post data size %s %s' %(count,len(post_data)))
            count= count + 1  
    else:
        print ('No caid in %s \n ' %vpt)
print ('Total number pushed = %s' %count )
 