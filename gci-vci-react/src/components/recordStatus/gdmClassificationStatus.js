import React from 'react';
import lodashGet from 'lodash/get';
import moment from 'moment';
import StatusBadge from '../common/StatusBadge';
import { getClassificationSavedDate } from "../../utilities/classificationUtilities";
import { sortListByDate } from '../../helpers/sort';
import { renderInProgressStatus } from './inProgressStatus';
import { renderProvisionalLink } from './provisionalStatus';
import { renderApprovalLink } from './approvalStatus';
import { renderPublishedWarningMessage } from '../recordStatus/publishStatus';

/**
 * Method to render a GDM's classification status and available link(s) on GCI page header
 * @param {object} classification - A GDM classification object
 * @param {object} gdm - The gene-disease record
 * @param {boolean} isMyClassification - Whether or not the classification associated with the provisional status is own by the logged in user. If so, the provisional status link will direct user to `provisional-classification` page, which allows user to modify the status (approve/publish/unpublish...). Otherwise, will direct user to the read-only evidence summary page.
 */
export function renderClassificationStatus(classification, gdm, isMyClassification) {
    const affiliationId = classification.affiliation ? classification.affiliation : null;
    const userId = classification.submitted_by?.PK;
    const associatedClassificationSnapshots = lodashGet(classification, 'associatedClassificationSnapshots', []);
    // some associatedClassificationSnapshots may lack of `.resource` data (the full classification object) 
    // for rendering status, so just use the snapshot object itself
    const snapshots = associatedClassificationSnapshots
      // make sure the snapshot object is not null or undefined
      .filter(snapshot => !!snapshot);

    // If this classification has snapshot(s), display related status tag(s) and link(s)
    if (snapshots?.length) {
      // Get all provisional status snapshots
      const provisionedSnapshots = snapshots.filter(snapshot => {
        return (
          snapshot?.approvalStatus === 'Provisional' || (snapshot?.resource?.approvalStatus === 'Provisional') ||
          // legacy code logic
          snapshot?.approvalStatus === 'Provisioned' || (snapshot?.resource?.approvalStatus === 'Provisioned')
        );
      });
      // Get all approved status snapshots
      const approvedSnapshots = snapshots.filter(snapshot => {
        return (snapshot?.approvalStatus === 'Approved' || snapshot?.resource?.approvalStatus === 'Approved');
      });
      // Get all approved but not published snapshots
      const approvedNotPublishedSnapshots = snapshots.filter(snapshot => {
        return snapshot?.approvalStatus === 'Approved' && (
          (!snapshot?.publishClassification) ||
          // legacy code logic
          ((!snapshot?.resource?.publishClassification) || !snapshot?.publishStatus)
        );
      });
      // Get all published snapshots
      const publishedSnapshots = snapshots.filter(snapshot => {
        return (
          (snapshot?.publishClassification === true) ||
          // legacy code logic
          ((snapshot?.resource?.publishClassification) || snapshot?.publishStatus)
        );
      });

      // Sort all the snapshot lists
      const sortedProvisionedSnapshots = provisionedSnapshots?.length ? sortListByDate(provisionedSnapshots, "date_created") : [];
      const sortedApprovedSnapshots = approvedSnapshots?.length ? sortListByDate(approvedSnapshots, "date_created") : [];
      const sortedApprovedNotPublishedSnapshots = approvedNotPublishedSnapshots?.length ? sortListByDate(approvedNotPublishedSnapshots, "date_created") : [];
      const sortedPublishedSnapshots = publishedSnapshots && publishedSnapshots.length ? sortListByDate(publishedSnapshots, "date_created") : [];

      // Check if need to display "PROVISIONAL" status tag
      const provisionalTag = checkProvisionalStatus(sortedProvisionedSnapshots, sortedApprovedSnapshots);
      // Check if need to display publish warning message
      // If the current approved Classification is more recent than this published Classification,
      // show warning message
      const publishedWarningMessage = checkPublishedWarningMessage(sortedApprovedNotPublishedSnapshots, sortedPublishedSnapshots);

      // Check if need to display "PUBLISHED" status tag
      const publishedTag = checkPublishedStatus(sortedPublishedSnapshots);

      // Check if need to display "APPROVED" status tag
      const approvedTag = checkApprovedStatus(sortedApprovedSnapshots);

      // Check if need to display "NEW PROVISIONL" status tag
      // If the current provisional Classification is more recent than this approved Classification,
      // display "NEW PROVISIONAL" status
      const newProvisionalTag = checkNewProvisionalStatus(sortedProvisionedSnapshots, sortedApprovedSnapshots);

      // If current classification status is "In progress", display "NEW SAVED SUMMARY" status tag
      let newSavedSummaryDate = null;
      if (classification?.classificationStatus === 'In progress') {
        newSavedSummaryDate = getClassificationSavedDate(classification);
      }

      return (
        <>
          {/* Display available status tag(s) */}
          <span className="classification-status ml-1">
            <>
              <strong>Status: </strong>

              {/* Provisional status tag */}
              {renderProvisionalStatus(provisionalTag)}

              {/* Published status tag and related warning message */}
              {renderPublishedStatus(publishedTag, publishedWarningMessage)}

              {/* Approved status tag */}
              {renderApprovedStatus(approvedTag)}

              {/* New Provisional status tag */}
              {renderNewProvisionalStatus(newProvisionalTag)}

              {/* New Saved Summary status tag */}
              {renderNewSavedSummaryStatus(newSavedSummaryDate)}
            </>
          </span>

          {/* Display available link(s) */}
          <div className="mt-1">
            <span className="ml-1">
              <>
                {/* Provisional snapshot link */}
                {provisionalTag?.provisionalDate && provisionalTag?.provisionalSnapshot ?
                  renderProvisionalLink(provisionalTag?.provisionalSnapshot, "classification", gdm, isMyClassification, affiliationId, userId)
                : null}

                {/* Approved snapshot link */}
                {approvedTag?.approvedDate && approvedTag?.approvedSnapshot ?
                  renderApprovalLink(approvedTag?.approvedSnapshot, "classification", affiliationId, userId, gdm?.PK)
                : null}

                {/* New provisional snapshot link */}
                {newProvisionalTag?.newProvisionalExist && newProvisionalTag?.newProvisionalSnapshot ?
                  renderProvisionalLink(newProvisionalTag?.newProvisionalSnapshot, "classification", gdm, isMyClassification, affiliationId, userId)
                : null}
              </>
            </span>
          </div>
        </>
      );
    } else {
      // If no snapshot, just display "IN PROGRESS" status tag
      return (
        <span className="ml-1">
          <strong>Status: </strong>
          {renderInProgressStatus(classification, "classification")}
        </span>
      );
    }
}

