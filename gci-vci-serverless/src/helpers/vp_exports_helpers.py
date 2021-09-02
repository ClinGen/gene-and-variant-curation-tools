import datetime
import uuid

def build(vp_export):
  """ Builds a new vp_export item with default values for required fields
  and combines any fo the given attributes.
  """

  if 'filter_save' not in vp_export or len(vp_export['filter_save']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in vp_export:
    pk = vp_export['rid']
    del vp_export['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    vp_export.update({
      'date_created': now,
      'last_modified': now
    })

  vp_export.update({
    'PK': pk,
    'item_type': 'vp_export',
  })

  return vp_export