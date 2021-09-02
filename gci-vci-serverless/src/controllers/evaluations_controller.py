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
  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      evaluation = body[key]
      #print ("Evaluation before create %s " %evaluation)
    except: 
      print ("Exceptionion encourted ")
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'The body of the request is not a valid JSON object.' }) }
    else:
      response = create(evaluation)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      evaluation = body[key]
    except:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /variants' }) }
    else:
      response = update(event['pathParameters']['pk'], evaluation)
  elif httpMethod == 'GET':
    if 'pk' in event['pathParameters']:
      response = find(event['pathParameters']['pk'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /evaluations' }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /evaluations' }) }

  return response

def create(evaluation):
  """ Saves an Evaluation type to the database. """

  # Legacy support to migrate 'rid' to 'PK'
  if 'rid' in evaluation:
    evaluation['PK'] = evaluation['rid']
    del evaluation['rid']
  else:
    evaluation['PK'] = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    evaluation['date_created'] = now
    evaluation['last_modified'] = now

  evaluation['item_type'] = 'evaluation'
  try:
    db.put(evaluation)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({'error': 'ERROR: %s' %e }) }
  else:
    response = { 'statusCode': 201, 'body': json.dumps(evaluation) }

  return response

def find(pk):
  """Queries the local database for an evaluation type with the given PK."""
  
  try:
    evaluation = db.find(pk)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if evaluation is not None:
      response = { 'statusCode': 200, 'body': json.dumps(evaluation) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def update(pk, attrs):
  """Updates an existing Evaluation object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for Evaluation update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    evaluation = db.update(pk, attrs, item_type='evaluation')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(evaluation) }

  return response