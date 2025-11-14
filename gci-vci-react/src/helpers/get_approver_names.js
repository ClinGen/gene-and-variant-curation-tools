import { getAffiliationName, getAffiliationNameBySubgroupID } from './affiliationsHelpers';

// Takes in a list of affiliation IDs and renders names for display
export function getContributorNames(classificationContributors, affiliationsData) {
    const contributorNames = [];
    classificationContributors.forEach(contributorId => {
        contributorNames.push(getAffiliationName(contributorId, affiliationsData));
    });
    return contributorNames;
}

// Takes in a list of affiliation subgroup IDs and renders names for display
export function getApproverNames(additionalApprover, affiliationsData) {
    let approverName;
    if (additionalApprover.startsWith('5')) {
        approverName = getAffiliationNameBySubgroupID('vcep', additionalApprover, affiliationsData);
    } else if (additionalApprover.startsWith('4')) {
        approverName = getAffiliationNameBySubgroupID('gcep', additionalApprover, affiliationsData);
    }
    return approverName;
}