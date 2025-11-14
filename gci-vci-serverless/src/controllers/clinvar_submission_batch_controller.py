import datetime
import os
import simplejson as json

from src.controllers import messaging_controller
from src.helpers import clinvar_submission_batch_helpers
from src.helpers import interpretation_helpers
from src.helpers import snapshot_helpers

from src.db.ddb_client import Client as DynamoClient

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

# Actions supported by this controller (grouped by HTTP method)
allowed_get_actions = ('fetch', 'find', 'generate')
allowed_put_actions = ('add', 'remove', 'replace', 'update')

def handle(event):
  httpMethod = event['httpMethod']
  path = event['path']

  if httpMethod == 'GET':
    if event.get('pathParameters') and 'action' in event['pathParameters'] and 'id' in event['pathParameters'] and event['pathParameters']['action'] in allowed_get_actions:
      if event['pathParameters']['action'] == 'fetch':
        response = fetch(event['pathParameters']['id'])

      elif event['pathParameters']['action'] == 'find':
        response = find(event['pathParameters']['id'], event['pathParameters'].get('input'))

      elif event['pathParameters']['action'] == 'generate':
        response = generate(event['pathParameters']['id'])

      else:
        response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

  elif httpMethod == 'PUT':
    if event.get('pathParameters') and 'action' in event['pathParameters'] and 'id' in event['pathParameters'] and event['pathParameters']['action'] in allowed_put_actions:
      if event['pathParameters']['action'] == 'add':
        if 'input' in event['pathParameters'] and event.get('queryStringParameters') and 'snapshot' in event['queryStringParameters']:
          response = add(event['pathParameters']['id'], event['pathParameters']['input'], event['queryStringParameters']['snapshot'])
        else:
          response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

      elif event['pathParameters']['action'] == 'remove':
        if 'input' in event['pathParameters'] and event.get('queryStringParameters') and 'batch' in event['queryStringParameters']:
          response = remove(event['pathParameters']['id'], event['pathParameters']['input'], event['queryStringParameters']['batch'])
        else:
          response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

      elif event['pathParameters']['action'] == 'replace':
        if 'input' in event['pathParameters'] and event.get('queryStringParameters') and 'batch' in event['queryStringParameters'] and 'snapshot' in event['queryStringParameters']:
          response = replace(event['pathParameters']['id'], event['pathParameters']['input'], event['queryStringParameters']['batch'], event['queryStringParameters']['snapshot'])
        else:
          response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

      elif event['pathParameters']['action'] == 'update':
        try:
          body = json.loads(event['body'])
          iterator = iter(body)
          key = next(iterator)
          batch_info = body[key]

        except:
          response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }

        else:
          response = update(event['pathParameters']['id'], batch_info)

      else:
        response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

  elif httpMethod == 'POST':
    if event.get('pathParameters') and 'action' in event['pathParameters'] and event['pathParameters']['action'] == 'generate' and 'id' in event['pathParameters']:
      try:
        body = json.loads(event['body'])
        iterator = iter(body)
        key = next(iterator)
        list = body[key]
        response = generateByList(event['pathParameters']['id'], list)
      except:
        response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.' }) }

    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /clinvar-submission-batch' }) }

  return response

