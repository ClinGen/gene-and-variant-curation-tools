import { convertDiseasePKToMondoId, isFreeTextDisease } from '../utilities/diseaseUtilities';
import { getFormattedDateTime } from '../utilities/dateTimeUtilities';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';
// import { getAffiliationName } from './get_affiliation_name';
// import { getUserName } from './getUserName';

// curationType can be 'variant' or 'gene'.
// If all interpretations are desired, getAllInterps = false.
// else if only user's interpretations are desired, getAllInterps = true.
// auth from redux store. Not used when getAllInterps is true, only needed for filtering for user data.
export async function get_interpretations(curationType, getAllInterps, auth, requestRecycler)  {

  // Return Variant preferredTitle Value
  /* async function getVariantFromPK(id, requestRecycler) {
    const url = '/variants/' + id
    const data = await requestRecycler.capture(API.get(API_NAME, url));
    if (data.preferredTitle){
      return data.preferredTitle;
    }
    return "--";
  }
  */

  // Create URL for GET call based on table type (variant vs. gene)
  let url = ''
  if (curationType === 'variant') {
    url = `/interpretations`
  }
  else if (curationType === 'gene') {
    url = '/gdms'
  }

  // filter if only user's interpretations are wanted.
  if (!getAllInterps) {
      // If an affiliation is selected, get those interpretations.
      // TODO: Otherwise, get user's created interpretations that have no affiliation.
      // ^^ Look into range query to do this.
    if (auth.currentAffiliation !== null) {
      url += `?affiliation=${auth.currentAffiliation.affiliation_id}`
    }
    else {
      url += `?submitted_by=${auth.PK}`
      // url += `?submitted_by=${props.auth.PK}&affiliation=null`
      // url += `?submitted_by=7b555d35-5431-4f10-b760-6e6f6d0c3ebf` // variant Check
      // url += `?submitted_by=59dc49a3-92fa-442f-8fa9-043094fe7b7c` // gene check
    }

    if (curationType === 'variant') {
      url += `&action=myinterpretations`
    }

    if (curationType === 'gene') {
      url += `&action=mygdms`;
    }
  }

  // Retrieves, relabels, and sorts the data.
  async function fetch() {
    const data = await requestRecycler.capture(API.get(API_NAME, url));
    const updatedData = data.map((item) => {
      // if item.disease is PK (VCI table)
      const diseaseDisplayText = typeof item.disease === 'string' ? (
        // `${item.diseaseTerm || ''}${!isFreeTextDisease(item.disease) ? ` (${convertDiseasePKToMondoId(item.disease)})` : ''}`
        !item.disease && !item.diseaseTerm
          ? '--'
          : `${item.diseaseTerm || ''}${item.disease && !isFreeTextDisease(item.disease) ? ` (${convertDiseasePKToMondoId(item.disease)})` : ''}`
      )
      : null;

      const modeInheritanceDisplayText = item.modeInheritance ? item.modeInheritance.replace(/ *\([^)]*\) */g, "") : '';
      const pathogenicityDisplayText = item.alteredClassification ? item.alteredClassification.split('-')[0] : (item.autoClassification ? item.autoClassification.split('-')[0] : '');
      // Created by - Uncommented for alphatest, needs to be reimplemented at a later time
      // const submitted_by_displayText = getUserName(item.submitted_by);
      // const created_by_displayText = `${submitted_by_displayText}${item.affiliation ? ` (${getAffiliationName(item.affiliation)})` : ''}`;
      let showPathogenicity = true;

      if (curationType === 'variant') {
        if (item.snapshotStatuses && item.snapshotStatuses === "" || item.status && item.status.toLowerCase() === "in progress") {
          showPathogenicity = false;
        }
        return {
          variant: (item.preferredTitle || '--'), // check that variantData[idx] is defined
          variantPK: item.variant, // for displaying link to interpretation page
          interpretationPK: item.PK, // for displaying link to interpretation page while specifying the interpretation PK
          disease_modeInheritance: `${diseaseDisplayText || '--'} / ${modeInheritanceDisplayText || '--'}`,
          snapshot: item.snapshotStatuses ? item.snapshotStatuses : item, // for displaying all matching statuses
          pathogenicity: showPathogenicity ? pathogenicityDisplayText : '--',
          criteria: item.criteria || 'None',
          date_created: getFormattedDateTime(item.date_created, 'LLL', true),
          last_modified: item.last_modified
          // created_by: created_by_displayText
        }
      }
      else if (curationType === 'gene') {
        if (!item.snapshotStatuses) {
          showPathogenicity = false;
        }
        let classification = item.alteredClassification && item.alteredClassification !== 'No Modification' ? item.alteredClassification : item.autoClassification;
        
        return {
          gene: (item.gene.PK ? item.gene.PK : (item.gene || '--')),
          gdmPK: item.PK, // for displaying link to gdm page
          disease_modeInheritance: `${diseaseDisplayText || '--'} / ${modeInheritanceDisplayText || '--'}`,
          classification: showPathogenicity ? classification : '--',
          snapshot: item.snapshotStatuses ? item.snapshotStatuses : item, // for displaying all matching statuses
          date_created: getFormattedDateTime(item.date_created, 'LLL', true),
          last_modified: item.last_modified
        }
      }
      else return {}
    });

    return updatedData;
  }
  const results = await fetch();
  return results;
}
