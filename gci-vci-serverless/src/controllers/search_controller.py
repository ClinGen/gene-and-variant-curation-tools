import os, json
from src.db.elasticsearch_client import Client as ElasticsearchClient

es = ElasticsearchClient(
    os.environ['ES_DOMAIN_ENDPOINT']
)

def handle(event, action):
    """ This controller handles access to the Elasticsearch endpoint. It should accept
    requests to the /search or /filter endpoints. Examples:
        - /search?query=cancer&item_type=interpretation
        - /filter?item_type=evaluation&criteriaStatus=met

    Only GET requests accepted.
    """
    response = None

    httpMethod = event['httpMethod']
    if httpMethod != 'GET':
        # Shortcut if this was something besides a GET request.
        return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /variants' }) }

    item_type = None
    if event.get('queryStringParameters', None) is not None and 'item_type' in event['queryStringParameters']:
        item_type = event['queryStringParameters']['item_type']
        del event['queryStringParameters']['item_type']

    if action == 'search':
        if event.get('queryStringParameters', None) is not None and 'query' in event['queryStringParameters']:            
            # If query parameter is present, do a simple query search
            query_string = event['queryStringParameters']['query']
            search_results = es.search(query_string, item_type=item_type)
            response = { 'statusCode': 200, 'body': json.dumps(search_results) }

        elif event.get('body', None) is not None:
            # If no query is present, then use the body as a passthrough
            search_results = es.passthrough_search(json.loads(event['body']))
            response = { 'statusCode': 200, 'body': json.dumps(search_results) }

        else:
            response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Query string parameter "query" required for /search'}) }

    elif action == 'filter':
        filters = {}
        if event.get('queryStringParameters', None) is not None:
            filters = event['queryStringParameters']
        
        filter_results = es.filter(filters, item_type=item_type)
        response = { 'statusCode': 200, 'body': json.dumps(filter_results) }
    
    else:
        # This is an internal error, not a user error, so raise an exception.
        raise ValueError("Invalid value for action in search_controller. Valid actions are filter and search")
        
    return response
