import datetime
import json
import os

from src.db.ddb_client import Client as DynamoClient
from src.helpers import curated_evidence_helpers
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
      curatedEvidence = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(curatedEvidence)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      curatedEvidence = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], curatedEvidence)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    elif event['pathParameters'] is None:
      response = get(event.get('queryStringParameters', {}))
    else:
      response = { 'ststausCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod + ' for /curated-evidences' }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /curated-evidences' }) }

  return response
  
def create(curatedEvidence):
  """Saves a CuratedEvidence item to the database."""
  
  try:
    # Build curated evidence object.  
    curatedEvidence = curated_evidence_helpers.build(curatedEvidence)
  except ValueError as ve:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Missing variant for CuratedEvidence create %s' %ve }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    try:
      # Save curated evidence to the database.
      curatedEvidence = db.put(curatedEvidence, embed=True)
    except (PopulatorException, NormalizerException) as error:
      return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(curatedEvidence) }

  return response

def update(pk, attrs):
  """Updates an existing CuratedEvidence item with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for CuratedEvidence update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    curatedEvidence = db.update(pk, attrs, embed=True, item_type='curated-evidence')
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(curatedEvidence) }

  return response

def get(filters = {}):
    #Queries and returns CuratedEvidence objects
  try:
    curatedEvidences = db.query_by_item_type('curated-evidence', filters, embed=True)
    curatedEvidences_tojson=json.dumps(curatedEvidences)
    print ('Response size curated evidence  %s %s' %(filters,len(curatedEvidences_tojson)))
    response = { 'statusCode': 200, 'body': curatedEvidences_tojson }
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  return response

def find(pk):
  """Queries the local database for a CuratedEvidence item with the given PK.
  
  Queries the database for an item type curated-evidence with the given PK
  and returns it. If no item is found it returns None.    
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for CuratedEvidence find'}) }
 
  try:
    curatedEvidence = db.find(pk, embed=True)
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if curatedEvidence is not None:
      response = { 'statusCode': 200, 'body': json.dumps(curatedEvidence) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response
