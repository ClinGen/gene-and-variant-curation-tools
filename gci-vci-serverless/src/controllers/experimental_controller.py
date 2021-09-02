import datetime
import json
import os

from src.db.ddb_client import Client as DynamoClient
from src.helpers import experimental_helpers
from src.utils.exceptions import PopulatorException, NormalizerException


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
      experimental = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(experimental)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      experimental = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], experimental)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    elif event['pathParameters'] is None:
      response = get(event['queryStringParameters'])
    else:
      response = { 'ststausCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /experimental' }) }

  return response

def create(experimental):
  """Creates an experimental item to the database."""

  try:
    # Build experimental object.
    experimental = experimental_helpers.build(experimental)
  except ValueError as ve:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Missing label or evidenceType for Experimental create' }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    try:
      experimental = db.put(experimental, embed=True)
    except (PopulatorException, NormalizerException) as e:
      return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(experimental) }

  return response

def update(pk, attrs):
  """Updates an existing experimental object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for experimental update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    experimental = db.update(pk, attrs, embed=True, item_type='experimental')
  except (PopulatorException, NormalizerException) as e:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(experimental) }

  return response

def find(pk):
  """Queries the local database for experimental item with the given PK.
  
  Queries the database for an item type experimental with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for experimental find'}) }

  try:
    experimental = db.find(pk, embed=True)
  except (PopulatorException, NormalizerException) as e:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if experimental is not None:
      response = { 'statusCode': 200, 'body': json.dumps(experimental) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def get(filters={}):
  """Queries and returns all experimental objects"""

  try:
    experimental = db.query_by_item_type('experimental', filters, embed=True)
  except (PopulatorException, NormalizerException) as e:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(experimental) }

  return response
