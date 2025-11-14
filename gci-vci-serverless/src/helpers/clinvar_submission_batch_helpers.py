import datetime
import uuid

def start_new_batch(affiliation_id):
  now = datetime.datetime.now()

  return {
    'PK': str(uuid.uuid4()),
    'affiliation': affiliation_id,
    'batch_members': [],
    'batch_name': now.strftime('%B %Y'),
    'batch_status': 'open',
    'date_created': now.isoformat(),
    'item_type': 'clinvar-submission-batch',
    'last_modified': now.isoformat()
  }
