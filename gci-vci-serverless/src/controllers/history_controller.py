import json
import os
from decimal import Decimal

from src.db.ddb_client import Client as DynamoClient

# Create instances of database clients for all db interactions
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

db_history = DynamoClient(
  os.environ['HISTORY_TABLE'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']

  if httpMethod == 'GET':
    if event.get('pathParameters') and 'pk' in event['pathParameters']:
      related = None

      if event.get('queryStringParameters') and 'related' in event['queryStringParameters']:
        related = event['queryStringParameters']['related']

      response = generate(event['pathParameters']['pk'], related)
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }

  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized ' + httpMethod + ' request for /history' }) }

  return response

def find(pk, serialize_data = True):
  '''Queries the history table for all entries for the given (data item) pk.'''

  # A basic check of pk to avoid unnecessary DB querying
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for /history find' }) }

  try:
    item_history = db_history.query_for_item_history(pk)
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  if item_history is None:
    return { 'statusCode': 404, 'body': json.dumps({}) }

  if serialize_data:
    return { 'statusCode': 200, 'body': json.dumps(item_history) }
  else:
    return { 'statusCode': 200, 'body': item_history }

# Return true unless the converted value is Decimal('NaN')
def keep_converted_data(converted_data):
  if not isinstance(converted_data, Decimal) or (isinstance(converted_data, Decimal) and not converted_data.is_nan()):
    return True
  else:
    return False

# Convert dictionary from "data type" structure to "normal"
# For example, the following:
# {
#   "PK": {
#     "S": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
#   }
# }
#
# would be converted to:
# {
#   "PK": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
# }
def convert_data_type_dictionary(dictionary_to_convert):
  result_dictionary = {}

  # Only allow dictionary objects
  if not isinstance(dictionary_to_convert, dict):
    raise Exception(f'Invalid object type ({type(dictionary_to_convert).__name__}) passed to convert_data_type_dictionary')

  # Convert sets to dictionaries (instead of lists) to avoid introducing an order?

  for key_to_convert, value_to_convert in dictionary_to_convert.items():
    # DynamoDB data types: String, Blob, String Set, Blob Set, Boolean
    if key_to_convert in {'S', 'B', 'SS', 'BS', 'BOOL'}:
      return value_to_convert

    # DynamoDB data type: Number
    elif key_to_convert == 'N':
      return Decimal(value_to_convert)

    # DynamoDB data type: Number Set
    elif key_to_convert == 'NS':
      converted_number_set = []

      for number_string in value_to_convert:
        converted_number_set.append(Decimal(number_string))

      return converted_number_set

    # DynamoDB data type: Map
    elif key_to_convert == 'M':
      converted_dictionary = {}

      for converted_dictionary_key, converted_dictionary_value in value_to_convert.items():
        converted_dictionary_data = convert_data_type_dictionary(converted_dictionary_value)

        # Drop key if converted value meets criteria
        if keep_converted_data(converted_dictionary_data):
          converted_dictionary[converted_dictionary_key] = converted_dictionary_data

      return converted_dictionary

    # DynamoDB data type: List
    elif key_to_convert == 'L':
      converted_list = []

      for converted_list_element in value_to_convert:
        converted_list_data = convert_data_type_dictionary(converted_list_element)

        # Drop key if converted value meets criteria
        if keep_converted_data(converted_list_data):
          converted_list.append(converted_list_data)

      return converted_list

    # DynamoDB data type: Null
    elif key_to_convert == 'NULL':
      if value_to_convert:
        return None

      # This would seem to indicate a key without a value (which isn't valid JSON), so returning
      # a value that prevents conversion of the key/value pair (effectively dropping it)
      else:
        return Decimal('NaN')

    # Data type not recognized, assume key is actual data (not a data type abbreviation)
    else:
      result_dictionary_data = convert_data_type_dictionary(value_to_convert)

      # Drop key if converted value meets criteria
      if keep_converted_data(result_dictionary_data):
        result_dictionary[key_to_convert] = result_dictionary_data

  return result_dictionary

# Compare data images to determine what changed (result can be empty if no differences found)
def compare_images(old_data_image, new_data_image):
  difference_dictionary = {}

  # Iterate over all keys within old data image
  for old_data_key, old_data_value in old_data_image.items():

    if old_data_key in new_data_image:
      # If both images have a dictionary at the current key, compare them recursively
      if isinstance(old_data_value, dict) and isinstance(new_data_image[old_data_key], dict):
        difference_child_dictionary = compare_images(old_data_value, new_data_image[old_data_key])

        for difference_child_dictionary_key, difference_child_dictionary_value in difference_child_dictionary.items():
          if difference_child_dictionary_key not in difference_dictionary:
            difference_dictionary[difference_child_dictionary_key] = {old_data_key: difference_child_dictionary_value}
          else:
            difference_dictionary[difference_child_dictionary_key].update({old_data_key: difference_child_dictionary_value})

        if not new_data_image[old_data_key]:
          new_data_image.pop(old_data_key, None)

      # Sort lists before comparing?

      # Record update event if non-dictionary data (boolean, Decimal, list, None, string) does not match
      elif old_data_value != new_data_image[old_data_key]:
        if 'update' not in difference_dictionary:
          difference_dictionary['update'] = {old_data_key: new_data_image[old_data_key]}
        else:
          difference_dictionary['update'].update({old_data_key: new_data_image[old_data_key]})

        new_data_image.pop(old_data_key, None)

      # Image data matches, record nothing (and drop processed key from new data image)
      else:
        new_data_image.pop(old_data_key, None)

    # Record delete event if current key not in new data image
    elif 'delete' not in difference_dictionary:
      difference_dictionary['delete'] = {old_data_key: old_data_value}
    else:
      difference_dictionary['delete'].update({old_data_key: old_data_value})

  # Record add events by iterating over all remaining (unmatched) keys within new data image
  for new_data_key, new_data_value in new_data_image.items():
    if 'add' not in difference_dictionary:
      difference_dictionary['add'] = {new_data_key: new_data_value}
    else:
      difference_dictionary['add'].update({new_data_key: new_data_value})

  return difference_dictionary

def generate(pk, related_attributes):
  find_results = find(pk, False)

  # If find fails, return its results/response
  if find_results['statusCode'] != 200:
    return find_results

  result_history_dictionary = {pk: {'history': []}}
  related_pk_set = set()
  reference_attribute_set = {'item_type', 'modified_by', 'affiliation', 'last_modified', 'criteria', 'evidenceCriteria'}
  user_dictionary = {}

  if related_attributes != None:
    related_attribute_list = related_attributes.split(',')
  else:
    related_attribute_list = []

  # Iterate over all history table entries for the specified item
  for history_item in find_results['body']:
    try:
      converted_new_image = convert_data_type_dictionary(history_item['change']['dynamodb']['NewImage'])

      # Collect PKs to related items from new image
      for related_attribute in related_attribute_list:
        if related_attribute in converted_new_image:
          if isinstance(converted_new_image[related_attribute], list):
            related_pk_set = related_pk_set.union(set(converted_new_image[related_attribute]))
          else:
            related_pk_set.add(converted_new_image[related_attribute])

      result_element = {'change_type': history_item['change_type']}

      # Save reference data from new image (includes some data that may not change during an item's history)
      for reference_attribute in reference_attribute_set:
        if reference_attribute in converted_new_image:
          result_element[reference_attribute] = converted_new_image[reference_attribute]

          if reference_attribute == 'modified_by':
            # Build a dictionary of users that have modified an item
            if result_element[reference_attribute] not in user_dictionary:
              try:
                user_dictionary[result_element[reference_attribute]] = db.find(result_element[reference_attribute])

              except Exception:
                user_dictionary[result_element[reference_attribute]] = {}
                pass

            # Save user data needed for UI display
            if 'name' in user_dictionary[result_element[reference_attribute]]:
              result_element['user_name'] = user_dictionary[result_element[reference_attribute]]['name']

            if 'family_name' in user_dictionary[result_element[reference_attribute]]:
              result_element['user_family_name'] = user_dictionary[result_element[reference_attribute]]['family_name']

            if 'email' in user_dictionary[result_element[reference_attribute]]:
              result_element['user_email'] = user_dictionary[result_element[reference_attribute]]['email']

      # For first entry (item creation), save entire new image (as an add)
      if history_item['change_type'] == 'INSERT':
        result_element['add'] = converted_new_image

        # For item creation, user can come from submitted_by property
        if 'modified_by' not in result_element and 'submitted_by' in converted_new_image:
          # Build a dictionary of users that have modified an item
          if converted_new_image['submitted_by'] not in user_dictionary:
            try:
              user_dictionary[converted_new_image['submitted_by']] = db.find(converted_new_image['submitted_by'])

            except Exception:
              user_dictionary[converted_new_image['submitted_by']] = {}
              pass

          # Save user data needed for UI display
          if 'name' in user_dictionary[converted_new_image['submitted_by']]:
            result_element['user_name'] = user_dictionary[converted_new_image['submitted_by']]['name']

          if 'family_name' in user_dictionary[converted_new_image['submitted_by']]:
            result_element['user_family_name'] = user_dictionary[converted_new_image['submitted_by']]['family_name']

          if 'email' in user_dictionary[converted_new_image['submitted_by']]:
            result_element['user_email'] = user_dictionary[converted_new_image['submitted_by']]['email']

      # After first entry, save image comparison data (includes action, add/update/delete, and corresponding data changes)
      else:
        image_difference = compare_images(convert_data_type_dictionary(history_item['change']['dynamodb']['OldImage']), converted_new_image)

        for image_difference_key, image_difference_value in image_difference.items():
          result_element[image_difference_key] = image_difference_value

      result_history_dictionary[pk]['history'].append(result_element)

    except Exception as e:
      return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  # Iterate over all related items
  for related_pk in related_pk_set:
    find_related_results = find(related_pk, False)

    # If find fails, return its results/response
    if find_related_results['statusCode'] != 200:
      return find_related_results

    result_history_dictionary[related_pk] = {'history': []}

    # Iterate over all history table entries for the current related item
    for history_item in find_related_results['body']:
      try:
        converted_new_image = convert_data_type_dictionary(history_item['change']['dynamodb']['NewImage'])

        result_element = {'change_type': history_item['change_type']}

        # Save reference data from new image (includes some data that may not change during an item's history)
        for reference_attribute in reference_attribute_set:
          if reference_attribute in converted_new_image:
            result_element[reference_attribute] = converted_new_image[reference_attribute]

            if reference_attribute == 'modified_by':
              # Build a dictionary of users that have modified an item
              if result_element[reference_attribute] not in user_dictionary:
                try:
                  user_dictionary[result_element[reference_attribute]] = db.find(result_element[reference_attribute])

                except Exception:
                  user_dictionary[result_element[reference_attribute]] = {}
                  pass

              # Save user data needed for UI display
              if 'name' in user_dictionary[result_element[reference_attribute]]:
                result_element['user_name'] = user_dictionary[result_element[reference_attribute]]['name']

              if 'family_name' in user_dictionary[result_element[reference_attribute]]:
                result_element['user_family_name'] = user_dictionary[result_element[reference_attribute]]['family_name']

              if 'email' in user_dictionary[result_element[reference_attribute]]:
                result_element['user_email'] = user_dictionary[result_element[reference_attribute]]['email']

        # For first entry (item creation), save entire new image (as an add)
        if history_item['change_type'] == 'INSERT':
          result_element['add'] = converted_new_image

          # For item creation, user can come from submitted_by property
          if 'modified_by' not in result_element and 'submitted_by' in converted_new_image:
            # Build a dictionary of users that have modified an item
            if converted_new_image['submitted_by'] not in user_dictionary:
              try:
                user_dictionary[converted_new_image['submitted_by']] = db.find(converted_new_image['submitted_by'])

              except Exception:
                user_dictionary[converted_new_image['submitted_by']] = {}
                pass

            # Save user data needed for UI display
            if 'name' in user_dictionary[converted_new_image['submitted_by']]:
              result_element['user_name'] = user_dictionary[converted_new_image['submitted_by']]['name']

            if 'family_name' in user_dictionary[converted_new_image['submitted_by']]:
              result_element['user_family_name'] = user_dictionary[converted_new_image['submitted_by']]['family_name']

            if 'email' in user_dictionary[converted_new_image['submitted_by']]:
              result_element['user_email'] = user_dictionary[converted_new_image['submitted_by']]['email']

        # After first entry, save image comparison data (includes action, add/update/delete, and corresponding data changes)
        else:
          image_difference = compare_images(convert_data_type_dictionary(history_item['change']['dynamodb']['OldImage']), converted_new_image)

          for image_difference_key, image_difference_value in image_difference.items():
            result_element[image_difference_key] = image_difference_value

        result_history_dictionary[related_pk]['history'].append(result_element)

      except Exception as e:
        return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }

  return { 'statusCode': 200, 'body': json.dumps(result_history_dictionary) }
