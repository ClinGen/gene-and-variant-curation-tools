import datetime
import os
import uuid
import simplejson as json
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient

import src.clients.ldh as ldh
import src.clients.pubmed as pubmed
import src.helpers.functional_data_helpers as functional_data_helpers

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  if httpMethod == 'POST':
    try:
      body = json.loads(event['body'],parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      functionalData = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'The body of the request is not a valid JSON object.' }) }
    else:
      response = create(functionalData)
  elif httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event['pathParameters']:
      response = find(event['pathParameters']['pk'])
    elif event['queryStringParameters'] is not None and 'variantId' in event['queryStringParameters']:
      response = find_in_ldh(event['queryStringParameters']['variantId'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': "The path parameter 'pk' is missing." }) }
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'],parse_float=Decimal)
      iterator = iter(body)
      key = next(iterator)
      functionalData = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], functionalData)
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /functional' }) }
  
  return response

def create(functionalData):
  """ Saves a functional data type to the database. """
  try:
    functionalData.update(functional_data_helpers.build(functionalData))
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  try:
    db.put(functionalData)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'ERROR: %s' %e }) }
  else:
    response = { 'statusCode': 201, 'body': json.dumps(functionalData) }

  return response

def find(pk):
  """Queries the local database for a functional item with the given PK."""

  try:
    functionalData = db.find(pk)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if functionalData is not None:
      response = { 'statusCode': 200, 'body': json.dumps(functionalData) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def find_in_ldh(variantId):
  """ Queries the LDH for functional data
  First gets variant data from the LDH, then gets more detailed functional data based on the
  Allele Functional Impact Statement ids, then converts the list of statements into a dictionary
  where the PubMed source article is the key. Sort the effects and experiments as the new object
  is constructed. Lastly, queries PubMed for the articles' meta data and embeds it in the AFIS object
  """

  try:
    # get variant data
    ldh_data = ldh.get_ldh_data(variantId)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    afis_records = ldh_data.get('ld', {}).get('AlleleFunctionalImpactStatement', [])
    if len(afis_records) == 0:
      response = { 'statusCode': 200, 'body': json.dumps({}) }
    else:
      # get detailed functional data
      afis_detailed_list = ldh.get_allele_functional_impact_statements(afis_records)
      if len(afis_detailed_list) == 0:
        response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Could not find Allele Functional Impact Statements' })}
      else:
        for index, record in enumerate(afis_detailed_list):
          afis_records[index]['fdr'] = record
        # construct afis object
        afis_object = build_afis_object(afis_records)
        try:
          # embed PubMed articles
          for pmid in afis_object:
            pubmed_article = pubmed.find(pmid)
            afis_object[pmid]['pubmedSource'] = pubmed_article
        except Exception as e:
          response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed retrieving article from Pubmed\n%s' %e }) }
        else:
          response = { 'statusCode': 200, 'body': json.dumps(afis_object) }
  return response

def update(pk, attrs):
  """Updates an existing Functional item with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for Functional data update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    evidence = db.update(pk, attrs, item_type='functional')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(evidence) }

  return response

def build_afis_object(afis_records):
  """
  Reconstruct AFIS as a dictionary with PubMed ids as the key and
  sort the effects and experiments
  """
  afis_object = {}
  for record in afis_records:
    pubmed_id = record.get('entContent', {}).get('Experiment', {}).get('Source', {}).get('entId', '')
    effects = record.get('entContent', {}).get('Effect', [])
    if len(effects) > 1:
      effects.sort(key=sort_effects)
    if pubmed_id is not None:
      if afis_object.get(pubmed_id, None) is not None and afis_object[pubmed_id]['statements']:
        afis_object[pubmed_id]['statements'].append(record)
        afis_object[pubmed_id]['statements'].sort(key=sort_experiments)
      else:
        afis_object[pubmed_id] = {}
        afis_object[pubmed_id]['statements'] = [record]
  return afis_object

def sort_effects(effect):
  return effect['number']

def sort_experiments(experiement):
  return experiement.get('entContent', {}).get('Experiment', {}).get('Number', {})