# Retrieve a batch with complete membership data
def fetch(batch_pk):
  # A basic check of provided data to avoid unnecessary DB querying
  if batch_pk is None or len(batch_pk) == 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Missing required data for /clinvar-submission-batch/fetch.' }) }

  # Retrieve requested batch
  try:
    batch = db.find(batch_pk)

    if batch is None:
      return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Requested batch could not be found.' }) }

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  # Add display data to batch membership list
  try:
    for batch_member in batch['batch_members']:
      try:
        archive_key = os.environ['SNAPSHOT_BUCKET'] + '/' + batch_member['interpretation'] + '/' + batch_member['snapshot'] + '.json'
        snapshot = snapshot_helpers.get_from_archive(archive_key)

        if 'variant' in snapshot:
          variant_title = snapshot['variant'].get('preferredTitle', '')
          variant_pk = snapshot['variant'].get('PK', '')
        else:
          variant_title = ''
          variant_pk = ''

        if 'disease' in snapshot:
          if isinstance(snapshot['disease'], dict):
            disease_pk = snapshot['disease'].get('PK', '')
          else:
            disease_pk = snapshot.get('disease', '')
        else:
          disease_pk = ''

        disease_term = snapshot.get('diseaseTerm', '')
        moi = snapshot.get('modeInheritance', '')

        if 'provisionalVariant' in snapshot:
          if 'alteredClassification' in snapshot['provisionalVariant']:
            classification = snapshot['provisionalVariant'].get('alteredClassification', '')
          else:
            classification = snapshot['provisionalVariant'].get('autoClassification', '')
        else:
          classification = ''

        met_criteria = []

        if 'evaluations' in snapshot:
          for evaluation in snapshot['evaluations']:
            if evaluation.get('criteriaStatus', '') == 'met':
              if 'criteria' in evaluation:
                if 'criteriaModifier' in evaluation:
                  met_criteria.append(evaluation['criteria'] + '_' + evaluation['criteriaModifier'])
                else:
                  met_criteria.append(evaluation['criteria'])

        batch_member.update({
          'classification': classification,
          'disease': disease_pk,
          'disease_term': disease_term,
          'met_criteria': ', '.join(met_criteria),
          'moi': moi,
          'variant': variant_pk,
          'variant_title': variant_title
        })

      except Exception:
        pass

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Attempt to retrieve batch membership data failed.' }) }

  else:
    return { 'statusCode': 200, 'body': json.dumps(batch) }

# Find all batches for a specified affiliation (possibly filtered by status)
def find(affiliation_id, status):
  allowed_status = ('open', 'closed')

  # A basic check of provided data to avoid unnecessary DB querying
  if affiliation_id is None or len(affiliation_id) == 0 or (status is not None and status not in allowed_status):
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Missing required data for /clinvar-submission-batch/find.' }) }

  # Retrieve requested batches
  try:
    query_filters = {'affiliation': affiliation_id}

    if status in allowed_status:
      query_filters['batch_status'] = status

    batches = db.query_by_item_type('clinvar-submission-batch', filters=query_filters)

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  # Convert batch_members to just a list of interpretation PKs for closed batches? (based on a query string param?)

  return { 'statusCode': 200, 'body': json.dumps(batches) }

# Generate ClinVar submission data from a batch
def generate(batch_pk):
  # A basic check of provided data to avoid unnecessary DB querying
  if batch_pk is None or len(batch_pk) == 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Missing required data for /clinvar-submission-batch/generate.' }) }

  # Retrieve requested batch
  try:
    batch = db.find(batch_pk)

    if batch is None:
      return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Requested batch could not be found.' }) }

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  # Generate ClinVar submission data (one batch member at a time)
  submission_data = {
    'status': {
      'totalRecords': 0,
      'successCount': 0,
      'errorCount': 0
    },
    'variants': []
  }

  try:
    for batch_member in batch['batch_members']:
      messaging_response = messaging_controller.generate_clinvar_data(batch_member['snapshot'])

      if messaging_response['statusCode'] != 200:
        raise Exception

      batch_member_data = json.loads(messaging_response['body'])

      submission_data['status']['totalRecords'] += batch_member_data['message']['status']['totalRecords']
      submission_data['status']['successCount'] += batch_member_data['message']['status']['successCount']
      submission_data['status']['errorCount'] += batch_member_data['message']['status']['errorCount']
      submission_data['variants'].append(batch_member_data['message']['variants'][0])

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Attempt to generate batch data failed.' }) }

  else:
    return { 'statusCode': 200, 'body': json.dumps(submission_data) }

