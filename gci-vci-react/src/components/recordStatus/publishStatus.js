import React from 'react';
import moment from 'moment';
import { sortListByDate } from '../../helpers/sort';

/**
 * Method to render the publication status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 * @param {'interpretation'|'classification'} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {boolean} stringOnly - Whether return status text or status labels/tags (default returns labels/tags)
 */
export function renderPublishStatus(snapshots, resourceType, stringOnly = false) {
  const dateTimeKey = resourceType === 'interpretation'
    ? 'classificationDate'
    : resourceType === 'classification'
      ? 'date_created'
      : null;
  const statusKey = resourceType === 'interpretation' ? 'classificationStatus'
    : resourceType === 'classification' ? 'approvalStatus' : null;
    
  // Get any snapshots that had been published
  const publishedSnapshots = snapshots && snapshots.length && snapshots.filter(snapshot => {
    return (snapshot && (
      (snapshot.publishClassification === true) ||
      // legacy code logic
      ((snapshot.resource && snapshot.resource.publishClassification) || snapshot.publishStatus)
    ));
  });

  // Get any snapshots that had been approved but not published
  const approvedSnapshots = snapshots && snapshots.length && snapshots.filter(snapshot => {
    return snapshot[statusKey] === 'Approved' && (
      (snapshot && !snapshot.publishClassification) ||
      // legacy code logic
      ((snapshot.resource && !snapshot.resource.publishClassification) || !snapshot.publishStatus)
    );
  });

  const sortedPublishedSnapshots = publishedSnapshots && publishedSnapshots.length ? sortListByDate(publishedSnapshots, dateTimeKey) : [];
  const sortedApprovedSnapshots = approvedSnapshots && approvedSnapshots.length ? sortListByDate(approvedSnapshots, dateTimeKey) : [];

  // If the current approved Classification is more recent than this published Classification, show warning message
  let publishedWarningMessage = false;
  if (sortedApprovedSnapshots && sortedApprovedSnapshots.length && sortedPublishedSnapshots && sortedPublishedSnapshots.length) {
    if (resourceType === 'interpretation') {
      if (sortedApprovedSnapshots[0] && sortedApprovedSnapshots[0].approvalDate && sortedPublishedSnapshots[0] && sortedPublishedSnapshots[0].publishDate) {
        publishedWarningMessage = moment(sortedApprovedSnapshots[0].approvalDate).isAfter(sortedPublishedSnapshots[0].publishDate);
      } else {
        // For snapshots saved into 'associatedClassificationSnapshots' array prior to R22 release,
        // we fallback to compare their 'date_created' timestamps - current approved vs. previously approved/published
        publishedWarningMessage = moment(sortedApprovedSnapshots[0].date_created).isAfter(sortedPublishedSnapshots[0].date_created);
      }
    }
    // use legacy code logic
    else if (resourceType === 'classification') {
      // The 'resource' object was absent in the flatten 'snapshot' object prior to R22 release.
      // So for those snapshots saved into 'associatedClassificationSnapshots' array previously,
      // comparing 'approvalDate' to 'publishDate' is impossible due to the absence of 'resource' obejct.
      // Going forward, we still want the 'approvalDate' to 'publishDate' comparison because it's more accurate.
      if (sortedApprovedSnapshots[0].resource && sortedApprovedSnapshots[0].resource.approvalDate && sortedPublishedSnapshots[0].resource && sortedPublishedSnapshots[0].resource.publishDate) {
        publishedWarningMessage = moment(sortedApprovedSnapshots[0].resource.approvalDate).isAfter(sortedPublishedSnapshots[0].resource.publishDate);
      } else {
        // For snapshots saved into 'associatedClassificationSnapshots' array prior to R22 release,
        // we fallback to compare their 'date_created' timestamps - current approved vs. previously approved/published
        publishedWarningMessage = moment(sortedApprovedSnapshots[0].date_created).isAfter(sortedPublishedSnapshots[0].date_created);
      }
    }
  }

  if (sortedPublishedSnapshots && sortedPublishedSnapshots.length) {
    const publishDate = sortedPublishedSnapshots[0] && sortedPublishedSnapshots[0].publishDate ? sortedPublishedSnapshots[0].publishDate
      // use legacy code logic
      : sortedPublishedSnapshots[0].resource && sortedPublishedSnapshots[0].resource.publishDate ? sortedPublishedSnapshots[0].resource.publishDate
      : null;
    
    if (stringOnly) {
      return 'Published';
    } else {
      return (
        <span className="mr-2 status-wrapper publication">
          {publishDate ?
            <span className="badge publish-background status-item" data-toggle="tooltip" data-placement="top"
              data-tooltip={'Published on ' + moment(publishDate).format("YYYY MMM DD, h:mm a")}>
              PUBLISHED
            </span>
            :
            <span className="badge publish-background status-item">PUBLISHED</span>
          }
          {publishedWarningMessage ? renderPublishedWarningMessage() : null}
        </span>
      );
    }
  } else {
    return null;
  }
}

function renderPublishedWarningMessage() {
  return (
    <span className="publish-warning" data-toggle="tooltip" data-placement="top"
      data-tooltip="The current approved Classification is more recent than this published Classification.">
      <i className="icon icon-exclamation-triangle ml-1"></i>
    </span>
  );
}
