import datetime
import json
import os

from src.db.ddb_client import Client as DynamoClient
from src.helpers import gene_helpers
from src.clients.gene_hgnc_service import fetch_hgnc
from src.clients.gene_hgnc_service import filter_gene_for_HGNC_compare

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
      gene = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'The body of the request is not a valid JSON object.' }) }
    else:
      response = create(gene)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      gene = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], gene)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    elif event['pathParameters'] is None:
      response = get()
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod + ' for /genes.' }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /genes' }) }
  
  return response

def create(gene):
  """ Saves a Gene record to the database. """
  try:
    # Build gene object.
    gene = gene_helpers.build(gene)
  except ValueError as ve:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Missing symbol or hgncId for Gene create - %s' %ve }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'ERROR: %s' %e }) }
  else:
    try:
      db.put(gene)
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'ERROR: %s' %e }) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(gene) }

  return response

def update(pk, attrs):
  """Updates an existing gene object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for gene update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    gene = db.update(pk, attrs, item_type='gene')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(gene) }

  return response

def find(pk):
  # pk is the gene symbol
  if pk is None or len(pk) <= 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': "Must supply a valid gene symbol."}) }

  hgnc_gene = None
  local_gene = None
  try:
    hgnc_gene = fetch_hgnc(pk)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if hgnc_gene is not None:
      try:
        # check if gene has been added to database
        local_gene = db.find(pk)
      except Exception as e:
        pass
      if local_gene is None:
        # gene is not found in db, add to database
        # print(hgnc_gene)
        print('add gene to db');
        response = create(hgnc_gene)
      else:
        # gene is found in db, check if data is same as gene data just requested from HGNC
        if filter_gene_for_HGNC_compare(local_gene) == hgnc_gene:
          print('found gene in db and no update needed');
          response = { 'statusCode': 200, 'body': json.dumps(local_gene) }
        else:
          # not the same, update data to database
          print('found gene in db and update needed');
          response = update(local_gene['PK'], hgnc_gene) 
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def get():
  """Queries and returns all gene objects"""

  try:
    genes = db.query_by_item_type('gene')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(genes) }

  return response

