import pandas as pd
import simplejson as json
import os

from decimal import Decimal

from .timeit import TimerPerf

import pprint
pp = pprint.PrettyPrinter(indent=2)

timer = TimerPerf()

def getStatusInfo (snapshot):
  statusInfo={}
  if 'last_modified' in snapshot:
    statusInfo['last_modified']=snapshot['last_modified']
  if 'classificationDate' in snapshot['resource']:
    statusInfo['classificationDate']=snapshot['resource']['classificationDate']
  if 'classificationStatus' in snapshot['resource']:
    statusInfo['classificationStatus']=snapshot['resource']['classificationStatus']
  if 'publishClassification' in snapshot['resource']:
    statusInfo['publishClassification']=snapshot['resource']['publishClassification']
  if 'approvedClassification' in snapshot['resource']:
    statusInfo['approvedClassification']=snapshot['resource']['approvedClassification']
  if 'provisionedClassification' in snapshot['resource']:
    statusInfo['provisionedClassification']=snapshot['resource']['provisionedClassification']
  if 'approvalDate' in snapshot['resource']:
    statusInfo['approvalDate']=snapshot['resource']['approvalDate']
  if 'publishDate' in snapshot['resource']:
    statusInfo['publishDate']=snapshot['resource']['publishDate']
  if 'provisionalDate' in snapshot['resource']:
    statusInfo['provisionalDate']=snapshot['resource']['provisionalDate']
  if ('PK' in snapshot):
    statusInfo['PK'] = snapshot['PK']
  return statusInfo


def getStatusInfoFromProvisional (provisional, type):
  statusInfo={}
  if 'last_modified' in provisional:
    statusInfo['last_modified']=provisional['last_modified']

  if 'classificationDate' in provisional:
    statusInfo['classificationDate']=provisional['classificationDate']

  if type == "Approved" and 'publishClassification' in provisional:
    statusInfo['publishClassification']=provisional['publishClassification']

  if type == "Approved" and 'approvedClassification' in provisional:
    statusInfo['approvedClassification']=provisional['approvedClassification']
    if statusInfo['approvedClassification'] is True:
      statusInfo['classificationStatus'] = type

  if type == "Provisional" and 'provisionedClassification' in provisional:
    statusInfo['provisionedClassification']=provisional['provisionedClassification']
    if statusInfo['provisionedClassification'] is True:
      statusInfo['classificationStatus'] = type

  if type == "Approved" and 'approvalDate' in provisional:
    statusInfo['approvalDate']=provisional['approvalDate']

  if type == "Approved" and 'publishDate' in provisional:
    statusInfo['publishDate']=provisional['publishDate']

  if type == "Provisional" and 'provisionalDate' in provisional:
    statusInfo['provisionalDate']=provisional['provisionalDate']

  if ('rid' in provisional):
    statusInfo['PK'] = provisional['rid']

  return statusInfo

@timer.timeit
def processNotApproved (provisionalClassification,db):
  snaps=[]
  if ('associatedClassificationSnapshots' in provisionalClassification ):
    for s in provisionalClassification['associatedClassificationSnapshots']:
      if ('uuid'in s):
        pk=s['uuid']
      else:
        pk=s
      #print ('Associated snapshot pk %s' %pk )
      snapshot=db.find(pk)
      #print ('Snapshot returned %s' %snapshot )
      if bool(snapshot) and 'resource' in snapshot:
        statusInfo=getStatusInfo(snapshot)
        snaps.append(statusInfo)
  return snaps

@timer.timeit
def processApproved (provisionalClassification):
  statuses=[]
  statusInfo = getStatusInfoFromProvisional(provisionalClassification, "Provisional")
  statuses.append(statusInfo)
  statusInfo = getStatusInfoFromProvisional(provisionalClassification, "Approved")
  statuses.append(statusInfo)
  return statuses

@timer.timeit
def appendSnapshotStatuses (db, gdms, filters):
  # Map of snap
  for gdm in gdms:
    if ('provisionalClassifications' in gdm):
      for c in gdm['provisionalClassifications']:
        checkProvisionalClassification=db.find(c)
        if ('affiliation' in filters and 'affiliation' in checkProvisionalClassification):
          currentAff = filters['affiliation']
          provisionAff = checkProvisionalClassification['affiliation']
          if (currentAff == provisionAff):
            provisionalClassification = checkProvisionalClassification
            if ('autoClassification' in provisionalClassification):
              gdm['autoClassification']= provisionalClassification['autoClassification']
            if ('alteredClassification' in provisionalClassification):
              gdm['alteredClassification']= provisionalClassification['alteredClassification']
            if ('classificationStatus' in provisionalClassification) : 
              statuses = []
              cs = provisionalClassification['classificationStatus']
              if (cs != 'Approved'):
                statuses= processNotApproved (provisionalClassification,db)
              elif (cs == 'Approved'):
                statuses= processApproved (provisionalClassification)
              gdm['snapshotStatuses']=statuses
            break
  return None

def warmup(db, filters, projections):
  return db.query_by_item_type('gdm',{
    'status!': 'deleted',
    **(filters if isinstance(filters, dict) else {})
  }, projections)

@timer.timeit
def get_gdms_by_affiliation(db, affiliation, projections):
  return db.query_by_affiliation(affiliation, filters={
    'status!': 'deleted',
    'item_type': 'gdm'
  }, projections=projections)

@timer.timeit
def get_gdms(db, filters, projections):
  return db.query_by_item_type('gdm',{
    'status!': 'deleted',
    **(filters if isinstance(filters, dict) else {})
  }, projections)


def getCustom(db, query_params):
  """Queries and returns all GDM objects"""
  projections= 'PK, gene, disease, diseaseTerm, submitted_by, affiliation, item_type, \
  provisionalClassifications, #status, modeInheritance,\
  last_modified, date_created'
  if (bool(query_params) and 'projections' in query_params):
    projections=query_params['projections']
    del query_params['projections']
  action=None
  if (bool(query_params) and 'action' in query_params):
    action=query_params['action']
    del query_params['action']
  filters = query_params
  print ('Gdms projections %s filters %s %s' %(projections, filters, action))
  
  if os.environ.get('WARMUP', None) is not None:
    print('Fired warmup')
    warmup(db, filters, projections)

  # If an affiliation was the only filter provided, use the affiliation index to query.
  # Otherwise, query using the item type index.
  if filters is not None and 'affiliation' in filters and len(filters) == 1:
    gdms = get_gdms_by_affiliation(db, filters['affiliation'], projections)
  else:
    gdms = get_gdms(db, filters, projections)
  
  #gdms = db.query_by_item_type('gdm',filters, projections)
  if (gdms is not None and len(gdms) > 0 ):
    if (filters is not None and 'affiliation' not in filters):
      gdms = [x for x in gdms if 'affiliation' not in x]
    if action == 'mygdms':
      appendSnapshotStatuses(db,gdms,filters)
  return gdms
