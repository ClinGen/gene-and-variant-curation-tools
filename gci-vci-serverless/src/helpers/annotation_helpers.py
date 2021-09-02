import datetime
import uuid

def build(annotation):
  """ Builds a new Annotation item with default values for required fields
  and combines any fo the given attributes.
  """

  if 'article' not in annotation or len(annotation['article']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in annotation:
    pk = annotation['rid']
    del annotation['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    annotation.update({
    'date_created': now,
    'last_modified': now
  })
  
  annotation.update({
    'PK': pk,
    'item_type': 'annotation',
  })
  return annotation

def get_related(db, annotation):
  ''' Fetches all items related to the given annotation.

  Returns items related to this annotation. Inspects the annotation for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.

  :param obj db: The database client used to execute the fetch request.
  :param obj annotation: The annotation to use as when fetching related objects.

  '''

  # Fetch all objects related to this annotation. 

  # article should always be present.
  related_pks = [annotation['article']]

  # Optional related items.
  if 'groups' in annotation:
    related_pks.extend(annotation['groups'])

  if 'families' in annotation:
    related_pks.extend(annotation['families'])

  if 'individuals' in annotation:
    related_pks.extend(annotation['individuals'])

  if 'caseControlStudies' in annotation:
    related_pks.extend(annotation['caseControlStudies'])

  if 'experimentalData' in annotation:
    related_pks.extend(annotation['experimentalData'])

  try: 
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to annotation:\n%s' %e)
    raise
  else:
    return items
