import React from 'react';
import moment from 'moment';

import { getClassificationSavedDate } from "../../utilities/classificationUtilities";


/**
 * Method to render 'IN PROGRESS' status tag/label for a given classification or provisional variant
 * @param {object} snapshot - Could be the saved GDM classification in GCI, or provisional variant in VCI.
 * @param {'classification'|'interpretation'} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {boolean} stringOnly - Whether return status text or status labels/tags (default returns labels/tags)
 */
export function renderInProgressStatus(snapshot, resourceType, stringOnly=false) {
  const statusKey = resourceType === 'interpretation' ? 'status'
  // use legacy code logic for classification in GCI
  : resourceType === 'classification' ? 'classificationStatus' : null;
  
  if (snapshot && snapshot[statusKey] && snapshot[statusKey].toLowerCase() === 'in progress') {
      if (stringOnly) {
          return 'In Progress';
      } else {
          return (
              <span className="status-wrapper in-progress">
                  <span className="badge badge-warning" data-toggle="tooltip" data-placement="top"
                      data-tooltip={'Last saved on ' + moment(getClassificationSavedDate(snapshot)).format("YYYY MMM DD, h:mm a")}>
                      IN PROGRESS
                  </span>
              </span>
          );
      }
  } else {
      if (stringOnly) {
          return 'None';
      } else {
        // We never want a status of 'None' displayed within dashboard, if data is unavailable
        // for any reason, default to 'In Progress' without date tooltip
          return (
            <span className="status-wrapper in-progress">
              <span className="badge badge-warning">
                IN PROGRESS
              </span>
            </span>
          );
      }
  }
}
