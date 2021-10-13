import datetime
import uuid
import os
import csv
import simplejson as json

from decimal import Decimal
from . import snapshot_helpers
from . import affiliation_file
from .csvTextBuilder import CsvTextBuilder


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

def get_snapshots(db, params):
  """Queries and returns all requested snapshot objects"""
  query_params = {}

  if params is not None and len(params):
    # Support request:
    # /snapshots?x-api-key=<api-key>&target=gci&affiliation=<affId>&status=approved&start=2021-06-01&end=2021-07-28
    # Add &count if only want to get the number of gdms found
    # Add &name=summary for summary report, if no name or &name=probands for probands details report
    # Add &format=csv to get back summary report in csv
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

      # print ('snapshots projections %s filters %s ' %(projections, filters))

      return db.query_by_item_type('snapshot', filters, projections)

def use_variantScores(classificationPoints):
  if 'autosomalRecessiveDisorder' in classificationPoints and 'probandWithOtherVariantType' in classificationPoints['autosomalRecessiveDisorder']:
    return True
  else:
    return False

def get_SOP_version(classification):
  if 'sopVersion' in classification:
    return classification['sopVersion']
  else:
    # Determine SOP version by classification point as in gci-vci-react/src/helpers/sop.js
    classificationPoints = classification['classificationPoints']
    if 'autosomalRecessiveDisorder' in classificationPoints and 'probandWithOtherVariantType' in classificationPoints['autosomalRecessiveDisorder']:
      return '8'
    elif 'segregation' in classificationPoints and 'evidenceCountExome' in classificationPoints['segregation']:
      return '7'
    else:
      return '5'

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

def get_proband_individual_data(ind, aff, useVariantScore):
  data = {}
  addInd = False

  # An proband individual can have multiple affiliation scores
  # If given affiliation has a score, add this proband individual data
  # if SOPv8 format and has variantScores then add 'variantScores' data
  if useVariantScore:
    if 'variantScores' in ind and ind['variantScores'] is not None:
      varScoreList = []
      for variantScore in ind['variantScores']:
        if 'affiliation' in variantScore and variantScore['affiliation'] == aff:
          addInd = True
          varScoreList.append(get_variant_score_data(variantScore))
      data['variantScores'] = varScoreList
  else:
    # SOPv7 format data, have 'variants' array and 'scores' data
    if 'scores' in ind and ind['scores'] is not None:
      for score in ind['scores']:
        if 'affiliation' in score and score['affiliation'] == aff:
          addInd = True
          data['score'] = get_score_data(score)

    if addInd and 'variants' in ind:
      varList = []
      for variant in ind['variants']:
        varList.append(get_variant_title(variant))
      data['variants'] = varList

  if addInd:
    if 'label' in ind:
      data['label'] = ind['label']
    if 'probandIs' in ind:
      data['Proband is'] = ind['probandIs']
    if 'hpoIdInDiagnosis' in ind and ind['hpoIdInDiagnosis'] is not None and len(ind['hpoIdInDiagnosis']):
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

  return data

def gather_proband_individual_data(individuals, pmid, aff, useVariantScore):
  list = []
  for ind in individuals:
    # Some individual objects in old snapshot do not have affiliation so do not check
    # Score can be added to other affiliation proband individual
    if 'proband' in ind and ind['proband'] == True:
      data = {}
      data = get_proband_individual_data(ind, aff, useVariantScore)
      if data and len(data):
        data['PMID'] = pmid
        list.append(data)

  return list

