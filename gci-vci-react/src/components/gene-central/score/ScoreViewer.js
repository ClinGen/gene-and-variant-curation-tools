import React, { useContext } from 'react';
import { cloneDeep, get as lodashGet } from "lodash";
import CASE_INFO_TYPES from './constants/caseInfoTypes';
import { AffilsContext, getAffiliationName } from '../../../helpers/affiliationsHelpers.js';
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

  let score = lodashGet(props, "score", null) &&
    (lodashGet(props, "score.scoreStatus", null) !== "none" ||
      lodashGet(props, "evidence.item_type", null) === 'caseControl')
    ? cloneDeep(props.score)
    : null;
  const { affiliationsData } = useContext(AffilsContext);

  // Support case control old and new score object
  // Old score object only has score point which by default has "Score" status
  // No old score object if caseControl has no score point
  // New score object has scoreStatus, ScoreExplanation, and score
  if (score && lodashGet(props, "evidence.item_type", null) === 'caseControl') {
    if (lodashGet(score, "scoreStatus", null)) {
      // New if has scoreStatus, no score to display if scoreStatus is not selected
      if (lodashGet(score, "scoreStatus", null) === "none") {
        score = null;
      }
    } else {
      // Old if has no scoreStatus, check if there's valid score point, set scoreStatus to "Score"
      score.scoreStatus = (("score" in score) && (score.score >= 0)) ? "Score" : "none";
    }
  }
  const scoreLabel = lodashGet(props, "evidence.item_type", null) === 'caseControl' ? "Score" : "Changed Score";
  const explanationLabel = lodashGet(props, "evidence.item_type", null) === 'caseControl' ? "Explanation" : "Reason(s) for score change";

  return (
    <>
      {score ?
            <div className="evidence-score-list-viewer">
              <h5>Curator: {score.affiliation ? getAffiliationName(score.affiliation, affiliationsData) : getUserName(score.submitted_by)}</h5>
              <dl className="dl-horizontal">
                {score.scoreStatus && score.scoreStatus !== 'none' ?
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
                    <dt>{scoreLabel}</dt>
                    <dd>{score.score}</dd>
                  </div>
                  : null}
                {score.scoreExplanation ?
                  <div>
                    <dt>{explanationLabel}</dt>
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
