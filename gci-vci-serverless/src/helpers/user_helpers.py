import datetime
import uuid
# Possible user status values.
USER_STATUS_REQUESTED_ACTIVATION = 'requested activation'
USER_STATUS_ACTIVE = 'active'
USER_STATUS_INACTIVE = 'inactive'
def build(user):
  ''' Builds a user object with default values for required fields. '''
  print(user)
  PK = str(uuid.uuid4())
  INSTITUTION = '--'
  AFFILIATIONS =[]
  GROUPS=[]
  for key, value in user.items():
    if key == 'custom:institution':
      INSTITUTION = value
    elif key == 'custom:rid':
      PK = value
    elif key == 'custom:affiliations':
      new_value = value.replace("|",",").replace(']','').replace('[','')
      l = new_value.replace('"','').split(",")
      AFFILIATIONS = l
    elif key == 'custom:groups':
      new_value = value.replace("|",",").replace(']','').replace('[','')
      l = new_value.replace('"','').split(',')
      GROUPS = l
  now = datetime.datetime.now().isoformat()
  if 'custom:rid' in user:
    return {
      'PK': PK,
      'item_type': 'user',
      'user_status': USER_STATUS_ACTIVE,
      'institution': INSTITUTION,
      'affiliations': AFFILIATIONS,
      'groups': GROUPS
    }
  else: 
    return {
      'PK': str(uuid.uuid4()),
      'item_type': 'user',
      'date_created': now,
      'last_modified': now,
      'user_status': USER_STATUS_ACTIVE,
      'affiliations': AFFILIATIONS,
      'groups': GROUPS,
      'institution': INSTITUTION
    }