import datetime
import uuid

def build(pathogenicity):
  """ Builds a new pathogenicity item with default values for required fields
  and combines any fo the given attributes.
  """
  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in pathogenicity:
    pk = pathogenicity['rid']
    del pathogenicity['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    pathogenicity.update({
      'date_created': now,
      'last_modified': now
    })
  
  pathogenicity.update({
    'PK': pk,
    'item_type': 'pathogenicity',
  })

  return pathogenicity
