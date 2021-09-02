import datetime
import uuid

def build(individual):
  """ Builds a new Individual item with default values for required fields
  and combines any fo the given attributes.
  """

  if 'label' not in individual or len(individual['label']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in individual:
    pk = individual['rid']
    del individual['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    individual.update({
      'date_created': now,
      'last_modified': now
    })

  individual.update({
    'PK': pk,
    'item_type': 'individual',
  })

  return individual

def get_related(db, individual):
  ''' Fetches all items related to the given individual.
  Returns items related to this individual. Inspects the individual for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.
  :param obj db: The database client used to execute the fetch request.
  :param obj individual: The individual to use as when fetching related objects.
  '''

  # Fetch all objects related to this individual. 

  related_pks = []

  # Optional related items.
  if 'diagnosis' in individual:
    related_pks.extend(individual['diagnosis'])

  if 'otherPMIDs' in individual:
    related_pks.extend(individual['otherPMIDs'])

  if 'variants' in individual:
    related_pks.extend(individual['variants'])

  if 'scores' in individual:
    related_pks.extend(individual['scores'])

  if 'variantScores' in individual:
    related_pks.extend(individual['variantScores'])

  try: 
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to individual:\n%s' %e)
    raise
  else:
    return items
