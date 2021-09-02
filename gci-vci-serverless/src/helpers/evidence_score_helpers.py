import datetime
import uuid

def build(evidenceScore):
  """ Builds a new evidenceScore item with default values for required fields
  and combines any fo the given attributes.
  """
  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in evidenceScore:
    pk = evidenceScore['rid']
    del evidenceScore['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    evidenceScore.update({
      'date_created': now,
      'last_modified': now
    })

  evidenceScore.update({
    'PK': pk,
    'item_type': 'evidenceScore',
  })

  return evidenceScore
