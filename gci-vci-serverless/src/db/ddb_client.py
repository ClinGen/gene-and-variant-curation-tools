import botocore
import json
import os
import traceback

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from botocore.exceptions import BotoCoreError
from boto3.dynamodb.types import TypeDeserializer
from boto3.dynamodb.transform import TransformationInjector

from src.utils.json import SetJSONEncoder
from src.models.item_type_serializer import ModelSerializer


class IndexNames:

  CAR_ID_INDEX_NAME = 'carId_index'
  CLINVAR_VARIANT_ID_INDEX_NAME = 'clinvarVariantId_index'
  ITEM_TYPE_INDEX_NAME = 'item_type_index'
  HGNC_TYPE_INDEX_NAME = 'hgnc_type_index'
  HGNC_GROUP_INDEX_NAME = 'hgnc_group_index'
  AFFILIATION_INDEX = 'affiliation_index'


class Client:
 
  def __init__(self, table_name, is_offline, config=None):
    """Initializes a client that can interact with our DynamoDB instance.

    Creates a object that can be used to interact with our DynamoDB instance. Configures
    the client to use the table defined in an environment variable. Automatically
    detects if we're offline and will configure the client with the correct settings.s
    """

    if config:
      ddb_config = config
    else:
      ddb_config = Config(
        signature_version = 'v4',
        retries = {
            'max_attempts': 10,
            'mode': 'standard'
        }
      )

    # if 'IS_OFFLINE' in os.environ and os.environ['IS_OFFLINE'] == 'true':
    if is_offline:
      # print('DEBUG: Using offline settings for dynamodb.')
      self.ddb_client = boto3.client(
          'dynamodb', endpoint_url='http://localhost:8000', config=ddb_config)
    else:
      self.ddb_client = boto3.client('dynamodb', config=ddb_config)

    self.table_name = table_name

    # Force load of the DynamoDB resource. Boto3 is dynamic and
    # if we don't do this the following types statement fails.
    boto3.resource('dynamodb')
    self.type_deserializer = boto3.dynamodb.types.TypeDeserializer()
    self.type_serializer = boto3.dynamodb.types.TypeSerializer()

  def describe_endpoints(self):
    """ Implementing this as a nothing call to establish an SSL connection """
    self.ddb_client.describe_endpoints()

  def stripNullsInCreate(self,d):
    clean = {}
    for k, v in d.items():
      if isinstance(v, dict):
        nested = self.stripNullsInCreate(v)
        if len(nested.keys()) > 0:
          clean[k] = nested
      elif not (v is None or v == '' or v == ""):
        clean[k] = v
    return clean
  
  def stripNullsInUpdate(self,d):
    clean = {}
    for k, v in d.items():
      if isinstance(v, dict):
        nested = self.stripNullsInUpdate(v)
        if len(nested.keys()) > 0:
          clean[k] = nested
      elif not (v == '' or v == ""):
        clean[k] = v
    return clean

  def put(self, item, embed=False, embed_exclude_keys=None, embed_include_keys=None):
    """Persists an item to the database.

    Encodes an item to an object conforming to DynamoDB schema and saves
    it to the database. If successful it returns the full item, otherwise it
    returns None.
    """

    if not item.get('item_type'):
      raise Exception(f'DynamoDBClientError: cannot create object in db because object is missing `item_type`: {item}')

    # always normalize data before writing to db, no matter `embed` is enabled or not
    item = ModelSerializer.normalize(self, item, item['item_type'])
    try:
      boto3.resource('dynamodb')
      serializer = boto3.dynamodb.types.TypeSerializer()
      item = self.stripNullsInCreate(item)
      ddb_item = {k: serializer.serialize(v) for k, v in item.items() if v is not None}
      condition_expr_builder = ConditionExpressionBuilder()
      condition_expr_builder.attribute_not_exists('PK')
      # Remove conditional expression for migration
      # print ("After stripping null and serilization  %s \n " %ddb_item )
      if (os.environ.get('MIGRATION', 'false') == 'true'):
        ddb_put_res = self.ddb_client.put_item(
          TableName=self.table_name,
          Item=ddb_item
        )
        #print ("Result of DB insert   %s \n " %ddb_put_res )
      else:
        ddb_put_res = self.ddb_client.put_item(
          TableName=self.table_name,
          Item=ddb_item,
          ConditionExpression=condition_expr_builder.build_expression()
        )
    except ClientError as ce:
      print('ERROR: DynamoDB put error: %s' % ce)
      raise
    except BotoCoreError as be:
      print('ERROR: BotoCore error: %s' % be)
      raise
    except Exception as e:
      print('ERROR: non-db related %s' % e)
      raise
    else:
      if ((ddb_put_res['ResponseMetadata']['HTTPStatusCode'] == 200) \
      and (os.environ.get('MIGRATION', 'false') == 'false')):
        try:
          return ModelSerializer.populate(self, item, \
          exclude_key_list=embed_exclude_keys, \
          include_key_list=embed_include_keys) if embed else item
        except Exception as e:
          traceback.print_exc()
          print('Error populating model serializer  %s' %error)
          raise
      else:
        return item

  def update(self, pk, attrs, item_type, embed=False, embed_exclude_keys=None, embed_include_keys=None):
    ''' Updates an existing item specified by the given PK

    This method updates an existing item for the given PK with the provided attributes. It will
    replace an attribute if it already exists or add one if it doesn't. To delete an existing attribute
    you can provide None as the value. Returns the full item with the new values or an
    error if the update fails.

    :param str pk: The primary key of the item to update.
    :param dict attrs: The attributes to update, add, or remove.

    '''

    # always normalize data before writing to db, no matter `embed` is enabled or not
    attrs = ModelSerializer.normalize(self, attrs, item_type)

    try:
      boto3.resource('dynamodb')
      serializer = boto3.dynamodb.types.TypeSerializer()

      # Serialize the key for the item that will be updated. We also ensure that 'PK' is not
      # included in the attributes otherwise DynamoDB will throw an error.
      key = {'PK':  serializer.serialize(pk)}
      if 'PK' in attrs:
        del attrs['PK']

      # Loop through each key in 'item' and build out an Update Expression.
      # If an item's value is None treat it as a REMOVE.
      expr_names_builder = ExpressionAttributeNamesBuilder()
      expr_values_builder = ExpressionAttributeValuesBuilder()
      update_expr_builder = UpdateExpressionBuilder()
      attrs = self.stripNullsInUpdate(attrs)
      for k, v in attrs.items():
        expr_names_builder.append_attribute_name(k)

        if v is not None:
          expr_values_builder.append_attribute(k, v)
          update_expr_builder.append_set(k)
        else:
          update_expr_builder.append_remove(k)

      ddb_update_res = self.ddb_client.update_item(
        TableName=self.table_name,
        Key=key,
        UpdateExpression=update_expr_builder.build_expression(),
        ExpressionAttributeNames=expr_names_builder.build_attribute_names(),
        ExpressionAttributeValues=expr_values_builder.build_attribute_values(),
        ReturnValues='ALL_NEW'
      )
    except ClientError as ce:
      print('ERROR: DynamoDB update error: %s' % ce)
      raise
    except BotoCoreError as be:
      print('ERROR: BotoCore error: %s' % be)
      raise
    else:
      if ddb_update_res['ResponseMetadata']['HTTPStatusCode'] == 200:
        ddb_item = ddb_update_res['Attributes']
        deserializer = boto3.dynamodb.types.TypeDeserializer()
        item = {k: deserializer.deserialize(v)
                                            for k, v in ddb_item.items() if v}

        item = json.loads(json.dumps(item, cls=SetJSONEncoder))
        return ModelSerializer.populate(self, item, exclude_key_list=embed_exclude_keys, include_key_list=embed_include_keys) if embed else item
      else:
        return None

  def find(self, pk, embed=False, embed_exclude_keys=None, embed_include_keys=None):
    """Retrieves the item from our database with the given PK.

    Returns an item using DynamoDB's get_item() interface with the
    given PK. If not found it returns None.
    """

    try:
      ddb_get_item_res = self.ddb_client.get_item(
        Key={
          'PK': {
            'S': pk
          }
        },
        TableName=self.table_name
      )
    except ClientError as ce:
      print('ERROR: DynamoDB get item error: %s' % ce)
      raise
    except BotoCoreError as be:
      print('ERROR: BotoCore error: %s' % be)
      raise
    else:
      if ddb_get_item_res['ResponseMetadata']['HTTPStatusCode'] == 200:
        try:
          ddb_item = ddb_get_item_res['Item']
        except:
          return None
        else:
          # Force load of the DynamoDB resource. Boto3 is dynamic and
          # if we don't do this the following types statement fails.
          boto3.resource('dynamodb')
          deserializer = boto3.dynamodb.types.TypeDeserializer()

          item = {k: deserializer.deserialize(v)
                                              for k, v in ddb_item.items() if v}

          item = json.loads(json.dumps(item, cls=SetJSONEncoder))

          if embed is True:
            # print("DEBUG: pass thru populate")
            item =  ModelSerializer.populate(self, item, exclude_key_list=embed_exclude_keys, include_key_list=embed_include_keys)

          return item
      else:
        return None

  def all(self, pks):
    ''' Retrieves all items with the given list of primary keys.

    Uses DynamoDB's batch_get_item action to fetch items that match the given primary keys.
    If successful returns a list of items.

    :param list pks: List of primary keys for the items you want to retrieve from the database.
    '''

    if len(pks) == 0:
      return []

    keys = [{'PK': self.type_serializer.serialize(pk)} for pk in pks if pk]

    try:
      ddb_res = self.ddb_client.batch_get_item(
        RequestItems={
          self.table_name: {
            'Keys': keys
          }
        }
      )
    except ClientError as ce:
      print('ERROR: DynamoDB get item error: %s' % ce)
      raise
    except BotoCoreError as be:
      print('ERROR: BotoCore error: %s' % be)
      raise
    else:
      items = []
      for ddb_item in ddb_res['Responses'][self.table_name]:
        item = {k: self.type_deserializer.deserialize(
            v) for k, v in ddb_item.items() if v}
        items.append(item)

      # Dump the deserialized DynamodDB data with a set encoder to get a valid JSON object
      # that has sets converted to lists. Load it using the regular JSON encoder so that
      # we return an object instead of string.
      return json.loads(json.dumps(items, cls=SetJSONEncoder))

  def query_by_hgnc(self, hgnc, filters={}, projections={}):
    ''' Queries the database for items with the given item type.

    Returns items with the partition key value equal to the given item type. This method uses the item_type
    seecondary global index and returns a list of items or an empty list if no items match the given item type.

    :param str item_type: The item type to use in the query.

    '''
    print ('In query by hgnc %s' %filters)
    items = self.__query(
      'hgnc',
      hgnc,
      IndexNames.HGNC_TYPE_INDEX_NAME,
      self.table_name,
      filters,
      projections,
    )
  
    return items
  
  def query_by_hgnc_group(self, hgnc, filters={}, projections={}):
    ''' Queries the database for items with the given item type.

    Returns items with the partition key value equal to the given item type. This method uses the item_type
    seecondary global index and returns a list of items or an empty list if no items match the given item type.

    :param str item_type: The item type to use in the query.

    '''
    print ('In query by hgnc group %s' %filters)
    items = self.__query(
      'gr',
      hgnc,
      self.table_name,
      IndexNames.HGNC_GROUP_INDEX_NAME,
      filters,
      projections,
    )
  
    return items

  def query_by_item_type(self, item_type, filters={}, projections={}, \
    embed=False, embed_exclude_keys=None, embed_include_keys=None):
    ''' Queries the database for items with the given item type.

    Returns items with the partition key value equal to the given item type. This method uses the item_type
    seecondary global index and returns a list of items or an empty list if no items match the given item type.

    :param str item_type: The item type to use in the query.

    '''
    print ('In query by item type %s' %filters)
    items = self.__query(
      'item_type',
      item_type,
      self.table_name,
      IndexNames.ITEM_TYPE_INDEX_NAME,
      filters,
      projections,
    )

    if embed is True:
      # print("DEBUG: pass thru populate")
      items = [ModelSerializer.populate(self, item, exclude_key_list=embed_exclude_keys, include_key_list=embed_include_keys) for item in items]

    return items

  def query_by_affiliation(self, affiliation, filters={}, projections={}):
    return self.__query(
      'affiliation',
      affiliation,
      self.table_name,
      IndexNames.AFFILIATION_INDEX,
      filters, 
      projections
    )

  def query_by_car_id(self, car_id, filters={}):
    ''' Queries the database for items with the given CAR ID.

    Returns items with the partition key value equal to the given CAR ID. This method uses the carId
    secondary global index and returns a list of items or an empty list if no items match the given CAR ID.

    :param str car_id: The CAR ID to use in the query.

    '''

    return self.__query(
      'carId',
      car_id,
      self.table_name,
      IndexNames.CAR_ID_INDEX_NAME,
      filters
    )

  def query_by_clinvar_variant_id(self, clinvar_variant_id, filters={}):
    ''' Queries the database for items with the given Clinvar Variant ID.

    Returns items with the partition key value equal to the given Clinvar Variant ID. This method uses the clinvarVariantId
    secondary global index and returns a list of items or an empty list if no items match the given Clinvar Variant ID.

    :param str clinvar_variant_id: The Clinvar Variant ID to use in the query.
    '''

    return self.__query(
      'clinvarVariantId',
      clinvar_variant_id,
      self.table_name,
      IndexNames.CLINVAR_VARIANT_ID_INDEX_NAME,
      filters
    )

  def query_for_item_history(self, pk, filters={'last_modified': '2000-01-01'}):
    ''' Queries a database (intended for the history table) for items with the given PK. '''

    return self.__query(
      'PK',
      pk,
      self.table_name,
      filters=filters
    )

  def __query(self, primary_key_name, primary_key_value, \
    table_name, index_name=None, filters={}, projections={} ):
    ''' Finds items in the database based on primary key values.
    Queries the database by primary key and returns matching items or an empty list if no items are found. You can query
    any table or secondary index that has a composite primary key.
    :param str primary_key_name:  The name of the primary (partition) key to use in the query.
                                  This key should map to a global or secondary index.
    :param str primary_key_value: The value of the primary (partition) key to use in the query.
    :param str index_name:        The name of the index (global or primary) that should be used. The index should represent
                                  the index configured with the given primary key name.
    :param str table_name:        The name of the table to use in the query.
    :param obj filters:           Map of key/values to use in a filter condition in this query.
                                  { 'variant': 'variant-PK' } filter by `variant` at value `variant-PK`, corresponds to url querystring `?variant=variant-PK`
                                  { 'variant': ['variant-PK-01', 'variant-PK-02'] } filter by `variant` at multiple values 'variant-PK-01', 'variant-PK-02', corresponds to url querystring `?variant=variant-PK-01&variant-PK-02`
                                  { 'status!': 'delete' } filter by `status` not equal to `delete`, corresponds to url querystring `?status!=delete`
    '''
    query_params = {}
    expr_names_builder = ExpressionAttributeNamesBuilder()
    expr_names_builder.append_attribute_name(primary_key_name)
    # Add expression attributes for reserved word status if found
    if (bool(projections) and projections.find('#status') >0):
      expr_names_builder.append_attribute_name('status')
    if (bool(projections) and projections.find('#resource') >0):
      expr_names_builder.append_attribute_name('resource')
    expr_values_builder = ExpressionAttributeValuesBuilder()
    expr_values_builder.append_attribute(primary_key_name, primary_key_value)
    key_expr_builder = KeyConditionExpressionBuilder(primary_key_name)
    # If filters include last modified we have to handle that separately since
    # it's a sort key. Instead of including it as part of the filter expression
    # we have to instead set it as part of the key condition.
    if filters is not None and 'last_modified' in filters:
      expr_names_builder.append_attribute_name('last_modified')
      last_modified_range = filters['last_modified'].split(',')
      if len(last_modified_range) == 2:
        start = last_modified_range[0]
        end = last_modified_range[1]
        if len(start) > 0 and len(end) > 0:
          key_expr_builder.append_sort_key_range('last_modified')
          expr_values_builder.append_attribute('start', last_modified_range[0])
          expr_values_builder.append_attribute('end', last_modified_range[1])
        elif len(start) > 0:
          key_expr_builder.append_sort_key_start('last_modified')
          expr_values_builder.append_attribute('start', last_modified_range[0])
        elif len(end) > 0:
          key_expr_builder.append_sort_key_end('last_modified')
          expr_values_builder.append_attribute('end', last_modified_range[1])
      elif len(last_modified_range) == 1:
          key_expr_builder.append_sort_key_start('last_modified')
          expr_values_builder.append_attribute('start', last_modified_range[0])
      del filters['last_modified']
    print ("Filters %s" %filters)
    if filters is not None and len(filters) > 0:
      filter_expr_builder = FilterExpressionBuilder()
      for k, v in filters.items():
        # allow frontend to query 'not equal' filter as `${url}?status!=deleted`
        if k and isinstance(k, str) and k.endswith('!'):
          filter_key = k[:-1]
          filter_expr_builder.not_equal(filter_key)
          expr_values_builder.append_attribute(filter_key, v)
        elif k and isinstance(k, str) and k.endswith('[contains]'):
          filter_key = k[:-10]
          filter_expr_builder.attribute_contains(filter_key)
          expr_values_builder.append_attribute(filter_key, v)
        elif k and isinstance(k, str) and k.endswith('[between]'):
          filter_key = k[:-9]
          filter_expr_builder.attribute_between(expr_values_builder, filter_key, v)
        elif v and isinstance(v, list):
          filter_key = k
          if len(v) == 1:
            filter_expr_builder.equal(k)
            expr_values_builder.append_attribute(filter_key, v[0])
          else:
            filter_expr_builder.is_in(k, len(v))
            expr_values_builder.append_attribute_list(filter_key, v)
        elif v and isinstance(v, str) and v == 'exists':
          filter_key = k
          filter_expr_builder.attribute_exists(k)
        else:
          filter_key = k
          filter_expr_builder.equal(k)
          expr_values_builder.append_attribute(filter_key, v)
        expr_names_builder.append_attribute_name(filter_key)
      query_params['FilterExpression'] = filter_expr_builder.build_expression()
    if (bool(index_name)):
      query_params['IndexName'] = index_name
    print ('Projections %s ' %projections)
    if (bool(projections)):
      query_params['ProjectionExpression'] \
        = projections
    query_params.update({
      'KeyConditionExpression': key_expr_builder.build_expression(),
      'TableName': table_name,
      'ExpressionAttributeNames': expr_names_builder.build_attribute_names(),
      'ExpressionAttributeValues': expr_values_builder.build_attribute_values()
    })
    print('Query Params %s' %(query_params))
    items = []
    try:
      ddb_res = self.ddb_client.query(**query_params)
      items = add_items(self, ddb_res['Items']) 
      last_key = None
      while 'LastEvaluatedKey' in ddb_res:
        last_key=ddb_res['LastEvaluatedKey']
        #print('Number of items returned = %s Last Key %s' % (len(items),last_key))
        query_params.update({ 'ExclusiveStartKey' : last_key})
        ddb_res = self.ddb_client.query(**query_params)
        items= items + add_items(self, ddb_res['Items'])
      #print('Number of items returned = %s ' % len(items))
    except ClientError as ce:
      print('ERROR: DynamoDB get all error: %s' % ce)
      raise
    except BotoCoreError as be:
      print('ERROR: BotoCore error: %s' % be)
      raise
    '''
        else:
        for ddb_item in ddb_res['Items']:
            count = count + 1
            # print('Item count, Item = %s  ddb_items %s' % (count, ddb_item))
            item = {k: self.type_deserializer.deserialize(v) for k, v in ddb_item.items() if v}
            items.append(item)
        last_evaluated_key = ddb_res.get('LastEvaluatedKey')
        print ('Number of items returned = %s Last Key %s' %(len(items), last_evaluated_key))
        if not last_evaluated_key:
          break
    '''
    # Dump the deserialized DynamodDB data with a set encoder to get a valid JSON object
    # that has sets converted to lists. Load it using the regular JSON encoder so that
    # we return an object instead of string.
    return json.loads(json.dumps(items, cls=SetJSONEncoder))

