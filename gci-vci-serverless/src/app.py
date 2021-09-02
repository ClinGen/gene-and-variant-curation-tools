import boto3
import json
import os
import traceback

from src.controllers import articles_controller
from src.controllers import curated_evidences_controller
from src.controllers import evaluations_controller
from src.controllers import interpretations_controller
from src.controllers import snapshots_controller
from src.controllers import variants_controller
from src.controllers import gdms_controller
from src.controllers import diseases_controller
from src.controllers import provisional_classifications_controller
from src.controllers import annotations_controller
from src.controllers import case_control_controller
from src.controllers import evidence_score_controller
from src.controllers import experimental_controller
from src.controllers import individuals_controller
from src.controllers import families_controller
from src.controllers import groups_controller
from src.controllers import populations_controller
from src.controllers import provisional_variants_controller
from src.controllers import functional_data_controller
from src.controllers import computational_data_controller
from src.controllers import users_controller
from src.controllers import affiliations_controller
from src.controllers import genes_controller
from src.controllers import pathogenicity_controller
from src.controllers import assessments_controller
from src.controllers import messaging_controller
from src.controllers import vpt_controller
from src.controllers import vp_saves_controller
from src.controllers import vp_exports_controller
from src.controllers import variant_score_controller
from src.controllers import history_controller
#from src.controllers import search_controller

from src.controllers import warming_controller

import logging
logger = logging.getLogger(__name__)

def configure_logging():
  if logging.getLogger().hasHandlers():
      logging.getLogger().setLevel(logging.INFO)
  else:
      logging.basicConfig(level=logging.INFO)

def handler(event, context):
  """ Entry point and main handler for the API Gateway requst.

  This function is the main entry point for the API Gateway request. It routes
  the request to the correct controller based on the request path.
  """
  configure_logging()

  if 'warmer' in event and event['warmer']:
    logger.info("Calling warming_controller")
    response = warming_controller.handle(event)
    return response


  try:
    path = event['path']

    if path.startswith('/variantscore'):
      response = variant_score_controller.handle(event)
    elif path.startswith('/variants'):
      response = variants_controller.handle(event)
    elif path.startswith('/interpretations'):
      response = interpretations_controller.handle(event)
    elif path.startswith('/evaluations'):
      response = evaluations_controller.handle(event)
    elif path.startswith('/articles'):
      response = articles_controller.handle(event)
    elif path.startswith('/curated-evidences'):
      response = curated_evidences_controller.handle(event)
    elif path.startswith('/snapshots'):
      response = snapshots_controller.handle(event)
    elif path.startswith('/gdms'):
      response = gdms_controller.handle(event)
    elif path.startswith('/diseases'):
      response = diseases_controller.handle(event)
    elif path.startswith('/provisional-classifications'):
      response = provisional_classifications_controller.handle(event)
    elif path.startswith('/annotations'):
      response = annotations_controller.handle(event)
    elif path.startswith('/casecontrol'):
      response = case_control_controller.handle(event)
    elif path.startswith('/evidencescore'):
      response = evidence_score_controller.handle(event)
    elif path.startswith('/experimental'):
      response = experimental_controller.handle(event)
    elif path.startswith('/individuals'):
      response = individuals_controller.handle(event)
    elif path.startswith('/families'):
      response = families_controller.handle(event)
    elif path.startswith('/groups'):
      response = groups_controller.handle(event)
    elif path.startswith('/populations'):
      response = populations_controller.handle(event)
    elif path.startswith('/provisional-variants'):
      response = provisional_variants_controller.handle(event)
    elif path.startswith('/functional'):
      response = functional_data_controller.handle(event)
    elif path.startswith('/computational'):
      response = computational_data_controller.handle(event)
    elif path.startswith('/users'):
      response = users_controller.handle(event)
    elif path.startswith('/affiliations'):
      response = affiliations_controller.handle(event)
    elif path.startswith('/genes'):
      response = genes_controller.handle(event)
    elif path.startswith('/pathogenicity'):
      response = pathogenicity_controller.handle(event)
    elif path.startswith('/assessments'):
      response = assessments_controller.handle(event)
    elif path.startswith('/messaging'):
      response = messaging_controller.handle(event)
    elif path.startswith('/vpt/search'):
      response = vpt_controller.handle(event)
    elif path.startswith('/vpt/saves'):
      response = vp_saves_controller.handle(event)
    elif path.startswith('/vpt/export'):
      response = vp_exports_controller.handle(event)
    elif path.startswith('/history'):
      response = history_controller.handle(event)
    #elif path.startswith('/search'):
    #  response = search_controller.handle(event, 'search')
    elif path.startswith('/filter'):
      response = search_controller.handle(event, 'filter')
    else:
      response = {
          'statusCode': 400,
          'body': json.dumps({ "message": "Unrecognized request." })
      }
      print ('App.py %s' %response)
      traceback.print_exc()
  except Exception as error:
    response = {
      'statusCode': 500,
      'body': json.dumps({ 'error': str(error) })
    }
    traceback.print_exc()

  # Ensure that the required CORS headers are present
  # in the response. Don't overwrite any headers that
  # may have been set.
  headers = response.get('headers', {})
  headers.update({
    'Access-Control-Allow-Credentials': True,
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  })
  response['headers'] = headers

  return response
