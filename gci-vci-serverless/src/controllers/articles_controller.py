import datetime
import json
import os
import uuid

from src.db.ddb_client import Client as DynamoClient

import src.clients.pubmed as pubmed
import src.helpers.article_helpers as article_helpers

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  
  if httpMethod == 'GET':
    if 'pk' in event.get('pathParameters', {}):
      response = find(event['pathParameters']['pk'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': "The path parameter 'pk' is required." }) }

  elif httpMethod == 'POST':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      article = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'The body of the request is not a valid JSON object.' }) }
    else:
      response = create(article)

  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /articles' }) }
  
  return response

def find(pk):
  ''' Finds and returns an article object with the given primary key.

  First looks in the database for a cached version of the article by the primary key. If no cached article
  is found we query and return an article from Pubmed.

  If no cached article exists but we're able to return an article from Pubmed it will not contain a 'PK' field.
  If you want to permanently save the article you must follow up this request with a request to POST /articles.

  :param str pk: The primary key of the article which is equivalent to a pubmed ID.
  '''

  if pk is None or len(pk) <= 0:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': "Must supply a valid pubmed ID." }) }

  article = None
  try:
    article = db.find(pk)
  except:
    # Ignore errors from this get. We'll just try and get it
    # directly from Pubmed.
    pass

  if article is not None:
    # If we have an article we can just return that.
    print("INFO: Found cached article with pubmed id " + pk)
    response = { 'statusCode': 200, 'body': json.dumps(article) }
  else:
    # Let's try and fetch it from Pubmed.
    try:
      print('INFO: Fetching article with id ' + pk + ' from Pubmed')
      article = pubmed.find(pk)
    except Exception as e:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Failed fetching article from Pubmed\n%s' %e }) }
    else:
      if article is not None:
        response = { 'statusCode': 200, 'body': json.dumps(article) }
      else:
        response = { 'statusCode': 404, 'body': json.dumps({}) }

  return response

def create(article):
  ''' Creates a new article item in our database with the given attributes.

  :param obj article: The article object to create. The pubmed ID is required.
  '''

  try:
    if 'pmid' not in article or len(article['pmid']) <= 0:
      raise ValueError()
    # legacy data handling
    article.update(article_helpers.build(article))
  except ValueError as ve:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'Missing PMID %s' %ve }) }
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'The article was not a valid object. %s' %e }) }
  else:

    try:
      # Save it to the database.
      article = db.put(article)
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e}) }
    else:
      response = { 'statusCode': 201, 'body': json.dumps(article) }

  return response