def add_items(self, data):
  items=[]
  for ddb_item in data:
    item = {k: self.type_deserializer.deserialize(v) for k, v in ddb_item.items() if v}
    items.append(item)
  return items

class UpdateExpressionBuilder:
  """ Builds a DynamoDB update expression from a list of actions.

  Use this class to help build a valid update expression to use in a DynamoDB update_item
  action request. By appending remove and set attributes you can configure a builder
  that will produce a full update expression string.

  """

  def __init__(self):
    self.set_actions = []
    self.remove_actions = []

  def append_remove(self, attr_name, attr_name_deref_prefix='#'):
    ''' Appends a 'REMOVE' attribute to the update expression. 
    
    :param str attr_name: The attribute name (with no prefix) to remove.
    :param str attr_name_deref_prefix: The prefix to use on the attribute name placeholder when constructing the expression. The default is '#'.

    '''

    remove_action = f'{attr_name_deref_prefix}{attr_name}'
    self.remove_actions.append(remove_action)

  def append_set(self, attr_name, attr_name_deref_prefix='#', attr_value_deref_prefix=':'):
    ''' Appends a 'SET' attribute to the update expression.

    :param str attr_name: The attribute name (with no prefix) to set.
    :param str attr_name_deref_prefix: The prefix to use on the attribute name placeholder when constructing the epxression. The default is '#'.
    :param str attr_value_deref_prefix: The prefix to use on the attribute value placeholder. The default is ':'.

    '''

    set_action = f'{attr_name_deref_prefix}{attr_name} = {attr_value_deref_prefix}{attr_name}'
    self.set_actions.append(set_action)

  def build_expression(self):
    ''' Builds and returns an update expression with the configured actions. '''

    expressions = []
    
    if len(self.set_actions) > 0:
      expressions.append('SET ' + ', '.join(self.set_actions))

    if len(self.remove_actions) > 0:
      expressions.append('REMOVE ' + ', '.join(self.remove_actions))

    return ' '.join(expressions)