/**
 * Method to check if PROVISIONAL status should be displayed.
 * Return provisional date and associated snapshot
 * @param {array} sortedProvisionedSnapshots - List of sorted provisonal snapshots in this classification
 * @param {array} sortedApprovedSnapshots - List of sorted approved snapshots in this classification
 */
function checkProvisionalStatus(sortedProvisionedSnapshots, sortedApprovedSnapshots) {
  let provisionalDate = null;
  let provisionalSnapshot = null;
  if (sortedProvisionedSnapshots?.length && !sortedApprovedSnapshots?.length) {
    provisionalDate = sortedProvisionedSnapshots[0].date_created || sortedProvisionedSnapshots[0].resource?.date_created;
    provisionalSnapshot = sortedProvisionedSnapshots[0];
  }

  return { provisionalDate, provisionalSnapshot };
}

/**
 * Method to check if a warning message should be displayed.
 * Return true or false flag
 * @param {array} sortedApprovedNotPublishedSnapshots - List of sorted approved but not published snapshots in this classification
 * @param {array} sortedPublishedSnapshots - List of sorted published snapshots in this classification
 */
function checkPublishedWarningMessage(sortedApprovedNotPublishedSnapshots, sortedPublishedSnapshots) {
  // If the current approved Classification is more recent than lasted published Classification,
  // show warning message
  let publishedWarningMessage = false;
  if (sortedApprovedNotPublishedSnapshots?.length && sortedPublishedSnapshots?.length) {
    // The 'resource' object was absent in the flatten 'snapshot' object prior to R22 release.
    // So for those snapshots saved into 'associatedClassificationSnapshots' array previously,
    // comparing 'approvalDate' to 'publishDate' is impossible due to the absence of 'resource' obejct.
    // Going forward, we still want the 'approvalDate' to 'publishDate' comparison because it's more accurate.
    if (sortedApprovedNotPublishedSnapshots[0].resource?.approvalDate && sortedPublishedSnapshots[0].resource?.publishDate) {
      publishedWarningMessage = moment(sortedApprovedNotPublishedSnapshots[0].resource.approvalDate).isAfter(sortedPublishedSnapshots[0].resource.publishDate);
    } else {
      // For snapshots saved into 'associatedClassificationSnapshots' array prior to R22 release,
      // we fallback to compare their 'date_created' timestamps - current approved vs. previously approved/published
      publishedWarningMessage = moment(sortedApprovedNotPublishedSnapshots[0].date_created).isAfter(sortedPublishedSnapshots[0].date_created);
    }
  }

  return publishedWarningMessage;
}

