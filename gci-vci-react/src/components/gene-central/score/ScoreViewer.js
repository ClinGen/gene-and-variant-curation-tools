import React from 'react';
import { get as lodashGet } from "lodash";
import CASE_INFO_TYPES from './constants/caseInfoTypes';
import { getAffiliationName } from '../../../helpers/get_affiliation_name.js';
import { getUserName } from '../../../helpers/getUserName.js';

// Transform the stored Case Information type 'value' into 'description'
// Use in display retired (pre-SOP8) scores
export const renderCaseInfoType = (value) => {
    let description;
    // Put CASE_INFO_TYPES object keys into an array
    // Use the 'OTHER' group because it has all 5 Case Information types
    let caseInfoTypeGroup = CASE_INFO_TYPES.OTHER;
    // Assign different number of variant kinds given a matched modeInheritance
    caseInfoTypeGroup.forEach(item => {
      if (value === item.TYPE) {
        description = item.DESCRIPTION;
      }
    });

    return description;
}

// Render scores viewer in Gene Curation Interface
export const ScoreViewer = (props) => {

  const score = lodashGet(props, "score", null) &&
    (lodashGet(props, "score.scoreStatus", null) !== "none" ||
      lodashGet(props, "evidence.item_type", null) === 'caseControl')
    ? props.score
    : null;

  return (
    <>
      {score ?
            <div className="evidence-score-list-viewer">
              <h5>Curator: {score.affiliation ? getAffiliationName(score.affiliation) : getUserName(score.submitted_by)}</h5>
              <dl className="dl-horizontal">
                {score.scoreStatus && score.scoreStatus !== 'none' && props.evidence['item_type'] !== 'caseControl' ?
                  <div>
                    <dt>Score Status</dt>
                    <dd>{score.scoreStatus}</dd>
                  </div>
                  : null}
                {score.calculatedScore ?
                  <div>
                    <dt>Default Score</dt>
                    <dd>{score.calculatedScore}</dd>
                  </div>
                  : null}
                {score.score >= 0 ?
                  <div>
                    <dt>Changed Score</dt>
                    <dd>{score.score}</dd>
                  </div>
                  : null}
                {score.scoreExplanation ?
                  <div>
                    <dt>Reason(s) for score change</dt>
                    <dd>{score.scoreExplanation}</dd>
                  </div>
                  : null}
              </dl>
            </div>
        :
        <span className="score-status-note">This evidence has not been scored</span>
      }
    </>
  );
};

export default ScoreViewer;
