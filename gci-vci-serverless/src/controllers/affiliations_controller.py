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
  if httpMethod == 'PUT':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      affiliation = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], affiliation)
  elif httpMethod == 'GET':
    if event['path'] == '/affiliations':
      response = get(event.get('multiValueQueryStringParameters', {}))
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /affiliations' }) }
  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      affiliation = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(affiliation)


  return response

def update(pk, attrs):
  """Updates an existing affiliation object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object.
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for user update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    affiliation = db.update(pk, attrs, item_type='affiliation')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(affiliation) }

  return response

def get(multiValueFilters = {}):
  """Queries and returns all affiliation objects"""

  try:
    affiliation = db.query_by_item_type('affiliation', multiValueFilters)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(affiliation) }

  return response

def create(affiliation):
  """Saves an Affiliation type to the database."""

  # Legacy support to migrate 'rid' to 'PK'
  if 'rid' in affiliation:
    affiliation['PK'] = affiliation['rid']
    del affiliation['rid']
  else:
    affiliation['PK'] = affiliation['affiliation_id']
    now = datetime.datetime.now().isoformat()
    affiliation['date_created'] = now
    affiliation['last_modified'] = now

  affiliation['item_type'] = 'affiliation'
  print ("Saving affiliation %s " %(affiliation))
  try:
    db.put(affiliation)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 201, 'body': json.dumps(affiliation) }

  return response