def gather_family_individual_data(families, pmid, aff, useVariantScore):
  list = []
  for family in families:
    # Some family objects in old snapshot do not have affiliation so do not check
    if 'individualIncluded' in family and family['individualIncluded'] is not None and len(family['individualIncluded']):
      tempInd = gather_proband_individual_data(family['individualIncluded'], pmid, aff, useVariantScore)
      list.extend(tempInd)

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
  useVariantScore = False
  # print (snapshot)

  if classificationPoints in snapshot['resource']: 
    useVariantScore = use_variantScores(snapshot['resource']['classificationPoints'])

  # Loop through annotations to gather proband individual evidences
  # annotations can be null
  if 'annotations' in curation and curation['annotations'] is not None and len(curation['annotations']):
    for anno in curation['annotations']:
      pmid = ''
      if 'article' in anno:
        pmid = anno['article']['PK']

      if 'groups' in anno and anno['groups'] is not None and len(anno['groups']):
        for group in anno['groups']:
          # Some group objects in old snapshot do not have affiliation so do not check
          if 'familyIncluded' in group and group['familyIncluded'] is not None and len(group['familyIncluded']):
            tempInd = gather_family_individual_data(group['familyIncluded'], pmid, aff, useVariantScore)
            list.extend(tempInd)
          if 'individualIncluded' in group and group['individualIncluded'] is not None and len(group['individualIncluded']):
            tempInd = gather_proband_individual_data(group['individualIncluded'], pmid, aff, useVariantScore)
            list.extend(tempInd)

      if 'families' in anno and anno['families'] is not None and len(anno['families']):
        tempInd = gather_family_individual_data(anno['families'], pmid, aff, useVariantScore)
        list.extend(tempInd)

      if 'individuals' in anno and anno['individuals'] is not None and len(anno['individuals']):
        tempInd = gather_proband_individual_data(anno['individuals'], pmid, aff, useVariantScore)
        list.extend(tempInd)

      # If proband individual evidence(s) is found, add this gdm curation to list
      if list is not None and len(list):
        gdm = get_gdm_data(curation, snapshot['resource'], aff, status)
        gdm['probands'] = list

  return gdm


def generate_gci_probands_report(query_params, snapshots):
  status = query_params['status']
  aff = query_params['affiliation']
  gdms = []

  # Loop through all snapshots to gather data and return
  for snapshot in snapshots:
    if 'resource' in snapshot and 'resourceParent' in snapshot and 's3_archive_key' in snapshot['resourceParent']:
      # print("found resourceParent S3 key")
      try:
        curation = snapshot_helpers.get_from_archive(snapshot['resourceParent']['s3_archive_key'])
        gdm = gather_gdm_proband_individuals(snapshot, curation, aff, status)
        if gdm is not None and gdm:
          gdms.append(gdm)
      except Exception as e:
        return { 'statusCode': 400, 'body': json.dumps({ 'generate_gci_probands_report error': '%s' %e }) }

  try:
    if status == 'published':
      gdms.sort(key = lambda gdm: gdm['Published Date'])
    else:
      gdms.sort(key = lambda gdm: gdm['Approval Date'])
  except Exception:
    pass

  # print(json.dumps(gdms))
  return { 'statusCode': 200, 'body': json.dumps(gdms) }

def get_classification_total_points(data, points):
  # Genetic Evidence total points
  if 'geneticEvidenceTotal' in points:
    data['Genetic Total Points']  = points['geneticEvidenceTotal']
  else:
    data['Genetic Total Points'] = 0 

  # Experimental Evidence Total
  if 'experimentalEvidenceTotal' in points:
    data['Experimental Total Points'] = points['experimentalEvidenceTotal']
  else:
    data['Experimental Total Points'] = 0 

  # Total points
  if 'evidencePointsTotal' in points:
    data['Total Points'] = points['evidencePointsTotal']
  else:
    data['Total Points'] = 0 

  return data

# Return basic GDM data and classification total points
def get_gdm_data_and_total_points(gdm, classification, aff):
  data = {}

  data['Gene'] = gdm['gene']['PK']
  data['Disease'] = gdm['disease']['term']
  data['Mode of Inheritance'] = gdm['modeInheritance']
  data['GCEP Affiliation'] = affiliation_file.lookup_affiliation_data(aff, 'fullname', 'gcep')

  if 'affiliation' in classification and classification['affiliation'] == aff:
    data['SOP Version'] = get_SOP_version(classification)
    if 'alteredClassification' in classification and classification['alteredClassification'] != 'No Modification':
      data['Final Classification'] = classification['alteredClassification']
    elif 'autoClassification' in classification:
        data['Final Classification'] = classification['autoClassification']
    else:
        data['Final Classification'] = ''

    # Use same login for "Date classification saved" in Evidence Summary header
    # getClassificationSavedDate() in gci-vci-react/src/utilities/classificationUtilities.js
    if 'classificationDate' in classification:
      data['Final Classification Date'] = classification['classificationDate']
    elif 'provisionalDate' in classification:
      data['Final Classification Date'] = classification['provisionalDate']
    elif 'last_modified' in classification:
      data['Final Classification Date'] = classification['last_modified']
    else:
      data['Final Classification Date'] = ''

    if 'classificationPoints' in classification:
      data = get_classification_total_points(data, classification['classificationPoints'])

  return data

