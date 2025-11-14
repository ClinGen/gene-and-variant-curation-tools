import React from 'react';
import moment from 'moment';

/**
 * Function to render the in progress classification status for an intepretation in ClinVar Submission batch
 * @param {string} date - last saved date
 */
export const renderInProgressStatus = (date) => {
    if (date) {
        return (
            <span className="mr-2 status-wrapper in-progress">
                <span className="badge badge-warning" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Last saved on ' + moment(date).format("YYYY MMM DD, h:mm a")}>
                        IN PROGRESS
                </span>
            </span>
        );
    } else {
        return null;
    }
}

/**
 * Function to render the provisional classification status for an intepretation in ClinVar Submission batch
 * @param {string} date - provisional date
 */
export const renderProvisionalStatus = (date) => {
    if (date) {
        return (
            <span className="mr-2 status-wrapper provisional">
                <span className="badge badge-info status-item" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Provisioned on ' + moment(date).format("YYYY MMM DD, h:mm a")}>
                        PROVISIONAL
                </span>
            </span>
        );
    } else {
        return null;
    }
}

/*
 * Function to render the approved classification status for an intepretation in ClinVar Submission batch
 * @param {string} date - approval date
 */
export const renderApprovedStatus = (date) => {
    if (date) {
        return (
            <span className="mr-2 status-wrapper approval">
                <span className="badge badge-success status-item" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Approved on ' + moment(date).format("YYYY MMM DD, h:mm a")}>
                        APPROVED
                </span>
            </span>
        );
    } else {
        return null;
    }
}

/**
 * Function to render the published warning message
 */
const renderPublishedWarningMessage = () => {
  return (
    <span className="publish-warning" data-toggle="tooltip" data-placement="top"
      data-tooltip="The current approved Classification is more recent than this published Classification.">
      <i className="icon icon-exclamation-triangle ml-1"></i>
    </span>
  );
}

/**
 * Function to render the published classification status for an intepretation in ClinVar Submission batch
 * @param {string} date - approval date
 * @param {boolean} showWarning - if true, dispaly warning message.
 */
export const renderPublishedStatus = (date, showWarning) => {
    if (date) {
        return (
            <>
            <span className="mr-2 status-wrapper publication">
                <span className="badge publish-background status-item" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Published on ' + moment(date).format("YYYY MMM DD, h:mm a")}>
                        PUBLISHED
                </span>
            </span>
            {showWarning ? renderPublishedWarningMessage() : null}
            </>
        );
    } else {
        return null;
    }
}

/**
 * Function to render the new provisional classification status for an intepretation in ClinVar Submission batch
 * @param {string} date - new provisional date
 */
export const renderNewProvisionalStatus = (date) => {
    if (date) {
        return (
            <span className="mr-2 status-wrapper new-provisional">
                <span className="badge badge-info status-item" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Provisioned on ' + moment(date).format("YYYY MMM DD, h:mm a")}>
                        <span className="badge-new">NEW</span> PROVISIONAL
                </span>
            </span>
        );
    } else {
        return null;
    }
}
