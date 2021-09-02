import datetime
import uuid

def build(population):
  """ Builds a new Population item with default values for required fields.
  
  You can provide a PK to this function to support legacy RID fields. If PK is
  None the item will get a new UUID.
  """
  if 'rid' in population:
    pk = population['rid']
    del population['rid']
  else:
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    population.update({
      'date_created': now,
      'last_modified': now
    })

  population.update({
    'PK': pk,
    'item_type': 'functional',
  })

  return population