# Return number of proband individual and scored proband individual in given individual list
def get_proband_count_from_ind_list(individuals, aff, useVariantScore):
  count = 0
  scoredCount = 0
  for ind in individuals:
    # An proband individual can have multiple affiliations' score
    # If given affiliation has a score, add this proband individual
    if 'proband' in ind and ind['proband'] == True:
      count = count + 1
      # Need to check if individual has counted score
      # if SOPv8 format and has variantScores then add 'variantScores' data
      if useVariantScore:
        if 'variantScores' in ind and ind['variantScores'] is not None and len(ind['variantScores']):
          done = False
          for variantScore in ind['variantScores']:
            # If score is zero, do not add to ScoredCount
            if done == False and 'scoreStatus' in variantScore and variantScore['scoreStatus'] == 'Score':
              if ('score' in variantScore and float(variantScore['score']) > 0) or \
                ('score' not in variantScore and 'calculatedScore' in variantScore and float(variantScore['calculatedScore']) > 0):
                scoredCount = scoredCount + 1
                done = True
      else:
        # SOPv7 format data, have 'scores' array
        # Check if score is found for given affiliation
        if 'scores' in ind and ind['scores'] is not None:
          done = False
          for score in ind['scores']:
            if done == False and 'affiliation' in score and score['affiliation'] == aff:
              # If score is zero, do not count
              if 'scoreStatus' in score and score['scoreStatus'] == 'Score' and \
                (('score' in score and float(score['score']) > 0) or \
                 ('score' not in score and 'calculatedScore' in score and float(score['calculatedScore']) > 0)):
                scoredCount = scoredCount + 1
                done = True

  return count, scoredCount

# Check if family has segregation score
def family_has_segregation_data(family):
  hasSegregation = False
  if 'segregation' in family:
    if 'includeLodScoreInAggregateCalculation' in family['segregation']:
      if 'lodPublished' in family['segregation']:
        if family['segregation']['lodPublished'] == True and \
          'publishedLodScore' in family['segregation'] and \
          family['segregation']['publishedLodScore'] > 0:
          hasSegregation = True
        elif family['segregation']['lodPublished'] == False and \
          'estimatedLodScore' in family['segregation'] and \
          family['segregation']['estimatedLodScore'] > 0:
          hasSegregation = True

  return hasSegregation

# Check if annotation has case-control evidence with score
def annotation_has_scored_case_control_evidence(annotation, aff):
  hasScoredCC = False

  if 'caseControlStudies' in annotation and annotation['caseControlStudies'] is not None and len(annotation['caseControlStudies']):
    for caseControl in annotation['caseControlStudies']:
      if hasScoredCC == False and 'scores' in caseControl:
        for score in caseControl['scores']:
          if hasScoredCC == False and 'affiliation' in score and score['affiliation'] == aff:
            if 'scoreStatus' in score and score['scoreStatus'] == 'Score':
              hasScoredCC = True

  return hasScoredCC

