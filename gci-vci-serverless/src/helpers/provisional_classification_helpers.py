import datetime
import uuid
import os

def build(provisionalClassification):
  """ Builds a new provisionalClassification item with default values for required fields
  and combines any fo the given attributes.
  """
  #print ("migration env %s" %(os.environ.get('MIGRATION')))

  if  ('classificationPoints' not in provisionalClassification \
    or 'autoClassification' not in provisionalClassification \
    or len(provisionalClassification['autoClassification']) <= 0):
    raise ValueError()

  # Legacy support to migrate 'rid' to 'PK'
  if 'rid' in provisionalClassification:
    provisionalClassification['PK'] = provisionalClassification['rid']
    del provisionalClassification['rid']
  else:
    provisionalClassification['PK'] = str(uuid.uuid4())

    # Set timestamps (for new data)
    now = datetime.datetime.now().isoformat()
    provisionalClassification['date_created'] = now
    provisionalClassification['last_modified'] = now

  provisionalClassification['item_type'] = 'provisionalClassification'

  return provisionalClassification

def get_related(db, provisionalClassification):
  ''' Fetches all items related to the given provisionalClassification.

  Returns items related to this provisionalClassification. Inspects the provisionalClassification for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.

  :param obj db: The database client used to execute the fetch request.
  :param obj provisionalClassification: The provisionalClassification to use as when fetching related objects.

  '''

  # Fetch all objects related to this provisionalClassification. 

  related_pks = []

  # Optional related items.
  # TODO: may want to store uuid in associatedClassificationSnapshots
  if 'associatedClassificationSnapshots' in provisionalClassification:
    related_pks.extend(provisionalClassification['associatedClassificationSnapshots'])

  try: 
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to provisionalClassification:\n%s' %e)
    raise
  else:
    return items
