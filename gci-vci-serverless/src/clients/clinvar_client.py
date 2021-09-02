import json
import os
import json
import requests
import traceback

import src.clients.car_client as car_client
import src.parsers.variant_xml_parser as v_xml_parser
from src.helpers.variant_helpers.variant_title import preferred_title_for
from src.helpers.variant_helpers.hgvs_notation import get_hgvs_notation
from src.clients import ensembl_vep_client

def find(id=None, clinvar_xml=None, extended=False, compute_preferred_title=True, ensembl_vep_transcripts=None):
  """Queries the ClinVar API for a Variant with the given ClinVar ID

  If found the response object is parsed and a Variant object is returned.

  #### Parameters
  :param str id: clinvar id to make clinvar api call
  :param dict clinvar_xml: if provided, will use it to replace clinvar api call
  :param bool extended: if true, return the extended parsing for the variant
  :param bool compute_preferred_title: if true, compute variant preferred title and include it in variant object
  :param list ensembl_vep_transcripts: optional, transcripts fetched from Ensembl VEP API. If not supplied (or supplied with None), this method will try to fetch via Ensembl VEP API. Note that supplying empty array will skip fetching, eventually letting preferred title skip MANE and Canonical title.
  """
  # Try and make a request to ClinVar for the given clinvarVariantId
  #
  if not clinvar_xml:
    clinvar_xml = fetch(id)
    
  # Try and parse the response.
  try:
    variant, variant_extension = v_xml_parser.from_xml(clinvar_xml, extended=True)
  except Exception as e:
    traceback.print_exc()
    raise ClientError(f'ClinvarClientParseError: cannot parse data from Clinvar API, error message: {e}. See more error stack detail at log.', 500)
  
  # if parse returns None, it's likely Clinvar API response lacks essential data;
  # treat this clinvar id as not found on Clinvar API
  if extended:
    if not variant_extension:
      return None
  else:
    if not variant:
      return None
  
  # compute preferred title
  if compute_preferred_title:
    effective_vep_transcripts = ensembl_vep_transcripts
    if effective_vep_transcripts == None:
      # set `raise_external_api_exception=False` to continue processing preferred title even if Ensembl VEP API not available (may be temporarily not responding, or not found given the hgvs notation)
      # i.e., fall back, only consider Clinvar title and GRCh37/38
      effective_vep_transcripts = ensembl_vep_client.get_effective_vep_transcripts_by_variant(variant, raise_external_api_exception=False)

    variant['preferredTitle'] = preferred_title_for(variant, effective_vep_transcripts, gene_source_from_clinvar_variant_extension=variant_extension if variant_extension else None)
  
  return variant_extension if extended else variant

def fetch(clinvar_id):
  res = requests.get(os.environ['CLIN_VAR_EUTILS_VCV_ENDPOINT'] + clinvar_id)
  if res.ok:
    return res.text
  
  message = f'There was an unexpected error from the ClinVar service: {res.text}'
  
  # in case Clinvar API call responded with a false successful status_code
  if res.status_code < 300:
    raise ClientError(message, 500)
  raise ClientError(message, res.status_code)

def find_esearch_data(variant):
  aminoAcidLocation = variant.get('allele', {}).get('ProteinChange', '')
  symbol = variant.get('gene', {}).get('symbol', '')
  if aminoAcidLocation and symbol:
    term = aminoAcidLocation[:-1]
    url = os.environ['CLIN_VAR_ESEARCH_ENDPOINT'] + term + '+%5Bvariant+name%5D+and+' + symbol + '&retmode=json'
    res = requests.get(url)
    if res.status_code == requests.codes['ok']:
      res = res.json()
      res['vci_term'] = term
      res['vci_symbol'] = symbol
      return res
    else:
      message = 'There was an unexpected error from the ClinVar service.'
      raise ClientError(message, res.status_code)
  else:
    return None


class Error(Exception):
  pass

class ClientError(Error):

  def __init__(self, message, status_code):
    self.message = message
    self.status_code = status_code
    