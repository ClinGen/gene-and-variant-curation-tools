
import copy
import datetime
import os
import simplejson as json

from src.db.ddb_client import Client as DynamoClient

from src.helpers import interpretation_helpers
from src.helpers import snapshot_helpers
from decimal import Decimal

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

allowed_types = ('gdm', 'interpretation')

def handle(event):
  httpMethod = event['httpMethod']
  path = event['path']

  if httpMethod == 'GET':
    if event.get('pathParameters') and 'pk' in event['pathParameters']:
      response = find(event['pathParameters']['pk'], path.endswith('/complete'))
    elif event.get('queryStringParameters') and 'target' in event['queryStringParameters']:
      # Call from API to query snapshot data
      response = get(event['queryStringParameters'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

  elif httpMethod == 'POST':
    if event.get('queryStringParameters') and 'type' in event['queryStringParameters'] and event['queryStringParameters']['type'] in allowed_types and 'action' in event['queryStringParameters']:
      try:
        body = json.loads(event['body'], parse_float=Decimal)
        iterator = iter(body)
        key = next(iterator)
        snapshot = body[key]
      except:
        response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.' }) }
      else:
        response = create(snapshot, event['queryStringParameters']['type'], event['queryStringParameters']['action'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

  elif httpMethod == 'PUT':
    if event.get('pathParameters') and 'pk' in event['pathParameters'] and event.get('queryStringParameters') and 'type' in event['queryStringParameters'] and event['queryStringParameters']['type'] in allowed_types:
      try:
        body = json.loads(event['body'], parse_float=Decimal)
        iterator = iter(body)
        key = next(iterator)
        snapshot = body[key]
      except:
        response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.' }) }
      else:
        response = update(event['pathParameters']['pk'], event['queryStringParameters']['type'], snapshot)
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Invalid PUT request for /snapshots' }) }

  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /snapshots' }) }

  return response

# Add to support API to query snapshot data
def get(query_params= {}):
  try:
    snapshots = snapshot_helpers.get_snapshots(db,query_params)
  except Exception as e:
    print ('ERROR: Exception during Get snapshots %s ' %e )
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  # If only count is requested, just return the count
  if 'count' in query_params:
    num = str(len(snapshots))
    return { 'statusCode': 200, 'body': json.dumps({ 'Number of curation found': '%s' %num }) }

  # Loop through all snapshots to gather data and return
  if snapshots is not None:
    status = query_params['status']
    aff = query_params['affiliation']
    gdms = []
    for snapshot in snapshots:
      if 'resource' in snapshot and 'resourceParent' in snapshot and 's3_archive_key' in snapshot['resourceParent']:
        # print("found resourceParent S3 key")
        try:
          curation = snapshot_helpers.get_from_archive(snapshot['resourceParent']['s3_archive_key'])
          gdm = snapshot_helpers.gather_gdm_proband_individuals(snapshot, curation, aff, status)

          if gdm is not None:
            gdms.append(gdm)
        except Exception as e:
          return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  try:
    if status == 'published':
      gdms.sort(key = lambda gdm: gdm['Published Date'])
    else:
      gdms.sort(key = lambda gdm: gdm['Approval Date'])
  except Exception:
    pass

  # print(json.dumps(gdms))
  response = { 'statusCode': 200, 'body': json.dumps(gdms) }

  return response

def find(pk, get_complete_snapshot):
  '''Queries the local database for a snapshot with the given pk.'''

  # A basic check of pk to avoid unnecessary DB querying
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for /snapshots find' }) }

  try:
    snapshot = db.find(pk)
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  if snapshot is None:
    return { 'statusCode': 404, 'body': json.dumps({}) }

  if not get_complete_snapshot:
    return { 'statusCode': 200, 'body': json.dumps(snapshot) }

  if 'resourceParent' not in snapshot or 's3_archive_key' not in snapshot['resourceParent']:
    return { 'statusCode': 200, 'body': json.dumps(snapshot) }

  try:
    curation_data = snapshot_helpers.get_from_archive(snapshot['resourceParent']['s3_archive_key'])
    snapshot['resourceParent'].update({ curation_data['item_type']: curation_data })
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  return { 'statusCode': 200, 'body': json.dumps(snapshot) }

def create(snapshot, type, action):
  '''Saves a snapshot to the database.'''
  # Check that required data has been included
  if 'resourceParent' not in snapshot or type not in snapshot['resourceParent']:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Creating a snapshot must include a curation data object (' + type + ').' }) }

  # If curation data "object" is a string, assume it's a PK (for object retrieval)
  if isinstance(snapshot['resourceParent'][type], str):
    try:
      snapshot['resourceParent'][type] = db.find(snapshot['resourceParent'][type])
    except Exception as e:
      return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  if not snapshot['resourceParent'][type]:
    return { 'statusCode': 404, 'body': json.dumps({ 'error': 'Curation data object (' + type + ') for snapshot could not be found.' }) }

  # Make a copy of the curation data object (before "completing" the snapshot)
  curation_data = copy.deepcopy(snapshot['resourceParent'][type])

  # Check for migrated objects
  isMigrated=False
  if 'rid' in snapshot:
    isMigrated = True

  # Build snapshot, including complete curation data object
  snapshot = snapshot_helpers.build(snapshot)

  try:
    if type == 'interpretation' and not isMigrated:
      snapshot['resourceParent'][type] = interpretation_helpers.build_complete(db, snapshot['resourceParent'][type])
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  # Archive snapshot curation data
  archive_key = None
  try:
    archive_key = snapshot_helpers.archive(os.environ['SNAPSHOT_BUCKET'], snapshot['PK'], snapshot['resourceParent'][type])
  except ValueError as ve:
    print('ERROR: Failed to archive snapshot curation data because the bucket value was invalid.')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %ve }) }
  except Exception as e:
    print('ERROR: Unknown error occurred when archiving snapshot curation data.')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  # Save snapshot, minus curation data, to DB
  try:
    snapshot['resourceParent'].update({ 's3_archive_key': archive_key })
    snapshot['resourceParent'].pop(type)
    snapshot = db.put(snapshot)
  except Exception as e:
    # If DB update fails, delete orphaned curation data file from archive?
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  # Update the curation data object (to incorporate the new snapshot)
  # Commented out because UI is updating the curation data object
  # try:
  #   if type == 'interpretation':
  #     curation_data = interpretation_helpers.add_snapshot(db, curation_data, snapshot['PK'], action, snapshot['date_created'])
  # except Exception as e:
  #   return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  # Return snapshot, including curation data
  snapshot['resourceParent'].update({ type: curation_data })

  return { 'statusCode': 201, 'body': json.dumps(snapshot) }

def update(pk, type, snapshot):
  """Updates an existing snapshot with the given pk"""

  curation_data = None

  # A basic check of pk to avoid unnecessary DB querying
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for /snapshots update' }) }

  # Check that required data has been included
  if 'resourceParent' not in snapshot or 's3_archive_key' not in snapshot['resourceParent']:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Updating a snapshot requires an S3 archive location.' }) }

  # Make a copy of the curation data object (if provided)
  if type in snapshot['resourceParent']:
    curation_data = copy.deepcopy(snapshot['resourceParent'][type])
    snapshot['resourceParent'].pop(type)

  # Update the last modified timestamp
  snapshot['last_modified'] = datetime.datetime.now().isoformat()

  # Update snapshot, minus curation data, in DB
  try:
    snapshot = db.update(pk, snapshot, item_type='snapshot')

    if curation_data:
      snapshot['resourceParent'].update({ type: curation_data })
  except Exception as e:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }

  return { 'statusCode': 200, 'body': json.dumps(snapshot) }
