import datetime
import uuid

def build(assessment):
  """ Builds a new Assessment item with default values for required fields
  and combines any fo the given attributes.
  """
  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in assessment:
    pk = assessment['rid']
    del assessment['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    assessment.update({
      'date_created': now,
      'last_modified': now
    })
  
  assessment.update({
    'PK': pk,
    'item_type': 'assessment',
  })

  return assessment