def get_gdm_proband_count_and_pmid_year(curation, classification, aff):
  # Loop through annotations to gather proband individual count
  # and the year of the most recent PMID associated with genetic evidence
  probandCount = 0
  scoredProbandCount = 0
  earliestYear = '3000'
  recentYear = '0'
  useVariantScore = False
  if 'classificationPoints' in classification: 
    useVariantScore = use_variantScores(classification['classificationPoints'])

  # annotations can be null or []
  if 'annotations' in curation and curation['annotations'] is not None and len(curation['annotations']):
    for anno in curation['annotations']:
      if 'article' in anno and 'date' in anno['article']:
        annoYear = anno['article']['date'][:4]
      annoProbandCount = 0
      annoProbandScoredCount = 0
      annoSegregation = False
      annoCaseControl = False

      # Loop through group evidences for proband counts
      if 'groups' in anno and anno['groups'] is not None and len(anno['groups']):
        for group in anno['groups']:
          # Some group objects in old snapshot do not have affiliation so do not check
          # Loop through group's family evidences for proband counts
          if 'familyIncluded' in group and group['familyIncluded'] is not None and len(group['familyIncluded']):
            for family in group['familyIncluded']:
              # Some family objects in old snapshot do not have affiliation so do not check
              if 'affiliation' not in family or ('affiliation' in family and family['affiliation'] == aff):
                # Check if family has segregation score
                if annoSegregation == False:
                  annoSegregation = family_has_segregation_data(family)

              # Loop through group's family's individual evidences for proband counts
              if 'individualIncluded' in family and family['individualIncluded'] is not None and len(family['individualIncluded']):
                pCount, sCount = get_proband_count_from_ind_list(family['individualIncluded'], aff, useVariantScore)
                annoProbandCount = annoProbandCount + pCount 
                annoProbandScoredCount = annoProbandScoredCount + sCount

          # Loop through group's individual evidences for proband counts
          if 'individualIncluded' in group and group['individualIncluded'] is not None and len(group['individualIncluded']):
            pCount, sCount = get_proband_count_from_ind_list(group['individualIncluded'], aff, useVariantScore)
            annoProbandCount = annoProbandCount + pCount 
            annoProbandScoredCount = annoProbandScoredCount + sCount

      # Loop through family individual evidences for proband counts
      if 'families' in anno and anno['families'] is not None and len(anno['families']):
        for family in anno['families']:
          # Some family objects in old snapshot do not have affiliation so do not check
          if 'affiliation' not in family or ('affiliation' in family and family['affiliation'] == aff):
            # Check if family has segregation score
            if annoSegregation == False:
              annoSegregation = family_has_segregation_data(family)

          # Loop through family's individual evidences for proband counts
          if 'individualIncluded' in family and family['individualIncluded'] is not None and len(family['individualIncluded']):
            pCount, sCount = get_proband_count_from_ind_list(family['individualIncluded'], aff, useVariantScore)
            annoProbandCount = annoProbandCount + pCount
            annoProbandScoredCount = annoProbandScoredCount + sCount

      # Loop through individual evidences for proband counts
      if 'individuals' in anno and anno['individuals'] is not None and len(anno['individuals']):
        pCount, sCount = get_proband_count_from_ind_list(anno['individuals'], aff, useVariantScore)
        annoProbandCount = annoProbandCount + pCount
        annoProbandScoredCount = annoProbandScoredCount + sCount

      # Keep check of proband counts
      probandCount = probandCount + annoProbandCount
      scoredProbandCount = scoredProbandCount + annoProbandScoredCount

      # Check if annotation has case-control evidence with score
      annoCaseControl = annotation_has_scored_case_control_evidence(anno, aff)

      # Record the PMID year if genetic evidence is found in this annotation
      # Check for proband individual count (not scored proband individual count)
      if annoProbandCount or annoSegregation or annoCaseControl:
        if int(annoYear) < int(earliestYear):
          earliestYear = annoYear
        if int(annoYear) > int(recentYear):
          recentYear = annoYear

  # If no genetic evidence, empty year value
  if earliestYear == '3000':
    earliestYear = ''
  if recentYear == '0':
    recentYear = ''

  return probandCount, scoredProbandCount, earliestYear, recentYear

# Gather summary report data
def gather_gdm_summary(snapshot, curation, aff):
  gdm = {}
  # If no annotation then no curation is done
  # annotations can be null
  if 'annotations' in curation and curation['annotations'] is not None and len(curation['annotations']):
    gdm = get_gdm_data_and_total_points(curation, snapshot['resource'], aff)
    probandCount, scoredProbandCount, earliestYear, recentYear = get_gdm_proband_count_and_pmid_year(curation, snapshot['resource'], aff)
    gdm['Proband Count'] = probandCount
    gdm['Scored Proband Count'] = scoredProbandCount
    gdm['Earliest PMID Year'] = earliestYear
    gdm['Most Recent PMID Year'] = recentYear
    gdm['GDM UUID'] = curation['PK']
    # temporary output PK
    # gdm['snapshotPK'] = snapshot['PK']

  return gdm