class ExpressionAttributeNamesBuilder:
  ''' Builds an expressionn attribute names map for use in a DynamoDB action. '''
  
  def __init__(self):
    self.attr_names = {}

  def append_attribute_name(self, attr_name, attr_name_deref_prefix='#'):
    ''' Appends an attribute name to the expression. 
    
    The attribute name can be the original name. This method will prepend expression
    placeholder prefixes.

    :param str attr_name: The original name of the attribute.
    :param str attr_name_deref_prefix: The prefix to use for the value placeholder in the expression. Defaults to '#'.

    '''
    # ??? should only set first attribute name
    # e.g. gdm.gene = name  => #gdm.gene = :gdm__name
    #               not #gdm  #gene since #gene will not be used
    #attr_names = {
    #  f'{attr_name_deref_prefix}{attr_sub_name}':attr_sub_name
    #  for attr_sub_name in attr_name.split('.')
    #}
    #self.attr_names.update(attr_names)

    attr_name_list = attr_name.split('.')
    if len(attr_name_list) > 1:
      self.attr_names[f'{attr_name_deref_prefix}{attr_name_list[0]}'] = attr_name_list[0]
    else:
      self.attr_names[f'{attr_name_deref_prefix}{attr_name}'] = attr_name


  def build_attribute_names(self):
    ''' Builds and returns an attribute names map. '''
    
    return self.attr_names

