import datetime
import uuid
import os

import simplejson as json

from src.db.s3_client import Client as S3Client
from decimal import Decimal

case_info_types = {
  'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT': 'Proband with other variant type with some evidence of gene impact',
  'PREDICTED_OR_PROVEN_NULL_VARIANT': 'Proband with predicted or proven null variant',
  'VARIANT_IS_DE_NOVO': 'Variant is de novo',
  'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS': 'Two variants (not predicted/proven null) with some evidence of gene impact in trans',
  'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO': 'Two variants in trans and at least one de novo or a predicted/proven null variant'
}

variant_score_variant_types = {
  'PREDICTED_OR_PROVEN_NULL': 'Predicted or proven null',
  'OTHER_VARIANT_TYPE': 'Other Variant Type'
}

def get_from_archive(archive_key):
  ''' Download a snapshot's curation data from S3.

  :param str archive_key: The curation data's location (S3 bucket and file path). This value is required.
  '''

  if archive_key is None or '/' not in archive_key:
    raise ValueError()

  bucket, key = archive_key.split('/', 1)

  s3_client = S3Client()

  try:
    archive_object = json.loads(s3_client.get_object(bucket, key)['Body'].read(),parse_float=Decimal)
  except Exception as e:
    print('ERROR: Error downloading ' + key + ' from ' + bucket + ' bucket. ERROR\n%s' %e)
    raise

  return archive_object

def build(snapshot={}):
  ''' Builds and returns a valid snapshot object.

  Builds a new snapshot object by creating default values for
  required fields and combines any of the given attributes.
  '''

  # Legacy support to migrate 'rid' to 'PK'
  if 'rid' in snapshot:
    snapshot['PK'] = snapshot['rid']
    del snapshot['rid']
  else:
    snapshot['PK'] = str(uuid.uuid4())

    # Set timestamps (for new data)
    now = datetime.datetime.now().isoformat()
    snapshot['date_created'] = now
    snapshot['last_modified'] = now

  snapshot['item_type'] = 'snapshot'

  return snapshot

def archive(bucket, snapshot_pk, curation_data):
  ''' Archives a snapshot's curation data to S3.

  Uploads the curation data object as a JSON file to S3. The location of the archive
  depends on the bucket and the primary key of the curation data. If the upload fails,
  an exception is raised. If successful, returns the archive location.

  :param str bucket: The name of the S3 bucket for the archive. This value is required.
  :param str snapshot_pk: The snapshot PK to use as the name of the JSON file. This value is required.
  :param obj curation_data: The curation data object to archive. This value is required.
  '''

  if bucket is None or len(bucket) <= 0:
    raise ValueError()

  if snapshot_pk is None or len(snapshot_pk) <= 0:
    raise ValueError()

  if not curation_data:
    raise ValueError()

  archive_file = __archive_key(curation_data) + '/' + snapshot_pk + '.json'

  # Upload curation data to S3 archive bucket.
  s3_client = S3Client()

  try:
    s3_client.put_object(
      bytes(json.dumps(curation_data).encode('UTF-8')),
      bucket,
      archive_file
    )
  except Exception as e:
    print('ERROR: Error uploading ' + archive_file + ' to ' + bucket + ' bucket. ERROR\n%s' %e)
    raise

  archive_key_comps = [bucket, archive_file]

  return '/'.join(archive_key_comps)

def __archive_key(curation_data):
  return curation_data['PK']

