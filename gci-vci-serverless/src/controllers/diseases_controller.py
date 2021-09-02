import datetime
import json
import os
import uuid

from src.db.ddb_client import Client as DynamoClient

import src.clients.ontology_lookup_service as ols
import src.helpers.disease_helpers as disease_helpers

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      disease = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'The body of the request is not a valid JSON object.' }) }
    else:
      response = create(disease)
  elif httpMethod == 'GET':
    if 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': "The path parameter 'pk' is missing." }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /diseases' }) }
  
  return response

def create(disease):
  """ Saves a Disease type to the database. """
  if 'diseaseId' in disease:
    disease['PK'] = disease['diseaseId']
    del disease['diseaseId']
  elif 'rid' in disease:
    disease['PK'] = disease['rid']
    del disease['rid']
  else:
    disease['PK'] = 'FREETEXT_' + str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    disease['date_created'] = now
    disease['last_modified'] = now

  disease['item_type'] = 'disease'

  try:
    db.put(disease)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'ERROR: %s' %e }) }
  else:
    response = { 'statusCode': 201, 'body': json.dumps(disease) }

  return response

def find(pk):
  if pk is None or len(pk) <= 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': "Must supply a valid MONDO Id."}) }

  disease = None
  try:
    disease = db.find(pk)
  except Exception as e:
    pass
  if disease is not None:
      print("INFO: Found cached disease with MONDO id " + pk)
      response = { 'statusCode': 200, 'body': json.dumps(disease) }
  else:
    try:
      print('INFO: Fetching disease with id ' + pk + ' from OLS')
      disease = ols.find_mondo_disease(pk)
    except Exception as e:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed fetching disease from OLS\n%s' %e }) }
    else:
      if disease is not None:
        # Found the disease! Save it and then return the result.
        disease.update(disease_helpers.build(disease))
        
        try:
          db.put(disease)
        except Exception as e:
          response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Failed to save disease fetched from OLS\n%s' %e}) }
        else:
          response = { 'statusCode': 200, 'body': json.dumps(disease) }
      else:
        response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response
