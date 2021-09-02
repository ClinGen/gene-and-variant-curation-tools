import requests

from requests.exceptions import HTTPError

def get_ldh_data(variant_id):
  if variant_id is None:
    # TODO: Raise an error here? Look at legacy code to see how 
    # it's currently handled.
    return {}

  try:
    ldh_url = 'https://ldh.clinicalgenome.org/ldh/Variant/id/' + variant_id
    ldh_data = requests.get(ldh_url, timeout=10)
    ldh_data.raise_for_status()
    ldh_data = ldh_data.json()
    
    return ldh_data['data']
  except HTTPError as e:
    if (e.response.status_code == 404):
      return {}
    
    return {} #http_error(HTTPServiceUnavailable(), request)
  except Exception as e:
    return {} #http_error(HTTPServiceUnavailable(), request)

def get_allele_functional_impact_statements(statements):
  afis_list = []
  try:
    for statement in statements:
      afis_id = statement['ldhId']
      afis_url = 'https://ldh.clinicalgenome.org/fdr/AlleleFunctionalImpactStatement/id/' + afis_id
      afis_record = requests.get(afis_url, timeout=10)
      afis_record = afis_record.json()
      afis_list.append(afis_record['data'])
  except:
    return []
  else:
    return afis_list