class ExpressionAttributeValuesBuilder:
  ''' Builds an expression attributes values map for use in a DynamoDB action. '''

  def __init__(self):
    self.attr_values = {}

    boto3.resource('dynamodb')
    self.serializer = boto3.dynamodb.types.TypeSerializer()

  def append_attribute(self, attr_name, attr_value, attr_value_deref_prefix=':'):
    ''' Appends an attribute key and value to the expression.


    The key and value provided can be the original key and value. This method will
    prepend expression placeholders and serialize the value to conform to DynamoDB
    requirements.

    :param str attr_name: The normalized key of the attribute.
    :param str attr_value: The normalized value of the attribute.
    :param str attr_value_deref_prefix: The prefix to use for the value placeholder in the expression. Defaults to ':'.

    '''
    attr_name_clean = attr_name.replace(".","__")
    self.attr_values[f'{attr_value_deref_prefix}{attr_name_clean}'] = self.serializer.serialize(attr_value)
  
  def append_attribute_list(self, attr_name, attr_value, attr_value_deref_prefix=':'):
    key = ''
    value = ''
    for i, v in enumerate(attr_value):
      key = f'{attr_value_deref_prefix}{attr_name}{i}'
      value = self.serializer.serialize(v)
      self.attr_values[key] = value

  def build_attribute_values(self):
    ''' Builds and returns attribute values based on the configured values. '''

    return self.attr_values

