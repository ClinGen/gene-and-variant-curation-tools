import datetime
import os
import simplejson as json
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient
from src.helpers import assessment_helpers
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
      assessment = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(assessment)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'], parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      assessment = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], assessment)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    elif event['pathParameters'] is None:
      response = get()
    else:
      response = { 'ststausCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /assessment' }) }

  return response

def create(assessment):
  """Creates an assessment item to the database."""

  try:
    # Build assessment object.
    assessment = assessment_helpers.build(assessment)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    try:
      db.put(assessment, embed=True)
    except (PopulatorException, NormalizerException) as e:
      return { 'statusCode': 500, 'body': json.dumps({ 'error': '%s' %e }) }
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(assessment) }

  return response

def update(pk, attrs):
  """Updates an existing assessment object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for assessment update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    assessment = db.update(pk, attrs, embed=True, item_type='assessment')
  except (PopulatorException, NormalizerException) as e:
      return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(assessment) }

  return response

def find(pk):
  """Queries the local database for assessment item with the given PK.
  
  Queries the database for an item type assessment with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for assessment find'}) }

  try:
    assessment = db.find(pk, embed=True)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if assessment is not None:
      response = { 'statusCode': 200, 'body': json.dumps(assessment) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def get():
  """Queries and returns all assessment objects"""

  try:
    assessment = db.query_by_item_type('assessment', embed=True)
  except (PopulatorException, NormalizerException) as e:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(e) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(assessment) }

  return response