# Generate ClinVar submission data from a list of snapshots
def generateByList(batch_pk, list):
  # Generate ClinVar submission data (one batch member at a time)
  submission_data = {
    'status': {
      'totalRecords': 0,
      'successCount': 0,
      'errorCount': 0
    },
    'variants': []
  }

  if len(list) > 0:
    try:
      for snapshot in list:

        messaging_response = messaging_controller.generate_clinvar_data(snapshot)

        if messaging_response['statusCode'] != 200:
          raise Exception

        batch_member_data = json.loads(messaging_response['body'])

        submission_data['status']['totalRecords'] += batch_member_data['message']['status']['totalRecords']
        submission_data['status']['successCount'] += batch_member_data['message']['status']['successCount']
        submission_data['status']['errorCount'] += batch_member_data['message']['status']['errorCount']
        submission_data['variants'].append(batch_member_data['message']['variants'][0])

    except Exception as e:
      return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Attempt to generate data for list of batch members failed.' }) }

    else:
      return { 'statusCode': 200, 'body': json.dumps(submission_data) }
  else:
    # Return empty list
    return { 'statusCode': 200, 'body': json.dumps(submission_data) }

# Add a member interpretation to an open batch
def add(affiliation_id, interpretation_pk, snapshot_pk):
  # A basic check of provided data to avoid unnecessary DB querying
  if affiliation_id is None or len(affiliation_id) == 0 or interpretation_pk is None or len(interpretation_pk) == 0 or snapshot_pk is None or len(snapshot_pk) == 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Missing required data for /clinvar-submission-batch/add.' }) }

  # Validate provided data
  try:
    interpretation = db.find(interpretation_pk)

    if interpretation is None or affiliation_id != interpretation['affiliation'] or affiliation_id != interpretation['provisionalVariant']['affiliation'] or snapshot_pk not in interpretation['snapshots']:
      raise Exception

    snapshot = db.find(snapshot_pk)

    if snapshot is None or affiliation_id != snapshot['resource']['affiliation'] or interpretation_pk != snapshot['interpretation'] or snapshot['resource']['classificationStatus'] != 'Approved':
      raise Exception

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Data provided to /clinvar-submission-batch/add was invalid/mismatched.' }) }

  # Confirm ClinVar submission data can be generated
  try:
    messaging_response = messaging_controller.generate_clinvar_data(snapshot_pk)

    if messaging_response['statusCode'] != 200:
      raise Exception

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Attempt to generate ClinVar submission data failed, selected interpretation can\'t be added to a batch.' }) }

  # Find current/open batch (if not found, create it)
  try:
    batch_find_response = find(affiliation_id, 'open')

    if batch_find_response['statusCode'] != 200:
      raise Exception

    open_batches = json.loads(batch_find_response['body'])

    if len(open_batches) > 1:
      raise Exception

    elif len(open_batches) == 1:
      batch_exists = True
      open_batch = open_batches[0]

    else:
      batch_exists = False
      open_batch = clinvar_submission_batch_helpers.start_new_batch(affiliation_id)

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Attempt to find or create an open batch failed.' }) }

  # Generate data that needs to be stored with member interpretation
  try:
    status_list = interpretation_helpers.summarize_status(db, interpretation)

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Attempt to generate batch membership data failed, selected interpretation was not added to a batch.' }) }

  # Add interpretation to current/open batch
  try:
    now = datetime.datetime.now().isoformat()

    open_batch['batch_members'].append({
      'add_date': now,
      'interpretation': interpretation_pk,
      'snapshot': snapshot_pk,
      'status': status_list
    })

    open_batch['last_modified'] = now

    if batch_exists:
      open_batch = db.update(open_batch['PK'], open_batch, item_type='clinvar-submission-batch')

    else:
      open_batch = db.put(open_batch)

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  else:
    return { 'statusCode': 200, 'body': json.dumps(open_batch) }

