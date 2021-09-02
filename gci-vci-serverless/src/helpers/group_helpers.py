import datetime
import uuid

def build(group):
  """ Builds a new Group item with default values for required fields
  and combines any fo the given attributes.
  """

  if 'label' not in group or len(group['label']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in group:
    pk = group['rid']
    del group['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    group.update({
      'date_created': now,
      'last_modified': now
    })

  group.update({
    'PK': pk,
    'item_type': 'group',
  })

  return group

def get_related(db, group):
  ''' Fetches all items related to the given group.
  Returns items related to this group. Inspects the group for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.
  :param obj db: The database client used to execute the fetch request.
  :param obj group: The group to use as when fetching related objects.
  '''

  # Fetch all objects related to this group. 

  related_pks = []

  # Optional related items.
  if 'commonDiagnosis' in group:
    related_pks.extend(group['commonDiagnosis'])

  if 'otherGenes' in group:
    related_pks.extend(group['otherGenes'])

  if 'otherPMIDs' in group:
    related_pks.extend(group['otherPMIDs'])

  if 'familyIncluded' in group:
    related_pks.extend(group['familyIncluded'])

  if 'individualIncluded' in group:
    related_pks.extend(group['individualIncluded'])

  try: 
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to group:\n%s' %e)
    raise
  else:
    return items