class ConditionExpressionBuilder:
  ''' Builds a condition expression for use in a DynamoDB action. '''

  def __init__(self):
    self.conditions = []

  def not_equal(self, attr_name):
    ''' Add a not equal condition for the given attribute name.

    For example, this function will add a condition that will pass if the attribute value of the field
    in the database is not equal to the attribute value in the DynamoDB action using this condition.

    :param str attr_name: The name of the attribute to use for this condition. You should not include any placeholder prefixes.

    '''

    self.conditions.append(f'#{attr_name} <> :{attr_name}')

  def attribute_not_exists(self, attr_name):
    ''' Adds a condition that will fail if the given attribute already exists. '''

    self.conditions.append(f'attribute_not_exists({attr_name})')

  def build_expression(self):
    ''' Builds and returns a condition expression.

    By default, this method joins conditions with an 'AND' logical operator. Therefore all conditions must pass or else
    this condition will fail.

    '''

    return ' AND '.join(self.conditions)

class KeyConditionExpressionBuilder:
  ''' Builds a key condition expression to use in a DynamoDB query. See KeyConditionExpression documentation for more information. '''

  def __init__(self, partition_key):
    self.conditions = [f'#{partition_key} = :{partition_key}']
    
  def append_sort_key_start(self, sort_key_name):
    ''' Appends a condition for the sort key where the attribute value is expected to be greater than or equal to a start value.
    
    This condition expects the second operand to be named 'start'.

    :param str sort_key_name: The name of the sort key attribute.
    '''

    self.conditions.append(f'#{sort_key_name} >= :start')

  def append_sort_key_end(self, sort_key_name):
    ''' Appends a condition for the sort key where the attribute value is expected to be less than or equal to the given value.
    
    This condition expects the second operand to be named 'end'.

    :param str sort_key_name: The name of the sort key attribute.
    '''
    
    self.conditions.append(f'#{sort_key_name} <= :end')

  def append_sort_key_range(self, sort_key_name):
    ''' Appends a condition for the sort key where the attribute value is expected to be greater than or less than given value.
    
    This condition expects the first and second operand to be named 'start' and 'end'.

    :param str sort_key_name: The name of the sort key attribute.
    '''
    
    self.conditions.append(f'#{sort_key_name} BETWEEN :start AND :end')

  def build_expression(self):
    ''' Builds and returns a key condition expression with configured primary key. '''
    
    return ' AND '.join(self.conditions)

