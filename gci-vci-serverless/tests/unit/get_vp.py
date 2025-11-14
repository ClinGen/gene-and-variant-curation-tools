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
'''
 python3 -u get_vp.py > vpIds.json
jq '.[].PK.S' vpIds.json > pkList_RUNX1.json
sed s/$/,/ pkList_RUNX1.json > x.json
'''
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
#url = ''
#url=''
#url=''
#url=''
#url=''
# genelist= [
#   'CDH1',
#   'CDH23',
#   'GAA',
#   'GJB2',
#   'HRAS',
#   'ITGA2B',
#   'ITGB3',
#   'MAP2K1',
#   'MAP2K2',
#   'MYH7',
#   'MYO7A',
#   'PAH',
#   'PTEN',
#   'PTPN11',
#   'RAF1',
#   'RUNX1',
#   'RYR1',
#   'SHOC2',
#   'SLC26A4',
#   'SOS1',
#   'TP53',
#   'USH2A'
# ]
genelist = ['USH2A']
for gene in genelist:
  url=''+gene
  response = requests.get(url, auth=auth)
  if bool(response):
    ids_dict = json.loads(response.content, parse_float=Decimal)
    for id in ids_dict:
      print('Gene= %s PK= %s ' %(json.dumps(id['PK']['S']),json.dumps(id['hgnc']['S'])) )
  else:
    print("Failed to get response for gene %s %s" %(gene, response))