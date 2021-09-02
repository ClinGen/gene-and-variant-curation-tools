import json, time

import boto3
from boto3.dynamodb.conditions import Attr, Key
from requests_aws4auth import AWS4Auth
from elasticsearch import Elasticsearch, RequestsHttpConnection
from elasticsearch.helpers import bulk

import logging
logger = logging.getLogger(__name__)
#logging.basicConfig(level=logging.INFO)

class DynamoToElasticsearchBulkLoader():
    def __init__(self, origin_table_name, destination_domain_endpoint, index_basename="gci-vci-", dynamodb_region=None, es_region=None):
        self.table_name = origin_table_name
        self.domain_endpoint = destination_domain_endpoint
        self.es_region = es_region
        self.dynamodb_region = dynamodb_region
        self.index_basename = index_basename
        self._aws_auth = None
        self._table = None
        self._es_client = None
        logger.info(f"ES Region: {self.es_region}")

    def index_item_type(self, item_type):
        es_client = self._get_es_client()
        try:
           bulk(es_client, self._record_generator(item_type), stats_only=True)
        except Exception as e:
            logger.info(f"Error while indexeing: {item_type} {e}")

    def _record_generator(self, item_type):
        dynamo_table = self._get_dynamo_table()
        index_name = self._get_index(item_type)
        
        last_evaluated_key = "init"

        while last_evaluated_key is not None:
            kwargs = {
                'IndexName':'item_type_index',
                'KeyConditionExpression':Key('item_type').eq(item_type)
            }

            if last_evaluated_key != 'init':
                kwargs['ExclusiveStartKey'] = last_evaluated_key

            resp = dynamo_table.query(**kwargs)

            last_evaluated_key = resp.get('LastEvaluatedKey', None)

            logging.info(f"Retrieved {resp['Count']} {item_type} records from dynamodb.")

            for i in resp['Items']:
                yield {
                    '_index': index_name,
                    '_id': i['PK'],
                    '_source': i
                }
            
    def _get_index(self, item_type):
        index_name = f"{self.index_basename}{item_type}"

        es_client = self._get_es_client()

        # Each index will get 2 shards and 1 replica. We may want to change 
        # this if a single item type is much larger than the rest
        es_client.indices.create(
            index=index_name,
            body={
                "settings": {
                    "number_of_shards": 2,
                    "number_of_replicas": 1
                }
            },
            ignore=400,
        )

        return f"{self.index_basename}{item_type}"

    def _get_es_auth(self):
        if self._aws_auth is not None:
            return self._aws_auth

        session = None
        region = self.es_region
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
            connection_class = RequestsHttpConnection,
            timeout=300
        )

        return self._es_client

    def _get_dynamo_table(self):
        if self._table is not None:
            return self._table

        dynamodb = None
        if self.dynamodb_region is None:
            dynamodb = boto3.resource('dynamodb')
        else:
            dynamodb = boto3.resource('dynamodb', region_name=self.dynamodb_region)

        self._table = dynamodb.Table(self.table_name)
        return self._table