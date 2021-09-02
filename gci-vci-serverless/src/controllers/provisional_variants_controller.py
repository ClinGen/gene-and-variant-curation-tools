import datetime
import json
import os
import uuid

from src.db.ddb_client import Client as DynamoClient

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  if httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    elif event['pathParameters'] is None:
      response = get()
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  elif httpMethod == 'POST':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      provisional_variant = body[key]
      #print ("Creating provisional variant %s \n " %provisional_variant )
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.' }) }
    else:
      response = create(provisional_variant)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      provisional_variant = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.' }) }
    else:
      if 'pathParameters' in event and 'pk' in event['pathParameters']:
        response = update(event['pathParameters']['pk'], provisional_variant)
      else:
        response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Invalid PUT request for /provisional-variants' }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /provisional-variants' }) }

  return response

def find(pk):
  """Queries the local database for a provisional_variant with the given pk."""

  # A basic check of pk to avoid unnecessary DB querying
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for /provisional-variants find' }) }

  try:
    provisional_variant = db.find(pk)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if provisional_variant is not None:
      response = { 'statusCode': 200, 'body': json.dumps(provisional_variant) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def get():
  """Queries and returns all provisional_variants"""

  try:
    provisional_variant = db.query_by_item_type('provisional_variant')
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(provisional_variant) }

  return response

def create(provisional_variant):
  """Saves a provisional_variant to the database."""

  # Legacy support to migrate 'rid' to 'PK'
  if 'rid' in provisional_variant:
    provisional_variant['PK'] = provisional_variant['rid']
    del provisional_variant['rid']
  else:
    provisional_variant['PK'] = str(uuid.uuid4())

    # Set item type and timestamps
    now = datetime.datetime.now().isoformat()
    provisional_variant['date_created'] = now
    provisional_variant['last_modified'] = now

  provisional_variant['item_type'] = 'provisional_variant'

  try:
    db.put(provisional_variant)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 201, 'body': json.dumps(provisional_variant) }

  return response

def update(pk, provisional_variant):
  """Updates an existing provisional_variant with the given pk"""

  # A basic check of pk to avoid unnecessary DB querying
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for /provisional-variants update' }) }

  # Update the last modified timestamp
  provisional_variant['last_modified'] = datetime.datetime.now().isoformat()

  try:
    provisional_variant = db.update(pk, provisional_variant, item_type='provisional_variant')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(provisional_variant) }

  return response
