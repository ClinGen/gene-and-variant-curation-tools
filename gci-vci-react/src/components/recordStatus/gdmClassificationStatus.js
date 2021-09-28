import React from 'react';
import lodashGet from 'lodash/get';
import { renderInProgressStatus } from './inProgressStatus';
import { renderProvisionalStatus } from './provisionalStatus';
import { renderApprovalStatus } from './approvalStatus';
import { renderNewProvisionalStatus } from './newProvisionalStatus';
import { renderPublishStatus } from './publishStatus';
import { renderNewSummaryStatus } from './newSummaryStatus';

/**
 * Method to render a GDM's classifications' common content (e.g. submitter name, calculated/modified classifications)
 * @param {object} classification - A GDM classification object
 * @param {object} gdm - The gene-disease record
 * @param {boolean} showProvisionalLink - Whether to render link to view/approve provisioned classification; only applies to provisional status, for approval or publish, will always show the link.
 * @param {boolean} isMyClassification - Whether or not the classification associated with the provisional status is own by the logged in user. If so, the provisional status link will direct user to `provisional-classification` page, which allows user to modify the status (approve/publish/unpublish...). Otherwise, will direct user to the read-only evidence summary page. This parameter only applies to classification (in GCI); in case of interpretation (in VCI), this value is left out as `null` and has no effect.
 */
export function renderClassificationStatus(classification, gdm, showProvisionalLink, isMyClassification) {
    const affiliationId = classification.affiliation ? classification.affiliation : null;
    const userId = classification.submitted_by.PK;
    const associatedClassificationSnapshots = lodashGet(classification, 'associatedClassificationSnapshots', []);
    // some associatedClassificationSnapshots may lack of `.resource` data (the full classification object) 
    // for rendering status, so just use the snapshot object itself
    const snapshots = associatedClassificationSnapshots
      // make sure the snapshot object is not null or undefined
      .filter(snapshot => !!snapshot);

    return (
      <span className="classification-status">
        <span className="classification-status-wrapper">
          {snapshots && snapshots.length ?
            <>
              {/* for `renderProvisionalStatus` and `renderNewProvisionalStatus`: pass in `isMyClassification` to determine whether the status link directs user to `provisional-classification` page for modifying status, or the read-only evidence summary page. */}
              {renderProvisionalStatus(snapshots, 'classification', gdm, showProvisionalLink, false, isMyClassification, affiliationId, userId)}

              {renderPublishStatus(snapshots, 'classification')}

              {renderApprovalStatus(snapshots, 'classification', affiliationId, userId, false, gdm.PK)}

              {renderNewProvisionalStatus(snapshots, 'classification', gdm, showProvisionalLink, false, isMyClassification, affiliationId, userId)}

              <span>
                {renderNewSummaryStatus(classification)}
              </span>
            </>
            :
            renderInProgressStatus(classification, 'classification')
          }
        </span>
      </span>
    );
}
