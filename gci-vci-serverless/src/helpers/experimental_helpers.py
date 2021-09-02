import datetime
import uuid

def build(experimental):
  """ Builds a new Experimental item with default values for required fields
  and combines any fo the given attributes.
  """

  if 'label' not in experimental or len(experimental['label']) <= 0 or 'evidenceType' not in experimental or len(experimental['evidenceType']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in experimental:
    pk = experimental['rid']
    del experimental['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    experimental.update({
      'date_created': now,
      'last_modified': now
    })

  experimental.update({
    'PK': pk,
    'item_type': 'experimental',
  })

  return experimental

def get_related(db, experimental):
  ''' Fetches all items related to the given experimental.
  Returns items related to this experimental. Inspects the experimental for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.
  :param obj db: The database client used to execute the fetch request.
  :param obj experimental: The experimental to use as when fetching related objects.
  '''

  # Fetch all objects related to this experimental. 

  related_pks = []

  # Optional related items.
  if 'biochemicalFunction' in experimental:
    if 'geneWithSameFunctionSameDisease' in experimental['biochemicalFunction']:
      if 'genes' in experimental['biochemicalFunction']['geneWithSameFunctionSameDisease']:
        related_pks.extend(experimental['biochemicalFunction']['geneWithSameFunctionSameDisease']['genes'])

  if 'proteinInteractions' in experimental:
    if 'interactingGenes' in experimental['proteinInteractions']:
      related_pks.extend(experimental['proteinInteractions']['interactingGenes'])

  if 'variants' in experimental:
    related_pks.extend(experimental['variants'])

  if 'scores' in experimental:
    related_pks.extend(experimental['scores'])

  try: 
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to experimental:\n%s' %e)
    raise
  else:
    return items
