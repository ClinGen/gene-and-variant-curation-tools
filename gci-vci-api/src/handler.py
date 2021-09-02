import json
import os
import boto3

from src.db.api_key_table import (
    Client,
    APIKeyNotFoundException
)
from src.authorization.authorizer import Authorizer

import logging
logger = logging.getLogger("gci-vci-api-main")

def handler(event, context):

    # Configure the logging module
    _configure_logging()

    logger.info(json.dumps(event))

    # Create the database connection
    table_name = os.environ['API_DYNAMO_TABLE_NAME']
    db_client = Client(table_name)

    # Get the key information from the database. If it's not present
    # create an empty item with the key as the value.
    api_key = event['headers']['x-api-key']
    key_info = None
    try:
        key_info = db_client.get_key_info(api_key)
    except APIKeyNotFoundException:
        # If the api key is not in the database, add it
        # with no roles or affiliations
        db_client.put_or_overwrite_key(api_key)
        key_info = db_client.get_key_info(api_key)
        

    # Determine if the API Key is authorized to make this call.
    authorizer = Authorizer()
    if not authorizer.authorize(key_info, event):
        logger.info("Authorizer: not authorized")
        return {
            "statusCode": 403,
            "body": "Forbidden - user is not authorized to do this request."
        }

    logger.info("Authorized.")
    function_name = os.environ['BACKEND_FUNCTION_ARN']

    # Since we are here, we're authorized. So forward the 
    # call onto the lambda which supports the backend.
    lambda_client = boto3.client("lambda")
    resp = lambda_client.invoke(
        FunctionName=function_name,
        Payload=json.dumps(event)
    )

    # Return the response from the other API.
    response_body = json.loads(resp['Payload'].read())
    body = response_body['body']
    
    response = {
        "statusCode": 200,
        "body": body
    }

    return response

def _configure_logging():
    default_level = logging.WARN
    level = default_level

    if os.environ.get('LOGGING_LEVEL', None) is not None:
        level = os.environ['LOGGING_LEVEL']

    try:
        logging.basicConfig(level=level, format='%(asctime)s :: %(name)s :: %(levelname)s :: %(message)s')
    except ValueError:
        logging.basicConfig(level=default_level, format='%(asctime)s :: %(name)s :: %(levelname)s :: %(message)s')
