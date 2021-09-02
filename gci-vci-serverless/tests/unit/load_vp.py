import uuid
import simplejson as json
import glob
import traceback
import requests
from requests_aws4auth import AWS4Auth
from decimal import Decimal

#auth=AWS4Auth(os.getenv('AWS_ACCESS_KEY_ID'), \
#    os.getenv('AWS_SECRET_ACCESS_KEY'),'us-west-2', \
#       'execute-api')
def execute_batch():
    vpt_samples = glob.glob('../data/vpt/PTEN*', recursive=True)
    count = 0
    for sample in vpt_samples:
        count=count+1
        post_data={}
        with open(sample, 'r') as vptFile:
            data=json.loads(vptFile.read(),parse_float=Decimal )
        post_data['body']=data
        post_data = json.dumps(post_data)
        #print ('Post data %s' %post_data)
        url = 'http://0.0.0.0:3000/vpt/'
        x = requests.post(url, data = post_data)
        #print(x.text)
def main():
    for i in range (1):
        if (i%100==0):
            print ('executing batch %s'%i) 
        execute_batch()
if __name__=='__main__':
    main()
    
 