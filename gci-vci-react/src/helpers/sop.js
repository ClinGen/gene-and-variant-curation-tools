
export const sopVersions = ['8', '7', '6', '5', '4', '3', '2', '1'];
const sopCurrentVersion = sopVersions[0];

/**
 * Method to determine the ClinGen SOP version of the provided evidence scoring (from a classification)
 * @param {object} classificationPoints - Object containing a classification's evidence scoring
 */
export function sopVersionByScoring(classificationPoints) {
    // Add check for SOPv8 as current version
    if (classificationPoints && classificationPoints.autosomalRecessiveDisorder && 'probandWithOtherVariantType' in classificationPoints.autosomalRecessiveDisorder) {
      return sopCurrentVersion;
    } else if (classificationPoints && classificationPoints.segregation && 'evidenceCountExome' in classificationPoints.segregation) {
        return '7';
    } else {
        return '5';
    }
}

/**
 * Method to determine if a classification's evidence scoring is based on the data model for ClinGen's current SOP
 * @param {object} classificationPoints - Object containing a classification's evidence scoring
 */
export function isScoringForCurrentSOP(classificationPoints) {
    if (sopVersionByScoring(classificationPoints) === sopCurrentVersion) {
        return true;
    } else {
        return false;
    }
}

/**
 * Method to determine if a classification's evidence scoring is based on the data model for ClinGen's supported SOP
 * to be published.  Support v7 and v8.
 * @param {object} classificationPoints - Object containing a classification's evidence scoring
 */
export function isScoringForSupportedSOP(classificationPoints) {
    const sopVersion = sopVersionByScoring(classificationPoints);
    if (sopVersion === sopCurrentVersion || sopVersion === '7') {
        return true;
    } else {
        return false;
    }
}

/**
 * Method to determine if a classification's evidence scoring is based on the data model for ClinGen's SOP that
 * has approval review date that should be used first, then approval date.  All versions above 5 has it.
 * @param {object} classificationPoints - Object containing a classification's evidence scoring
 */
export function snapshotHasApprovalPreviewDate(classificationPoints) {
    // Any SOP versions after SOP5 can have approval review date
    const sopVersion = sopVersionByScoring(classificationPoints);
    if (sopVersion !== '5') {
        return true;
    } else {
        return false;
    }
}

/**
 * Method to determine the ClinGen SOP version from the provisional object
 * @param {object} provisional - Object containing classification info
*/
export function determineSOPVersion(provisional) {
    if (provisional) {
        if (provisional.hasOwnProperty('sopVersion')) {
            if (provisional.sopVersion) {
                return provisional.sopVersion;
            } else {
                // Until "current" classification is approved (where SOP is selected), assume curation is taking place under current SOP
                return sopCurrentVersion;
            }
        } else {
            // For classifications saved before users could select an SOP version, use existing determination logic
            return sopVersionByScoring(provisional.classificationPoints);
        }
    }
}

