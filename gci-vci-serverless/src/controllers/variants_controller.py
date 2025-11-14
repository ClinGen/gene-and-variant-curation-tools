import boto3
import datetime
import json
import os
import uuid
import traceback

from botocore.exceptions import ClientError

from src.db.ddb_client import Client as DynamoClient
import src.clients.clinvar_client as clinvar_client
import src.clients.car_client as car_client
import src.clients.ensembl_vep_client as ensembl_vep_client

from src.clients.clinvar_client import ClientError as ClinVarClientError
from src.clients.car_client import ClientError as CarClientError

from src.helpers.variant_helpers.hgvs_notation import get_hgvs_notation
from src.helpers.variant_helpers.variant_title import preferred_title_for
from src.helpers.variant_helpers.lovd import get_lovd
from src.helpers.variant_helpers.litvar import get_litvar
from src.parsers.variant_xml_clinvar_interpretation_parser import from_xml as parse_clinvar_interpretations


# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  if httpMethod == 'GET':
    if event['pathParameters'] is not None and 'pk' in event['pathParameters']:
      response = find(event['pathParameters']['pk'])
    
    elif event['queryStringParameters'] is not None and 'clinvarVariantId' in event['queryStringParameters']:
      response = find_by_clinvar(event['queryStringParameters']['clinvarVariantId'])
    
    elif event['queryStringParameters'] is not None and 'carId' in event['queryStringParameters']:
      response = find_by_allele(event['queryStringParameters']['carId'])
    
    elif event['queryStringParameters'] is not None and 'cacnId' in event['queryStringParameters']:
      response = find_by_allele(event['queryStringParameters']['cacnId'], type="cacn")
    
    elif event['queryStringParameters'] is not None and 'basicInfo' in event['queryStringParameters'] and (
      'variantSource' in event['queryStringParameters'] and
      'variantId' in event['queryStringParameters']
    ):
      response = find_by_basic_info(event['queryStringParameters']['variantSource'], event['queryStringParameters']['variantId'])
    elif event['queryStringParameters'] is not None and 'lovd' in event['queryStringParameters'] and (
      'geneName' in event['queryStringParameters'] and
      'variantOnGenome' in event['queryStringParameters']
    ):
      response = get_lovd_link(event['queryStringParameters']['geneName'], event['queryStringParameters']['variantOnGenome'])
    elif event['queryStringParameters'] is not None and 'litvar' in event['queryStringParameters'] and 'rsId' in event['queryStringParameters']:
      response = get_litvar_link(event['queryStringParameters']['rsId'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /variants' }) }

  elif httpMethod == 'POST':
    try:
      variant = json.loads(event['body'])
      iterator = iter(variant)
      key = next(iterator)
      variant = variant[key]
    except: 
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'The body of the request is not a valid JSON object.' }) }
    
    try:
      response = create_or_update(variant)
    except Exception as e:
      traceback.print_exc()
      response = { 'statusCode': 500, 'body': json.dumps({ 'error': f'VariantControllerException: in create_or_update(): {e}' }) }

  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /variants' }) }

  return response

