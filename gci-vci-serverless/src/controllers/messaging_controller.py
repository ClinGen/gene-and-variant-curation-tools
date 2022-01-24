
import simplejson as json
import os
from copy import deepcopy

from src.db.ddb_client import Client as DynamoClient

from src.helpers import snapshot_helpers
from src.helpers import messaging_helpers
from decimal import Decimal

is_offline = os.environ.get('IS_OFFLINE', 'false') == 'true'
is_prod = os.environ.get('APP_STAGE', 'dev') == 'prod'

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  is_offline
)

allowed_post_actions = ('publish-gdm', 'track-data')

def handle(event):
  httpMethod = event['httpMethod']
  path = event['path']

  if httpMethod == 'GET':
    if event.get('pathParameters') and 'action' in event['pathParameters'] and 'pk' in event['pathParameters']:
      if event['pathParameters']['action'] == 'publish':
        response = publish(event['pathParameters']['pk'])
      elif event['pathParameters']['action'] == 'generate-clinvar-data':
        response = generate_clinvar_data(event['pathParameters']['pk'])
      else:
        response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
    else:
      print('\n**** Messaging Error: Unrecognized path for GET method ****\n')
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

  elif httpMethod == 'POST':
    if event.get('pathParameters') and 'action' in event['pathParameters'] and event['pathParameters']['action'] in allowed_post_actions:
      try:
        body = json.loads(event['body'], parse_float=Decimal)
        iterator = iter(body)
        key = next(iterator)
        messaging_data = body[key]
      except:
        print('\n**** Messaging Error: POST method ' + event['pathParameters']['action'] + ' - The body of the request is not a valid JSON object ****\n')
        response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.' }) }
      else:
        response = produce_data(messaging_data, event['pathParameters']['action'])
    else:
      print('\n**** Messaging Error: Unrecognized path for POST method ****\n')
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

  else:
    print('\n**** Messaging Error: Unrecognized request - ' + httpMethod + ' for /messaging ****\n')
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /messaging' }) }

  return response