def get_snapshots(db, params):
  """Queries and returns all requested snapshot objects"""
  query_params = {}

  if params is not None and len(params) > 0:
    # To support initial request
    # /snapshots?x-api-key=<api-key>&target=gci&affiliation=<affId>&status=approved&start=2021-06-01&end=2021-07-28
    # /snapshots?x-api-key=<api-key>&target=gci&affiliation=<affId>&status=approved&start=2021-06-01&end=2021-07-28
    # Add &count if only want to get the number of gdms found
    # curl example:
    # Check query params include required params: target, affiliation, status, start, and end
    if 'target' in params and 'affiliation' in params and 'status' in params and 'start' in params and 'end' in params:
      # build filters from given params
      filters = {}
      filters['resource.affiliation'] = params['affiliation']
      filters['approvalStatus'] = 'Approved'
      if params['target'] == 'gci':
        filters['resourceType'] = 'classification'
      else:
        filters['resourceType'] = 'interpretation'

      if params['status'] == 'published':
        # Add this filter, classifications that were published within given date range
        # and still have published status now are returned
        # Note: If a classification was published more than once within the time range, only last publish is found
        # snapshot.publishClassification is set to false and publishDate was set to unpublish date when it was unpublished
        filters['resource.publishClassification'] = True
        filters['resource.publishDate[between]'] = params['start'] + ',' + params['end']
      else:
        filters['resource.approvalDate[between]'] = params['start'] + ',' + params['end']

      filters['status!'] = 'deleted'

      projections = 'PK,#resource,resourceParent,affiliation,item_type'

      print ('snapshots projections %s filters %s ' %(projections, filters))

      snapshots = db.query_by_item_type('snapshot', filters, projections)

      return snapshots

def get_variant_title(variant):
  if 'preferredTitle' in variant:
    return variant['preferredTitle']
  elif 'clinvarVariantTitle' in variant:
    return variant['clinvarVariantTitle']
  elif 'clinvarVariantId' in variant:
    return variant['clinvarVariantId']
  elif 'CarId' in variant:
    return variant['CarId']
  else:
    return variant['PK']

def get_score_data(score):
  scoreData = {}
  if 'caseInfoType' in score:
    scoreData['Variant Type'] = case_info_types[score['caseInfoType']]
  if 'scoreStatus' in score:
    scoreData['Score Status'] = score['scoreStatus']
  if 'calculatedScore' in score:
    scoreData['Default Score'] = float(score['calculatedScore'])
  if 'score' in score:
    scoreData['Modified Score'] = float(score['score'])
  if 'scoreExplanation' in score:
    scoreData['Modified Score Explanation'] = score['scoreExplanation']

  return scoreData

def get_variant_score_data(variantScore):
  scoreData = {}
  if 'variantScored' in variantScore:
    scoreData['variant'] = get_variant_title(variantScore['variantScored'])
  if 'variantType' in variantScore:
    scoreData['Variant Type'] = variant_score_variant_types[variantScore['variantType']]
  if 'functionalDataSupport' in variantScore:
    scoreData['Functional Data Support'] = variantScore['functionalDataSupport']
  if 'functionalDataExplanation' in variantScore:
    scoreData['Functional Data (Explanation)'] = variantScore['functionalDataExplanation']
  if 'deNovo' in variantScore:
    scoreData['De Novo'] = variantScore['deNovo']
  if 'maternityPaternityConfirmed' in variantScore:
    scoreData['Paternity/maternity confirmed'] = variantScore['maternityPaternityConfirmed']
  if 'scoreStatus' in variantScore:
    scoreData['Score Status'] = variantScore['scoreStatus']
  if 'calculatedScore' in variantScore:
    scoreData['Default Score'] = float(variantScore['calculatedScore'])
  if 'score' in variantScore:
    scoreData['Modified Score'] = float(variantScore['score'])
  if 'scoreExplanation' in variantScore:
    scoreData['Modified Score Explanation'] = variantScore['scoreExplanation']

  return scoreData

