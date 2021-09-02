import boto3

from requests_aws4auth import AWS4Auth
from elasticsearch import Elasticsearch, RequestsHttpConnection
from elasticsearch.helpers import bulk

class Client:
    def __init__(self, domain_endpoint, region=None, index_name_prefix="gci-vci-"):
        self.domain_endpoint = domain_endpoint
        self.region = region
        self.index_name_prefix = index_name_prefix

        self._aws_auth = None
        self.es_client = None
        self._get_es_client()

    def search(self, search_string, item_type=None):
        """ We are using the simple query string search here to avoid
            errors in syntax."""
        body = {
            "query": {
                "simple_query_string": {
                    "query": search_string
                }
            }
        }
        return self.passthrough_search(body, item_type)

    def filter(self, filters, item_type=None):
        # Reformat filters dict into Query DSL
        filter_query = [{"term":{f"{k}.keyword":v}} for k,v in filters.items()]
        body = {
            "query": {
                "bool": {
                    "filter": filter_query
                }
            }
        }
        return self.passthrough_search(body, item_type)

    def passthrough_search(self, search_body, item_type=None):
        index_name = self._item_type_to_index_name(item_type)
        resp = self.es_client.search(
            index=index_name,
            body=search_body
        )
        return resp['hits']

    def _item_type_to_index_name(self, item_type):
        index_name = "_all"
        if item_type is not None:
            index_name = "".join([self.index_name_prefix, item_type])
        return index_name

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
        if self.es_client is not None:
            return self.es_client

        es_auth = self._get_es_auth()

        self.es_client = Elasticsearch(
            hosts = [{
                'host':self.domain_endpoint,
                'port':443
            }],
            http_auth = es_auth,
            use_ssl = True,
            verify_certs = True,
            connection_class = RequestsHttpConnection
        )

        return self.es_client
