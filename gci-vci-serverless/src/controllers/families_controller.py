import datetime
import os
import simplejson as json
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient
from src.helpers import family_helpers
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
      body = json.loads(event['body'],parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      family = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(family)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'], parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      family = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], family)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'], event.get('queryStringParameters', {}))
    elif event['pathParameters'] is None:
      response = get()
    else:
      response = { 'ststausCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /families' }) }

  return response

def create(family):
  """Saves a family item to the database."""

  try:
    # Build family object.
    family = family_helpers.build(family)
  except ValueError as ve:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Missing label for family create' }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    try:
      family = db.put(family, embed=True)
    except (PopulatorException, NormalizerException) as e:
      return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(family) }

  return response

def update(pk, attrs):
  """Updates an existing family object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for family update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    family = db.update(pk, attrs, embed=True, item_type='family')
  except (PopulatorException, NormalizerException) as e:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(family) }

  return response

def find(pk, filters = {}):
  """Queries the local database for family item with the given PK.
  
  Queries the database for an item type family with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for family find'}) }

  # Check if embed key is in filter and get its value
  embed = True
  if filters and 'embed' in filters:
    embed = filters.get('embed', True)

  try:
    family = db.find(pk, embed=embed)
  except (PopulatorException, NormalizerException) as e:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if family is not None:
      response = { 'statusCode': 200, 'body': json.dumps(family) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def get():
  """Queries and returns all family objects"""

  try:
    families = db.query_by_item_type('family', embed=True)
  except (PopulatorException, NormalizerException) as e:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(families) }

  return response
