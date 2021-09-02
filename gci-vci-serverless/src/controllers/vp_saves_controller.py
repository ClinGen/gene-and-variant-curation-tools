import datetime
import simplejson as json
import os
import uuid
import traceback
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient
from src.helpers import vp_saves_helpers

db = DynamoClient(
    os.environ['DB_TABLE_NAME'],
    os.environ.get('IS_OFFLINE', 'false') == 'true'
)

dbVP = DynamoClient(
    os.environ['DB_VPFILTER_TABLE_NAME'],
    os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  path = event['path']

  response = {}
  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      save = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.' }) }
    else:
      response = create(save)
  elif httpMethod == 'GET':
    if event.get('pathParameters') and 'pk' in event['pathParameters']:
      response = find(event['pathParameters']['pk'], path.endswith('/complete'))
    elif event['pathParameters'] is None:
      response = get(event.get('queryStringParameters', {}))
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  elif httpMethod == 'PUT':
    if event.get('pathParameters'):
      try:
        body = json.loads(event['body'])
        iterator = iter(body)
        key = next(iterator)
        vp_save = body[key]
        print('VP SAVE IN HANDLE PUT', vp_save)
      except:
        response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.' }) }
      else:
        response = update(event['pathParameters']['pk'], vp_save)
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Invalid PUT request for /saves' }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /saves' }) }
  return response

def create(save):
  """Saves a VP_Save type to the database."""

  vp_saves = vp_saves_helpers.build(save)

  archive_key = None
  try:
    archive_key = vp_saves_helpers.archive(os.environ['VP_BUCKET'], vp_saves['PK'], vp_saves)
  except ValueError as ve:
    print('ERROR: Failed to archive vp save data because the bucket value was invalid.')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %ve }) }
  except Exception as e:
    print('ERROR: Unknown error occurred when archiving vp save data.')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  try:
    vp_saves.update({ 's3_archive_key': archive_key })
    if 'payload' in vp_saves:
      del vp_saves['payload']
    vp_saves = dbVP.put(vp_saves)
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  return { 'statusCode': 201, 'body': json.dumps(vp_saves) }

def get(query_params = {}):
  '''Queries the local database for a vp_save with the given query_param (affiliation or submitted_by)'''

  vp_save_keys = []

  try:
    vp_save_keys = dbVP.query_by_item_type('vp_save', query_params)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
    traceback.print_exc()
  else:
    response = { 'statusCode': 200, 'body': json.dumps(vp_save_keys) }
  return response

def find(pk, get_complete_save):
  '''Queries the local database for a vp_save with the given pk.'''

  # A basic check of pk to avoid unnecessary DB querying
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for /saves find' }) }

  try:
    vp_save = dbVP.find(pk)
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  if vp_save is None:
    return { 'statusCode': 404, 'body': json.dumps({}) }

  if not get_complete_save:
    return { 'statusCode': 200, 'body': json.dumps(vp_save) }

  if 's3_archive_key' not in vp_save:
    return { 'statusCode': 200, 'body': json.dumps(vp_save) }

  try:
    save_data = vp_saves_helpers.get_from_archive(vp_save['s3_archive_key'])
    if 'payload' in save_data:
      vp_save['payload'] = save_data['payload']
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  return { 'statusCode': 200, 'body': json.dumps(vp_save) }

def update(pk, vp_save):
  """Updates an existing vp_save with the given pk"""

  # A basic check of pk to avoid unnecessary DB querying
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for /saves update' }) }

  # Check that required data has been included
  if 's3_archive_key' not in vp_save:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Updating a vp_save requires a valid S3 archive location.'}) }

  # Update the last modified timestamp
  vp_save['last_modified'] = datetime.datetime.now().isoformat()
  try:
    vp_saves_helpers.archive(os.environ['VP_BUCKET'], vp_save['PK'], vp_save)
    if 'payload' in vp_save:
      del vp_save['payload']
    vp_save = dbVP.update(pk, vp_save, 'vp_save')

  except Exception as e:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }

  return { 'statusCode': 200, 'body': json.dumps(vp_save) }
