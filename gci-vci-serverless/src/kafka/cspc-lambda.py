import json
import os

from src.db.ddb_client import Client as DynamoClient

from src.helpers import user_helpers

db = DynamoClient(
    os.environ['DB_TABLE_NAME'],
    os.environ.get('IS_OFFLINE', 'false') == 'true'
)


def cleanVariant(variant):
    # Todo parse data
    return variant

def handler(event, context):
    ''' Handles code incoming from cspec topic '''
    
    print('Event' + event)
    # Todo: Parse event and pull out needed variant
    # info from event
    # variant = cleanVariant(event['incomingVariantInfo'])


    # Todo: save variant to DB
    # Todo: create uuid and add to variant
    # try: 
    #   db.put(variant)
    return event
