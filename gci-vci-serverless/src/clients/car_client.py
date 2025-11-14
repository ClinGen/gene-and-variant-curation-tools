import json
import os
import requests
import traceback

import src.clients.ldh as ldh
from src.helpers.variant_helpers.variant_title import preferred_title_for
from src.helpers.variant_helpers.hgvs_notation import get_hgvs_notation

def find(id, compute_preferred_title=True, type="car"):
  """Queries the CAR registry for a Variant object with the given ID
  The ID can be a CAR ID or ClinVar ID, depends on the given type

  This function queries the CAR registry for a Varaint with the given ID. If found,
  it decodes the response into a Variant dictionary and returgene_listreturns
  None.

  #### Parameters
  :param bool compute_preferred_title: if true, compute variant preferred title and include it in variant object
  :param string type: if "car", given ID is a CAR ID.  If "clinvar", ClinVar ID is given
  """

  if type == "clinvar":
    res = requests.get(os.environ['CLIN_VAR_ALLELES_ENDPOINT'] + id)
  elif type == "cacn":
    res = requests.get(os.environ['CAR_ALLELE_ENDPOINT'] + id + '?overlappingGenes=true')
  else:
    res = requests.get(os.environ['CAR_ALLELE_ENDPOINT'] + id)

  if res.status_code == requests.codes['ok']:
    # When request by clinvar id, an array of data is returned, take the first one
    if type == "clinvar":
      list = json.loads(res.text)
      if list and list[0]:
        car_data = list[0]
      else:
        return None
    elif type == "cacn":
      list = json.loads(res.text)
      if list and list[0]:
        car_data = list[0]
      else:
        return None
    else:
      car_data = json.loads(res.text)
    
    if type == "cacn":
      try:
        variant = decode_cacn_response_obj(car_data)
      except Exception as e:
        traceback.print_exc()
        raise ClientError(f'CARClientParseError: cannot parse CACN data from CAR API, error message: {e}. See detail error stack at log.', 500)
    else:
      try:
        variant = decode_response_obj(car_data)
      except Exception as e:
        traceback.print_exc()
        raise ClientError(f'CARClientParseError: cannot parse data from CAR API, error message: {e}. See detail error stack at log.', 500)

    # compute preferred title
    if compute_preferred_title:
      variant['preferredTitle'] = preferred_title_for(variant)

    return variant
  elif res.status_code == requests.codes['not_found']:
    return None
  else:
    message = 'There was an unexpected error from the CAR service.'
    raise ClientError(message, res.status_code)


def decode_response_obj(car_obj):
  """Parses a CAR registry response body and return a Variant object"""

  variant = {}
  
  # Parse and set the CAR ID 
  variant['carId'] = os.path.basename(car_obj['@id'])

  # Parse External Records
  if 'externalRecords' in car_obj:
    external_records = car_obj['externalRecords']
    
    # Parse and set the ClinVar Variant ID
    if 'ClinVarVariations' in external_records and len(external_records['ClinVarVariations']) > 0:
      clinvar_variations = external_records['ClinVarVariations'][0]
      variant['clinvarVariantId'] = str(clinvar_variations['variationId'])

    # Parse and set dbSNP IDs
    if 'dbSNP' in external_records and len(external_records['dbSNP']) > 0:
      variant['dbSNPIds'] = [str(dbsnp_item['rs']) for dbsnp_item in external_records['dbSNP']]

  # Parse and set HGVS names
  hgvs_names = __decode_hgvs_names(car_obj)

  if hgvs_names:
    variant['hgvsNames'] = hgvs_names

  # Parse and set CAR communityStandardTitle
  if 'communityStandardTitle' in car_obj and car_obj['communityStandardTitle'] and car_obj['communityStandardTitle'][0]:
    variant['communityStandardTitle'] = car_obj['communityStandardTitle'][0]

  return variant

