import { get as lodashGet } from "lodash";

/**
 * Method to determine if a user should be allowed to publish/unpublish
 * @param {object} userAffiliation - Object containing a user's affiliation data
 * @param {string} resourceToPublish - Type of resource to publish/unpublish
 */
function isUserAllowedToPublish(userAffiliation, resourceToPublish) {
    // IDs of affiliations with a GCEP and/or a VCEP that are not allowed to publish
    const nonPublishingAffiliations = new Set([
        '10000', // Interface Admin
        '10116', // Stanford Gecko
        '10117'  // Test Site Example Affiliation
    ]);

    // To publish from the GCI, user must belong to an affiliation with a GCEP
    if (resourceToPublish === 'classification') {
        return (!nonPublishingAffiliations.has(lodashGet(userAffiliation, 'affiliation_id', '')) &&
            lodashGet(userAffiliation, 'subgroups.gcep.id', false));

    // To publish from the VCI, user must belong to an affiliation with a VCEP
    } else if (resourceToPublish === 'interpretation') {
        return (!nonPublishingAffiliations.has(lodashGet(userAffiliation, 'affiliation_id', '')) &&
            lodashGet(userAffiliation, 'subgroups.vcep.id', false));
    }

    return false;
}

export function allowPublishGlobal(userAffiliation, resourceToPublish, modeOfInheritance = null, diseaseID = null) {
    if (isUserAllowedToPublish(userAffiliation, resourceToPublish)) {
        if (resourceToPublish === 'classification') {
            const allowedModeOfInheritance = typeof modeOfInheritance === 'string' && /(Autosomal|Mitochondrial|Semidominant|X-linked|Undetermined|Typified)/.test(modeOfInheritance);
            const allowedDiseaseID = typeof diseaseID === 'string' && diseaseID.indexOf('MONDO') > -1;

            return allowedModeOfInheritance && allowedDiseaseID;
        } else if (resourceToPublish === 'interpretation') {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}
