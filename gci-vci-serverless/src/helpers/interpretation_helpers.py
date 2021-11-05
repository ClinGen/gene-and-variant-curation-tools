import pandas as pd
import numpy as np
import json
import os

from .timeit import TimerPerf

import pprint
pp = pprint.PrettyPrinter(indent=2)

timer = TimerPerf()

def get_related(db, interpretation):
  ''' Fetches all items related to the given interpretation.

  Returns items related to this interpretation. Inspects the interpretation for
  related items (i.e. attributes that set as another item's primary key) and
  fetches them from the given database. Returns the list of found items.

  :param obj db: The database client used to execute the fetch request.
  :param obj interpretation: The interpretion to use as when fetching related objects.

  '''
  # Fetch all objects related to this interpretation. 
  # Variant should always be present.
  related_pks = [interpretation['variant']]

  # Optional related items.
  if 'disease' in interpretation:
    related_pks.append(interpretation['disease'])

  if 'curated_evidence_list' in interpretation:
    related_pks.extend(interpretation['curated_evidence_list'])

  if 'evaluations' in interpretation:
    related_pks.extend(interpretation['evaluations'])

  try: 
    items = db.all(related_pks)
  except Exception as e:
    print('ERROR: Failed to fetch items related to interpretation:\n%s' %e)
    raise
  else:
    return items

def build_complete(db, interpretation):
  ''' Builds and returns a complete interpretation object.

  A complete object is one where PK references to other objects are replaced
  by the objects themselves.

  :param obj db: The database client used to retrieve data from the DB.
  :param obj interpretation: The interpretation to update (to make complete).
  '''

  # Fetch all objects related to the provided interpretation
  try:
    related_objects = get_related(db, interpretation)
  except Exception as e:
    print('ERROR: Failed to build complete interpretation object:\n%s' %e)
    raise

  # Create a dictionary to lookup related objects by PK
  related_lookup = {}

  for related_index, related_object in enumerate(related_objects):
    if 'PK' in related_object:
      related_lookup.update({ related_object['PK']: related_index })

  # Replace related object PKs with corresponding objects
  try:
    interpretation['variant'] = related_objects[related_lookup[interpretation['variant']]]

    if 'disease' in interpretation:
      interpretation['disease'] = related_objects[related_lookup[interpretation['disease']]]

    if 'curated_evidence_list' in interpretation:
      for evidence_index, evidence_pk in enumerate(interpretation['curated_evidence_list']):
        interpretation['curated_evidence_list'][evidence_index] = related_objects[related_lookup[evidence_pk]]

    if 'evaluations' in interpretation:
      for evaluation_index, evaluation_pk in enumerate(interpretation['evaluations']):
        interpretation['evaluations'][evaluation_index] = related_objects[related_lookup[evaluation_pk]]
  except Exception as e:
    print('ERROR: Failed to build complete interpretation object:\n%s' %e)
    raise
  return interpretation

def add_snapshot(db, interpretation, snapshot_pk, status, timestamp):
  ''' Add the provided snapshot PK to the list of snapshots in the provided
  interpretation.

  :param obj db: The database client used to send data to the DB.
  :param obj interpretation: The interpretation to update (to record a new snapshot).
  :param str snapshot_pk: The PK of a recently-created snapshot.
  :param str status: The user action that triggered the creation of the snapshot.
  :param str timestamp: The date/time when the snapshot was created.
  '''

  # Need to calculate an overall status...

  # Update interpretation for new snapshot
  try:
    if 'associatedInterpretationSnapshots' in interpretation['provisionalVariant']:
      interpretation['provisionalVariant']['associatedInterpretationSnapshots'].append(snapshot_pk)
    else:
      interpretation['provisionalVariant']['associatedInterpretationSnapshots'] = [snapshot_pk]

    interpretation['overall_status'] = status
    interpretation['last_modified'] = timestamp

    interpretation = db.update(interpretation['PK'], interpretation, item_type='interpretation')
  except Exception as e:
    print('ERROR: Failed to add snapshot to interpretation:\n%s' %e)
    raise
  
  return interpretation

def get_items_in_batch(db,pks):
  slices = (len(pks)/100)+1
  rid_batch = np.array_split(np.array(pks), slices)
  items = []
  for i in range(0,len(rid_batch)):
    rids=list(set(rid_batch[i].tolist()))
    items = items + db.all(rids)
  return items

def cleanNullTerms(d):
   return {
      k:v
      for k, v in d.items()
      if v == v or v == "" or v ==''
   }

