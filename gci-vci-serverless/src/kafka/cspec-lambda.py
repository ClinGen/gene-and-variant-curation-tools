import json
import os
import datetime
import uuid
import traceback
from decimal import Decimal
from botocore.config import Config
from botocore.exceptions import ClientError

from src.db.ddb_client import Client as DynamoClient

from src.helpers import user_helpers

config = Config (
    retries = {
        'max_attempts': 50,
        'mode': 'standard'
    }
)
db = DynamoClient(
    os.environ['DB_TABLE_NAME'],
    os.environ.get('IS_OFFLINE', 'false') == 'true',
    config
)

def update(pk, attrs):
    """Updates an existing VP object with the given PK"""

    # Some basic check on PK to make sure we're not saving a totally
    # bogus object.
    if pk is None or len(pk) == 0:
        return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for Interpretation update'}) }

    # Update the last modified date.
    now = datetime.datetime.now().isoformat()
    attrs['last_modified'] = now

    # Frontend may only send fields to be updated and not sending in entire interpretation object,
    # need to add item_type so that `normalize_fields` works
  
    attrs['item_type'] = 'cspec'

    try:
        cspec_document = db.update(pk, attrs, embed=False, item_type='cspec')
    except Exception as e:
        traceback.print_exc()
        response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
    else:
        response = { 'statusCode': 200, 'body': json.dumps(cspec_document) }

    return response

def isValid(cspec_document):
    if 'event' not in cspec_document:
        raise ValueError('CSpec Event element missing %s' %cspec_document)
    if not (cspec_document['event']=='Add' \
        or cspec_document['event']=='Update'):
        raise ValueError('CSpec Event element is not Add or Update ')
    if 'subject' not in cspec_document:
        raise ValueError('CSpec Subject element missing %s' %cspec_document )
    if 'ruleSetDoc' not in cspec_document:
        raise ValueError('CSpec ruleSetDoc element missing %s' %cspec_document )
    if 'affiliationId' not in cspec_document['ruleSetDoc']:
        raise ValueError('CSpec affiliation element missing %s' %cspec_document )
    if 'documentVersion' not in cspec_document['ruleSetDoc']:
        raise ValueError('Document Version not missing %s' %cspec_document)
    return True

def generate_uuid(document_version, subject):
    """Generate a consistent UUID based on document version and subject."""
    namespace_uuid = uuid.NAMESPACE_DNS
    name = f'{document_version}|{subject}'
    return str(uuid.uuid5(namespace_uuid, name))

def create(cspec_document):
    subject=str(cspec_document['subject'])
    document_version=str(cspec_document['ruleSetDoc']['documentVersion'])
    generated_uuid = generate_uuid(document_version, subject)
    cspec_document['PK'] = generated_uuid
    cspec_document['affiliation']=cspec_document['ruleSetDoc']['affiliationId'] 
    cspec_document['item_type'] = 'cspec'
    now = datetime.datetime.now().isoformat()
    cspec_document['date_created'] = now
    cspec_document['last_modified'] = now
    return cspec_document

def process(event, context):
    for record in event:
        cspec_document=json.loads(record['value'],parse_float=Decimal)
        try:
            if isValid(cspec_document):
                if cspec_document['event'] == 'Add':
                    cspec_document=create(cspec_document)
                    cspec_document=db.put(cspec_document)
                    response = { 'statusCode': 201, 'body': json.dumps(cspec_document) }
                elif cspec_document['event'] == 'Update':
                    subject=str(cspec_document['subject'])
                    document_version=str(cspec_document['ruleSetDoc']['documentVersion'])
                    generated_uuid = generate_uuid(document_version, subject)
                    db_cspec_document=db.find(generated_uuid)
                    # If not found by UUID, find by subject ID
                    if not db_cspec_document and 'subject' in cspec_document:
                      db_cspec_document = db.find(cspec_document['subject'])
                    if bool(db_cspec_document):
                        response=update(db_cspec_document['PK'],cspec_document)
                    else:
                        print (f"CSpec PK/Subject missing in DB \n {cspec_document}")
                        raise ValueError('CSpec event element missing') 
        except ValueError as ve:
            response = { 'CSpec statusCode': 500, 'body': json.dumps({ 'error': '%s' % str(ve) }) }
        except ClientError as ce:
            print(str(ce))
            response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' % str(ce) }) }
        except Exception as e:
            traceback.print_exc()
            response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' % e }) }
            print('CSpec DB put error Response %s \n %s' % (response,cspec_document['subject']))
        else:
            print('CSpec Event Response %s'  %response)

def handler(event, context):
    ''' Handles code incoming from cspec topic '''
    print('CSpec Event %s'  %event)
    print('Number of records received %s' %len(event))
    print('First record received %s' %event[0])
    print('Last record received %s' %event[len(event)-1])
    process(event, context)
    return event
