import json
from src.models.schema_reader import get_schema, is_singular_relational_field, is_plural_relational_field, parse_schema_string
from src.utils.exceptions import PopulatorException

from src.models.item_type_serializer import ModelSerializer


def populate_fields(db, parent):
  '''Replaces PK (references) of relational fields by nested objects. 
  Populating is done recursively based on the model schema json files.

  Will raise error if some fields are not found by the PK in db.
  If some fields already populated, will skip them.
  If a relational field in parent object is empty and has no PK, will skip.

  :param DynamoClient db: the DynamoDB client used by each controller
  :param dict parent: the original parent object that contains PK references in some fields.
  '''

  # TODO: remove the following once `ModelSerializer` is working as expected

  schema = get_schema(parent)
  schema = schema['properties']
  
  populate_field_keys = list(
    filter(lambda schema_key: (
      # make sure the field exists in parent object
      schema_key in parent
    ) and (
      # make sure schema details for the field is available
      isinstance(schema[schema_key], dict)
    ) and (
      (
        # make sure the field is singular (i.e. a string for PK) on parent object
        isinstance(parent[schema_key], str) and parent[schema_key] and
        is_singular_relational_field(schema[schema_key])
      ) or (
        # make sure the field is plural (i.e. a non-empty array) on parent object
        isinstance(parent[schema_key], list) and len(parent[schema_key]) > 0 and
        is_plural_relational_field(schema[schema_key])
       )
    ), schema.keys())
  )

  # for each field to be embedded, create a map `field_name -> item_type` so that we can access their schema later.
  # if the relational field is for a single nested object, we add pair `field_name: item_type`
  # otherwise if it's arary of objects, we add `field_name: [item_type]` in the map
  populate_item_type_map = {}
  # record fields that need to inject associatedField
  # e.g. for parent item_type=group and `group.individualIncluded` whose $schema contains arg `injectParentAsAssociatedField`, 
  # record 'individualIncluded' in the set, so that later on we know to inject {associatedGroup: ...} into individual
  fields_need_to_inject_parent_as_associated_field = set()
  for populate_key in populate_field_keys:
    related_schema_string = schema[populate_key]['items']['$schema'] if schema[populate_key]['type'] == 'array' else schema[populate_key]['$schema']
    related_item_type, related_schema_string_args = parse_schema_string(related_schema_string)
    
    populate_item_type_map[populate_key] = [related_item_type] if schema[populate_key]['type'] == 'array' else related_item_type

    if 'injectParentAsAssociatedField' in related_schema_string_args:
      fields_need_to_inject_parent_as_associated_field.add(populate_key)

  # collect all related PKs
  related_pks = set()
  for field_key, item_type_manifest in populate_item_type_map.items():
    # only populate if value is a PK, and skip already-populated or empty field values
    if isinstance(parent[field_key], str) and parent[field_key]:
      related_pks.add(parent[field_key])
    elif isinstance(parent[field_key], list) and len(parent[field_key]) > 0:
      for PK in parent[field_key]:
        related_pks.add(PK)
  
  # no relational PK, so no need to do any populating
  if len(related_pks) == 0:
    return parent

  # local populate
  #

  # pull objects from db
  try:
    items = db.all(list(related_pks))
  except Exception as e:
    raise PopulatorException(f'PopulateFieldError: the db client failed to collect related objects for parent of type `{parent["item_type"]}`:\n{e}.\nFields to populate: {populate_field_keys}\nParent object: {parent}\nDB client error detail: {e}')

  if len(items) != len(related_pks):
    items_from_db_set = set([item['PK'] for item in items])
    object_not_found_in_db_pks = related_pks.difference(items_from_db_set)
    raise PopulatorException(f'PopulateFieldError: cannot populate some related fields for {parent["item_type"]} because the following PKs not found in db: {object_not_found_in_db_pks}\nFields to populate: {populate_field_keys}\nParent object: {parent}')
  
  # dispatch objects into each field
  related_lookup = { item['PK']: item for item in items }
  populated_parent = { **parent }
  for field_key, item_type_manifest in populate_item_type_map.items():
    if isinstance(item_type_manifest, list):
      populated_parent[field_key] = [related_lookup[PK] for PK in parent[field_key]]

      # inject associatedField
      if field_key in fields_need_to_inject_parent_as_associated_field:
        populated_parent[field_key] = [add_associated_field(parent, embed_object) for embed_object in populated_parent[field_key]]

    else:
      embed_object = related_lookup[ parent[field_key] ]
      populated_parent[field_key] = embed_object

      # inject associatedField
      if field_key in fields_need_to_inject_parent_as_associated_field:
        populated_parent[field_key] = add_associated_field(embed_object)

  # recursive populate
  #

  # apply populate_fields() recursively to each populated object
  # so that all deeply nested, relational fields are populated
  for field_key, item_type_manifest in populate_item_type_map.items():
    if isinstance(item_type_manifest, list):
      populated_parent[field_key] = [ populate_fields(db, populated_object) for populated_object in populated_parent[field_key] ]
    else:
      populated_parent[field_key] = populate_fields(db, populated_parent[field_key])
  
  return populated_parent

def add_associated_field(parent, embed_object):
  parent_item_type = parent['item_type']
  associated_field_name = f'associated{parent_item_type.capitalize()}'
  
  return {
    **embed_object,
    associated_field_name: parent['PK']
  }
