import datetime
import uuid

def build(functionalData):
  """ Builds a new Functional item with default values for required fields.
  
  You can provide a PK to this function to support legacy RID fields. If PK is
  None the item will get a new UUID.
  """
  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in functionalData:
    pk = functionalData['rid']
    del functionalData['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    functionalData.update({
      'date_created': now,
      'last_modified': now
    })

  functionalData.update({
    'PK': pk,
    'item_type': 'functional',
  })

  return functionalData
