from src.models.schema_reader import get_schema, is_singular_relational_field, is_plural_relational_field
from src.utils.exceptions import NormalizerException
from src.models.item_type_models import ITEM_TYPE_TO_MODEL
from src.models.item_type_serializer import ModelSerializer


def normalize_fields(db, parent):
  '''Replaces nested objects by PK on parent object.
  Will do this by best-effort and skip if already-normalized or any missing relational field.
  If object does not contain PK - in case of singular field, will just skip,
  but for plural field (list of objects), will raise error if any has missing PK.

  :param DynamoClient db: the DynamoDB client used by each controller
  :param dict parent: the parent object that contains nested objects
  '''

  # TODO: remove the following once `ModelSerializer` is working as expected
  # TODO: also remove the `injectParentAsAssociatedField` in json schema of case level evidences
  # TODO: also remove the exception object not used

  schema = get_schema(parent)
  schema = schema['properties']

  # loop through properties in schema
  normalized_parent = { **parent }
  for schema_property, schema_property_value in schema.items():
    if schema_property not in parent:
      continue

    # when it's a relational field, we swap in PK(s)
    if isinstance(schema_property_value, dict):
      if is_singular_relational_field(schema_property_value):
        # relational field is singular object
        # skip non-object field (which probably is already normalized)
        if (isinstance(parent[schema_property], dict) and 'PK' in parent[schema_property]):
          normalized_parent[schema_property] = parent[schema_property]['PK']

      elif is_plural_relational_field(schema_property_value):
        # relational field is list of objects
        if isinstance(parent[schema_property], list) and len(parent[schema_property]) > 0:
          # collect PKs from scratch
          normalized_parent[schema_property] = []
          for relational_field_value in parent[schema_property]:
            if isinstance(relational_field_value, dict):
              if not ('PK' in relational_field_value and relational_field_value['PK']):
                raise NormalizerException(f'NormalizeFieldError: while normalizing {parent["item_type"]}, no PK on relational field {schema_property} object: {relational_field_value}')
              normalized_parent[schema_property].append(relational_field_value['PK'])
            # if it's string - probably it's the PK, means already-normalized - then just add it as-is
            elif isinstance(relational_field_value, str) and relational_field_value:
              normalized_parent[schema_property].append(relational_field_value)
  
  # TODO: refactor normalizer to OOP using model classes
  Model = ITEM_TYPE_TO_MODEL.get(parent['item_type'])
  if Model:
    # remove computed properties so that they won't be stored in db
    for computed_property_key in Model.computed_properties:
      if normalized_parent.get(computed_property_key):
        del normalized_parent[computed_property_key]

  return normalized_parent