@timer.timeit
# TODO: not used so remove later
def getAllMetCriteriaStatuses(db,filters):
  projections= 'PK, criteria, criteriaModifier'
  if 'affiliation' in filters:
    filters = {"affiliation": filters['affiliation'], "criteriaStatus": "met"}
  elif 'submitted_by' in filters:
    filters = {"submitted_by": filters['submitted_by'], "criteriaStatus": "met"}
  evaluations = db.query_by_item_type('evaluation', filters, projections)
  for evaluation in evaluations:
    if 'criteriaModifier' in evaluation:
      evaluation['criteria'] = evaluation['criteria'] + '_' + evaluation['criteriaModifier']
  if ('affiliation' not in filters):
    evaluations = [x for x in evaluations if 'affiliation' not in x]
  return evaluations

@timer.timeit
def getAllMetCriteriaStatuses_by_affiliation(db,filters):
  projections= 'PK, criteria, criteriaModifier'
  evaluations = None
  if 'affiliation' in filters:
    affiliation = filters['affiliation']
    
    evaluations = db.query_by_affiliation(affiliation, {
      'criteriaStatus': "met",
      'item_type': 'evaluation'
    })
    filters = {"affiliation": affiliation, "criteriaStatus": "met"}
  elif 'submitted_by' in filters:
    filters = {"submitted_by": filters['submitted_by'], "criteriaStatus": "met"}
    evaluations = db.query_by_item_type('evaluation', filters, projections)

  for evaluation in evaluations:
    if 'criteriaModifier' in evaluation:
      evaluation['criteria'] = evaluation['criteria'] + '_' + evaluation['criteriaModifier']
  if ('affiliation' not in filters):
    evaluations = [x for x in evaluations if 'affiliation' not in x]
  return evaluations

def getSnapInfo (snapshot):
  #print('SNAPSHOT RESOURCE in %s getSnapInfo' %snapshot['resource'])
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
  #print('statusInfo %s' %statusInfo)
  return statusInfo

def getStatusInfo (provisionalVariant, type):
  statusInfo={}
  if 'last_modified' in provisionalVariant:
    statusInfo['last_modified']=provisionalVariant['last_modified']

  if 'classificationDate' in provisionalVariant:
    statusInfo['classificationDate']=provisionalVariant['classificationDate']

  if type == "Approved" and 'publishClassification' in provisionalVariant:
    statusInfo['publishClassification']=provisionalVariant['publishClassification']

  if type == "Approved" and 'approvedClassification' in provisionalVariant:
    statusInfo['approvedClassification']=provisionalVariant['approvedClassification']
    if statusInfo['approvedClassification'] is True:
      statusInfo['classificationStatus'] = type

  if type == "Provisional" and 'provisionedClassification' in provisionalVariant:
    statusInfo['provisionedClassification']=provisionalVariant['provisionedClassification']
    if statusInfo['provisionedClassification'] is True:
      statusInfo['classificationStatus'] = type

  if type == "Approved" and 'approvalDate' in provisionalVariant:
    statusInfo['approvalDate']=provisionalVariant['approvalDate']

  if type == "Approved" and 'publishDate' in provisionalVariant:
    statusInfo['publishDate']=provisionalVariant['publishDate']

  if type == "Provisional" and 'provisionalDate' in provisionalVariant:
    statusInfo['provisionalDate']=provisionalVariant['provisionalDate']

  if ('rid' in provisionalVariant):
    statusInfo['PK'] = provisionalVariant['rid']

  return statusInfo


def getStatusInfoFromSnapshot(interpretation,db):
  return [
    getSnapInfo(s) 
    for s in db.all( interpretation.get('snapshots',[]) ) 
    if bool(s) and 'resource' in s
  ]


# TODO: not used so remove later
def getStatusInfoFromSnapshotOld(interpretation, db):
  snaps=[]
  if ('snapshots' in interpretation):
    #projections= 'approvalStatus,last_modified,#resource'
    #snaps = [getSnapInfo(s) for s in db.all(interpretation['snapshots']) if bool(s) and 'resource' in s]
    for s in interpretation['snapshots']:
      snapshot=db.find(s)
      #print('SNAPSHOT AFTER DB FIND inside getStatusInfoFromSnapshot', snapshot)
      if bool(snapshot) and 'resource' in snapshot:
        statusInfo=getSnapInfo(snapshot)
        snaps.append(statusInfo)
  # print ('Founds provisional status in snapshot %s for interpretation %s' %(snaps,interpretation['PK']))
  return snaps

