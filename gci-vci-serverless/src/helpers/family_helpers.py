import datetime
import uuid

def build(family):
  """ Builds a new Family item with default values for required fields
  and combines any fo the given attributes.
  """

  if 'label' not in family or len(family['label']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in family:
    pk = family['rid']
    del family['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    family.update({
      'date_created': now,
      'last_modified': now
    })

  family.update({
    'PK': pk,
    'item_type': 'family',
  })

  return family

def get_related(db, family):
  ''' Fetches all items related to the given family.
  Returns items related to this family. Inspects the family for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.
  :param obj db: The database client used to execute the fetch request.
  :param obj family: The family to use as when fetching related objects.
  '''

  # Fetch all objects related to this family. 

  related_pks = []

  # Optional related items.
  if 'commonDiagnosis' in family:
    related_pks.extend(family['commonDiagnosis'])

  if 'otherPMIDs' in family:
    related_pks.extend(family['otherPMIDs'])

  if 'individualIncluded' in family:
    related_pks.extend(family['individualIncluded'])

  if 'segregation' in family:
    if 'variants' in family['segregation']:
      related_pks.extend(family['segregation']['variants'])

  try: 
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to family:\n%s' %e)
    raise
  else:
    return items
