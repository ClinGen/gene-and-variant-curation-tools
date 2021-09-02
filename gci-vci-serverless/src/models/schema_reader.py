import os
import json

class _SchemaReader:
  MODELS_DIR = os.path.dirname(os.path.realpath(__file__))

  def get_schema(self, item_type) -> dict:
    with open(self._get_schema_file_path(item_type), 'r') as schema_file:
      return json.load(schema_file)['properties']
  
  def is_singular_relational_field(self, schema_property_value):
    if (
      isinstance(schema_property_value, dict) and
      'type' in schema_property_value and schema_property_value['type'] == 'string' and
      '$schema' in schema_property_value and schema_property_value['$schema']
    ):
      return True
    else:
      return False

  def is_plural_relational_field(self, schema_property_value):
    if (
      isinstance(schema_property_value, dict) and
      'type' in schema_property_value and schema_property_value['type'] == 'array' and
      'items' in schema_property_value and isinstance(schema_property_value['items'], dict) and
      is_singular_relational_field(schema_property_value['items'])
    ):
      return True
    else:
      return False
  
  def is_nested_field(self, schema_property_value):
    if (
      isinstance(schema_property_value, dict) and
      'type' in schema_property_value and schema_property_value['type'] == 'object' and
      'properties' in schema_property_value and isinstance(schema_property_value['properties'], dict)
    ):
      return True
    else:
      return False

  def _get_schema_file_path(self, item_type):
    '''Get the schema file path based on item_type.
    Also maps item_type to the file name of the schema json file.

    :param str item_type: the item_type on an object.
    '''

    filename_no_extension = item_type.replace('-', '_')
    return f'{self.MODELS_DIR}/{filename_no_extension}.json'

  def parse_schema_string(self, schema_string: str) -> (str, set):
    '''Parse the $schema field of the json schema, and retrieve the item_type and schema args

      e.g. for json schema `"$schema": "family:injectParentAsAssociatedField"`,
      will yield item_type=family and schema_string_args={'injectParentAsAssociatedField'}

      :param str schema_string: the value of key $schema in json schema
    '''
    schema_string_tokens = schema_string.split(':')
    item_type = schema_string_tokens[0]
    schema_string_args = set(schema_string_tokens[1:])

    return item_type, schema_string_args

SchemaReader = _SchemaReader()


# TODO: remove the following once `ModelSerializer` is working stably
def get_schema(parent) -> dict:
  if 'item_type' not in parent or not parent['item_type']:
    raise Exception(f"ReadSchemaError: parent object does not have item_type on it. `parent` is {str(parent)}.")
  item_type = parent['item_type']

  with open(__get_schema_file_path(item_type), 'r') as schema_file:
    return json.load(schema_file)
  
def is_singular_relational_field(schema_property_value):
  if (
    isinstance(schema_property_value, dict) and
    'type' in schema_property_value and schema_property_value['type'] == 'string' and
    '$schema' in schema_property_value and schema_property_value['$schema']
  ):
    return True
  else:
    return False

def is_plural_relational_field(schema_property_value):
  if (
    isinstance(schema_property_value, dict) and
    'type' in schema_property_value and schema_property_value['type'] == 'array' and
    'items' in schema_property_value and isinstance(schema_property_value['items'], dict) and
    is_singular_relational_field(schema_property_value['items'])
  ):
    return True
  else:
    return False

def __get_schema_file_path(item_type):
  '''Get the schema file path based on item_type.
  Also maps item_type to the file name of the schema json file.

  :param str item_type: the item_type on an object.
  '''

  filename_no_extension = item_type.replace('-', '_')
  return f'src/models/{filename_no_extension}.json'

def parse_schema_string(schema_string: str) -> (str, set):
  '''Parse the $schema field of the json schema, and retrieve the item_type and schema args

    e.g. for json schema `"$schema": "family:injectParentAsAssociatedField"`,
    will yield item_type=family and schema_string_args={'injectParentAsAssociatedField'}

    :param str schema_string: the value of key $schema in json schema
  '''
  schema_string_tokens = schema_string.split(':')
  item_type = schema_string_tokens[0]
  schema_string_args = set(schema_string_tokens[1:])

  return item_type, schema_string_args