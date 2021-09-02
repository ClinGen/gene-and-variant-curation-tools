import datetime
import json
import os
import uuid
import importlib

from src.db.ddb_client import Client as DynamoClient
from src.helpers import user_helpers

# to handle - in file names

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handle(event):
  httpMethod = event['httpMethod']
  
  # POST endpoint only for migrating old user object data
  # once migration done, remove this endpoint so that
  # cognito pre sign up is the sole way to create user object
  if httpMethod == 'POST':
    response={}
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      migrated_user = body[key]
    except Exception as e:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'The body of the request is not a valid JSON object. ' + e }) }
    else:
      response = create_for_migrated_user (migrated_user)
    # record all users and exceptions in CloudWatch
    print(response)
  elif httpMethod == 'PUT':
    try:
      body = json.loads(event['body'])
      iterator = iter(body)
      key = next(iterator)
      user = body[key]
    except:
      response = { 'statusCode': 422, 'body': json.dumps({ 'error', 'The body of the request is not a valid JSON object.'}) }
    else:
      response = update(event['pathParameters']['pk'], user)
  elif httpMethod == 'GET':
    if event['path'] == '/users':
      response = get(event.get('queryStringParameters', {}))
    elif 'pk' in event['pathParameters']:
      response = find(event['pathParameters']['pk'])
    else:
      response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized path for ' + httpMethod }) }
  else:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': 'Unrecognized request ' + httpMethod + ' for /users' }) }

  return response
def cleanup(user):
  if 'cognito:email_alias' in user:
    del user['cognito:email_alias']
  if 'cognito:username' in user:
    del user['cognito:username']
  if 'cognito:user_status' in user:
    del user['cognito:user_status']
  if 'cognito:mfa_enabled' in user :
    del user['cognito:mfa_enabled']
  if 'custom:rid' in user:
    del user['custom:rid']
  if 'custom:groups' in user:
    del user['custom:groups']
  if 'custom:affiliations' in user: 
    del user['custom:affiliations']
  if 'custom:institution' in user:
    del user['custom:institution']

def create_for_migrated_user(migrated_user):
  """ Saves an user object to the database. 
  
  This method (and POST user endpoint) is only meant for migrating users from legacy system DB to new current architecture's DB.
  
  Once such migration is done, ths method and POST user endpoint should be removed and only Cognito pre sign up hook should be used to create user object in DB.
  """

  if not isinstance(migrated_user, dict):
    raise Exception(f'UserControllerException: in /users create endpoint, migrated_user should be an object (dict), but is {type(migrated_user)} instead: {migrated_user}')

  if 'rid' in migrated_user:
    migrated_user['PK'] = migrated_user['rid']
    del migrated_user['rid']
    migrated_user['item_type'] = 'user'
  else:
    migrated_user.update(user_helpers.build(migrated_user))
    # reset migrated users to active
    migrated_user['user_status']='active'
    cleanup(migrated_user)
  try:
    db.put(migrated_user)
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': 'ERROR: %s' %e }) }
  else:
    response = { 'statusCode': 201, 'body': json.dumps(migrated_user) }

  return response

def update(pk, attrs):
  """Updates an existing user object with the given PK"""

  # Some basic check on PK to make sure we're not saving a totally
  # bogus object. 
  if pk is None or len(pk) == 0:
    return { 'statusCode': 422, 'body': json.dumps({ 'error': 'Invalid primary key for user update'}) }

  # Update the last modified date.
  now = datetime.datetime.now().isoformat()
  attrs['last_modified'] = now

  try:
    user = db.update(pk, attrs, item_type='user')
  except Exception as e:
    response = { 'statusCode': 422, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(user) }

  return response

def get(filters = {}):
  """Queries and returns all user objects"""

  try:
    user = db.query_by_item_type('user', filters)
  except Exception as e:
    response = { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  else:
    response = { 'statusCode': 200, 'body': json.dumps(user) }

  return response

def find(pk):
  """Queries for a user type with the given PK"""

  try:
    user = db.find(pk)
  except Exception as e:
    return { 'statusCode': 400, 'body': json.dumps({ 'error': '%s' %e }) }
  
  if not user:
    return { 'statusCode': 404, 'body': json.dumps({ 'error': f'user {pk} not found' }) }

  return { 'statusCode': 200, 'body': json.dumps(user) }