@timer.timeit
def appendSnapshotStatuses(db, interpretations,filters):
  for interpretation in interpretations:
    if ('provisionalVariant' in interpretation):
        if ('autoClassification' in interpretation['provisionalVariant']):
          interpretation['autoClassification']= \
            interpretation['provisionalVariant']['autoClassification']
        if ('alteredClassification' in interpretation['provisionalVariant']):
          interpretation['alteredClassification']= \
            interpretation['provisionalVariant']['alteredClassification']
        
        if ('classificationStatus' in interpretation['provisionalVariant']): 
          statuses = []
          cs = interpretation['provisionalVariant']['classificationStatus']
          if (cs != 'Approved'):
            snap_list = interpretation.get('snapshots', [])
            if len(snap_list) != 0:
              statuses= getStatusInfoFromSnapshot(interpretation,db)
            #print('STATUSES RETURN AFTER getStatusInfoFromSnapshot', statuses)
          elif (cs == 'Approved'):
            statusInfo = getStatusInfo(interpretation['provisionalVariant'], "Provisional")
            statuses.append(statusInfo)
            statusInfo = getStatusInfo(interpretation['provisionalVariant'], "Approved")
            statuses.append(statusInfo)
          

          # print ('Founds snapshot statuses in provisonalVariant %s for interpretation %s' %(statuses,interpretation['PK']))
          interpretation['snapshotStatuses'] = statuses
          del interpretation['provisionalVariant']
  return None

@timer.timeit 
# TODO: not user so remove later
def appendSnapshotStatusesTest(db, interpretations, filters):
  affiliation = filters['affiliation']
  snapshot_filter = {'resource.affiliation': affiliation}
  snapshots = db.query_by_item_type('snapshot', snapshot_filter)
  status_infos = {s['PK']:getSnapInfo(s) for s in snapshots}

  for interpretation in interpretations:
    if ('provisionalVariant' in interpretation):
      if ('autoClassification' in interpretation['provisionalVariant']):
        interpretation['autoClassification']= \
          interpretation['provisionalVariant']['autoClassification']
      if ('alteredClassification' in interpretation['provisionalVariant']):
        interpretation['alteredClassification']= \
          interpretation['provisionalVariant']['alteredClassification']
      if interpretation.get('snapshots',None) is not None: 
        '''
        interpretation['snapshotStatuses'] = [
          status_infos.get(spk)
          for spk in interpretation['snapshots']
        ]
        '''
        snapshotStatuses=[]
        for spk in interpretation['snapshots']:
          status_info=status_infos.get(spk)
          if bool(status_info):
            snapshotStatuses.append(status_info)
          else:
            print ('no dashboard status for snapshot %s %s \n' %(spk,json.dumps(interpretation)))
        if bool(snapshotStatuses):
          interpretation['snapshotStatuses']=snapshotStatuses
        else:
          print ('Skipping, interpretation-affiliation mismatch %s \n' %(json.dumps(interpretation)))
      del interpretation['provisionalVariant']
    
  return None
  

def getAllVariantsWithTitle (db):
  projections= 'PK,preferredTitle'
  #filters = {"criteriaStatus":"met"}
  filters={}
  variants = db.query_by_item_type('variant',filters,projections)
  return variants

@timer.timeit
def append_criteria (db,interpretations,filters):
  dfie=None

  try:
    #evaluations=getAllMetCriteriaStatuses(db,filters)
    evaluations=getAllMetCriteriaStatuses_by_affiliation(db,filters)
    # Create a dataframe and match column to merge (PK)
    # with evaluations in Interpretation
    dfe=pd.DataFrame(evaluations).rename(index=str, columns={"PK" : "evaluations"})
    dfi=pd.DataFrame(interpretations, columns=[ 'PK','evaluations']) \
      .explode('evaluations')
    dfie=pd.merge(dfi,dfe,on='evaluations')\
      .groupby(['PK'])['criteria']\
      .apply(', '.join)
  except Exception as e:
    print('No Evaluations for affiliation/user:\n%s' %e)
  
  return dfie

def append_variant_title_all_interp (db,interpretations):

  pd.set_option('display.max_rows', None)
  pd.set_option('display.max_columns', None)
  pd.set_option('display.width', None)
  pd.set_option('display.max_colwidth', -1)

  variants=getAllVariantsWithTitle(db)
  print (f' all Number of variants returned = {len(variants)}')
  dfi=pd.DataFrame(interpretations, columns=[ \
  'PK','variant','item_type', 'submitted_by', 'affiliation', \
   'diseaseTerm','disease','status','modeInheritance',\
  'last_modified','date_created']) \
    .fillna("")
  print (f'all Interpretation dimensions {dfi.shape}')
  dfv=pd.DataFrame(variants).rename(index=str, columns={"PK" : "variant"}) \
    .fillna("")
  print (f'Variant dimensions {dfv.shape}')
  df=pd.merge(dfi,dfv,on='variant')
  print (f'all Interpretations+ Variant merged {df.shape}')
  # print ('Af Merge 2 Int DF,Var= \n %s \n' %dff)
  interpretations_with_prefTitle= df.to_dict('records')
  interpretations_no_nulls=[]
  for i in interpretations_with_prefTitle:
    interpretations_no_nulls.append(cleanNullTerms(i))
  print (f' all Variant + Interpretations len after null cleanup {len(interpretations_no_nulls)}' )
  return interpretations_no_nulls

