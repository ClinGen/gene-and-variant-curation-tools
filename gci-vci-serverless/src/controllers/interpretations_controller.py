import datetime
import json
import os
import uuid
import pandas as pd
import numpy as np

from src.db.ddb_client import Client as DynamoClient
from src.helpers import interpretation_helpers
from src.utils.exceptions import PopulatorException, NormalizerException
from src.models.model_data_populator import populate_fields


# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  path = event['path']
  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      interpretation = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = create(interpretation)

  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      interpretation = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], interpretation)

  elif httpMethod == 'GET':
    try:
      filters={}
      #print ('In interpretation path parameters = %s' %event.get('pathParameters', {}))
      #pk= event.get('pathParameters', {})
      if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
        print ('In interpretation find by PK %s' %event['pathParameters']['pk'])
        filters['variant'] = event['pathParameters']['pk']
        response = find(filters)
      else:
        # note that `queryStringParameters` always exist in `event`, therefore
        # `event.get('queryStringParameters', {})` will still be None instead of {} if no querystring.
        # directly accessing key `queryStringParameters` to avoid this confusion
        response = get(event['queryStringParameters'])
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'Error during response %s ' %e}) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /interpretations' }) }

  return response

def create(interpretation):
  """Saves an Interpretation type to the database."""
  # Legacy support to migrate 'rid' to 'PK'
  # Assumes other transformations are handled by 
  # legacy migration scripts
  if 'rid' in interpretation:
    interpretation['PK'] = interpretation['rid']
    del interpretation['rid']
    # Replace extra_evidence with curated-evidence
    if 'extra_evidence_list' in interpretation: 
      interpretation['curated_evidence_list'] = interpretation['extra_evidence_list']
      del interpretation['extra_evidence_list']
    # Replace provisional_variant with provisional-variant
    if 'provisional_variant' in interpretation: 
      interpretation['provisional-variant'] = interpretation['provisional_variant']
      del interpretation['provisional_variant'] 
  else:
    interpretation['PK'] = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    interpretation['date_created'] = now
    interpretation['last_modified'] = now

  interpretation['item_type'] = 'interpretation'
  #print ("Saving interpretation %s " %(interpretation))  

  try:
    interpretation = db.put(interpretation, embed=True)
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 201, 'body': json.dumps(interpretation) }

  return response

def update(pk, attrs):
  """Updates an existing Interpretation object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object.
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for Interpretation update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  # Frontend may only send fields to be updated and not sending in entire interpretation object,
  # need to add item_type so that `normalize_fields` works
  if 'item_type' not in attrs:
    attrs['item_type'] = 'interpretation'

  try:
    interpretation = db.update(pk, attrs, embed=True, item_type='interpretation')
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(interpretation) }

  return response

def find(filters={}):
  """Queries dynamoDB for interpretation objects based on filters.
  Note that interpretation objects are embedded with related objects.
  This endpoint function is used by interpretation (variant central) page to query a list of interpretations that belong to a variant.
  
  Returns a response object that includes a list of interpretation objects.   
  """
  # Some basic check on PK to make sure we're not trying to find a totally
  # bogus object. 
  if filters is None or not bool(filters) :
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for interpretation obj find'}) }
  try:
    interpretations = db.query_by_item_type('interpretation', filters, embed=True)
  except (PopulatorException, NormalizerException) as error:
    return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if interpretations is not None:
      response = { 'statusCode': 200, 'body': json.dumps(interpretations) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }
  return response

def get(query_params= {}):
  print (f'Interpretations query_params {query_params} ' )
  # If 'PK' is in query_params, find interpretation by PK
  if (bool(query_params) and 'PK' in query_params):
    try:
      interpretation = db.find(query_params['PK'], embed=True)
    except Exception as e:
      print ('Exception during Get Interpretation by PK %s ' %e )
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 200, 'body': json.dumps(interpretation) }
  else:
    """Queries and returns all Interpretation objects for tables in home page in UI.
    """
    try:
      interpretations = interpretation_helpers.getDereferenced(db,query_params)
    except Exception as e:
      print ('Exception during Get Interpretations %s ' %e )
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      # interpretations = [populate_fields(db, interpretation) for interpretation in interpretations]
      print (f'Interpretations size {len(interpretations)} ' )
      response = { 'statusCode': 200, 'body': json.dumps(interpretations) }
  
  return response