def get_data(pk):
  # A basic check of pk to avoid unnecessary DB querying
  if pk is None or len(pk) == 0:
    print('\n**** Messaging Error: get_data - Invalid primary key ****\n')
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for /messaging' }) }

  # Retrieve data from DB (and possibly archive)
  try:
    messaging_data = db.find(pk)
  except Exception as e:
    print('\n**** Messaging Error: get_data - Fetching data from database - PK = ' + pk + ' ****\n')
    print('\n**** Messaging Error: get_data - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  if messaging_data is None:
    print('\n**** Messaging Error: get_data - Data fetched from database is not found - PK = ' + pk + ' ****\n')
    return { 'statusCode': 404, 'body': json.dumps({ 'error': 'Data for messaging not found' }) }

  if isinstance(messaging_data, dict) and messaging_data.get('resourceParent') and 's3_archive_key' in messaging_data['resourceParent']:
    try:
      curation_data = snapshot_helpers.get_from_archive(messaging_data['resourceParent']['s3_archive_key'])
      messaging_data['resourceParent'].update({ curation_data['item_type']: curation_data })
    except Exception as e:
      print('\n**** Messaging Error: get_data - Data to be published not found - PK = ' + pk + ' ****\n')
      print('\n**** Messaging Error: get_data - Return Error: ' + str(e) + ' ****\n')
      return { 'statusCode': 404, 'body': json.dumps({ 'error': 'Data to be published not found (in archive)' }) }

  return { 'statusCode': 'Success', 'body': messaging_data }

def publish(pk):
  '''Publish curation data from a snapshot identified by the given pk.'''

  # Retrieve data for publishing
  try:
    get_results = get_data(pk)

    if get_results['statusCode'] == 'Success':
      messaging_data = get_results['body']
    else:
      return get_results

  except Exception as e:
    print('\n**** Messaging Error: publish - Failed to retrieve data for publishing - PK = ' + pk + ' ****\n')
    print('\n**** Messaging Error: publish - Return Error: ' + str(e) + ' ****\n')

    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed to retrieve data for publishing' }) }

  # Check that data has expected elements
  try:
    data_type_to_publish = messaging_data['resourceType']

    if data_type_to_publish == 'interpretation':
      evidence_to_publish = messaging_data['resourceParent']['interpretation']

    elif data_type_to_publish == 'classification':
      evidence_to_publish = messaging_data['resourceParent']['gdm']
      publishing_affiliation = messaging_data['resource']['affiliation']
      evidence_counts_to_publish = messaging_data['resource']['classificationPoints']

    else:
      raise Exception

  except Exception as e:
    print('\n**** Messaging Error: publish - Data to be published missing expected elements \n Data - %s \n ****\n' % messaging_data)
    print('\n**** Messaging Error: publish - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Data to be published missing expected elements' }) }

  # Check that message should be sent? (approved status? permission to publish?)

  # Construct message
  try:
    if data_type_to_publish == 'interpretation':
      message_template = deepcopy(messaging_helpers.publish_interpretation_message_template)
      data_to_remove = messaging_helpers.publish_interpretation_data_to_remove
      messaging_helpers.add_data_to_message_template(messaging_data, None, None, message_template)

    else:
      # Determine which message template to use.  Support v7 and v8
      if 'variantIsDeNovo' in messaging_data['resource']['classificationPoints']['autosomalDominantOrXlinkedDisorder']:
        message_template = deepcopy(messaging_helpers.publish_classification_message_template_v7)
        templateVersion = 7
      else:
        message_template = deepcopy(messaging_helpers.publish_classification_message_template)
        templateVersion = 8

      classification_points = deepcopy(evidence_counts_to_publish)
      messaging_helpers.add_data_to_message_template(messaging_data, messaging_helpers.gather_evidence(evidence_to_publish, publishing_affiliation, templateVersion),
        messaging_helpers.gather_evidence_counts(classification_points, True, templateVersion), message_template)
      message = json.dumps(message_template, separators=(',', ':'))

  except Exception as e:
    print('\n**** Messaging Error: publish - Failed to build complete message \n Data - %s \n ****\n' % messaging_data)
    print('\n**** Messaging Error: publish - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed to build complete publish message' }) }

  # Transform message (if necessary, via independent service)
  try:
    if data_type_to_publish == 'interpretation':
      messaging_helpers.remove_data_from_message_template(data_to_remove, message_template['interpretation'])
      message_template['interpretation'] = messaging_helpers.transform_interpretation(message_template['interpretation'], is_offline)
      message = json.dumps(message_template, separators=(',', ':'))

  except Exception as e:
    print('\n**** Messaging Error: publish - Failed to transform publish message \n Data - %s \n ****\n' % messaging_data)
    print('\n**** Messaging Error: publish - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed to transform publish message' }) }

  # Configure publish message delivery parameters
  if is_offline:
    kafka_topic = 'test'

  else:
    if data_type_to_publish == 'interpretation':
      kafka_topic = 'variant_interpretation'
    else:
      kafka_topic = 'gene_validity'

    if not is_prod:
      kafka_topic += '_dev'

  # Send message
  try:
    message_results = messaging_helpers.send_message(message, kafka_topic, is_offline)

    if message_results['status'] == 'Success':
      print('\n**** Messaging Success: publish success\n Data - %s \n ****\n' % message)
      return { 'statusCode': 200, 'body': json.dumps(message_results) }
    else:
      print('\n**** Messaging Error: publish - Kafka server error\n Data - %s \n ****\n' % message)
      print('\n**** Messaging Error: publish - Return Kafka error: %s \n ****\n' % message_results['message'])
      return { 'statusCode': 400, 'body': json.dumps({ 'error': message_results['message'] }) }

  except Exception as e:
    print('\n**** Messaging Error: publish - Delivery of publish message failed\n Data - %s \n ****\n' % message)
    print('\n**** Messaging Error: publish - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Delivery of publish message failed' }) }

