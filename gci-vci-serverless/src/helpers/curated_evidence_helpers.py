import datetime
import uuid

def build(curatedEvidence):
  """ Builds a new CurationEvidence item with default values for required fields
  and combines any fo the given attributes.
  """

  if 'variant' not in curatedEvidence or len(curatedEvidence['variant']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'PK'
  if 'rid' in curatedEvidence:
    pk = curatedEvidence['rid']
    del curatedEvidence['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    curatedEvidence.update({
      'date_created': now,
      'last_modified': now
    })
  curatedEvidence.update({
    'PK': pk,
    'item_type': 'curated-evidence',
  })
  return curatedEvidence

def get_related(db, curatedEvidence):
  ''' Fetches all items related to the given curatedEvidence object.

  Returns items related to this curatedEvidence. Inspects the cureatedEvidence for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.

  :param obj db: The database client used to execute the fetch request.
  :param obj curatedEvidence: The curated evidence to use as when fetching related objects.

  '''

  # Fetch all objects related to this curated evidence.
  # Variant should always be present.
  related_pks = [curatedEvidence['variant']]

  # Optional related items.
  if 'articles' in curatedEvidence:
    related_pks.extend(curatedEvidence['articles'])

  try:
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to curatedEvidence:\n%s' %e)
    raise
  else:
    return items