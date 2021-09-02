import json
import os
import requests
import traceback

import src.clients.ldh as ldh
from src.helpers.variant_helpers.variant_title import preferred_title_for
from src.helpers.variant_helpers.hgvs_notation import get_hgvs_notation
from src.clients import ensembl_vep_client, clinvar_client

def find(id, compute_preferred_title=True, ensembl_vep_transcripts=None):
  """Queries the CAR registry for a Variant object with the given CAR ID

  This function queries the CAR registry for a Varaint with the given CAR ID. If found,
  it decodes the response into a Variant dictionary and returgene_listreturns
  None.

  #### Parameters
  :param bool compute_preferred_title: if true, compute variant preferred title and include it in variant object
  :param list ensembl_vep_transcripts: optional, transcripts fetched from Ensembl VEP API. If not supplied (or supplied with None), this method will try to fetch via Ensembl VEP API. Note that supplying empty array will skip fetching, eventually letting preferred title skip MANE and Canonical title.
  """

  res = requests.get(os.environ['CAR_ALLELE_ENDPOINT'] + id)
  if res.status_code == requests.codes['ok']:
    car_data = json.loads(res.text)
    try:
      variant = decode_response_obj(car_data)
    except Exception as e:
      traceback.print_exc()
      raise ClientError(f'CARClientParseError: cannot parse data from CAR API, error message: {e}. See detail error stack at log.', 500)

    # compute preferred title
    if compute_preferred_title:
      effective_vep_transcripts = ensembl_vep_transcripts
      if effective_vep_transcripts == None:
        # set `raise_external_api_exception=False` to continue processing preferred title even if Ensembl VEP API not available (may be temporarily not responding, or not found given the hgvs notation)
        # i.e., fall back, only consider Clinvar title and GRCh37/38
        effective_vep_transcripts = ensembl_vep_client.get_effective_vep_transcripts_by_variant(variant, raise_external_api_exception=False)

      variant['preferredTitle'] = preferred_title_for(variant, effective_vep_transcripts, car_data=car_data)

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
    