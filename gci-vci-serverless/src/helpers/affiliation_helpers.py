"""
This file contains all affiliation helper methods to be shared in the gci-vci 
backend.
"""

import os
import requests
import logging
from typing import TypedDict

affiliation_data, saved_affiliation, affiliation_detail = [], [], []


class APIConfig(TypedDict):
    url: str
    api_key: str


def load_affiliation_data():
  """Get Affiliations list from Affiliations microservice API"""
  global affiliation_data
  
  try:
    api_info = get_affils_api_config()
    url = f'{api_info["url"]}affiliations_list/'
    auth_headers = {'X-Api-Key': api_info['api_key']}
    res = requests.get(url, headers=auth_headers)

    if res.status_code == 200:
      affiliation_data = res.json()
    else:
      logging.error(f'affiliation_helpers {res.status_code} response - in load_affiliation_data')
  except Exception as e:
    logging.error(f'affiliation_helpers error - in load_affiliation_data: {e}')


def load_affiliation_detail(affiliation_id):
  """Get a single Affiliations detail from Affiliations microservice API"""
  global affiliation_detail

  try:
    api_info = get_affils_api_config()
    url = f'{api_info["url"]}affiliation_detail/?affil_id={affiliation_id}'
    auth_headers = {'X-Api-Key': api_info['api_key']}
    res = requests.get(url, headers=auth_headers)

    if res.status_code == 200:
      affiliation_detail = res.json()
    else:
      logging.error(f'affiliation_helpers {res.status_code} response - in load_affiliation_detail')
  except Exception as e:
    logging.error(f'affiliation_helpers error - in load_affiliation_detail: {e}')


def lookup_affiliation_data(affiliation_id, affiliation_key, affiliation_subgroup=None):
  """Lookup affiliation data associated with a provided ID"""
  global saved_affiliation
  global affiliation_detail

  if affiliation_id and affiliation_key:
    if (not saved_affiliation 
        or 'affiliation_id' not in saved_affiliation 
        or affiliation_id != saved_affiliation['affiliation_id']):
      load_affiliation_detail(affiliation_id)

      for affiliation in affiliation_detail:
        if affiliation_id == affiliation.get('affiliation_id'):
          saved_affiliation = affiliation
          break
    try:
      if affiliation_subgroup:
        return saved_affiliation['subgroups'][affiliation_subgroup][affiliation_key]
      else:
        return saved_affiliation[affiliation_key]
    except Exception as e:
      logging.error(f'affiliation_helpers error - in lookup_affiliation_data - return data: {e}')
      pass
    return None
  else:
    return None


def get_affils_api_config() -> APIConfig:
  """Get affiliation API configuration"""
  try:  
    app_stage = _get_env_variable_or_fail('APP_STAGE')
  except KeyError as e:
    logging.error(e)
    raise
  
  # Only use prod affiliations service for curation and curation-test sites
  is_prod = app_stage == 'prod' or app_stage == 'ptest'

  try:
    if is_prod:
      return {
        'url': _get_env_variable_or_fail('AFFILS_ENDPOINT_PROD'),
        'api_key': _get_env_variable_or_fail('AFFILS_API_KEY_PROD'),
      }
    else:
      return {
        'url': _get_env_variable_or_fail('AFFILS_ENDPOINT_DEV'),
        'api_key': _get_env_variable_or_fail('AFFILS_API_KEY_DEV'),
      }
  except KeyError as e:
    logging.error(f'API config fetch failed: {e}')
    raise


def _get_env_variable_or_fail(key: str) -> str:
  """Fetch required environment variable or raise a KeyError."""
  value = os.environ.get(key)
  if value is None:
    logging.error('_get_env_variable_or_fail - Missing required '
                 f'environment variable: {key}')
    raise KeyError(f'{key} not set in environment')
  return value
