import React from 'react';

/**
 * Method to generically display a status tag/label given the status of a classification
 * Applicable to: snapshots, GCI Evidence Summary, VCI Evaluation Summary
 * @param {string} status - The status of a given classification in a GDM or Interpretation
 * @param {boolean} publishStatus - The publication status of a given classification
 */
export function renderSimpleStatusLabel(status, publishStatus) {
    if (status === 'In progress') {
        return <span className="badge badge-warning">IN PROGRESS</span>;
    } else if (status.match(/Provisional|Provisioned/)) {
        return <span className="badge badge-info">PROVISIONAL</span>;
    } else if (status === 'Approved') {
        return (
            <span>
                <span className="badge badge-success">APPROVED</span>
                {publishStatus ? <span className="badge publish-background ml-1">PUBLISHED</span> : null}
            </span>
        );
    }
}