import datetime
import uuid

def build(gene):
  """ Builds a new Gene item with default values for required fields
  and combines any fo the given attributes.
  """
  if 'hgncId' not in gene or len(gene['hgncId']) <= 0 or 'symbol' not in gene or len(gene['symbol']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in gene:
    del gene['rid']
  else:
    now = datetime.datetime.now().isoformat()
    gene.update({
      'date_created': now,
      'last_modified': now
    })

  gene.update({
    'PK': gene['symbol'],
    'item_type': 'gene',
  })

  return gene

