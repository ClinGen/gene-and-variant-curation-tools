import datetime
import json
import os

from src.db.ddb_client import Client as DynamoClient
from src.helpers import annotation_helpers
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
      annotation = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(annotation)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      annotation = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], annotation)
  elif httpMethod == 'GET':
    # print ('DEBUG: In annotation Get, query parameters = %s' %event.get('queryStringParameters', {}))

    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'], event.get('queryStringParameters', {}))
    elif event['pathParameters'] is None:
      response = get(event.get('queryStringParameters', {}))
    else:
      response = { 'ststausCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /annotations' }) }

  return response

def create(annotation):
  """Saves an annotation item to the database."""

  try:
    # Build annotation object.
    annotation = annotation_helpers.build(annotation)
  except ValueError as ve:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Missing article for Annotation create' }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }

  try:
    annotation = db.put(annotation, embed=True)
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  
  return { 'statusCode': 201, 'body': json.dumps(annotation) }

def update(pk, attrs):
  """Updates an existing annotation object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for annotation update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    annotation = db.update(pk, attrs, embed=True, item_type='annotation')
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }

  return { 'statusCode': 200, 'body': json.dumps(annotation) }

def find(pk, filters = {}):
  """Queries the local database for annotation item with the given PK.
  
  Queries the database for an item type annotation with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for annotation find'}) }

  # Check if embed key is in filter and get its value
  embed = True
  if filters and 'embed' in filters:
    embed = filters.get('embed', True)

  try:
    annotation = db.find(pk, embed=embed)
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if annotation is not None:
      return { 'statusCode': 200, 'body': json.dumps(annotation) }
    else:
      return { 'statusCode': 404, 'body': json.dumps({}) }

def get(filters = {}):
  """Queries and returns all annotation objects"""

  try:
    annotations = db.query_by_item_type('annotation', filters, embed=True)
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  annotations.sort(key=lambda annotation: annotation['date_created'])
  return { 'statusCode': 200, 'body': json.dumps(annotations) }
