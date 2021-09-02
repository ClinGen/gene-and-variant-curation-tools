import copy

from src.utils.exceptions import PopulatorException
from src.utils.dict import dictdeepget, dictdeepset, dictdeepdel
from src.models.item_type_models import ITEM_TYPE_TO_MODEL, ITEM_TYPE_TO_MODEL_INSTANCE


class _ModelSerializer:
  def _get_model(self, parent, item_type: str = None):
    if not item_type:
      item_type = parent.get('item_type')
    
    if not item_type:
      raise Exception(f'SerializerError: not able to locate the model for object because cannot tell which item_type the object is: {parent}')

    if item_type not in ITEM_TYPE_TO_MODEL_INSTANCE:

      if item_type not in ITEM_TYPE_TO_MODEL:
        raise Exception(f'SerializerError: model for item type {item_type} not yet setup. Did you add a model to the list `ITEM_TYPE_TO_MODEL` for {item_type}?')

      ITEM_TYPE_TO_MODEL_INSTANCE[item_type] = ITEM_TYPE_TO_MODEL[item_type](item_type)

    return ITEM_TYPE_TO_MODEL_INSTANCE[item_type]

  def populate(self, db, src_parent: dict, exclude_key_list: list = None, include_key_list: list = None):
    '''
    :param DynamoClient db: the DynamoDB client used by each controller
    :param dict src_parent: the initial, top-level object to get populated
    :param list exclude_key_list: optional, a list of key in dot representation. If `include_key_list` also supplied, keys in `exclude_key_list` take the priority.
    :param list include_key_list: optional, a list of key in dot representation. If `exclude_key_list` also supplied, keys in `exclude_key_list` take the priority.

    :return: the populated object derived from `src_parent`.
    :rtype: dict
    '''

    if 'item_type' not in src_parent or not src_parent['item_type']:
      raise Exception(f"PopulateError: parent object does not have item_type on it. `parent` is {str(src_parent)}.")

    populated_src_parent = copy.deepcopy(src_parent)

    include_key_set = set(include_key_list if include_key_list else [])
    exclude_key_set = set(exclude_key_list if exclude_key_list else [])
    
    # use a DFS traverse to go through all levels of fields that need populated
    # avoid recursion since in case there's bug in recursion and got infinite calls, could cause serverless to keep scaling up and does not stop
    populate_stack = [(include_key_set, exclude_key_set, populated_src_parent)]
    while populate_stack:
      include_key_set, exclude_key_set, parent = populate_stack.pop()

      Model = self._get_model(parent)

      # yield the final fields to populate
      opt_in_fields = None
      if not include_key_set and not exclude_key_set:
        opt_in_fields = Model.dot_representations_for_embedding
      elif not include_key_set and exclude_key_set:
        opt_in_fields = set(Model.dot_representations_for_embedding) - exclude_key_set
      elif include_key_set and not exclude_key_set:
        opt_in_fields = include_key_set.intersection(Model.dot_representations_for_embedding)
      elif include_key_set and exclude_key_set:
        opt_in_fields = include_key_set.intersection(Model.dot_representations_for_embedding) - exclude_key_set

      # only fields in dot representation are concerned
      all_related_pks = set()
      # `embedding_meta_list` will store meta info about where an object or objects should be embedded
      embedding_meta_list = []
      for _dot_representation in opt_in_fields:
        is_array = Model.is_array_dot_representation(_dot_representation)
        dot_representation = _dot_representation.replace('[]', '')
        
        parent_value = dictdeepget(parent, dot_representation)

        # skip if such field is missing (not a pk string or not a list of pk strings) on parent object
        if not parent_value:
          continue
        
        # check consistency whether it's an array field or not 
        # between parent object and schema
        if not (
          (is_array and isinstance(parent_value, list) and parent_value) or
          (not is_array and isinstance(parent_value, str))
        ):
          continue
        
        # collect all pks
        if is_array:
          for pk in parent_value:
            if pk and isinstance(pk, str):
              all_related_pks.add(pk)
        else:
          if parent_value and isinstance(parent_value, str):
            all_related_pks.add(parent_value)
        
        embedding_meta_list.append({
          # store local parent so we can set attr more quickly
          'dot_representation': dot_representation,
          'is_array': is_array
        })
      
      # no relational PK, so no need to do any populating
      # (db.all() will throw error if list is empty)
      if len(all_related_pks) == 0:
        continue

      # batch pull from db client
      try:
        items = db.all(list(all_related_pks))
      except Exception as e:
        raise PopulatorException(f'PopulateFieldError: the db client failed to collect related objects for parent of type `{parent["item_type"]}`:\n{e}.\nFields to populate: {opt_in_fields}\nParent object: {parent}\nDB client error detail: {e}')
      if len(items) != len(all_related_pks):
        items_from_db_set = set([item['PK'] for item in items])
        object_not_found_in_db_pks = all_related_pks.difference(items_from_db_set)
        raise PopulatorException(f'PopulateFieldError: cannot populate some related fields for {parent["item_type"]} because the following PKs not found in db: {object_not_found_in_db_pks}\nFields to populate: {list(map(lambda meta: meta["dot_representation"], embedding_meta_list))}\nParent object: {parent}')

      # gerenate a store of { PK01: object01, ... } to quickly retrieve the db object by its PK
      related_lookup = { item['PK']: item for item in items }
      
      # embed objects onto parent
      for embedding_meta in embedding_meta_list:
        dot_representation = embedding_meta['dot_representation']
        is_array = embedding_meta['is_array']
        value_on_parent = dictdeepget(parent, dot_representation)

        if is_array and isinstance(value_on_parent, list):
          dictdeepset(
            parent, 
            dot_representation,
            list(map(
              lambda value: related_lookup[value] if isinstance(value, str) else value,
              value_on_parent
            ))
          )
        elif not is_array and isinstance(value_on_parent, str):
          dictdeepset(
            parent,
            dot_representation,
            related_lookup[value_on_parent]
          )
      
      # allow any custom logic to modify the populated object
      Model.did_populate(parent)

      # keep doing the same thing on embedded objects
      # use DFS and push into stack
      populate_stack.extend([(None, None, item) for item in items])
    
    return populated_src_parent

  def normalize(self, db, src_parent: dict, item_type: str):
    '''Replace embed objects by PK, and strip off any computed field in `src_parent`, so the db does not store redundant data.

    :param DynamoClient db: the DynamoDB client used by each controller
    :param dict src_parent: the object to get normalized
    :param str item_type: required, the item_type of `src_parent`. This is required since when frontend do a 
        PUT for update, frontend may only send a partial object containing only the fields get changed.
        This means that `src_parent` may not have item_type, therefore item_type needs to be supplied
        separately excplicitly to make sure normalizing always work.
        `item_type` is used to locate model of the object in order to tell which field to normalize or strip off.

    :return: the normalized object derived from `src_parent`.
    :rtype: dict
    '''

    parent = copy.deepcopy(src_parent)

    # only need to normalize fields on `dot_representations`
    Model = self._get_model(parent, item_type)
    for _dot_representation in Model.dot_representations_for_embedding:
      is_array = Model.is_array_dot_representation(_dot_representation)
      dot_representation = _dot_representation.replace('[]', '')

      # only normalize if such field exists && contains objects
      field_value = dictdeepget(parent, dot_representation)
      if not field_value:
        continue
        
      if is_array:
        pks = list(map(lambda value: value['PK'] if isinstance(value, dict) and 'PK' in value else value, field_value))
        dictdeepset(parent, dot_representation, pks)
      else:
        if isinstance(field_value, dict) and 'PK' in field_value:
          dictdeepset(parent, dot_representation, field_value['PK'])
    
    # also remove computed properties so that they won't be stored in db
    for computed_property_key in Model.computed_properties:
      found_computed_value = dictdeepget(parent, computed_property_key)
      if found_computed_value != None:
        dictdeepdel(parent, computed_property_key)
    
    return parent

ModelSerializer = _ModelSerializer()
