import datetime
import uuid

def build(variantScore):
  """ Builds a new variantScore item with default values for required fields
  and combines any fo the given attributes.
  """

  if 'variantScored' not in variantScore or 'evidenceScored' not in variantScore:
    raise ValueError()

  pk = str(uuid.uuid4())
  now = datetime.datetime.now().isoformat()
  variantScore.update({
    'PK': pk,
    'item_type': 'variantScore',
    'date_created': now,
    'last_modified': now
  })

  return variantScore

def get_related(db, variantScore):
  ''' Fetches all items related to the given variantScore.
  Returns items related to this variantScore. Inspects the variantScore for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.
  :param obj db: The database client used to execute the fetch request.
  :param obj variantScore: The variantScore to use as when fetching related objects.
  '''

  # Fetch all objects related to this variantScore. 

  related_pks = []

  # Related items.
  if 'variantScored' in variantScore:
    related_pks.extend(variantScore['variantScored'])

  try: 
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to variantScore:\n%s' %e)
    raise
  else:
    return items
