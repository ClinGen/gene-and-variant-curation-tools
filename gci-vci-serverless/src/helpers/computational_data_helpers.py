import datetime
import uuid

def build(computationalData):
  """ Builds a new Computational item with default values for required fields.
  
  You can provide a PK to this function to support legacy RID fields. If PK is
  None the item will get a new UUID.
  """
  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in computationalData:
    pk = computationalData['rid']
    del computationalData['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    computationalData.update({
      'date_created': now,
      'last_modified': now
    })

  computationalData.update({
    'PK': pk,
    'item_type': 'computational',
  })

  return computationalData