# Generate summary report in csv format
def output_gci_summary_in_csv(gdms):

  if gdms is not None and len(gdms):
    csvfile = CsvTextBuilder()
    # temporary gdmPK & snapshotPK
    # fieldnames = ['Final Classification', 'SOP Version', 'GDM UUID', 'snapshotPK', 'Gene', 'Disease', 'Mode of Inheritance', 'GCEP Affiliation', 'Final Classification Date', 'Genetic Total Points', 'Experimental Total Points', 'Total Points', 'Proband Count', 'Scored Proband Count', 'Earliest PMID Year', 'Most Recent PMID Year']
    fieldnames = ['Final Classification', 'SOP Version', 'GDM UUID', 'Gene', 'Disease', 'Mode of Inheritance', 'GCEP Affiliation', 'Final Classification Date', 'Genetic Total Points', 'Experimental Total Points', 'Total Points', 'Proband Count', 'Scored Proband Count', 'Earliest PMID Year', 'Most Recent PMID Year']
    writer = csv.DictWriter(csvfile, fieldnames)
    writer.writeheader()
    writer.writerows(gdms)
    return ''.join(csvfile.csv_string)
  else:
    return ''

# This report includes the following columns
# 'Final Classification', 'SOP Version', 'GDM UUID', 'Gene', 'Disease', 'Mode of Inheritance', 'GCEP Affiliation', 'Final Classification Date', 'Genetic Total Points', 'Experimental Total Points', 'Total Points', 'Proband Count', 'Scored Proband Count', 'Earliest PMID Year', 'Most Recent PMID Year'
# Proband Count = individual evidence that has proband = true, can be created by any affiliation 
# Scored Proband Count = proband individual evidence that has > 0 final score and is scored by given affiliation 
# Earliest PMID Year - year of the earliest PMID associated with genetic evidence
# Most Recent PMID Year - year of the most recent PMID associated with genetic evidence
def generate_gci_summary_report(query_params, snapshots):
  aff = query_params['affiliation']
  format = 'json'
  if 'format' in query_params:
    format = query_params['format']

  gdms = []
  for snapshot in snapshots:
    if 'resource' in snapshot and 'resourceParent' in snapshot and 's3_archive_key' in snapshot['resourceParent']:
      # print("found resourceParent S3 key")
      try:
        curation = snapshot_helpers.get_from_archive(snapshot['resourceParent']['s3_archive_key'])
        gdm = gather_gdm_summary(snapshot, curation, aff)

        if gdm is not None and gdm:
          gdms.append(gdm)
      except Exception as e:
          return { 'statusCode': 400, 'body': json.dumps({ 'generate_gci_summary_report error': '%s' %e }) }

  try:
    gdms.sort(key = lambda gdm: (gdm['Final Classification'], gdm['SOP Version']))
  except Exception:
    pass

  # print(json.dumps(gdms))
  if format == 'csv':
    csvString = output_gci_summary_in_csv(gdms)
    return { 'statusCode': 200, 'body': csvString }
  else:
    return { 'statusCode': 200, 'body': json.dumps(gdms) }

def generate_gci_report(query_params, snapshots):
  name = ''
  if 'name' in query_params:
    name = query_params['name']

  if name == 'summary':
    return generate_gci_summary_report(query_params, snapshots)
  elif name == 'probands' or name == '':
    return generate_gci_probands_report(query_params, snapshots)

def generate_vci_report(name, snapshots, query_params):
  return ''

# Call from API to return a report generated from snapshot objects
def generate_api_report(db, query_params):
  snapshots = []
  target = query_params['target']

  try:
    # Queries and gets all snapshot objects
    snapshots = get_snapshots(db, query_params)
  except Exception as e:
    print ('ERROR: Exception during Get snapshots %s ' %e )
    return { 'statusCode': 400, 'body': json.dumps({ 'API report get_snapshots error': '%s' %e }) }

  # If only count is requested, just return the count
  if 'count' in query_params:
    num = str(len(snapshots))
    return { 'statusCode': 200, 'body': json.dumps({ 'Number of curation found': '%s' %num }) }

  if snapshots is not None and len(snapshots):
    if target == 'gci':
      return generate_gci_report(query_params, snapshots)
    elif target == 'vci':
      return generate_vci_report(query_params, snapshots)

  return { 'statusCode': 200, 'body': '' }