@timer.timeit
def append_variant_title (db,interpretations,dfie=None):

  pd.set_option('display.max_rows', None)
  pd.set_option('display.max_columns', None)
  pd.set_option('display.width', None)
  pd.set_option('display.max_colwidth', None)

  variants=getAllVariantsWithTitle(db)
  print (f'Number of variants returned = {len(variants)}')
  dfi=pd.DataFrame(interpretations, columns=[ \
  'PK','variant','snapshotStatuses','item_type', 'submitted_by', 'affiliation', \
    'autoClassification', 'alteredClassification',
   'diseaseTerm','disease','status','modeInheritance',\
  'last_modified','date_created','pathogenicity','modifiedPathogenicity']) \
    .fillna("")
  print (f'Interpretation dimensions {dfi.shape}')
  dfi['snapshotStatuses'].apply(pd.Series)
  print (f'Interpretation dimensions after serializing snaps {dfi.shape}')
  dfv=pd.DataFrame(variants).rename(index=str, columns={"PK" : "variant"}) \
    .fillna("")
  print (f'Variant dimensions {dfv.shape}')
  df=pd.merge(dfi,dfv,on='variant')
  print (f'Interpretations+ Variant merged {df.shape}')
  if dfie is None:
    dff = df
  else:
    df['snapshotStatuses'].apply(pd.Series)
    # print ('Bef Merge 2 Int DF,Var= \n %s \n' %df)
    #print ('Merge 2 Eval DF= \n %s \n' %dfie)
    dff=pd.merge(df,dfie,on='PK',how='outer')
  interpretations_with_prefTitle= dff.to_dict('records')
  interpretations_no_nulls=[]
  for i in interpretations_with_prefTitle:
    interpretations_no_nulls.append(cleanNullTerms(i))
  print (f'Variant + Interpretations len after null cleanup {len(interpretations_no_nulls)}' )
  return interpretations_no_nulls

@timer.timeit
def get_interpretations(db, filters, projections):
  return db.query_by_item_type('interpretation',{
    'status!': 'deleted',
    **(filters if isinstance(filters, dict) else {})
  }, projections)

@timer.timeit
def get_interpretations_by_affiliation(db, affiliation, projections):
  return db.query_by_affiliation(affiliation, filters={
    'status!': 'deleted',
    'item_type': 'interpretation'
  }, projections=projections)

def warmup(db, filters, projections):
  return db.query_by_item_type('interpretation',{
    'status!': 'deleted',
    **(filters if isinstance(filters, dict) else {})
  }, projections)

@timer.timeit
def getDereferenced(db, query_params):
  """Queries and returns all Interpretation objects"""    
  projections= 'PK,variant,disease, submitted_by, affiliation, item_type, snapshots, \
  provisionalVariant,diseaseTerm, #status, modeInheritance,\
  last_modified,date_created,pathogenicity,modifiedPathogenicity, evaluations'

  if (bool(query_params) and 'projections' in query_params):
    projections=query_params['projections']
    del query_params['projections']

  action=None
  if (bool(query_params) and 'action' in query_params):
    action=query_params['action']
    del query_params['action']

  filters = query_params
  print ('Interpretation projections: [%s], filters [%s], action [%s]' %(projections, filters, action))

  ## Call this method (which takes time) but should warm up the connection
  ## and have a more accurate comparison of times. This will make the full
  ## call take longer.
  if os.environ.get('WARMUP', None) is not None:
    warmup(db, filters, projections)

  ###### Get the interpretations
  # If an affiliation was the only filter provided, use the affiliation index to query.
  # Otherwise, query using the item type index.
  interpretations = []
  if filters is not None and 'affiliation' in filters and len(filters) == 1:
    interpretations = get_interpretations_by_affiliation(db, filters['affiliation'], projections)
  else:
    interpretations = get_interpretations(db, filters, projections)
  
  if (interpretations is not None and len(interpretations) > 0 ):
    if (filters is not None and 'affiliation' not in filters):
      interpretations = [x for x in interpretations if 'affiliation' not in x]
    
    dfie=None
    if action == 'myinterpretations': #dashboard
      appendSnapshotStatuses(db,interpretations,filters)
      dfie = append_criteria (db,interpretations,filters)
      #print ('\n Inter after snapshots and criteria %s \n' %interpretations)
      interpretations_with_prefTitle = append_variant_title (db,interpretations,dfie)
      return interpretations_with_prefTitle
    else:
      interpretations_with_prefTitle = append_variant_title_all_interp (db,interpretations)
      return interpretations_with_prefTitle
  else:
    return interpretations
