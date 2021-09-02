import datetime
import simplejson as json
import os
import uuid
import traceback
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient
from src.helpers import vp_exports_helpers

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

  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      export = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.' }) }
    else:
      response = create(export)
  elif httpMethod == 'GET':
    if event.get('pathParameters') and 'pk' in event['pathParameters']:
      response = find(event['pathParameters']['pk'], path.endswith('/complete'))
    elif event['pathParameters'] is None:
      response = get(event.get('queryStringParameters', {}))
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  return response

  response = {}
  return response


def find(pk):
  '''Queries the local database for a vp_export with the given pk.'''

  # A basic check of pk to avoid unnecessary DB querying
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for /exports find' }) }

  try:
    vp_export = dbVP.find(pk)
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  if vp_export is None:
    return { 'statusCode': 404, 'body': json.dumps({}) }

  return { 'statusCode': 200, 'body': json.dumps(vp_export) }

def get(filters= {}):
  '''Queries the local database for a vp_export with the given filters (affiliation or submitted_by)'''

  vp_export_keys = []

  try:
    vp_export_keys = dbVP.query_by_item_type('vp_export', filters)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
    traceback.print_exc()
  else:
    response = { 'statusCode': 200, 'body': json.dumps(vp_export_keys) }
  return response

def create(export):
  """Saves a vp_export item to the database."""

  try:
    # Build vp_export object.
    vp_export = vp_exports_helpers.build(export)
  except ValueError as ve:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Missing title for create' }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    try:
      vp_export = db.put(vp_export)
      vp_export = dbVP.put(vp_export)
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(vp_export) }

  return response