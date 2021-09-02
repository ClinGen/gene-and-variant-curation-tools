
import json, time

import boto3
from boto3.dynamodb.types import TypeDeserializer

from requests_aws4auth import AWS4Auth
from elasticsearch import Elasticsearch, RequestsHttpConnection
from elasticsearch.helpers import bulk

import logging
logger = logging.getLogger(__name__)

type_deserializer = TypeDeserializer()

class ElasticsearchClient():
    def __init__(self, domain_endpoint, region=None, index_basename='gci-vci-'):
        self.domain_endpoint = domain_endpoint
        self.region = region
        self.index_basename = index_basename
        self._aws_auth = None
        self._es_client = None

        ## Setup the es client when this object is created.
        self._get_es_client()
    
    def handle_record(self, record):
        event_name = record['eventName']
        if event_name == 'MODIFY' or event_name == 'INSERT':
            doc = type_deserializer.deserialize( {"M": record['dynamodb']['NewImage']} )
            self.index_record(doc)
        elif event_name == 'REMOVE':
            doc = type_deserializer.deserialize( {"M": record['dynamodb']['OldImage']} )
            self.remove_record(doc)

    def index_record(self, doc):
        client = self._get_es_client()

        item_type = doc['item_type']
        pk = doc['PK']
        
        index_name = "".join([self.index_basename, item_type])
        resp = client.index(
            index=index_name,
            id=pk,
            body=doc
        )
        logger.info("Response from ES index:")
        logger.info(json.dumps(resp))

    def remove_record(self, doc):
        client = self._get_es_client()

        item_type = doc['item_type']
        pk = doc['PK']
        
        index_name = "".join([self.index_basename, item_type])

        # ignore not found items.
        resp = client.delete(
            index=index_name,
            id=pk,
            ignore=[400,404]
        )
        logger.info("Deleting record response:")
        logger.info(json.dumps(resp))

    def _get_es_auth(self):
        if self._aws_auth is not None:
            return self._aws_auth

        session = None
        region = self.region
        if region is None:
            session = boto3.Session()
            region = session.region_name
        else:
            session = boto3.Session(region_name=region)

        credentials = session.get_credentials()
        access_key = credentials.access_key
        secret_key = credentials.secret_key
        token = credentials.token

        self._aws_auth = AWS4Auth(
            access_key,
            secret_key,
            region,
            'es',
            session_token=token
        )

        return self._aws_auth

    def _get_es_client(self):
        if self._es_client is not None:
            return self._es_client

        es_auth = self._get_es_auth()

        self._es_client = Elasticsearch(
            hosts = [{
                'host':self.domain_endpoint,
                'port':443
            }],
            http_auth = es_auth,
            use_ssl = True,
            verify_certs = True,
            connection_class = RequestsHttpConnection
        )

        return self._es_client
