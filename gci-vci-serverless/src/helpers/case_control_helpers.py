import datetime
import uuid

def build(caseControl):
  """ Builds a new caseControl item with default values for required fields
  and combines any fo the given attributes.
  """

  if 'label' not in caseControl or len(caseControl['label']) <= 0 or 'caseCohort' not in caseControl or len(caseControl['caseCohort']) <= 0 or 'controlCohort' not in caseControl or len(caseControl['controlCohort']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in caseControl:
    pk = caseControl['rid']
    del caseControl['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    caseControl.update({
      'date_created': now,
      'last_modified': now
    })

  caseControl.update({
    'PK': pk,
    'item_type': 'caseControl',
  })

  return caseControl

def get_related(db, caseControl):
  ''' Fetches all items related to the given caseControl.
  Returns items related to this caseControl. Inspects the caseControl for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.
  :param obj db: The database client used to execute the fetch request.
  :param obj caseControl: The caseControl to use as when fetching related objects.
  '''

  # Fetch all objects related to this caseControl. 

  # caseCohort and controlCohort groups should always be present.
  related_pks = [caseControl['caseCohort']]
  related_pks.extend(caseControl['controlCohort'])

  # Optional related items.
  if 'scores' in caseControl:
    related_pks.extend(caseControl['scores'])

  try: 
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to caseControl:\n%s' %e)
    raise
  else:
    return items