def find_by_clinvar(variant_id, car_variant=None):
  """Queries ClinVar for a Variant with the given ClinVar ID

  Queries the ClinVar service for a Variant with the given ClinVar ID.
  If no result from ClinVar service, returns a 404.
  If ClinVar result is returned and car_variant is provided, merge car_variant to ClinVar variant and set preferredTitle again.
  If ClinVar result is returned and a CAR ID is in result, query Allele registry by calling find_by_allele() with ClinVar result.  If no CAR result is returned, remove CAR ID from ClinVar variant; else use returned result.
  If no CAR ID is found in ClinVar variant, query Allele registry by calling find_by_allele() using ClinVar ID and with ClinVar result.  If CAR result is returned then use returned result else use ClinVar variant.
  If no car_variant, no CAR result is found in ClinVar variant, use ClinVar variant

  #### Parameters
  :param dict car_variant: (optional) if supplied, will merge car_variant into response, but with clinvar variant attributes prioritized except preferredTitle.
  """
  
  try:
    variant = clinvar_client.find(variant_id)
  except ClinVarClientError as e:
    response = { 'statusCode': 500, 'body': json.dumps({ "error": e.message + ' ' + str(e.status_code) }) }
  else:
    if variant is None:
      response = { 'statusCode': 404, 'body': json.dumps({}) }
    elif car_variant and isinstance(car_variant, dict) and isinstance(variant, dict):
      # if CAR variant is provided, merge with ClinVar variant so we have both Clinvar and CAR data
      variant = {
        **car_variant,
        **variant, # clinvar variant takes priority when merging
      }
      # Compute preferred title since variant is merged
      # if CAR variant has communityStandardTitle, it should be the preferred title
      variant['preferredTitle'] = preferred_title_for(variant)
      response = { 'statusCode': 200, 'body': json.dumps(variant) }
    elif 'carId' in variant and variant['carId'] is not None:
      # If clinVar variant response has a CAR Id, try to get and merge CAR data to clinVar variant
      response = find_by_allele(variant['carId'], clinvar_variant=variant)
      # If no CAR variant result, use ClinVar variant but remove CAR Id
      if response['statusCode'] == 404:
        print('No valid CAR data returned for %s %s, removed CAR ID' %(variant_id, variant['carId']))
        del variant['carId']
        response = { 'statusCode': 200, 'body': json.dumps(variant) }
    else:
      # if no car_variant data or carId in clinVar variant, try to query Allele Registry with clinvar Id.
      response = find_by_allele(variant_id, type="clinvar", clinvar_variant=variant)
      # If no CAR variant result, use ClinVar variant but remove CAR Id
      if response['statusCode'] == 404:
        print('No valid CAR data returned for ClinVar Id %s' %(variant_id ))
        response = { 'statusCode': 200, 'body': json.dumps(variant) }

  return response

def find_by_allele(id, type="car", clinvar_variant=None):
  """Queries the Allele registry for a Variant with the given ID

  Queries the Allele registry for a Variant with the given ID.
  If no result from Allele registry, returns a 404.
  If CAR result is returned and clinvar_variant is provided, merge data to clinvar_variant and set preferredTitle again
  If CAR result is returned and a ClinVar Variation ID is in result, query ClinVar service by calling find_by_clinvar() with CAR result.  If no ClinVar result is returned, remove ClinVar ID from CAR variant; else use returned result.
  If no clinvar_variant and no ClinVar Variant ID is found in CAR variant, return CAR variant.

  #### Parameters
  :param dict clinvar_variant: (optional) if supplied, will merge CAR response into clinvar_variant, with clinvar_variant attributes prioritized except preferredTitle.
  """

  try:
    # Query the CAR for the variant given the CAR ID.
    variant = car_client.find(id, compute_preferred_title=True, type=type)
  except CarClientError as e:
    response = { 'statusCode': 400, 'body': json.dumps({ "error": e.message + ' ' + str(e.status_code) }) }
  else:
    if variant is None:
      response = { 'statusCode': 404, 'body': json.dumps({}) }
    elif clinvar_variant and isinstance(clinvar_variant, dict) and isinstance(variant, dict):
      # If there's clinvar_variant data, should use the ClinVar data except preferredTitle
      variant = {
        **variant,
        **clinvar_variant, # clinvar variant takes priority when merging
      }
      # Compute preferred title since variant is merged
      # if CAR variant has communityStandardTitle, it should be the preferred title
      variant['preferredTitle'] = preferred_title_for(variant)
      response = { 'statusCode': 200, 'body': json.dumps(variant) }
    elif 'clinvarVariantId' in variant and variant['clinvarVariantId'] is not None:
      # If CAR response has a ClinVar Id, try to get and merge ClinVar data to CAR variant except preferredTitle
      response = find_by_clinvar(variant['clinvarVariantId'], car_variant=variant)
      # If no ClinVar variant result, use CAR variant but remove ClinVar Id
      if response['statusCode'] == 404:
        print('No valid ClinVar data returned for %s %s, removed ClinVar ID' %(car_id, variant['clinvarVariantId']))
        del variant['clinvarVariantId']
        response = { 'statusCode': 200, 'body': json.dumps(variant) }
    else:
      # if no clinvar_variant data or clinvarVariantId, use the CAR response.
      response = { 'statusCode': 200, 'body': json.dumps(variant) }
    
  return response