def generate_clinvar_data(pk):
  '''Generate ClinVar submission data from a snapshot identified by the given pk.'''

  # Retrieve data for generating ClinVar submission
  try:
    get_results = get_data(pk)

    if get_results['statusCode'] == 'Success':
      messaging_data = get_results['body']
    else:
      return get_results

  except Exception as e:
    print('\n**** Messaging Error: Generate clinvar data - Failed to retrieve data for ClinVar submission - PK = ' + pk + ' ****\n')
    print('\n**** Messaging Error: Generate clinvar data - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed to retrieve data for ClinVar submission' }) }

  # Check that data has expected elements
  try:
    if messaging_data['resourceType'] != 'interpretation':
      raise Exception

  except Exception as e:
    print('\n**** Messaging Error: Generate clinvar data - Data for ClinVar submission missing expected elements \n Data - %s \n ****\n' % messaging_data)
    print('\n**** Messaging Error: Generate clinvar data - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Data for ClinVar submission missing expected elements' }) }

  # Check that data should be submitted to ClinVar? (approved status? permission to generate?)

  # Collect data for ClinVar submission
  try:
    submission_template = deepcopy(messaging_helpers.publish_interpretation_message_template)
    data_to_remove = messaging_helpers.publish_interpretation_data_to_remove
    messaging_helpers.add_data_to_message_template(messaging_data, None, None, submission_template)

  except Exception as e:
    print('\n**** Messaging Error: Generate clinvar data - Failed to build complete ClinVar submission \n Data - %s \n ****\n' % messaging_data)
    print('\n**** Messaging Error: Generate clinvar data - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed to build complete ClinVar submission' }) }

  # Transform ClinVar submission
  try:
    messaging_helpers.remove_data_from_message_template(data_to_remove, submission_template['interpretation'])
    submission_template['interpretation'] = messaging_helpers.transform_interpretation(submission_template['interpretation'], is_offline)
    submission = messaging_helpers.request_clinvar_data(submission_template['interpretation'])
    print('\n**** Messaging Success: Generate clinvar data success\n message - %s \n ****\n' % submission)
    return { 'statusCode': 200, 'body': json.dumps({ 'status': 'Success', 'message': submission }) }

  except Exception as e:
    print('\n**** Messaging Error: Generate clinvar data - Failed to transform ClinVar submission \n Data - %s \n ****\n' % messaging_data)
    print('\n**** Messaging Error: Generate clinvar data - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed to transform ClinVar submission' }) }

def produce_data(messaging_data, action):
  '''Produce data to a unique topic, based on the action, of the streaming platform (Data Exchange).'''

  # Get GDM resourceParent object
  if action == 'publish-gdm':
    if isinstance(messaging_data, dict) and messaging_data.get('resourceParent') and 's3_archive_key' in messaging_data['resourceParent']:
      try:
        curation_data = snapshot_helpers.get_from_archive(messaging_data['resourceParent']['s3_archive_key'])
        messaging_data['resourceParent'].update({ curation_data['item_type']: curation_data })
      except Exception as e:
        print('\n**** Messaging Error: ' + action + ' - failed to get resourceParent data ' + messaging_data['resourceParent']['s3_archive_key'] + ' ****\n')
        print('\n**** Messaging Error: ' + action + ' - Return Error: ' + str(e) + ' ****\n')
        return { 'statusCode': 404, 'body': json.dumps({ 'error': 'resourceParent Data to be published not found (in archive)\n%s' %e }) }


  # Construct message
  try:
    message = json.dumps(messaging_data, separators=(',', ':'))

  except Exception as e:
    print('\n**** Messaging Error: ' + action + ' - Failed to build complete message ****\n')
    print('\n**** Messaging Error: ' + action + ' - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed to build complete ' + action + ' message\n%s' %e }) }

  # Set message key
  try:
    if action == 'publish-gdm':
      message_key = messaging_data['PK'] + '-' + messaging_data['resource']['publishDate']
    else:
      message_key = messaging_data['report_id'] + '-' + messaging_data['date']

  except Exception as e:
    print('\n**** Messaging Error: ' + action + ' - Failed to set message key ****\n')
    print('\n**** Messaging Error: ' + action + ' - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed to set ' + action + ' message key\n%s' %e }) }

  # Configure message delivery parameters
  if is_offline:
    kafka_topic = 'test'

  else:
    if action == 'publish-gdm':
      kafka_topic = 'gene_validity_raw'
    else:
      kafka_topic = 'gene_validity_events'

    if not is_prod:
      kafka_topic += '_dev'

  if action == 'publish-gdm':
    extra_conf = { 'compression.type': 'gzip' }
  else:
    extra_conf = None

  # Send message
  try:
    message_results = messaging_helpers.send_message(message, kafka_topic, is_offline, extra_conf, message_key)

    if message_results['status'] == 'Success':
      print('\n**** Messaging Success: ' + action + ' - Success\n Data - %s \n ****\n' % message)
      return { 'statusCode': 200, 'body': json.dumps(message_results) }
    else:
      print('\n**** Messaging Error: ' + action + ' - Kafka server error\n Data - %s \n ****\n' % message)
      print('\n**** Messaging Error: ' + action + ' - Return error: - %s \n ****\n' % message_results['message'])
      return { 'statusCode': 400, 'body': json.dumps({ 'error': message_results['message'] }) }

  except Exception as e:
    print('\n**** Messaging Error: ' + action + ' - Delivery to Data Exchange failed\n Data - %s \n ****\n' % message)
    print('\n**** Messaging Error: ' + action + ' - Return Error: ' + str(e) + ' ****\n')
    return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Delivery of ' + action + ' message failed\n' + str(e) }) }
