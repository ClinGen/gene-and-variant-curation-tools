import datetime
import os
import simplejson as json
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient
from src.helpers import evidence_score_helpers

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'], parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      evidenceScore = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(evidenceScore)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'], parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      evidenceScore = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], evidenceScore)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    elif event['pathParameters'] is None:
      response = get(event.get('queryStringParameters', {}))
    else:
      response = { 'ststausCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /evidencescore' }) }

  return response

def create(evidenceScore):
  """Creates an evidenceScore item to the database."""

  try:
    # Build evidenceScore object.
    evidenceScore = evidence_score_helpers.build(evidenceScore)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    try:
      db.put(evidenceScore)
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(evidenceScore) }

  return response

def update(pk, attrs):
  """Updates an existing evidenceScore object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for evidencescore update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    evidenceScore = db.update(pk, attrs, item_type='evidenceScore')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(evidenceScore) }

  return response

def find(pk):
  """Queries the local database for evidenceScore item with the given PK.
  
  Queries the database for an item type evidenceScore with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for evidencescore find'}) }

  try:
    evidenceScore = db.find(pk)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if evidenceScore is not None:
      response = { 'statusCode': 200, 'body': json.dumps(evidenceScore) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def get(filters={}):
  """Queries and returns all evidenceScore objects"""

  # Check if embed key is in filter and get its value
  # Then delete it from filters
  embed = True
  if filters and 'embed' in filters:
    embed = filters.get('embed', True)
    del filters['embed']

  try:
    evidenceScore = db.query_by_item_type('evidenceScore', filters, embed=embed)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(evidenceScore) }

  return response