def find_by_basic_info(variant_source, variant_id):
  """
  #### Parameters
  :param variant_source: either `clinvar` or `car`
  """

  # Initialize clinvar data, best effort to acquire clinvar regardless of variant source
  clinvar_xml = None
  clinvar_id = None
  print ("Basic info for source %s variant id %s" %(variant_source,variant_id))
  # Retrieve variant object; and best effort to assign `clinvar_xml` and `clinvar_id`
  if variant_source == 'clinvar':
    clinvar_id = variant_id
    try:
      clinvar_xml = clinvar_client.fetch(clinvar_id)
      variant = clinvar_client.find(clinvar_xml=clinvar_xml, compute_preferred_title=False)
    except ClinVarClientError as e:
      return { 'statusCode': 500, 'body': json.dumps({ "error": e.message + ' ' + str(e.status_code) }) }
  elif variant_source == 'car':
    try:
      variant = car_client.find(variant_id, compute_preferred_title=False)
      if 'clinvarVariantId' in variant and variant['clinvarVariantId']:
        clinvar_id = variant['clinvarVariantId']
        clinvar_xml = clinvar_client.fetch(clinvar_id)
    except CarClientError as e:
      return { 'statusCode': 500, 'body': json.dumps({ "error": e.message + ' ' + str(e.status_code) }) }
  else:
    return {'statusCode': 400, 'body': json.dumps({
      'error': 'variant_source must be clinvar or car, but given ' + variant_source
    })}

  # Retrieve transcripts from Ensembl VEP 
  hgvs_notation = get_hgvs_notation(variant, 'GRCh38', True)

  variant_effects = {}
  try:
    variant_effects = ensembl_vep_client.find(hgvs_notation)
  except ensembl_vep_client.EnsemblVEPClientError as e:
    print('No valid ClinVar data returned for %s %s' %(variant_source, variant_id))
    traceback.print_exc()
    return { 'statusCode': 400, 'body': json.dumps({ "error": e.message + ' ' + str(e.status_code) }) }
  try:
    # best effort to get primary transcript from clinvar, since clinvar may not be available for car variants
    variant_effects = ensembl_vep_client.get_clinvar_primary_transcript(variant_effects, clinvar_xml)
  except ensembl_vep_client.EnsemblVEPClientError as e:
    print('No valid ClinVar data returned for %s %s' %(variant_source, variant_id))
    traceback.print_exc()
    #return { 'statusCode': 400, 'body': json.dumps({ "error": e.message + ' ' + str(e.status_code) }) }
  
  # Retrieve interpretations from clinvar
  if clinvar_xml:
    clinvar_interpretations = parse_clinvar_interpretations(clinvar_xml)
    variant_effects = {
      **variant_effects, **clinvar_interpretations
    }

  if variant_effects:
    response = { 'statusCode': 200, 'body': json.dumps(variant_effects) }
  else:
    response = { 'statusCode': 404, 'body': json.dumps({}) }
  
  return response

def get_lovd_link(gene_name, variant_on_genome):
  try:
    lovd = get_lovd(gene_name, variant_on_genome)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if lovd is not None:
      response = { 'statusCode': 200, 'body': json.dumps(lovd) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }
  return response

