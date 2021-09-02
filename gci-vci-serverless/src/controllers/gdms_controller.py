import datetime
import simplejson as json
import os
import uuid

from src.helpers import gdm_helpers
from decimal import Decimal
from src.db.ddb_client import Client as DynamoClient
from src.utils.exceptions import PopulatorException, NormalizerException


# Create an instance of the database client for all db interactions.
db = DynamoClient(
    os.environ['DB_TABLE_NAME'],
    os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
    httpMethod = event['httpMethod']
    if httpMethod == 'POST':
        try:
            body = json.loads(event['body'])
            iterator = iter(body)
            key = next(iterator)
            gdm = body[key]
        except:
            response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
        else:
            response = create(gdm)
    elif httpMethod == 'PUT':
        try:
            body = json.loads(event['body'])
            iterator = iter(body)
            key = next(iterator)
            gdm = body[key]
        except:
            response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
        else:
            response = update(event['pathParameters']['pk'], gdm)
    elif httpMethod == 'GET':
        if event['pathParameters'] is not None and 'pk' in event.get('pathParameters', {}):
            response = find(event['pathParameters']['pk'])
        elif event['pathParameters'] is None:
            query_params=event.get('queryStringParameters', {})
            if (bool(query_params) and 'action' in query_params and \
                query_params['action'] == 'mygdms'):
                response = getCustom(query_params)
            else:
                response = get(query_params)
        else:
            response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
    else:
        response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request for ' + httpMethod + ' for /gdms' }) }

    return response

def create(gdm):
    """Saves a GDM record to the database"""

    # Legacy support to migrate 'rid' to 'PK'
    if 'rid' in gdm:
        gdm['PK'] = gdm['rid']
        del gdm['rid']
    else:
        gdm['PK'] = str(uuid.uuid4())
        now = datetime.datetime.now().isoformat()
        gdm['date_created'] = now
        gdm['last_modified'] = now

    gdm['item_type'] = 'gdm'

    try:
        gdm = db.put(gdm, embed=True)
    except (PopulatorException, NormalizerException) as error:
        return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
    except Exception as e:
        return { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    
    return { 'statusCode': 201, 'body': json.dumps(gdm) }

def update(pk, attrs):
    """Updates an existing GDM object with the given PK"""

    # Some basic check on PK to make sure we're not saving a totally
    # bogus object. 
    if pk is None or len(pk) == 0:
        return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for gene update'}) }
    
    # Update the last modified date.
    now = datetime.datetime.now().isoformat()
    attrs['last_modified'] = now

    try:
        gdm = db.update(pk, attrs, embed=True, item_type='gdm')
    except (PopulatorException, NormalizerException) as error:
        return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
    except Exception as e:
        return { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }

    return { 'statusCode': 200, 'body': json.dumps(gdm) }

def getCustom(query_params):
    """Queries and returns all gdm objects"""
    try:
        gdms=gdm_helpers.getCustom(db,query_params)
    except (PopulatorException, NormalizerException) as error:
        return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
    except Exception as e:
        return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

    return { 'statusCode': 200, 'body': json.dumps(gdms) }

def get(filters = {}):
    """Queries and returns all gdm objects"""

    try:
        gdms = db.query_by_item_type('gdm', filters)
    except (PopulatorException, NormalizerException) as error:
        return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
    except Exception as e:
        return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

    # TODO: change to DynamoDB not exist operator for affiliation=null
    # when filtering by individual, workaround for excluding gdms that belong to affiliation
    if isinstance(filters, dict) and 'submitted_by' in filters:
        gdms = list(filter(lambda gdm: 'affiliation' not in gdm, gdms))

    return { 'statusCode': 200, 'body': json.dumps(gdms) }

def find(pk):
    """Queries for a gdm type with the given PK"""
    try:
        gdm = db.find(pk, embed=True)
    except (PopulatorException, NormalizerException) as error:
        return { 'statusCode': 500, 'body': json.dumps({ 'error': str(error) }) }
    except Exception as e:
        return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
    
    if not gdm:
        return { 'statusCode': 404, 'body': json.dumps({ 'error': f'gdm {pk} not found' }) }

    return { 'statusCode': 200, 'body': json.dumps(gdm) }