# Remove a member interpretation from an open batch
def remove(affiliation_id, interpretation_pk, batch_pk):
  # A basic check of provided data to avoid unnecessary DB querying
  if affiliation_id is None or len(affiliation_id) == 0 or interpretation_pk is None or len(interpretation_pk) == 0 or batch_pk is None or len(batch_pk) == 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Missing required data for /clinvar-submission-batch/remove.' }) }

  # Validate provided data
  try:
    interpretation = db.find(interpretation_pk)

    if interpretation is None or affiliation_id != interpretation['affiliation'] or affiliation_id != interpretation['provisionalVariant']['affiliation']:
      raise Exception

    batch = db.find(batch_pk)

    if batch is None or affiliation_id != batch['affiliation'] or batch['batch_status'] != 'open':
      raise Exception

    for batch_index, batch_member in enumerate(batch['batch_members']):
      if interpretation_pk == batch_member['interpretation']:
        break

    else:
      raise Exception

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Data provided to /clinvar-submission-batch/remove was invalid/mismatched.' }) }

  # Remove interpretation from current/open batch
  try:
    now = datetime.datetime.now().isoformat()

    del batch['batch_members'][batch_index]
    batch['last_modified'] = now

    batch = db.update(batch_pk, batch, item_type='clinvar-submission-batch')

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  else:
    return { 'statusCode': 200, 'body': json.dumps(batch) }

# Replace membership information of a batch member
def replace(affiliation_id, interpretation_pk, batch_pk, snapshot_pk):
  # A basic check of provided data to avoid unnecessary DB querying
  if affiliation_id is None or len(affiliation_id) == 0 or interpretation_pk is None or len(interpretation_pk) == 0 or batch_pk is None or len(batch_pk) == 0 or snapshot_pk is None or len(snapshot_pk) == 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Missing required data for /clinvar-submission-batch/replace.' }) }

  # Validate provided data
  try:
    interpretation = db.find(interpretation_pk)

    if interpretation is None or affiliation_id != interpretation['affiliation'] or affiliation_id != interpretation['provisionalVariant']['affiliation'] or snapshot_pk not in interpretation['snapshots']:
      raise Exception

    batch = db.find(batch_pk)

    if batch is None or affiliation_id != batch['affiliation'] or batch['batch_status'] != 'open':
      raise Exception

    for batch_index, batch_member in enumerate(batch['batch_members']):
      if interpretation_pk == batch_member['interpretation']:
        break

    else:
      raise Exception

    snapshot = db.find(snapshot_pk)

    if snapshot is None or affiliation_id != snapshot['resource']['affiliation'] or interpretation_pk != snapshot['interpretation'] or snapshot['resource']['classificationStatus'] != 'Approved':
      raise Exception

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Data provided to /clinvar-submission-batch/replace was invalid/mismatched.' }) }

  # Confirm ClinVar submission data can be generated
  try:
    messaging_response = messaging_controller.generate_clinvar_data(snapshot_pk)

    if messaging_response['statusCode'] != 200:
      raise Exception

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Attempt to generate ClinVar submission data failed, selected interpretation can\'t be added to a batch.' }) }

  # Generate data that needs to be stored with member interpretation
  try:
    status_list = interpretation_helpers.summarize_status(db, interpretation)

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Attempt to generate batch membership data failed, selected interpretation was not added to a batch.' }) }

  # Replace member interpretation snapshot in current/open batch
  try:
    now = datetime.datetime.now().isoformat()

    batch['batch_members'][batch_index]['add_date'] = now
    batch['batch_members'][batch_index]['snapshot'] = snapshot_pk
    batch['batch_members'][batch_index]['status'] = status_list
    batch['last_modified'] = now

    batch = db.update(batch_pk, batch, item_type='clinvar-submission-batch')

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  else:
    return { 'statusCode': 200, 'body': json.dumps(batch) }

# Update information describing a batch (name, status, etc.)
def update(batch_pk, batch_info):
  # A basic check of provided data to avoid unnecessary DB querying
  if batch_pk is None or len(batch_pk) == 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Missing required data for /clinvar-submission-batch/update.' }) }

  # Update requested batch
  try:
    now = datetime.datetime.now().isoformat()

    # Only update close_date attribute if batch is being closed
    if batch_info.get('batch_status', '') == 'closed':
      batch = db.find(batch_pk)

      if batch is None:
        return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Requested batch could not be found.' }) }

      elif batch['batch_status'] == 'open':
        batch_info['close_date'] = now

    batch_info['last_modified'] = now

    batch = db.update(batch_pk, batch_info, item_type='clinvar-submission-batch')

  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  else:
    return { 'statusCode': 200, 'body': json.dumps(batch) }
