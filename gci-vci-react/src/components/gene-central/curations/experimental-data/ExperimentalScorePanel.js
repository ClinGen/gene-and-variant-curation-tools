import React, { useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import has from 'lodash/has';
import cloneDeep from 'lodash/cloneDeep';

import Input from '../../../common/Input';
import CardPanel from '../../../common/CardPanel';
import { LoadingButton } from '../../../common/LoadingButton';
import {
  calculateUserScore,
  calculateScoreRange,
  calculateDefaultScore,
  calculateUserAffiliatedScore,
} from './utils';

const ExperimentalScorePanel = ({
  auth,
  experimentalData,
  handleUserScoreObj,
  experimentalEvidenceType,
  scoreExplanationError,
  onSubmit,
  isSubmitting,
}) => {
  const [didMount, setDidMount] = useState(false);
  const [scoreData, setScoreData] = useState({});
  const [scoreRange, setScoreRange] = useState(null);
  const [requiredScoreExplanation, setRequiredScoreExplanation] = useState(false);
  const [updateDefaultScore, setUpdateDefaultScore] = useState(false);
  const [willNotCountScore, setWillNotCountScore] = useState(false);
  const [showScoreInput, setShowScoreInput] = useState(false);

  const loadData = () => {
    // Get evidenceScore object for the logged-in user if exists
    if (experimentalData && experimentalData.scores && experimentalData.scores.length) {
      const userAffiliatedScore = calculateUserAffiliatedScore(experimentalData.scores, auth);
      let loggedInUserScore = calculateUserScore(experimentalData.scores, auth);
      let matchedScore;
      if (userAffiliatedScore) {
        matchedScore = userAffiliatedScore;
      } else {
        matchedScore = loggedInUserScore && !loggedInUserScore.affiliation && auth && !auth.currentAffiliation ? loggedInUserScore : null;
      }
      if (matchedScore) {
        // Render or remove the default score, score range, and explanation fields
        const matchedScoreStatus = matchedScore.scoreStatus;
        const matchedDefaultScore = matchedScore.calculatedScore;
        const matchedModifiedScore = has(matchedScore, 'score') ? matchedScore.score.toString() : null;
        const matchedScoreExplanation = matchedScore.scoreExplanation;
        const calcScoreRange = calculateScoreRange(experimentalEvidenceType, parseFloat(matchedDefaultScore));
        /**************************************************************************************/
        /* Curators are allowed to access the score form fields when the 'Score' is selected, */
        /* or when 'Review' is selected given the matched Mode of Inheritance types           */
        /* (although its score won't be counted from the summary).                            */
        /**************************************************************************************/
        if (matchedScoreStatus && (matchedScoreStatus === 'Score' || matchedScoreStatus === 'Review')) {
          // Setting UI and score object property states
          setShowScoreInput(true);
          setWillNotCountScore(matchedScoreStatus === 'Review');
          setScoreRange(calcScoreRange);
          setRequiredScoreExplanation(!isNaN(parseFloat(matchedModifiedScore)) && scoreExplanation.length);

          setScoreData({
            scoreStatus: matchedScoreStatus,
            defaultScore: parseFloat(matchedDefaultScore) ? matchedDefaultScore : null,
            modifiedScore: !isNaN(parseFloat(matchedModifiedScore)) ? matchedModifiedScore : 'none',
            scoreExplanation: matchedScoreExplanation || '',
            PK: matchedScore.PK,
            affiliation: matchedScore.affiliation
          });
        } else {
          setShowScoreInput(false);

          setScoreData({
            scoreStatus: matchedScoreStatus || 'none',
            scoreExplanation: matchedScoreExplanation || '',
            PK: matchedScore.PK,
            affiliation: matchedScore.affiliation
          });
        }
      }
    }
  };

  useEffect(() => {
    loadData();
    setDidMount(true);
  }, []);

  useEffect(() => {
    if (didMount) {
      setScoreData(prevScoreData => {
        const newScoreData = cloneDeep(prevScoreData);
        newScoreData['scoreStatus'] = 'none';
        return newScoreData;
      });
      setShowScoreInput(false);
      setWillNotCountScore(false);
    }
  }, [experimentalEvidenceType]);

  const handleChange = (e) => {
    const newData = cloneDeep(scoreData);

    if (e.target.name === 'scoreStatus') {
      // Render or remove the default score, score range, and explanation fields
      // Parse score status value and set the state
      const selectedScoreStatus = e.target.value;
      newData['scoreStatus'] = selectedScoreStatus;
      if (selectedScoreStatus === 'Score' || selectedScoreStatus === 'Review') {
        const calcDefaultScore = calculateDefaultScore(experimentalEvidenceType, null, updateDefaultScore);
        const calcScoreRange = calculateScoreRange(experimentalEvidenceType, calcDefaultScore);
        // Reset the states and update the calculated default score
        // Reset score range dropdown options if any changes
        // Reset explanation if score status is changed
        setShowScoreInput(true);
        setWillNotCountScore(selectedScoreStatus === 'Review');
        setRequiredScoreExplanation(false);
        setUpdateDefaultScore(true);
        setScoreRange(calcScoreRange);

        newData['defaultScore'] = calcDefaultScore;
        newData['modifiedScore'] = 'none';
        newData['scoreExplanation'] = '';
      } else {
        setShowScoreInput(false);
        setWillNotCountScore(false);
        setRequiredScoreExplanation(false);
        setScoreRange([]);
        
        newData['defaultScore'] = null;
        newData['modifiedScore'] = 'none';
        newData['scoreExplanation'] = '';
      }
    }

    if (e.target.name === 'modifiedScore') {
      /****************************************************/
      /* If a different score is selected from the range, */
      /* make explanation text box "required".            */
      /****************************************************/
      // Parse the modified score selected by the curator
      const selectedModifiedScore = e.target.value;
      newData['modifiedScore'] = selectedModifiedScore;
      if (!isNaN(parseFloat(selectedModifiedScore))) {
        setRequiredScoreExplanation(true);
      } else {
        // Reset explanation if default score is kept
        newData['scoreExplanation'] = '';
        setRequiredScoreExplanation(false);
      }
    }

    if (e.target.name === 'scoreExplanation') {
      newData['scoreExplanation'] = e.target.value;
    }

    setScoreData(newData);
    handleUserScoreObj(newData);
  };

  const scoreStatus = scoreData && (scoreData.scoreStatus || 'none');
  const defaultScore = scoreData && (scoreData.defaultScore || null);
  const modifiedScore = scoreData && (scoreData.modifiedScore || 'none');
  const scoreExplanation = scoreData && (scoreData.scoreExplanation || '');

  return (
    <CardPanel title="Experimental Data Score" className="experimental-evidence-score-viewer">
      <Input
        type="select"
        name="scoreStatus"
        label="Select Status:"
        value={scoreStatus}
        onChange={handleChange}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
      >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="Score">Score</option>
        <option value="Review">Review</option>
        <option value="Contradicts">Contradicts</option>
      </Input>
      {willNotCountScore &&
        <Col sm={{ span: 7,offset: 5 }} className="alert alert-warning">
          <i className="icon icon-info-circle" /> This is marked with the status &quot;Review&quot; and will not be included in the final score.
        </Col>
      }
      {showScoreInput &&
        <>
          <div className="row mb-4">
            <label className="col-sm-5 control-label">Default Score:</label>
            <span className="col-sm-7" style={{ paddingTop: 5 }}>
              {defaultScore || 'Insufficient information to obtain score'}
            </span>
          </div>
          <Input
            type="select"
            name="modifiedScore"
            label={<span>Select a score different from default score: <i>(optional)</i></span>}
            value={modifiedScore}
            onChange={handleChange}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            disabled={scoreRange && scoreRange.length ? false : true}
          >
            <option value="none">No Selection</option>
            <option disabled="disabled"></option>
            {scoreRange.map(function(score, i) {
              return <option key={i} value={score}>{score}</option>;
            })}
          </Input>
        </>
      }
      {scoreStatus !== 'none' &&
        <>
          <Input
            type="textarea"
            name="scoreExplanation"
            required={requiredScoreExplanation}
            label={<span>Explanation:{scoreStatus !== 'Contradicts' && <><br /><i>(<strong>Required</strong> when selecting score different from default score)</i></>}</span>}
            value={scoreExplanation}
            onChange={handleChange}
            placeholder="Note: If you selected a score different from the default score, you must provide a reason for the change here."
            rows="3"
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
          />
          {scoreExplanationError &&
            <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
              <i className="icon icon-exclamation-triangle" /> A reason is required for the changed score.
            </Col>
          }
        </>
      }
      {onSubmit &&
        <LoadingButton
          type="button"
          className="align-self-end mb-2 ml-2 float-right "
          variant="primary"
          text="Save"
          onClick={onSubmit}
          textWhenLoading="Submitting"
          isLoading={isSubmitting}
        />
      }
    </CardPanel>
  );
};

export default ExperimentalScorePanel;