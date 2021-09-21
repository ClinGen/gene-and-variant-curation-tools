import React from 'react';
import moment from 'moment';
import { Button } from 'react-bootstrap';

import { sortListByDate } from '../../helpers/sort';
import { Link } from 'react-router-dom';

/**
 * Method to render the provisional status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 * @param {'interpretation'|'classification'} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {object} gdm - The GDM object
 * @param {boolean} showLink - Whether to render link to view/approve provisional (gdm) or view provisional summary (interpretation)
 * @param {boolean} stringOnly - Whether return status text or status labels/tags (default returns labels/tags)
 * @param {boolean|null} isMyClassification - refer to `renderProvisionalLink()`
 * @param {string|null} affiliationId - refer to `renderProvisionalLink()`
 * @param {string|null} userId - refer to `renderProvisionalLink()`
 */
export function renderProvisionalStatus(snapshots, resourceType, gdm, showLink, stringOnly=false, isMyClassification=null, affiliationId=null, userId=null) {
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

    const sortedProvisionedSnapshots = provisionedSnapshots && provisionedSnapshots.length ? sortListByDate(provisionedSnapshots, provisionalDateTimeKey) : [];
    const sortedApprovedSnapshots = approvedSnapshots && approvedSnapshots.length ? sortListByDate(approvedSnapshots, approvalDateTimeKey) : [];

    let showProvisionalLink = false;
    if (resourceType === 'classification' && showLink) {
        showProvisionalLink = true;
    } else if (resourceType === 'interpretation' && showLink) {
        showProvisionalLink = true;
    }
    if (sortedProvisionedSnapshots && sortedProvisionedSnapshots.length && (!sortedApprovedSnapshots || (sortedApprovedSnapshots && !sortedApprovedSnapshots.length))) {
        const dateCreated = sortedProvisionedSnapshots[0][provisionalDateTimeKey] || (sortedProvisionedSnapshots[0].resource && sortedProvisionedSnapshots[0].resource[provisionalDateTimeKey]);
        if (stringOnly) {
            return 'Provisional';
        } else {
            return (
                <span className="mr-2 status-wrapper provisional">
                    <span className="badge badge-info status-item" data-toggle="tooltip" data-placement="top"
                        data-tooltip={'Provisioned on ' + moment(dateCreated).format("YYYY MMM DD, h:mm a")}>
                        PROVISIONAL
                    </span>
                    {showProvisionalLink ? renderProvisionalLink(sortedProvisionedSnapshots[0], resourceType, gdm, isMyClassification, affiliationId, userId) : null}
                </span>
            );
        }
    } else {
        return null;
    }
}

/**
 * Method to render linkout to the evidence summary of a given approved classification or interpretation
 * @param {object} snapshot - The approved classification or interpretation snapshot
 * @param {string} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {object} gdm - The GDM object
 * @param {boolean} isMyClassification - Whether or not the classification associated with the provisional status is own by the logged in user. If so, the provisional status link will direct user to `provisional-classification` page, which allows user to modify the status (approve/publish/unpublish...). Otherwise, will direct user to the read-only evidence summary page. This parameter only applies to classification (in GCI); in case of interpretation (in VCI), this value is left out as `null` and has no effect.
 * @param {string|null} affiliationId - only effective when `isMyClassification` is false. Used to display affiliation information in the evidence summary page.
 * @param {string|null} userId - only effective when `isMyClassification` is false. Used to display user information in the evidence summary page when the classification author doesn't belong to any affiliation.
 */
export function renderProvisionalLink(snapshot, resourceType, gdm, isMyClassification=null, affiliationId=null, userId=null) {
    const snapshotPK = snapshot.uuid || snapshot.PK;
    if (!snapshotPK || typeof snapshotPK !== 'string') {
        console.error(`SnapshotPK is not a valid string, the status link may be incorrect. Snapshot=`, snapshot)
    }

    if (resourceType === 'classification') {
        let linkTarget = '_self';
        
        // generate href and title
        let provisionalLinkHref;
        let provisionalLinkTitle;
        // Even if isMyClassification, the snapshot might be created by another affiliation previously so link to read only
        if (!isMyClassification) {
            // render as others classification's link to evidence summary (read-only)

            if (!snapshot) {
                throw new Error("Must have snapshot when rendering others classification provisional link, but instead the snapshot is " + snapshot); 
            }

            // add additional params
            const params = new URLSearchParams('status=Provisional')
            // Use the affiliation from the snapshot if exists since this affiliation is this snapshot's owner
            if (snapshot && snapshot.resource && snapshot.resource.affiliation) {
                params.append('affiliationId', snapshot.resource.affiliation);
            } else if (affiliationId && affiliationId.length) {
                params.append('affiliationId', affiliationId);
            } else if (userId && userId.length) {
                params.append('userId', userId);
            }
            
            // get finalized url
            params.append('snapshot', snapshotPK);
            provisionalLinkHref = `/curation-central/${gdm.PK}/gene-disease-evidence-summary/?${params}`;
            provisionalLinkTitle = 'View Current Provisional';
            linkTarget = '_blank';
        } else {
            // default: generate link to classification page (page where user can modify status)
            const params = new URLSearchParams([
              ['approval', 'yes']
            ]);
            provisionalLinkHref = `/provisional-classification/${gdm.PK}/?${params}`;
            provisionalLinkTitle = 'View/Approve Current Provisional';
        }

        return (
            <span className="classification-link-item ml-1">
                <Button variant="info" target={linkTarget} as={Link} to={provisionalLinkHref} className="ml-2">{provisionalLinkTitle}</Button>
            </span>
        );
    } else if (resourceType === 'interpretation') {
        return (
            <span className="classification-link-item">
                <Link to={{ pathname: `/snapshot-summary/?snapshot=${snapshotPK}` }} title="View Current Provisional" target="_blank"><i className="icon icon-link"></i></Link>
            </span>
        );
    }
}
