import datetime
import uuid

def build(article):
  """ Builds an empty article object with basic fields set to default values. 
  
  We leverage the unique Pubmed Id (pmid) by setting that value as our PK field. This means
  we can not build a new article object without a valid pmid. 
  """
  
  if 'pmid' not in article or len(article['pmid']) <= 0:
    raise ValueError()

  # Legacy support to migrate 'rid' to 'pk'
  if 'rid' in article:
    del article['rid']
  else:
    now = datetime.datetime.now().isoformat()
    article.update({
      'date_created': now,
      'last_modified': now
    })

  article.update({
    'PK': article['pmid'],
    'item_type': 'article',
    'pmid': article['pmid']
  })

  return article
