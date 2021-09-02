/**
 * Method to determine if a user should be allowed to publish/unpublish
 * @param {object} userAffiliation - Object containing a user's affiliation data
 * @param {string} resourceToPublish - Type of resource to publish/unpublish
 */
function isUserAllowedToPublish(userAffiliation, resourceToPublish) {
    let affiliationSubgroup, affiliationGuidelinesCheck;

    if (resourceToPublish === 'classification') {
        affiliationSubgroup = 'gcep';
        affiliationGuidelinesCheck = true;
    } else if (resourceToPublish === 'interpretation') {
        affiliationSubgroup = 'vcep';
        affiliationGuidelinesCheck = userAffiliation && userAffiliation.subgroups && userAffiliation.subgroups[affiliationSubgroup] &&
            userAffiliation.subgroups[affiliationSubgroup].guidelines_url ? true : false;
    }

    if (userAffiliation && userAffiliation.publish_approval &&
        (!userAffiliation.subgroups || userAffiliation.subgroups[affiliationSubgroup]) && affiliationGuidelinesCheck) {
        return true;
    } else {
        return false;
    }
}

export function allowPublishGlobal(userAffiliation, resourceToPublish, modeOfInheritance = null, diseaseID = null) {
    if (isUserAllowedToPublish(userAffiliation, resourceToPublish)) {
        if (resourceToPublish === 'classification') {
            const allowedModeOfInheritance = typeof modeOfInheritance === 'string' && /(Autosomal|Mitochondrial|Semidominant|X-linked|Undetermined)/.test(modeOfInheritance);
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
