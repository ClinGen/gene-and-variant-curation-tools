import { convertDiseasePKToMondoId, isFreeTextDisease } from '../utilities/diseaseUtilities';
import { getFormattedDateTime } from '../utilities/dateTimeUtilities';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';

// curationType can be 'variant' or 'gene'.
// If all interpretations are desired, getAllInterps = false.
// else if only user's interpretations are desired, getAllInterps = true.
// auth from redux store. Not used when getAllInterps is true, only needed for filtering for user data.
export async function get_interpretations(curationType, getAllInterps, auth, requestRecycler)  {
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
    // Otherwise, get user's created interpretations that have no affiliation.
    if (auth.currentAffiliation !== null) {
      url += `?affiliation=${auth.currentAffiliation.affiliation_id}`
    }
    else {
      url += `?submitted_by=${auth.PK}`
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
    let data = [];
    if (curationType === 'variant') {
      if (auth.currentAffiliation !== null) {
        // Fetch interpretations created by affiliation
        // Some VCI affiliation interpretations fetch reach API Gateway limit
        // Split into multiple query requests
        const url1 = url += '&date_created[between]=2016-01-01T00:00,2023-12-31T24:00';
        const url2 = url += '&date_created[between]=2024-01-01T00:00,2024-12-31T24:00';
        const url3 = url += '&date_created[between]=2025-01-01T00:00,2025-12-31T24:00';
        let [batch1, batch2, batch3] = await Promise.all([
          requestRecycler.capture(API.get(API_NAME, url1)),
          requestRecycler.capture(API.get(API_NAME, url2)),
          requestRecycler.capture(API.get(API_NAME, url3))
        ]);
        data = [...batch1, ...batch2, ...batch3];
      } else {
        // Fetch interpretations created by user
        data = await requestRecycler.capture(API.get(API_NAME, url));
      }
    } else {
      // Get GDMs
      data = await requestRecycler.capture(API.get(API_NAME, url));
    }

    const updatedData = data.map((item) => {
      // if item.disease is PK (VCI table)
      const diseaseDisplayText = typeof item.disease === 'string' ? (
        !item.disease && !item.diseaseTerm
          ? '--'
          : `${item.diseaseTerm || ''}${item.disease && !isFreeTextDisease(item.disease) ? ` (${convertDiseasePKToMondoId(item.disease)})` : ''}`
      )
      : null;

      const modeInheritanceDisplayText = item.modeInheritance ? item.modeInheritance.replace(/ *\([^)]*\) */g, "") : '';
      const pathogenicityDisplayText = item.alteredClassification ? item.alteredClassification.split('-')[0] : (item.autoClassification ? item.autoClassification.split('-')[0] : '');
      const variantIdDisplayText = item.carId && item.clinvarVariantId 
        ? `${item.carId},${item.clinvarVariantId}` 
        : `${item.carId || ''}${item.clinvarVariantId || ''}`;
      // Created by - Uncommented for alphatest, needs to be reimplemented at a later time
      // const submitted_by_displayText = getUserName(item.submitted_by);
      // const created_by_displayText = `${submitted_by_displayText}${item.affiliation ? ` (${getAffiliationName(item.affiliation)})` : ''}`;
      let showPathogenicity = true;

      if (curationType === 'variant') {
        if (item.snapshotStatuses && item.snapshotStatuses.length === 0 || item.status && item.status.toLowerCase() === "in progress") {
          showPathogenicity = false;
        }
        return {
          variant: (item.preferredTitle || '--'), // check that variantData[idx] is defined
          variantPK: item.variant, // for displaying link to interpretation page
          variantId: variantIdDisplayText,
          interpretationPK: item.PK, // for displaying link to interpretation page while specifying the interpretation PK
          disease_modeInheritance: `${diseaseDisplayText || '--'} / ${modeInheritanceDisplayText || '--'}`,
          snapshot: item.snapshotStatuses && item.snapshotStatuses.length ? item.snapshotStatuses : item, // for displaying all matching statuses
          pathogenicity: showPathogenicity ? pathogenicityDisplayText : '--',
          criteria: item.criteria || 'None',
          date_created: getFormattedDateTime(item.date_created, 'LLL', true),
          last_modified: item.last_modified
          // created_by: created_by_displayText
        }
      }
      else if (curationType === 'gene') {
        if (item.snapshotStatuses && item.snapshotStatuses.length === 0) {
          showPathogenicity = false;
        }
        let classification = item.alteredClassification && item.alteredClassification !== 'No Modification' ? item.alteredClassification : item.autoClassification;

        return {
          gene: (item.gene.PK ? item.gene.PK : (item.gene || '--')),
          gdmPK: item.PK, // for displaying link to gdm page
          disease_modeInheritance: `${diseaseDisplayText || '--'} / ${modeInheritanceDisplayText || '--'}`,
          classification: showPathogenicity ? classification : '--',
          snapshot: item.snapshotStatuses && item.snapshotStatuses.length ? item.snapshotStatuses : item, // for displaying all matching statuses
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
