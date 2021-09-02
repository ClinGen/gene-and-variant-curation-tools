from functools import reduce

def _dictdeepget_reducer(acc, curr):
  if acc == None:
    return None

  if curr not in acc:
    return None
  
  return acc[curr]

def dictdeepget(dict_object, dot_representation_key, default_value=None):
  '''Get value from a deep nested dictionary using `dot_representation_key`. Returns `None` if the field does not exist.

  :param str|list dot_representation_key: a key representing a field or nested field. e.g. `segreggation.variants[]`, or `submitted_by`. You can also pass over a list of string to manifest a key or nested key, e.g. ['segreggation', 'variants[]']
  '''
  if isinstance(dot_representation_key, str):
    key_list = dot_representation_key.split('.')
  elif isinstance(dot_representation_key, list):
    key_list = dot_representation_key
  
  result = reduce(_dictdeepget_reducer, key_list, dict_object)
  if result == None:
    return default_value
  return result

def dictdeepset(dict_object, dot_representation_key, value):
  '''
  :param str|list dot_representation_key: the key in the dict_object you want to set. Or if it's a nested field, separate levels by dot. Could be either a string or a list of strings.
  '''
  if isinstance(dot_representation_key, str):
    keys = dot_representation_key.split('.')
  elif isinstance(dot_representation_key, list):
    keys = dot_representation_key
  else:
    raise Exception(f'DictUtilSetException: invalid type of `dot_representation_key`. Should be one of str or list, but instead got type `{type(dot_representation_key)}`. dot_representation_key={dot_representation_key}')

  # do nothing if `dot_representation_key` is just empty string 
  if not keys:
    return
  
  # if `dot_representation_key` is just a 1st level key
  if len(keys) == 1:
    dict_object[dot_representation_key] = value
    return
  
  # if `dot_representation_key` contains arbitrary number of levels (one or more dots),
  # then go get its immediate parent object (one level up of `dot_representation_key`).
  # since python store dict by its reference,
  # we can use it to set attribute
  immediate_parent = dictdeepget(dict_object, keys[:-1])
  
  immediate_parent[keys[-1]] = value

def dictdeepdel(dict_object, dot_representation_key):
  if isinstance(dot_representation_key, str):
    keys = dot_representation_key.split('.')
  elif isinstance(dot_representation_key, list):
    keys = dot_representation_key
  else:
    raise Exception(f'DictUtilDelException: invalid type of `dot_representation_key`. Should be one of str or list, but instead got type `{type(dot_representation_key)}`. dot_representation_key={dot_representation_key}')

  # do nothing if `dot_representation_key` is just empty string 
  if not keys:
    return
  
  # if `dot_representation_key` is just a 1st level key
  if len(keys) == 1:
    del dict_object[dot_representation_key]
    return
  
  # if `dot_representation_key` contains arbitrary number of levels (one or more dots),
  # then go get its immediate parent object (one level up of `dot_representation_key`).
  # since python store dict by its reference, we can use it to del attribute
  immediate_parent = dictdeepget(dict_object, keys[:-1])
  
  del immediate_parent[keys[-1]]