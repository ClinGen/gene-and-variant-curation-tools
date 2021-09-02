import calendar
import os
import json
import requests

def find_mondo_disease(mondo_id):
  mondo_search_url = 'https://www.ebi.ac.uk/ols/api/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/'
  
  try:
    res = requests.get(mondo_search_url + mondo_id, timeout=60)
  except Exception as e:
    print('ERROR: OLS MONDO Request error: %s' %e)
    raise
  else:
    if res.status_code == requests.codes['ok']:
      disease_data = json.loads(res.text)
      return parse_mondo_disease(disease_data, mondo_id)
    elif res.status_code == requests.codes['not_found']:
      return None
    else:
      message = 'There was an unexpected error from the OLS MONDO service.'
      raise ClientError(message, res.status_code)

def parse_mondo_disease(disease_data, mondo_id):
  terms_data = disease_data.get('_embedded', {}).get('terms', [])
  if len(terms_data) == 0:
    return None
  definitions_list = terms_data[0].get('annotation', {}).get('def', [])
  disease_definition = None
  if len(definitions_list) != 0:
    disease_definition = definitions_list[0]
  disease_label = terms_data[0].get('label', '')
  disease_synonyms = terms_data[0].get('annotation', {}).get('hasExactSynonym')

  disease = {}
  disease['PK'] = mondo_id
  disease['term'] = disease_label
  disease['definition'] = disease_definition
  disease['synonyms'] = disease_synonyms

  return disease


class Error(Exception):
  pass

class ClientError(Error):

  def __init__(self, message, status_code):
    self.message = message
    self.status_code = status_code