import datetime
import json
import os
import uuid

from src.db.ddb_client import Client as DynamoClient

# cspec_data_raw = open('tests/data/cspec_data.json')
# cspec_data = json.load(cspec_data_raw)

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  if httpMethod == 'GET':
    # Response below should be replaced with get()

    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    elif event['queryStringParameters'] is not None and 'affiliation' in event['queryStringParameters']:
      affiliation = event['queryStringParameters']['affiliation']
      if affiliation == 'none':
        response = db.query_by_item_type('cspec')
      else:
        response = db.query_by_affiliation(affiliation, {
          'item_type': 'cspec'
        })
      response = { 'statusCode': 200, 'body': json.dumps(response) }
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': "The path parameter 'pk' is missing." }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /cspec' }) }
  
  return response

def find(pk):
  if pk is None or len(pk) <= 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': "Must supply a valid CSpec ID."}) }

  cspec_doc = None
  try:
    cspec_doc = db.find(pk)
  except Exception as e:
    response = { 'statusCode': 404, 'body': json.dumps({ 'error': 'ERROR in Cspec find: %s' %e }) }

  if cspec_doc:
    response = { 'statusCode': 200, 'body': json.dumps(cspec_doc) }
  
  return response