def get_individual_data(ind, aff):
  data = {}
  if 'label' in ind:
    data['label'] = ind['label']
  if 'probandIs' in ind:
    data['Proband is'] = ind['probandIs']
  if 'hpoIdInDiagnosis' in ind and len(ind['hpoIdInDiagnosis']):
    data['HPO terms'] = ind['hpoIdInDiagnosis']
  if 'termsInDiagnosis' in ind:
    data['HPO terms text'] = ind['termsInDiagnosis']
  if 'recessiveZygosity' in ind:
    data['Zygosity'] = ind['recessiveZygosity']
  if 'otherPMIDs' in ind:
    data['Other PMID(s)'] = ind['otherPMIDs']
  if 'method' in ind:
    if 'previousTesting' in ind['method']:
      data['Previous Testing'] = ind['method']['previousTesting']
    if 'previousTestingDescription' in ind['method']:
      data['Previous Testing Description'] = ind['method']['previousTestingDescription']
    if 'genotypingMethods' in ind['method']:
      data['Genotyping Methods'] = ind['method']['genotypingMethods']
    if 'specificMutationsGenotypedMethod' in ind['method']:
      data['Specific Mutations Genotyping Method'] = ind['method']['specificMutationsGenotypedMethod']

  # if has variantScores then use SOPv8 format, have 'variantScores' data
  if 'variantScores' in ind:
    varScoreList = []
    for variantScore in ind['variantScores']:
      if 'affiliation' in variantScore and variantScore['affiliation'] == aff:
        varScoreList.append(get_variant_score_data(variantScore))
    data['variantScores'] = varScoreList
  else:
    # use SOPv7 format data, have 'variants' array and 'score' data
    if 'variants' in ind:
      # data['variants'] = ind['variants']
      varList = []
      for variant in ind['variants']:
        varList.append(get_variant_title(variant))
      data['variants'] = varList

    if 'scores' in ind:
      for score in ind['scores']:
        if 'affiliation' in score and score['affiliation'] == aff:
          data['score'] = get_score_data(score)

  return data

def gather_individual_data(individuals, pmid, aff):
  list = []
  for ind in individuals:
    if 'affiliation' in ind and ind['affiliation'] == aff:
      if ind['proband'] == True:
        data = {}
        data = get_individual_data(ind, aff)
        data['PMID'] = pmid
        list.append(data)

  return list

def gather_family_individual_data(families, pmid, aff):
  list = []
  for family in families:
    if 'affiliation' in family and family['affiliation'] == aff:
      if 'individualIncluded' in family and len(family['individualIncluded']):
        list = gather_individual_data(family['individualIncluded'], pmid, aff)

  return list

def get_gdm_data(gdm, classification, aff, status):
  data = {}

  data['Gene'] = gdm['gene']['PK']
  data['Disease'] = gdm['disease']['term']
  data['Mode of Inheritance'] = gdm['modeInheritance']
  if 'affiliation' in classification and classification['affiliation'] == aff:
    data['Status'] = status
    if 'approvalDate' in classification:
      data['Approval Date'] = classification['approvalDate']
    if 'approvalReviewDate' in classification:
      data['Approval Review Date'] = classification['approvalReviewDate']
    if status == 'published' and 'publishDate' in classification:
      data['Published date'] = classification['publishDate']

  return data

def gather_gdm_proband_individuals(snapshot, curation, aff, status):
  gdm = None
  list = []
  # print (snapshot)

  # Loop through annotations to gather proband individual evidences
  if 'annotations' in curation and len(curation['annotations']):
    for anno in curation['annotations']:
      pmid = ''
      if 'article' in anno:
        pmid = anno['article']['PK']

      if 'groups' in anno and len(anno['groups']):
        for group in anno['groups']:
          if 'affiliation' in group and group['affiliation'] == aff:
            if 'familyIncluded'in group and len(group['familyIncluded']):
              tempInd = gather_family_individual_data(group['familyIncluded'], pmid, aff)
              list.extend(tempInd)
            if 'individualIncluded' in group and len(group['individualIncluded']):
              tempInd = gather_individual_data(group['individualIncluded'], pmid, aff)
              list.extend(tempInd)

      if 'families' in anno and len(anno['families']):
        tempInd = gather_family_individual_data(anno['families'], pmid, aff)
        list.extend(tempInd)

      if 'individuals' in anno and len(anno['individuals']):
        tempInd = gather_individual_data(anno['individuals'], pmid, aff)
        list.extend(tempInd)

      # If proband individual evidence(s) is found, add this gdm curation to list
      if len(list):
        gdm = get_gdm_data(curation, snapshot['resource'], aff, status)
        gdm['probands'] = list

  return gdm
