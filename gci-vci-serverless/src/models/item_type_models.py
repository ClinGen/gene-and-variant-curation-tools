import copy

from src.models.schema_reader import SchemaReader
from src.utils.exceptions import PopulatorException
from src.utils.dict import dictdeepget, dictdeepset


class BaseModel:
  item_type = None

  # specify `computed_properties` for normalizer to strip off these fields so that they don't get stored in db
  computed_properties = set()

  dot_representations_for_embedding = [
    # embed a single object
    # 'submitted_by'

    # embed a list of objects
    # 'segregation.variants[]'
  ]
  map_dot_representation_to_item_type = {
    # item examples below. Note that we're not adding `[]` in suffix for array fields
    # 'submitted_by': 'user',
    # 'segregation.variants': 'variant'
  }

  def __init__(self, item_type=None):
    if not self.item_type:
      self.item_type = item_type
    
    self._load_dot_representations_for_embedding()
  
  def __str__(self):
    return self.item_type
  
  def __repr__(self):
    return self.__str__()

  def did_populate(self, populated_parent):
    '''Override this method to add custom logic for modifying the fully populated object. Please modify `populated_parent` in-place.
    '''
  
  def is_array_dot_representation(self, dot_representation: str):
    return dot_representation.endswith('[]')
  
  def get_dot_representation_keys(self):
    singular_keys = []
    plural_keys = []
    for dot_representation in self.dot_representations_for_embedding:
      if self.is_array_dot_representation(dot_representation):
        plural_keys.append(dot_representation.replace('[]', ''))
      else:
        singular_keys.append(dot_representation)
    
    return singular_keys, plural_keys

  def _load_dot_representations_for_embedding(self):
    if not self.item_type:
      raise Exception('item_type not set')
    
    self.dot_representations_for_embedding = []
    
    self.schema = parent_schema = SchemaReader.get_schema(self.item_type)
    stack = [('', parent_schema)]
    while stack:
      dot_representation, schema = stack.pop()
      for field_key, field_schema in schema.items():
        key = '.'.join([dot_representation, field_key]) if dot_representation else field_key
        if SchemaReader.is_singular_relational_field(field_schema):
          item_type, _ = SchemaReader.parse_schema_string(field_schema['$schema'])
          # e.g. `...submitted_by`
          self.dot_representations_for_embedding.append(key)
          self.map_dot_representation_to_item_type[key] = item_type
        elif SchemaReader.is_plural_relational_field(field_schema):
          item_type, _ = SchemaReader.parse_schema_string(field_schema['items']['$schema'])
          # e.g. `...variants[]`
          key_with_brackets = key + '[]'
          self.dot_representations_for_embedding.append(key_with_brackets)
          self.map_dot_representation_to_item_type[key] = item_type
        elif SchemaReader.is_nested_field(field_schema):
          # e.g. `...segregation`
          stack.append((key, field_schema['properties']))
      
    # make sure the list is unique
    self.dot_representations_for_embedding = list(set(self.dot_representations_for_embedding))


class IndividualModel(BaseModel):
  item_type = 'individual'

  computed_properties = set([
    'associatedGroups',
    'associatedFamilies'
  ])


class FamilyModel(BaseModel):
  item_type = 'family'

  computed_properties = set([
    'associatedGroups'
  ])

  def did_populate(self, populated_parent: dict):
    # add associated field for case level evidence fields
    for individual in populated_parent.get('individualIncluded', []):
      individual['associatedFamilies'] = [populated_parent['PK']]

class GroupModel(BaseModel):
  def did_populate(self, populated_parent: dict):
    # add associated field for case level evidence fields
    for individual in populated_parent.get('individualIncluded', []):
      individual['associatedGroups'] = [populated_parent['PK']]
    for family in populated_parent.get('familyIncluded', []):
      family['associatedGroups'] = [populated_parent['PK']]

ITEM_TYPE_TO_MODEL = {
  'affiliation': BaseModel,
  'annotation': BaseModel,
  'article': BaseModel,
  'assessment': BaseModel,
  'caseControl': BaseModel,
  'computational': BaseModel,
  'curated-evidence': BaseModel,
  'disease': BaseModel,
  'evaluation': BaseModel,
  'evidenceScore': BaseModel,
  'experimental': BaseModel,
  'family': FamilyModel,
  'functional': BaseModel,
  'gdm': BaseModel,
  'gene': BaseModel,
  'group': GroupModel,
  'individual': IndividualModel,
  'interpretation': BaseModel,
  'pathogenicity': BaseModel,
  'population': BaseModel,
  'provisional_variant': BaseModel,
  'provisionalClassification': BaseModel,
  'user': BaseModel,
  'variant': BaseModel,
  'snapshot': BaseModel,
  'vp_save': BaseModel,
  'vp_export': BaseModel,
  'variantScore': BaseModel,
}

ITEM_TYPE_TO_MODEL_INSTANCE = {}