def get_litvar_link(rs_id):
  try:
    litvar = get_litvar(rs_id)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if litvar is not None:
      response = { 'statusCode': 200, 'body': json.dumps(litvar) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }
  return response

def find(pk):
  """Queries the local database for a Variant item with the given PK."""
  
  try:
    variant = db.find(pk)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    if variant is not None:
      response = { 'statusCode': 200, 'body': json.dumps(variant) }
    else:
      response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def create_or_update(variant):
  """Saves a Variant type to the database. 
  
  If no PK is present in the object a new one is generated before being saved. First checks
  if the legacy RID field exists and if so uses that as the PK value; otherwise generates
  a new UUIDv4. Before saving the last_modified value is updated to reflect the current time.

  """

  # If no PK is present we have a new item. Create a new PK (or copy the legacy RID)
  # and set the created date to now.
  if 'PK' not in variant or variant['PK'] is None:
    if 'rid' in variant and variant['rid'] is not None:
      response = create(variant)
    else:
      # The variant does not have a PK nor does it have a legacy RID. Therefore we
      # should first check if there is an existing Variant with the same 'clinvarVariantId'
      # or 'carId'. If so we should treat this as an update. Otherwise we execute a create.
      source_variant = None
      if 'clinvarVariantId' in variant:
        try:
          # we want to access `variant.status` to filter out deleted variant
          # note that `db.query_by_clinvar_variant_id()` does not return the complete variant object
          # only an object with key `carId`, `clinvarVariantId` and `PK`; 
          # so we need `db.query_by_item_type` in order to access `status`.
          # another way is to add `status` to `NonKeyAttributes` for DynamoDB
          # but may require updating dynamoDB table
          variants = db.query_by_item_type('variant', filters={
            'clinvarVariantId': variant['clinvarVariantId'],
            'status!': 'deleted'
          })
        except Exception as e:
          return { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
        else:
          if len(variants) > 0:
            print(f'INFO: Variant create or update found existing variant by clinvarVariantId.')
            source_variant = variants[0]

      if source_variant is None and 'carId' in variant:
        try:
          variants = db.query_by_item_type('variant', filters={
            'carId': variant['carId'],
            'status!': 'deleted'
          })
        except Exception as e:
          return { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
        else:
          if len(variants) > 0:
            print(f'INFO: Variant create or update found existing variant by carId.')
            source_variant = variants[0]

      if source_variant is None and 'cacnId' in variant:
        try:
          variants = db.query_by_item_type('variant', filters={
            'cacnId': variant['cacnId'],
            'status!': 'deleted'
          })
        except Exception as e:
          return { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
        else:
          if len(variants) > 0:
            print(f'INFO: Variant create or update found existing variant by cacnId.')
            source_variant = variants[0]
      
      if source_variant is not None:
        # We have a variant with the same ClinVar, CACN, or CAR ID. Treat this request as an update.
        response = update(source_variant['PK'], variant)
      else:
        # Creating a new variant.
        response = create(variant)

  else:
    # We have a PK so we should treat this as an update.
    response = update(variant['PK'], variant)
  
  return response
  
def create(variant):
  ''' Saves a new Variant type to the database. 

  If the variant being created contains a legacy 'rid' it is migrated to the PK column
  and deleted. Otherwise, a new unique PK is created.
  
  :param str variant: The Variant to create.
  '''
  
  if 'rid' in variant and variant['rid'] is not None:
    variant['PK'] = variant['rid']
    del variant['rid']
  else:
    variant['PK'] = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    variant['date_created'] = now
    variant['last_modified'] = now

  variant['item_type'] = 'variant'

  # TODO: only for migration, once variant migration is done, remove below.
  # During normal workflow, `preferredTitle` is computed and assigned in Clinvar and CAR client
  if not variant.get('preferredTitle'):
    variant['preferredTitle'] = get_preferred_title_for_migrated_variant(variant)
  
  try:
    db.put(variant)  
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 201, 'body': json.dumps(variant) }

  return response

def update(pk, attrs):
  ''' Updates an existing variant with the given PK 
  
  :param str pk: The unique identifier of the variant to update.
  :param obj attrs: The new attributes of the variant to update.
  '''

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for Variant update'}) } 

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  # getting preferred title for migrating variant's convenience.
  # Note that such variant may already have `preferredTitle` in db, but we cannot be sure
  # since frontend may only send partial object for `attrs`; in order to ensure variant
  # always has a `preferredTitle` in db, we always try to compute and update `preferredTitle` field.
  # However, since `attrs` could be only partial variant object, computed `preferredTitle` could be inaccurate.
  # TODO: This is only for migration, once variant migration is done, remove below.
  # During normal workflow, `preferredTitle` is computed and assigned in Clinvar and CAR client
  if not attrs.get('preferredTitle') and (
    # we at least need clinvar or car id to compute an accpetable preferred title
    attrs.get('clinvarVariantId') or attrs.get('carId')
  ):
    attrs['preferredTitle'] = get_preferred_title_for_migrated_variant(attrs)

  try:
    variant = db.update(pk, attrs, item_type='variant')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(variant) }

  return response


def get_preferred_title_for_migrated_variant(migrated_variant):
  """Method to add preferred title in variant object for the variant create() & update() function above.
  This method is intended only for migration script purpose where variant create/update does not go through UI;
  however, it could potentially be used for variant create() or update() as well,
  since it handles both Clinvar and CAR API failure.
  
  Normally, the UI will hit GET /variants beforehand and obtain preferred title there from Clinvar and Car client, 
  where Clinvar/CAR data are available in one place, and are used to generate preferred title.

  Calling this function will make extra calls to Clinvar and CAR.
  After migration is complete, this function can be removed.
  """

  # note that both id may be unavailable
  clinvarVariantId = migrated_variant.get('clinvarVariantId')
  carId = migrated_variant.get('carId')

  # note that we cannot compute perferred title right away here, because we still need gene information from Clinvar or CAR API, and variant object does not store gene info. Therefore, we have to go through Clinvar and CAR client, and let them compute the perferred title
  variant = None
  car_variant = None

  # process as a Clinvar variant
  if clinvarVariantId:
    try:
      variant = clinvar_client.find(clinvarVariantId)
    except ClinVarClientError as error:
      # in case Clinvar API failed, we may try carId next
      print(f'WARNING: queried variant by clinvarVariantId {clinvarVariantId} but ClinvarClient reported error: {error.message}. An existing clinvarVariantId means the data should be available on Clinvar API, but it could be the API temporary unavailable. Will try to query CAR instead. Note that Clinvar is favored over CAR data.')

  # process as a CAR variant
  if carId:
    try:
      car_variant = car_client.find(carId)
      # use CAR variant if no ClinVar variant
      if variant is None and car_variant:
        variant = car_variant
      elif variant and car_variant and isinstance(variant, dict) and isinstance(car_variant, dict):
        # if there's ClinVar variant data, merge ClinVar and CAR data
        variant = {
          **car_variant,
          **variant, # clinvar variant takes priority when merging
        }
    except CarClientError as error:
      # even if CAR failed, still try to continue
      print(f'WARNING: queried variant by CAR id {carId} but CARClient reported error: {error.message}. Will try to continue computing preferred title with the migrated variant data. You may want to re-try later since the CAR API may be temparorily unavailable.')

  # in case both Clinvar and CAR API failed or not found (i.e. `variant` is None), we don't have gene info,
  # still try to compute preferred title (may be less accurate, e.g., only GRCh38 w/o amino acid info) with the migrated variant data we have
  variant_for_computing_preferred_title = variant if variant and isinstance(variant, dict) else migrated_variant
  
  # compute preferred title by standard logic
  return preferred_title_for(variant_for_computing_preferred_title)
