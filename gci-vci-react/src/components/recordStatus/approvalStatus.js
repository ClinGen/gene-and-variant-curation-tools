import React from 'react';
import moment from 'moment';
import { Button } from 'react-bootstrap';

import { sortListByDate } from '../../helpers/sort';
import { Link } from 'react-router-dom';


/**
 * Method to render the 'APPROVED' status of a given GDM's classification or interpretation
 * @param {array} snapshots - List of snapshots associated with a classification or interpretation
 * @param {'classification'|'interpretation'} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {string} affiliationId - The affiliation ID
 * @param {string} userId - The user's UUID
 * @param {boolean} stringOnly - Whether return status text or status labels/tags (default returns labels/tags)
 * @param {string?} gdmPK - The PK of the current GDM. Only required when resourceType is 'classification'.
 */
export function renderApprovalStatus(snapshots, resourceType, affiliationId, userId, stringOnly=false, gdmPK) {
    let showApprovalLink = false;

    // when resouce is classification (GCI), use legacy logic for accessing date and status
    const dateTimeKey = resourceType === 'interpretation' ? 'approvalDate'
        : resourceType === 'classification' ? 'date_created' : null;
    const statusKey = resourceType === 'interpretation' ? 'classificationStatus'
        : resourceType === 'classification' ? 'approvalStatus' : null;

    // Get any snapshots that had been approved
    const approvedSnapshots = snapshots && snapshots.length && snapshots.filter(snapshot => {
        return snapshot[statusKey] === 'Approved' || (snapshot.resource && snapshot.resource[statusKey] === 'Approved');
    });

    const sortedApprovedSnapshots = approvedSnapshots && approvedSnapshots.length ? sortListByDate(approvedSnapshots, dateTimeKey) : [];
    

    // Show the approval link if the following conditions are true
    if (resourceType === 'classification' && (affiliationId || userId)) {
        showApprovalLink = true;
    } else if (resourceType === 'interpretation' && (affiliationId || userId)) {
        showApprovalLink = true;
    }
    if (sortedApprovedSnapshots && sortedApprovedSnapshots.length) {
      const dateCreated = sortedApprovedSnapshots[0][dateTimeKey] || (sortedApprovedSnapshots[0].resource && sortedApprovedSnapshots[0].resource[dateTimeKey]);
        if (stringOnly) {
            return 'Approved';
        } else {
            return (
                <span className="mr-2 status-wrapper approval">
                    <span className="badge badge-success status-item" data-toggle="tooltip" data-placement="top"
                        data-tooltip={'Approved on ' + moment(dateCreated).format("YYYY MMM DD, h:mm a")}>
                        APPROVED
                    </span>
                    {showApprovalLink ? renderApprovalLink(sortedApprovedSnapshots[0], resourceType, affiliationId, userId, gdmPK) : null}
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
 * @param {string} affiliationId - The affiliation ID
 * @param {string} userId - The user's UUID
 * @param {string?} gdmPK - The PK of the current GDM. Only required when resourceType is 'classification'.
 */
function renderApprovalLink(snapshot, resourceType, affiliationId, userId, gdmPK) {
    let url, param = new URLSearchParams([]), summary_uri = '';
    const snapshotPK = snapshot.uuid || snapshot.PK;
    if (!snapshotPK || typeof snapshotPK !== 'string') {
        console.error(`SnapshotPK is not a valid string, the status link may be incorrect. Snapshot=`, snapshot)
    }

    if (resourceType === 'classification') {
        summary_uri = `/curation-central/${gdmPK}/gene-disease-evidence-summary/`;
    } else if (resourceType === 'interpretation') {
        summary_uri = '/snapshot-summary/'
    }
    if (snapshot) {
        // Use the affiliation from the snapshot if exists since this affiliation is this snapshot's owner
        if (snapshot.resource && snapshot.resource.affiliation) {
            param.append('status', 'Approved');
            param.append('affiliationId', snapshot.resource.affiliation);
        } else if (affiliationId && affiliationId.length) {
            param.append('status', 'Approved');
            param.append('affiliationId', affiliationId);
        } else if (userId && userId.length) {
            param.append('status', 'Approved');
            param.append('userId', userId);
        }
      url = `${summary_uri}?snapshot=${snapshotPK}&${param}`;
    }
    if (resourceType === 'classification') {
        return (
            <span className="classification-link-item ml-1">
                <Button variant="success" target="_blank" as={Link} to={url} className="ml-2">View Current Approved</Button>
            </span>
        );
    } else if (resourceType === 'interpretation') {
        return (
            <span className="classification-link-item ml-1">
                <Link to={{ pathname: url }} title="View Current Approved" target="_blank"><i className="icon icon-link"></i></Link>
            </span>
        );
    }
}
