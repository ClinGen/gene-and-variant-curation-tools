import datetime
import os
import simplejson as json
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient
from src.helpers import variant_score_helpers
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
      variantScore = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(variantScore)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'], parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      variantScore = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], variantScore)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'], event.get('queryStringParameters', {}))
    elif event['pathParameters'] is None:
      response = get(event.get('queryStringParameters', {}))
    else:
      response = { 'ststausCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /variantscore' }) }

  return response

def create(variantScore):
  """Creates a variantScore item to the database."""

  try:
    # Build variantScore object.
    variantScore = variant_score_helpers.build(variantScore)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    try:
      db.put(variantScore, embed=True)
    except (PopulatorException, NormalizerException) as error:
      return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(variantScore) }

  return response

def update(pk, attrs):
  """Updates an existing variantScore object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for variantscore update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    variantScore = db.update(pk, attrs, embed=True, item_type='variantScore')
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(variantScore) }

  return response

def find(pk, filters = {}):
  """Queries the local database for variantScore item with the given PK.
  
  Queries the database for an item type variantScore with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for variantscore find'}) }

  # Check if embed key is in filter and get its value
  embed = True
  if filters and 'embed' in filters:
    embed = filters.get('embed', True)

  try:
    variantScore = db.find(pk, embed=embed)
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if variantScore is not None:
      response = { 'statusCode': 200, 'body': json.dumps(variantScore) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def get(filters={}):
  """Queries and returns all variantScore objects"""

  # Check if embed key is in filter and get its value
  # Then delete it from filters
  embed = True
  if filters and 'embed' in filters:
    embed = filters.get('embed', True)
    del filters['embed']

  try:
    variantScores = db.query_by_item_type('variantScore', filters, embed=embed)
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(variantScores) }

  return response
