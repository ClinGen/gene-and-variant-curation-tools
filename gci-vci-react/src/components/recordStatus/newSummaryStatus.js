import React from 'react';
import moment from 'moment';
import { getClassificationSavedDate } from '../../utilities/classificationUtilities';
import StatusBadge from '../common/StatusBadge';

/**
 * Method to render 'NEW SAVED SUMMARY' status tag/label for a given classification or provisional variant
 * @param {object} snapshot - Could be the saved GDM classification in GCI, or provisional variant in VCI.
 */
export function renderNewSummaryStatus(snapshot) {
    if (snapshot && snapshot.classificationStatus && snapshot.classificationStatus === 'In progress') {
        return (
            <span className="status-wrapper new-summary">
                <span data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Last saved on ' + moment(getClassificationSavedDate(snapshot)).format("YYYY MMM DD, h:mm a")}>
                        <StatusBadge label="new saved summary" />
                </span>
            </span>
        );
    } else {
        return null;
    }
}