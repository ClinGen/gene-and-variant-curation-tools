import React from 'react';
import { renderInProgressStatus, renderProvisionalStatus, renderApprovedStatus, renderPublishedStatus, renderNewProvisionalStatus } from '../../recordStatus/renderStatusBadges';

/**
 * Function to check if given interpretation is included in current open ClinVar Submission batch
 * @param {array} batches - list of open and closed ClinVar Submission batch
 * @param {string} interpretationPK - interpretation PK
 * Return open batch object if interpretation is included in it or null if not
 */
export const inCurrentBatch = (batches, interpretationPK) => {
    let currentBatch = null;
    if (interpretationPK && batches && batches.length) {
        const openBatch = getBatchesByStatus(batches, "open");

        if (openBatch && openBatch.length === 1 && openBatch[0].batch_members && openBatch[0].batch_members.length) {
            const found = openBatch[0].batch_members.filter(member => {
                return member.interpretation === interpretationPK;
            });
            if (found && found.length) {
                currentBatch = openBatch[0];
            }
        }
    }

    return currentBatch;
};

/**
 * Function to find the open batch from list of ClinVar Submission batches
 * @param {array} batches - list of open and closed ClinVar Submission batch
 * Return open batch object if it is found or null if not
 */
export const getOpenBatch = (batches) => {
    const openBatch = getBatchesByStatus(batches, "open");
    if (openBatch && openBatch.length === 1) {
        return openBatch[0];
    }
    return null;
}

/**
 * Function to find the batches with given status from list of ClinVar Submission batches
 * @param {array} batches - list of open and closed ClinVar Submission batch
 * @param {string} status - "open" or "closed"
 * Return batches with given status or []
 */
export const getBatchesByStatus = (batches, status) => {
    const foundBatches = batches.filter(b => {
        return b.batch_status === status;
    });

    return foundBatches;
}

/**
 * Function to check if given interpretation's associated snapshot is included in given ClinVar Submission batch
 * @param {object} batch - ClinVar Submission batch object
 * @param {string} interpretationPK - interpretation PK
 * @param {string} snapshotPK - snapshot PK
 * Return true if interpretation snapshot is included or false if not
 */
export const snapshotInBatch = (batch, interpretationPK, snapshotPK) => {
    if (batch && batch["batch_members"] && batch["batch_members"].length) {
        const found = batch.batch_members.filter(member => {
            return (member.interpretation === interpretationPK && member.snapshot === snapshotPK);
        });
        if (found && found.length) {
            return true;
        }
    }
    return false;
}

/**
 * Function to render the classification status(es) for an intepretation in ClinVar Submission batch
 * @param {array} status - array with status date and label
 */
export const renderStatus = (status) => {
    if (status && status.length) {
        // Get to be displayed status
        let inProgress = null;
        let provisional = null;
        let approved = null;
        let newProvisional = null;
        let published = null;

        status.forEach((data) => {
            if (typeof data === 'object' && data.label && data.date) {
                if (data['label'] === "In Progress") {
                    inProgress = data;
                } else if (data['label'] === "Provisional") {
                    provisional = data;
                } else if (data['label'] === "Approved") {
                    approved = data;
                } else if (data['label'] === "New Provisional") {
                    newProvisional = data;
                } else if (data['label'] === "Published") {
                    published = data;
                }
            }
        });
        return (
            <span className="classification-status">
                <span className="classification-status-wrapper">
                    {inProgress ? renderInProgressStatus(inProgress.date) : null}
                    {provisional ? renderProvisionalStatus(provisional.date) : null}
                    {approved ? renderApprovedStatus(approved.date) : null}
                    {newProvisional ? renderNewProvisionalStatus(newProvisional.date) : null}
                    {published ? renderPublishedStatus(published.date, published.warning) : null}
                </span>
            </span>
        );
    } else {
        return ("--");
    }
}
