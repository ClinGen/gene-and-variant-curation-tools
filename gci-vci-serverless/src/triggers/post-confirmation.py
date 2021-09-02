import json
import os

from src.db.ddb_client import Client as DynamoClient

from src.helpers import user_helpers

# Create an instance of the database client for all db interactions.
db = DynamoClient(
  os.environ['DB_TABLE_NAME'],
  os.environ.get('IS_OFFLINE', 'false') == 'true'
)

def handler(event, context):
  ''' Handles the Cognito PreSignUp trigger. 
      If trigger source is ConfirmSignup then create user
      Otherwise (example Reset Password) do nothing
      Log full event in CloudWatch
  '''
  if (event['triggerSource'] =='PostConfirmation_ConfirmSignUp'): 
    try:
      create_user(event['request']['userAttributes'])
    except Exception as e:
      print('ERROR: Could not handle post confirmation trigger event: %s' %e)  
    if 'affiliations' in event['request']['userAttributes']:
      del event['request']['userAttributes']['affiliations']
    if 'groups' in event['request']['userAttributes']:
      del event['request']['userAttributes']['groups']
    if 'PK' in event['request']['userAttributes']:
      del event['request']['userAttributes']['PK']
    if 'item_type' in event['request']['userAttributes']:
      del event['request']['userAttributes']['item_type']
    if 'date_created' in event['request']['userAttributes']:
      del event['request']['userAttributes']['date_created']
    if 'last_modified' in event['request']['userAttributes']:
      del event['request']['userAttributes']['last_modified']
    if 'user_status' in event['request']['userAttributes']:
      del event['request']['userAttributes']['user_status']
    if 'institution' in event['request']['userAttributes']:
      del event['request']['userAttributes']['institution']
  print('Event %s' %event)
  return event

def create_user(user = {}):
  ''' Creates a user in our local database.

  Sets default values for the user such as PK, item_type, etc. You can provide additional user attributes
  that will be included in the object when saved.

  :param obj user: Additional user attributes to save in our local database record. Defaults to empty object.
  '''
  
  user.update(user_helpers.build(user))
  print ('User %s' %user)
  try:
    
    if 'cognito:email_alias' in user:
      del user['cognito:email_alias']
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
    db.put(user)
  except Exception as e:
    print('ERROR: Failed to create user post confirmation: %s' %e)
    raise
