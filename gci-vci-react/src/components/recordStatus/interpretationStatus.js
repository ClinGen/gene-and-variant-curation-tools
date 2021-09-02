import React from 'react';

import { renderInProgressStatus } from './inProgressStatus';
import { renderProvisionalStatus } from './provisionalStatus';
import { renderApprovalStatus } from './approvalStatus';
import { renderNewProvisionalStatus } from './newProvisionalStatus';
import { renderPublishStatus } from './publishStatus';


/**
 * Method to render the status(es) of all interpretations on a given variant
 * Primarily for the display of all interpretations on the 'Basic Info' tab in the VCI
 * Specifically, it renders a linkout to the interpretation's evaluation summary IF the interpretation had ben approved
 * @param {object} provisionalVariant - The 'provisional_variant' object associated with a given interpretation
 * @param {boolean} showProvisionalLink - Whether to render link to view provisional summary
 */
export function renderInterpretationStatus(snapshots, provisionalVariant, showProvisionalLink) {
    const affiliationId = provisionalVariant && provisionalVariant.affiliation ? provisionalVariant.affiliation : null;
    const userId = provisionalVariant && provisionalVariant.submitted_by ? provisionalVariant.submitted_by : null;

    if (snapshots && snapshots.length) {
      if (provisionalVariant) {
        return (
          <span className="classification-status">
              <span className="classification-status-wrapper">
                  {renderProvisionalStatus(snapshots, 'interpretation', null, false, null, affiliationId, userId)}
                  {renderApprovalStatus(snapshots, 'interpretation', affiliationId, userId)}
                  {renderNewProvisionalStatus(snapshots, 'interpretation', null, showProvisionalLink, null, affiliationId, userId)}
                  {renderPublishStatus(snapshots, 'interpretation')}
              </span>
          </span>
        );
      } else {
        return (
            <span className="classification-status">
                <span className="classification-status-wrapper">
                    {renderProvisionalStatus(snapshots, 'interpretation', null, showProvisionalLink)}
                    {renderApprovalStatus(snapshots, 'interpretation')}
                    {renderNewProvisionalStatus(snapshots, 'interpretation', null, showProvisionalLink)}
                    {renderPublishStatus(snapshots, 'interpretation')}
                </span>
            </span>
        );
      }
    } else {
        return (
            <span className="classification-status">
                <span className="classification-status-wrapper">
                    {renderInProgressStatus(snapshots, 'interpretation')}
                </span>
            </span>
        );
    }
}
