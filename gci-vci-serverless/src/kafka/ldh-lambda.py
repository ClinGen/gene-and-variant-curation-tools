import simplejson as json
import os
import datetime
import uuid
from decimal import Decimal

from botocore.config import Config
from botocore.exceptions import ClientError

from src.db.ddb_client import Client as DynamoClient

config = Config(
    retries = {
        'max_attempts': 50,
        'mode': 'standard'
    }
)

db = DynamoClient(
    os.environ['DB_VPT_TABLE_NAME'],
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
  if 'item_type' not in attrs:
    attrs['item_type'] = 'variant'

  try:
    variant = db.update(pk, attrs, embed=False, item_type='variant')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(variant) }

  return response

def transform (variant):
    now = datetime.datetime.now().isoformat()
    variant['date_created'] = now
    variant['last_modified'] = now
    variant['item_type'] = 'variant'
    variant['hgnc']=variant['hgnc'][0]
    #refactor later
    variant['carId']=variant['caId']
    return variant

def process(event, context):
    # Todo: Parse event and pull out needed variant
    # info from event
    # variant = cleanVariant(event['incomingVariantInfo'])
    count=0
    record_count = 0
    for record in event:
        count=count+1
        #print('records received %s' %record)
        variant=json.loads(record['value'],parse_float=Decimal)
        try:
            variant=transform(variant)
            if 'event' in variant and variant['event'] == 'Add':
                variant['PK']=str(uuid.uuid4())
                variant['gr']=variant['hgnc'] + '_' + str(record['partition']) + '_' + str(count % 2)
                variant=db.put(variant)
            elif 'event' in variant and variant['event'] == 'Update':
                db_variant=db.query_by_car_id(variant['carId'])
                if (len(db_variant) > 0):
                  variant=update(db_variant[0]['PK'],variant)
                else:
                  print (f"CAID missing in DB {variant['carId']} {variant['hgnc']}")
                  variant['PK']=str(uuid.uuid4())
                  variant['gr']=variant['hgnc'] + '_' + str(record['partition']) + '_' + str(count % 2)
                  variant=db.put(variant)
            else:
                raise ValueError('event element missing') 
        except ValueError as ve:
            response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' % str(ve) }) }
        except ClientError as ce:
            print(str(ce))
            response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' % str(ce) }) }
        except Exception as e:
            response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' % e }) }
            print('DB put error Response %s \n %s' % (response,variant['caId']))
        else:
            record_count = record_count + 1
            response = { 'statusCode': 201, 'body': json.dumps(variant) }

def handler(event, context):
    ''' Handles code incoming from cspec topic '''
    
    print('Number of records received %s' %len(event))
    print('First record received %s' %event[0])
    print('Last record received %s' %event[len(event)-1])
    process(event, context)
    return event
