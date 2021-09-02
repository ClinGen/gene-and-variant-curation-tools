import datetime
import os
import simplejson as json
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient
from src.helpers import pathogenicity_helpers
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
      body = json.loads(event['body'], parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      pathogenicity = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(pathogenicity)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'], parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      pathogenicity = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], pathogenicity)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    elif event['pathParameters'] is None:
      response = get()
    else:
      response = { 'ststausCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /pathogenicity' }) }

  return response

def create(pathogenicity):
  """Creates an pathogenicity item to the database."""

  try:
    # Build pathogenicity object.
    pathogenicity = pathogenicity_helpers.build(pathogenicity)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    try:
      db.put(pathogenicity, embed=False)
    except (PopulatorException, NormalizerException) as e:
      return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(pathogenicity) }

  return response

def update(pk, attrs):
  """Updates an existing pathogenicity object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for pathogenicity update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    pathogenicity = db.update(pk, attrs, embed=False, item_type='pathogenicity')
  except (PopulatorException, NormalizerException) as e:
      return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(pathogenicity) }

  return response

def find(pk):
  """Queries the local database for pathogenicity item with the given PK.
  
  Queries the database for an item type pathogenicity with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for pathogenicity find'}) }

  try:
    pathogenicity = db.find(pk, embed=True)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if pathogenicity is not None:
      response = { 'statusCode': 200, 'body': json.dumps(pathogenicity) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def get():
  """Queries and returns all pathogenicity objects"""

  try:
    pathogenicity = db.query_by_item_type('pathogenicity', embed=True)
  except (PopulatorException, NormalizerException) as e:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(pathogenicity) }

  return response