/**
 * Method to check if PUBLISHED status should be displayed.
 * Return published flag and published date
 * @param {array} sortedPublishedSnapshots - List of sorted published snapshots in this classification
 */
function checkPublishedStatus(sortedPublishedSnapshots) {
  let published = false;
  let publishDate = null;
  // Display status if there's published snapshots and try to get latest published date
  if (sortedPublishedSnapshots && sortedPublishedSnapshots.length) {
    // Will display PUBLISHED status even published date may be not available
    published = true;
    publishDate = sortedPublishedSnapshots[0].publishDate ? sortedPublishedSnapshots[0].publishDate
      // use legacy code logic
      : sortedPublishedSnapshots[0].resource?.publishDate ? sortedPublishedSnapshots[0].resource.publishDate
      : null;
  }

  return { published, publishDate };
}

/**
 * Method to check if APPROVED status should be displayed.
 * Return approved date and snapshot
 * @param {array} sortedApprovedSnapshots - List of sorted approved snapshots in this classification
 */
function checkApprovedStatus(sortedApprovedSnapshots) {
  let approvedDate = null;
  let approvedSnapshot = null;
  if (sortedApprovedSnapshots?.length) {
    approvedDate = sortedApprovedSnapshots[0].date_created || sortedApprovedSnapshots[0].resource?.date_created;
    approvedSnapshot = sortedApprovedSnapshots[0];
  }

  return { approvedDate, approvedSnapshot };
}

/**
 * Method to check if NEW PROVISIONAL status should be displayed.
 * Return newProvisionalExist flag, new provisional date and snapshot
 * @param {array} sortedProvisionedSnapshots - List of sorted provisonal snapshots in this classification
 * @param {array} sortedApprovedSnapshots - List of sorted approved snapshots in this classification
 */
function checkNewProvisionalStatus(sortedProvisionedSnapshots, sortedApprovedSnapshots) {
  // If the current provisional Classification is more recent than latest approved Classification,
  // display "NEW PROVISIONAL" status
  let newProvisionalExist = false;
  let newProvisionalDate = null;
  let newProvisionalSnapshot = sortedProvisionedSnapshots[0];
  if (sortedProvisionedSnapshots?.length && sortedApprovedSnapshots?.length) {
    // The 'resource' object was absent in the flatten 'snapshot' object prior to R22 release.
    // So for those snapshots saved into 'associatedClassificationSnapshots' array previously,
    // comparing 'provisionalDate' to 'approvalDate' is impossible due to the absence of 'resource' obejct.
    // Going forward, we still want the 'provisionalDate' to 'approvalDate' comparison because it's more accurate.
    if (sortedProvisionedSnapshots[0].resource?.provisionalDate && sortedApprovedSnapshots[0].resource?.approvalDate) {
      newProvisionalExist = moment(sortedProvisionedSnapshots[0].resource.provisionalDate).isAfter(sortedApprovedSnapshots[0].resource.approvalDate);
      newProvisionalDate = sortedProvisionedSnapshots[0].resource?.date_created;
    } else {
      // Fallback timestamp comparison for old snapshots prior to R22 release
      newProvisionalExist = moment(sortedProvisionedSnapshots[0].date_created).isAfter(sortedApprovedSnapshots[0].date_created);
      newProvisionalDate = sortedProvisionedSnapshots[0].date_created;
    }
  }

  return { newProvisionalExist, newProvisionalDate, newProvisionalSnapshot };
}

