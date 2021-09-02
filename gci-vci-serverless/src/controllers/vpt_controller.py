import datetime
import simplejson as json
import os
import uuid
import traceback
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient
from src.helpers import vp_helpers

# Create an instance of the database client for all db interactions.
db = DynamoClient(
    os.environ['DB_TABLE_NAME'],
    os.environ.get('IS_OFFLINE', 'false') == 'true'
)

dbVP = DynamoClient(
    os.environ['DB_VPT_TABLE_NAME'],
    os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def build_last_evaluated_record(query_params= {}):
  """Queries and returns all individual objects"""
  full_key={}
  full_key_dynamoDB={}
  if bool(query_params) and 'ExclusiveStartKey' in query_params:
    pk=query_params['ExclusiveStartKey']
    if pk == 'first_set':
      del query_params['ExclusiveStartKey']
    else:
      full_key=dbVP.find(query_params['ExclusiveStartKey'])
      for k,v in full_key.items():
        if k in ['last_modified', 'hgnc','PK']:
          full_key_dynamoDB[k] = {'S': v}
      query_params['ExclusiveStartKey']= full_key_dynamoDB
  return query_params

def getChunkPKList(filters= {}):
  lastEvaluatedList=[]
  variantJsonStr={}
  try:
    if (bool(filters) and 'hgnc' in filters):  
      hgnc=filters['hgnc']
      # remove hgnc since it is a primary key and 
      # should not be part of a filter expression
      del filters['hgnc']
      vp= dbVP.query_by_hgnc(hgnc,filters,projections='PK')
      #lastEvaluatedList.extend(vp)
      #print ('vp \n %s ' %lastEvaluatedList)
      while ('ExclusiveStartKey' in vp[0]):
        last_key=vp[0]['ExclusiveStartKey']
        lastEvaluatedList.append(last_key)
        print ('Found %s with %s  records' %(last_key, len(vp)))
        if filters is None:
          filters={}
        filters['ExclusiveStartKey']= last_key
        vp= dbVP.query_by_hgnc(hgnc,filters,projections='PK')
        #lastEvaluatedList.extend(vp)   
      #lastEvaluatedPKList= [x['PK'] for x in lastEvaluatedList ]   
      #len_set=len(set(lastEvaluatedList))
      #len_list=(len(lastEvaluatedList))
      #print ('len_set %s len_list %s ' %(len_set,len_list))
      #dup_result={'len_set' : len_set,'len_list' : len_list}
      variantJsonStr=json.dumps(lastEvaluatedList)
      #variantJsonStr=json.dumps(dup_result)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
    traceback.print_exc()
  else:
    response = { 'statusCode': 200, 'body': variantJsonStr }
    print ('Response data size %s \n ' %variantJsonStr)
  
  return response    

def get_by_car_id(query_params = {}):
  PK=""
  carId=""
  try:
      if (bool(query_params) and 'carId' in query_params): 
        carId=query_params['carId']
        vp=dbVP.query_by_car_id(carId)
        if (vp is not None and len(vp) > 0):   
          print ('Value of first record %s' %vp)
          PK=vp[0]['PK']
        else:
          print ('vp is none')
  except Exception as e:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
      traceback.print_exc()
  else:
      response = { 'statusCode': 200, 'body': json.dumps({'PK' : PK}) }
      print ('%s %s %s \n ' %(response,carId,PK))  
  return response     
 

def get(query_params= {}):
  """Queries and returns all individual objects"""
  variantJson={}
  full_key={}
  variantJsonStr={}
  try:
    if (bool(query_params) and 'carId' in query_params): 
      pk=get_by_car_id(query_params = {})
    elif (bool(query_params) and 'hgnc_gr' in query_params):

      hgnc_gr=query_params['hgnc_gr']
      del query_params['hgnc_gr']

      print ('QP after build last evaluated %s' %query_params)
      vp = dbVP.query_by_hgnc_group(hgnc_gr,query_params)
      #vp= dbVP.query_by_item_type('variant',query_params)
      if (vp is not None):   
        print ('Value of first record %s' %vp[0])
        print('LENGTH OF FULL VP GRP %s' %len(vp))
        print('last record of vp grp %s' %vp[len(vp) - 1])
      else:
        print ('vp is none')
      variantJson['data']=vp
      variantJsonStr=json.dumps(variantJson)
      print('variantJsonStr %s' %len(variantJsonStr))
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
    traceback.print_exc()
  else:
    response = { 'statusCode': 200, 'body': variantJsonStr }
  return response

def handle(event):
  #print ('Event = %s' %event)
  httpMethod = event['httpMethod']
  response={}
  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'],parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      vp = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(vp)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'],parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      vp = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], vp)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None:
      if 'pk' in event.get('pathParameters', {}):
        response = find(event['pathParameters']['pk'])
      elif 'getids' in event.get('pathParameters', {}):
        response = getChunkPKList(event['queryStringParameters'])
    elif event['pathParameters'] is None:
      query_params=event['queryStringParameters']
      if (bool(query_params) and 'carId' in query_params): 
        response = get_by_car_id(event['queryStringParameters'])
      else:
        response = get(event['queryStringParameters'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /individuals' }) }
  print('LENGTH OF RESPONSE IN HANDLE GET %s' %len(response))
  return response

def create(vp):
  """Saves a vp item to the database."""

  try:
    # Build individual object.
    vp = vp_helpers.build(vp)
  except ValueError as ve:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Missing label for Individual create' }) }
  except Exception as e:
    print ('Exception during build %s ' %e)
    response = { 'statusCode': 422, 'body': json.dumps({ ' 422 error': '%s' %e }) }
  else:
    try:
      dbVP.put(vp)
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(vp) }

  return response

def update(pk, attrs):
  """Updates an existing individual object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for individual update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    vp = dbVP.update(pk, attrs, embed=True, item_type='individual')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(vp) }

  return response

def find(pk):
  """Queries the local database for individual item with the given PK.
  
  Queries the database for an item type individual with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for individual find'}) }

  try:
    vp = dbVP.find(pk, embed=True)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if vp is not None:
      response = { 'statusCode': 200, 'body': json.dumps(vp) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response