def decode_cacn_response_obj(car_obj):
  """Parses a CAR registry response body and return a Variant object for a CACN ID"""

  variant = {}
  
  # Parse and set CACN ID, when available
  if 'CACNid' in car_obj:
    variant['cacnId'] = car_obj['CACNid']

  # Parse External Records
  if 'externalRecords' in car_obj:
    external_records = car_obj['externalRecords']
    
    # Parse and set the ClinVar Variant ID
    if 'ClinVarVariations' in external_records and len(external_records['ClinVarVariations']) > 0:
      clinvar_variations = external_records['ClinVarVariations'][0]
      variant['clinvarVariantId'] = str(clinvar_variations['variationId'])

    # Parse and set dbSNP IDs
    if 'dbSNP' in external_records and len(external_records['dbSNP']) > 0:
      variant['dbSNPIds'] = [str(dbsnp_item['rs']) for dbsnp_item in external_records['dbSNP']]

  # Parse and set HGVS names
  hgvs_names = __decode_hgvs_names(car_obj)

  if hgvs_names:
    variant['hgvsNames'] = hgvs_names

  # Parse and set CAR communityStandardTitle
  if 'communityStandardTitle' in car_obj and type(car_obj['communityStandardTitle']) == str:
    variant['communityStandardTitle'] = car_obj['communityStandardTitle']

  if 'overlappingGenes' in car_obj:
    variant['overlappingGenes'] = []

    for gene in car_obj['overlappingGenes']:
      if 'symbol' in gene:
        variant['overlappingGenes'].append(gene['symbol'])

  return variant

def __decode_hgvs_names(car_obj):
  hgvs_names = {}

  # Parse and set genomic alleles
  if 'genomicAlleles' in car_obj and len(car_obj['genomicAlleles']) > 0:
    genomic_alleles = car_obj['genomicAlleles']
    for genomic_allele in genomic_alleles:
      
      if 'hgvs' in genomic_allele:
        for hgvs in genomic_allele['hgvs']:
          # Skip this HGVS if it starts with 'CM'
          if hgvs.startswith('CM'):
            continue
          elif hgvs.startswith('NC'):
            # If NC, file by 'referenceGenome' if it exists...
            if 'referenceGenome' in genomic_allele:
              hgvs_names[genomic_allele['referenceGenome']] = hgvs
            else: 
              # .. file as other.
              if 'others' not in hgvs_names:
                hgvs_names['others'] = []

              hgvs_names['others'].append(hgvs)
          else:
            if 'others' not in hgvs_names:
              hgvs_names['others'] = []

            hgvs_names['others'].append(hgvs)

  # Parse and set amino acid alleles.
  if 'aminoAcidAlleles' in car_obj and len(car_obj['aminoAcidAlleles']) > 0:
    amino_acid_alleles = car_obj['amino_acid_alleles']
    other_hgvs_names = __decode_alleles(amino_acid_alleles)
    if len(other_hgvs_names) > 0:
      if 'others' not in hgvs_names:
        hgvs_names['others'] = []

      hgvs_names['others'].extend(other_hgvs_names)
  
  # Parse and set transcript alleles.
  if 'transcriptAlleles' in car_obj and len(car_obj['transcriptAlleles']) > 0:
    transcript_alleles = car_obj['transcriptAlleles']
    other_hgvs_names = __decode_alleles(transcript_alleles)
    if len(other_hgvs_names) > 0:
      if 'others' not in hgvs_names:
        hgvs_names['others'] = []
      
      hgvs_names['others'].extend(other_hgvs_names)

  return hgvs_names

def __decode_alleles(alleles):
  other_hgvs_names = []

  for allele in alleles:
    other_hgvs_names.extend([hgvs for hgvs in allele.get('hgvs', [])])
    
  return other_hgvs_names

class Error(Exception):
  pass

class ClientError(Error):

  def __init__(self, message, status_code):
    self.message = message
    self.status_code = status_code

