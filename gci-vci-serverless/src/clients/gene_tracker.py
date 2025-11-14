import json
import os
import requests
from requests.exceptions import HTTPError

def get_precuration_data(precuration_id=None):
  if precuration_id is None:
    raise ClientError("No precuration Id is given.", 400)

  try:
    gt_url = os.environ['GENE_TRACKER_ENDPOINT'] + '/' + precuration_id
    headers = {
      "Authorization": "Bearer %s" %os.environ['GENE_TRACKER_TOKEN'],
      "Accept": "application/json"
    }
    res = requests.get(gt_url, headers=headers, timeout=60)

    if res.status_code == 200:
      gt_data = res.json()
      return { 'status_code': 200, 'body': gt_data }
    elif res.status_code == 404:
      raise ClientError("404 curation not found error.", res.status_code)
    else: 
      raise ClientError("There was unexpected error.", res.status_code)
  except Exception as e:
    raise

class Error(Exception):
  pass

class ClientError(Error):
  def __init__(self, message, status_code):
    self.message = message
    self.status_code = status_code
