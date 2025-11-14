import { convertDiseasePKToMondoId, isFreeTextDisease } from '../utilities/diseaseUtilities';
import { getFormattedDateTime } from '../utilities/dateTimeUtilities';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';

export async function get_interpretations_all(requestRecycler)  {

  // Create URL for GET call to fetch all interpretations
  const url1 = '/interpretations?date_created[between]=2016-01-01T00:00,2021-12-31T24:00'; // 9922
  const url2 = '/interpretations?date_created[between]=2022-01-01T00:00,2022-12-31T24:00'; // 4868
  const url3 = '/interpretations?date_created[between]=2023-01-01T00:00,2023-12-31T24:00'; // 5481
  const url4 = '/interpretations?date_created[between]=2024-01-01T00:00,2024-12-31T24:00';
  const url5 = '/interpretations?date_created[between]=2025-01-01T00:00,2025-12-31T24:00';

  // Retrieves, relabels, and sorts the data.
  async function fetch() {
    let [batch1, batch2, batch3, batch4, batch5] = await Promise.all([
        requestRecycler.capture(API.get(API_NAME, url1)),
        requestRecycler.capture(API.get(API_NAME, url2)),
        requestRecycler.capture(API.get(API_NAME, url3)),
        requestRecycler.capture(API.get(API_NAME, url4)),
        requestRecycler.capture(API.get(API_NAME, url5)),
    ]);
    let data = [...batch1, ...batch2, ...batch3, ...batch4, ...batch5];
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

        if (item.snapshotStatuses && item.snapshotStatuses.length === 0 || item.status && item.status.toLowerCase() === "in progress") {
          showPathogenicity = false;
        }
        return {
          variant: (item.preferredTitle || '--'), // check that variantData[idx] is defined
          variantPK: item.variant, // for displaying link to interpretation page
          interpretationPK: item.PK, // for displaying link to interpretation page while specifying the interpretation PK
          disease_modeInheritance: `${diseaseDisplayText || '--'} / ${modeInheritanceDisplayText || '--'}`,
          snapshot: item.snapshotStatuses && item.snapshotStatuses.length ? item.snapshotStatuses : {}, // for displaying all matching statuses
          pathogenicity: showPathogenicity ? pathogenicityDisplayText : '--',
          criteria: item.criteria || 'None',
          date_created: getFormattedDateTime(item.date_created, 'LLL', true),
          last_modified: item.last_modified
          // created_by: created_by_displayText
        }
    });

    return updatedData;
  }
  const results = await fetch();
  return results;
}
