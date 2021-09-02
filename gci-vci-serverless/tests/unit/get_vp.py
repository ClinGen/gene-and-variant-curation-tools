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
#url = 'https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search?event=Add&hgnc=PTEN&ExclusiveStartKey=2bdc9ccd-364b-4810-833e-57f9872b62e6'
#url = 'https://0ksjsepofg.execute-api.us-west-2.amazonaws.com/vpt/vpt/search?event=Add&hgnc=PTEN&ExclusiveStartKey=first_set'
#url='https://9y811p72oa.execute-api.us-west-2.amazonaws.com/vp/vpt/search/getids?hgnc=PTEN'
#url='https://9y811p72oa.execute-api.us-west-2.amazonaws.com/vp/vpt/search/getids?hgnc=PAH'
#url='https://9y811p72oa.execute-api.us-west-2.amazonaws.com/vp/vpt/search/getids?hgnc=CDH1'
#url='https://9y811p72oa.execute-api.us-west-2.amazonaws.com/vp/vpt/search/getids?hgnc=GAA'
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
  url='https://cccdiej2x5.execute-api.us-west-2.amazonaws.com/vpt/vpt/search/getids?hgnc='+gene
  response = requests.get(url, auth=auth)
  if bool(response):
    ids_dict = json.loads(response.content, parse_float=Decimal)
    for id in ids_dict:
      print('Gene= %s PK= %s ' %(json.dumps(id['PK']['S']),json.dumps(id['hgnc']['S'])) )
  else:
    print("Failed to get response for gene %s %s" %(gene, response))