class FilterExpressionBuilder:
  ''' Builds a filter expression to use in a DynamoDB query. See FilterExpression documentation for more information. '''

  def __init__(self):
    self.filters = []

  def get_clean_val_name(self, attr_name):
    return attr_name.replace(".", "__")

  def is_in(self, attr_name, values_list_length):
    attr_names_string = ''
    for i in range(values_list_length):
      if i > 0:
        attr_names_string += ', '
      attr_names_string += f':{attr_name}{i}'
    self.filters.append(f'#{attr_name} IN ({attr_names_string})')

  def equal(self, attr_name):
    ''' Builds a condition where an attribute is expected to equal a specific value. 
    
    :param str attr_name: The name of the attribute being tested in this expression.
    '''

    #??? no need to change attribute name
    #attr_key_name_clean = ".".join([f"#{attr_sub_name}" for attr_sub_name in attr_name.split(".")])
    #self.filters.append(f'{attr_key_name_clean} = :{attr_val_name_clean}')
    attr_val_name_clean = self.get_clean_val_name(attr_name)
    self.filters.append(f'#{attr_name} = :{attr_val_name_clean}')
  
  def not_equal(self, attr_name):
    ''' Builds a condition where an attribute is expected to not equal a specific value.
    https://stackoverflow.com/a/44998248/9814131
    :param str attr_name: The name of the attribute being tested in this expression.
    '''
    #??? no need to change attribute name
    #attr_key_name_clean = ".".join([f"#{attr_sub_name}" for attr_sub_name in attr_name.split(".")])
    #self.filters.append(f'{attr_key_name_clean} <> :{attr_val_name_clean}')
    attr_val_name_clean = self.get_clean_val_name(attr_name)
    self.filters.append(f'#{attr_name} <> :{attr_val_name_clean}')

  def attribute_between(self, expr_values_builder, attr_name, v):
    range = v.split(',')
    if len(range) == 2:
      start = range[0]
      end = range[1]

      if len(start) > 0 and len(end) > 0:
        self.filters.append(f'#{attr_name} BETWEEN :start AND :end')
        expr_values_builder.append_attribute('start', range[0])
        expr_values_builder.append_attribute('end', range[1])
      elif len(start) > 0:
        self.filters.append(f'#{key_name} >= :start')
        expr_values_builder.append_attribute('start', range[0])
      elif len(end) > 0:
        key_expr_builder.append_sort_key_end('last_modified')
        self.filters.append(f'#{key_name} <= :end')
        expr_values_builder.append_attribute('end', range[1])

  def attribute_exists(self, attr_name):
    ''' Adds a condition that will fail if the given attribute does not exist. '''

    self.filters.append(f'attribute_exists(#{attr_name})')

  def attribute_contains(self, attr_name):
    ''' Builds a condition where an attribute contains a specific value. '''

    self.filters.append(f'contains(#{attr_name}, :{attr_name})')

  def build_expression(self):
    return ' AND '.join(self.filters)
