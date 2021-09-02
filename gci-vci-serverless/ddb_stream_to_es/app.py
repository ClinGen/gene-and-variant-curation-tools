# © 2021 Amazon Web Services, Inc. or its affiliates. All Rights Reserved.
# 
# This AWS Content is provided subject to the terms of the AWS Customer Agreement
# available at http://aws.amazon.com/agreement or other written agreement between
# Customer and either Amazon Web Services, Inc. or Amazon Web Services EMEA SARL or both.

import json, os, boto3

from boto3.dynamodb.conditions import Attr, Key
from requests_aws4auth import AWS4Auth
from elasticsearch import Elasticsearch, RequestsHttpConnection
from elasticsearch.helpers import bulk

# Setup a logger
import logging
logger = logging.getLogger()

# If run in AWS Lambda, preconfigures a handler for you.
log_level = os.environ.get('LOG_LEVEL', 'WARN').upper()
if logger.hasHandlers():
    logger.setLevel(log_level)
# If run outside AWS, can still use logging.
else:
    logging.basicConfig(level=log_level, format="%(asctime)s - %(name)s - %(level)s - %(message)s")


# Setup an elasticsearch client
from ddb_stream_to_es.gci_vci_elasticsearch.client import ElasticsearchClient
es_client = ElasticsearchClient(
    domain_endpoint=os.environ['ES_DOMAIN_ENDPOINT']
)

def handler(event, context):
    logger.info(json.dumps(event))

    for record in event.get('Records', []):
        logger.info("Sending record to ES Client")
        es_client.handle_record(record)