import json
import src.clients.gene_tracker as gt

def handle(event):
  httpMethod = event['httpMethod']

  if httpMethod == 'GET':
    if 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': "The path parameter 'pk' is required." }) }

  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /precurations' }) }
  
  return response

def find(pk):
  if pk is None or len(pk) <= 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': "Must supply a valid precuration Id." }) }

  try:
    precuration = gt.get_precuration_data(pk)
    # print (precuration)
    response = { 'statusCode': 200, 'body': json.dumps(precuration) }
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed fetching precuration data - %s' %e }) }
  except ClientError as err:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed fetching precuration data - %s' %err }) }

  return response

