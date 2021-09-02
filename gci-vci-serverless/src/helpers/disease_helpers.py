import datetime
import uuid

def build(disease):
  """ Builds an empty disease object with basic fields set to default values. 
  
  We leverage the unique MONDO id by setting that value as our PK field. This means
  we can not build a new disease object without a valid MONDO id. 
  """

  if 'rid' in disease:
    del disease['rid']
  else:
    now = datetime.datetime.now().isoformat()
    disease.update({
      'date_created': now,
      'last_modified': now
    })

  disease.update({
    'PK': disease['PK'],
    'item_type': 'disease'
  })

  return disease
