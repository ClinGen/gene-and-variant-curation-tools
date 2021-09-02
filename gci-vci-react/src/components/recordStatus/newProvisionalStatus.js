import React from 'react';
import moment from 'moment';

import { sortListByDate } from '../../helpers/sort';
import { renderProvisionalLink } from "./provisionalStatus";


/**
 * Method to render the 'NEW PROVISIONAL' status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 * @param {'interpretation'|'classification'} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {object?} gdm - The GDM object (only required when resourceType is `classification`)
 * @param {boolean} showLink - Whether to render link to view/approve provisional (gdm) or view provisional summary (interpretation)
 * @param {boolean} stringOnly - Whether return status text or status labels/tags (default returns labels/tags)
 * @param {boolean|null} isMyClassification - refer to `renderProvisionalLink()`
 * @param {string|null} affiliationId - refer to `renderProvisionalLink()`
 * @param {string|null} userId - refer to `renderProvisionalLink()`
 */
export function renderNewProvisionalStatus(snapshots, resourceType, gdm, showLink, stringOnly=false, isMyClassification=null, affiliationId=null, userId=null) {
    const provisionalDateTimeKey = resourceType === 'interpretation'
        ? 'provisionalDate'
        : resourceType === 'classification'
            ? 'date_created' 
            : null;
    const approvalDateTimeKey = resourceType === 'interpretation'
        ? 'approvalDate'
        : resourceType === 'classification'
            ? 'date_created' 
            : null;
    const statusKey = resourceType === 'interpretation'
        ? 'classificationStatus'
        : resourceType === 'classification'
            ? 'approvalStatus'
            : null;
    
    // const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, dateTimeKey) : [];
    // Get any snapshots that had been provisioned
    const provisionedSnapshots = snapshots && snapshots.length && snapshots.filter(snapshot => {
        return (snapshot && (
            snapshot[statusKey] === 'Provisional' || (snapshot.resource && snapshot.resource[statusKey] === 'Provisional') ||
            // legacy code logic
            snapshot[statusKey] === 'Provisioned' || (snapshot.resource && snapshot.resource[statusKey] === 'Provisioned')
        ));
    });
    // Get any snapshots that had been approved
    const approvedSnapshots = snapshots && snapshots.length && snapshots.filter(snapshot => {
        return (snapshot && snapshot[statusKey] === 'Approved' || (snapshot.resource && snapshot.resource[statusKey] === 'Approved'));
    });

    const sortedProvisionedSnapshots = provisionedSnapshots && provisionedSnapshots.length
        ? sortListByDate(provisionedSnapshots, provisionalDateTimeKey) : [];
    const sortedApprovedSnapshots = approvedSnapshots && approvedSnapshots.length
        ? sortListByDate(approvedSnapshots, approvalDateTimeKey) : [];

    // If the current provisional Classification is more recent than this approved Classification, display 'New Provisional' status
    let newProvisionalExist = false;
    if (sortedProvisionedSnapshots && sortedProvisionedSnapshots.length && sortedApprovedSnapshots && sortedApprovedSnapshots.length) {
        if (resourceType === 'interpretation') {
            if (sortedProvisionedSnapshots[0] && sortedProvisionedSnapshots[0].provisionalDate && sortedApprovedSnapshots[0] && sortedApprovedSnapshots[0].approvalDate) {
                newProvisionalExist = moment(sortedProvisionedSnapshots[0].provisionalDate).isAfter(sortedApprovedSnapshots[0].approvalDate);
            } else {
                // Fallback timestamp comparison for old snapshots prior to R22 release
                newProvisionalExist = moment(sortedProvisionedSnapshots[0].date_created).isAfter(sortedApprovedSnapshots[0].date_created);
            }
        } 
        // use legacy code logic
        else if (resourceType === 'classification') {
            // The 'resource' object was absent in the flatten 'snapshot' object prior to R22 release.
            // So for those snapshots saved into 'associatedClassificationSnapshots' array previously,
            // comparing 'provisionalDate' to 'approvalDate' is impossible due to the absence of 'resource' obejct.
            // Going forward, we still want the 'provisionalDate' to 'approvalDate' comparison because it's more accurate.
            if (sortedProvisionedSnapshots[0].resource && sortedProvisionedSnapshots[0].resource.provisionalDate && sortedApprovedSnapshots[0].resource && sortedApprovedSnapshots[0].resource.approvalDate) {
                newProvisionalExist = moment(sortedProvisionedSnapshots[0].resource.provisionalDate).isAfter(sortedApprovedSnapshots[0].resource.approvalDate);
            } else {
                // Fallback timestamp comparison for old snapshots prior to R22 release
                newProvisionalExist = moment(sortedProvisionedSnapshots[0].date_created).isAfter(sortedApprovedSnapshots[0].date_created);
            }
        }
    }
    
    if (newProvisionalExist) {
      const dateCreated = sortedProvisionedSnapshots[0][provisionalDateTimeKey] || (sortedProvisionedSnapshots[0].resource && sortedProvisionedSnapshots[0].resource[provisionalDateTimeKey]);
        if (stringOnly) {
            return 'New Provisional';
        } else {
            return (
                <span className="mr-2 status-wrapper new-provisional">
                    <span className="badge badge-info status-item" data-toggle="tooltip" data-placement="top"
                        data-tooltip={'Provisioned on ' + moment(dateCreated).format("YYYY MMM DD, h:mm a")}>
                        <span className="badge-new">NEW</span> PROVISIONAL
                    </span>
                    {showLink ? renderProvisionalLink(sortedProvisionedSnapshots[0], resourceType, gdm, isMyClassification, affiliationId, userId) : null}
                </span>
            );
        }
    } else {
        return null;
    }
}
