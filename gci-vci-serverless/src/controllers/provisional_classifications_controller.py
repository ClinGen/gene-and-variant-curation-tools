import datetime
import os
import uuid
import simplejson as json
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient
from src.helpers import provisional_classification_helpers

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'],parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      provisionalClassification = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(provisionalClassification)
  elif httpMethod == 'PUT':
    if event.get('pathParameters') and 'pk' in event['pathParameters']:
      try:
        body = json.loads(event['body'],parse_float=Decimal)
        iterator = iter(body)
        key = next(iterator)
        provisionalClassification = body[key]
      except:
        response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
      else:
        response = update(event['pathParameters']['pk'], provisionalClassification)
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Invalid ' + httpMethod + ' request for /provisionalclassifications' }) }
  elif httpMethod == 'GET':
    if event.get('pathParameters'):
      if 'pk' in event['pathParameters']:
        response = find(event['pathParameters']['pk'])
      else:
        response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod + ' request for /provisionalclassifications' }) }
    else:
      response = get()
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /provisionalclassifications' }) }

  return response

def create(provisionalClassification):
  """Creates a provisionalClassification type to the database."""

  try:
    provisionalClassification = provisional_classification_helpers.build(provisionalClassification)
  except ValueError as ve:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Missing classificationPoints or autoClassification for provisionalClassification create' }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    try:
      db.put(provisionalClassification)
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(provisionalClassification) }

  return response

def update(pk, attrs):
  """Updates an existing provisionalClassification object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for provisional update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    provisionalClassification = db.update(pk, attrs, item_type='provisionalClassification')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(provisionalClassification) }

  return response

def find(pk):
  """Queries the local database for provisionalClassification item with the given PK.
  
  Queries the database for an item type provisionalClassification with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for provisionalClassification find'}) }

  try:
    provisionalClassification = db.find(pk)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if provisionalClassification is not None:
      response = { 'statusCode': 200, 'body': json.dumps(provisionalClassification) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def get():
  """Queries and returns all provisionalClassification objects"""

  try:
    provisionalClassifications = db.query_by_item_type('provisionalClassification')
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(provisionalClassifications) }

  return response
