import datetime
import requests
import simplejson as json
import os
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient

import src.clients.clinvar_client as clinvar_client
import src.helpers.computational_data_helpers as computational_data_helpers

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  if httpMethod == 'POST':
    try:
      #print ("Computational in handle POST \n %s" %event['body'])
      body = json.loads(event['body'], parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      computationalData = body[key]
      response = create(computationalData)
      #print ("Computational response object \n %s" %response)
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'The body of the request is not a valid JSON object.' }) }  
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event['pathParameters']:
      response = find(event['pathParameters']['pk'])
    elif event['queryStringParameters'] is not None and 'clinvarVariantId' in event['queryStringParameters']:
      response = find_esearch_data_by_clinvar_id(event['queryStringParameters']['clinvarVariantId'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': "The path parameter 'pk' is missing." }) }
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'], parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      computationalData = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], computationalData)
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /computational' }) }
  
  return response

def find(pk):
  """Queries the local database for a computational item with the given PK."""

  try:
    computationalData = db.find(pk)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if computationalData is not None:
      response = { 'statusCode': 200, 'body': json.dumps(computationalData) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def find_esearch_data_by_clinvar_id(variant_id):
  """Queries ClinVar for a Variant with the given ClinVar ID and then queries ClinVar Esearch

  Queries the ClinVar service for a Variant with the given ClinVar ID. If found,
  queries Esearch and returns response. Otherwise, returns a 404.
  """
  
  try:
    variant = clinvar_client.find(variant_id, extended=True)
    if variant is not None and len(variant) > 1:
      esearch_data = clinvar_client.find_esearch_data(variant)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if esearch_data is not None:
      response = { 'statusCode': 200, 'body': json.dumps(esearch_data) }
    else:
      response = { 'statusCode': 200, 'body': json.dumps({}) }

  return response


def create(computationalData):
  """ Saves a computational data type to the database. """

  # Legacy support to migrate 'rid' to 'PK'

  try:
    # Build computational object.
    computationalData.update(computational_data_helpers.build(computationalData))
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  try:
    db.put(computationalData)
    #print ("Sample data \n %s" %computationalData)
    computational_json=json.dumps(computationalData)
    response = { 'statusCode': 201, 'body': computational_json }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'ERROR: %s' %e }) }
  return response

def update(pk, attrs):
  """Updates an existing Computational item with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for Computational data update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    evidence = db.update(pk, attrs, item_type='computational')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(evidence) }

  return response