/**
 * Method to render the PROVISIONAL status.
 * @param {object} provisionalTag - provisonal status related data
 */
function renderProvisionalStatus(provisionalTag) {
  // If provisional date exists, show the status tag
  return (
    <>
      {provisionalTag?.provisionalDate ?
        <span className="mr-2 status-wrapper provisional">
          <span className="badge badge-info status-item"
            data-toggle="tooltip"
            data-placement="top"
            data-tooltip={'Provisioned on ' + moment(provisionalTag?.provisionalDate).format("YYYY MMM DD, h:mm a")}>
            PROVISIONAL
          </span>
        </span>
      : null}
    </>
  );
}

/**
 * Method to render the PUBLISHED status.
 * @param {object} publishedTag - published status related data
 * @param {boolean} publishedWarningMessage - display warning message flag
 */
function renderPublishedStatus(publishedTag, publishedWarningMessage) {
  // If published flag is true, display the status tag
  // But published date may not be available
  return (
    <>
      {publishedTag?.published ?
        <span className="mr-2 status-wrapper publication">
          {publishedTag?.publishDate ?
            <span className="badge publish-background status-item"
              data-toggle="tooltip"
              data-placement="top"
              data-tooltip={'Published on ' + moment(publishedTag?.publishDate).format("YYYY MMM DD, h:mm a")}>
              PUBLISHED
            </span>
          :
            <span className="badge publish-background status-item">PUBLISHED</span>
          }
          {publishedWarningMessage ? renderPublishedWarningMessage() : null}
        </span>
      : null}
    </>
  );
}

/**
 * Method to render the APPROVED status.
 * @param {object} approvedTag - approved status related data
 */
function renderApprovedStatus(approvedTag) {
  return (
    <>
      {approvedTag?.approvedDate ?
        <span className="mr-2 status-wrapper approval">
          <span className="badge badge-success status-item"
            data-toggle="tooltip"
            data-placement="top"
            data-tooltip={'Approved on ' + moment(approvedTag?.approvedDate).format("YYYY MMM DD, h:mm a")}>
            APPROVED
          </span>
        </span>
      : null}
    </>
  );
}

/**
 * Method to render the NEW PROVISIONAL status.
 * @param {object} newProvisionalTag - new provisonal status related data
 */
function renderNewProvisionalStatus(newProvisionalTag) {
  return (
    <>
      {newProvisionalTag?.newProvisionalExist ?
        <span className="mr-2 status-wrapper new-provisional">
          <span className="badge badge-info status-item"
            data-toggle="tooltip"
            data-placement="top"
            data-tooltip={'Provisioned on ' + moment(newProvisionalTag?.newProvisionalDate).format("YYYY MMM DD, h:mm a")}>
            <span className="badge-new">NEW</span> PROVISIONAL
          </span>
        </span>
      : null}
    </>
  );
}

/**
 * Method to render the NEW SAVED SUMMARY status.
 * @param {string} newSavedSummaryDate - new saved summary date
 */
function renderNewSavedSummaryStatus(newSavedSummaryDate) {
  return (
    <>
      {newSavedSummaryDate ?
        <span className="status-wrapper new-summary">
          <span data-toggle="tooltip"
            data-placement="top"
            data-tooltip={'Last saved on ' + moment(newSavedSummaryDate).format("YYYY MMM DD, h:mm a")}>
            <StatusBadge label="new saved summary" />
          </span>
        </span>
      : null}
    </>
  );
}
