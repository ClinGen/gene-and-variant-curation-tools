import React, { useState, useEffect } from 'react';
import { Row, Col } from "react-bootstrap";
import { cloneDeep, isEmpty, get as lodashGet } from "lodash";
import Input from "../../common/Input";
import { LoadingButton } from "../../common/LoadingButton";
import { getUserScore } from './helpers/getUserScore';
import { getUserAffiliatedScore } from './helpers/getUserAffiliatedScore';

// Render scoring panel in Gene Curation Interface
export const CaseControlScore = ({
  auth,
  caseControl,
  handleUserScoreObj,
  submitScore,
  isDisabled,
  isSubmitting
}) => {

  const [scoreAffiliation, setScoreAffiliation] = useState(null); // Affiliation associated with the score
  const [scoreData, setScoreData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isDisabled && !isEmpty(scoreData) && scoreData.score !== 'none') {
      let newData = {...scoreData, score: 'none'};
      setScoreData(newData);
      updateUserScoreObj(newData);
    }
  }, [isDisabled]);

  const loadData = () => {
    // Get evidenceScore object for the logged-in user if exists
    if (caseControl && caseControl.scores && caseControl.scores.length > 0) {
      const userAffiliatedScore = getUserAffiliatedScore(caseControl.scores, auth);
      const loggedInUserScore = getUserScore(caseControl.scores, lodashGet(auth, "PK", null));
      const affiliation = lodashGet(auth, "currentAffiliation.affiliation_id", null);
      let matchedScore;
      if (userAffiliatedScore) {
        matchedScore = userAffiliatedScore;
        setScoreAffiliation(affiliation);
      } else {
        matchedScore = loggedInUserScore && !loggedInUserScore.affiliation && !affiliation ? loggedInUserScore : null;
      }
      if (matchedScore) {
        const modifiedScore = lodashGet(matchedScore, "score", null) !== null && matchedScore.score >= 0 ? matchedScore.score.toString() : 'none';
        setScoreData({
          PK: matchedScore.PK,
          evidenceType: "Case control",
          evidenceScored: matchedScore.evidenceScored,
          score: modifiedScore
        });
      }
    } else {
      setScoreData({
        evidenceType: "Case control",
        evidenceScored: lodashGet(caseControl, "PK", null),
        score: "none"
      });
    }
  };

  const handleScoreRangeChange = (e) => {
    if (e.target.name === 'scoreRange') {
      const newData = cloneDeep(scoreData);
      newData['score'] = e.target.value;
      setScoreData(newData);
      updateUserScoreObj(newData);
    }
  };

  // Put together the score object based on the form values for
  // the currently logged-in user
  const updateUserScoreObj = (newScore) => {
    let newUserScoreObj = cloneDeep(newScore);

    // Call parent function to update user object state
    if (!isEmpty(newUserScoreObj)) {
      newUserScoreObj['evidenceType'] = "Case control";
      if (newScore['score'] !== 'none') {
        const score = newScore['score'];
        newUserScoreObj.score = score && !isNaN(parseFloat(score)) ? parseFloat(score) : null;
      } else {
        newUserScoreObj.score = null;
      }
      // Add affiliation to score object
      // if the user is associated with an affiliation
      // and if the data object has no affiliation
      // and only when there is score data to be saved
      if (scoreAffiliation && scoreAffiliation.length) {
        newUserScoreObj['affiliation'] = scoreAffiliation;
      } else if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
        newUserScoreObj['affiliation'] = auth.currentAffiliation.affiliation_id;
      }

      handleUserScoreObj(newUserScoreObj);
    }
  }

  return (
    <div className="section">
      <Input type="select" name="scoreRange" label="Score:" onChange={handleScoreRangeChange}
        value={scoreData['score']} disabled={isDisabled} labelClassName="col-sm-5 control-label"
        wrapperClassName="col-sm-7" groupClassName="row mb-3">
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="0">0</option>
        <option value="0.5">0.5</option>
        <option value="1">1</option>
        <option value="1.5">1.5</option>
        <option value="2">2</option>
        <option value="2.5">2.5</option>
        <option value="3">3</option>
        <option value="3.5">3.5</option>
        <option value="4">4</option>
        <option value="4.5">4.5</option>
        <option value="5">5</option>
        <option value="5.5">5.5</option>
        <option value="6">6</option>
      </Input>
      {isDisabled ?
        <div className="col-sm-7 col-sm-offset-5 score-alert-message">
          <p className="alert alert-warning"><i className="icon icon-info-circle"></i> A Study type must be selected
            to Score this Case-Control evidence.</p>
        </div>
        : null}
      {submitScore ?
        <Row><Col>
          <LoadingButton
            type="submit"
            className="align-self-end mb-2 ml-2 float-right "
            variant="primary"
            text="Save"
            textWhenLoading="Submitting"
            isLoading={isSubmitting}
            onClick={submitScore}
          />
        </Col></Row>
        : null}
    </div>
  );
}
