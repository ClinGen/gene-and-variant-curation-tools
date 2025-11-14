import React, { useState, useEffect } from 'react';
import { Row, Col } from "react-bootstrap";
import { cloneDeep, isEmpty, get as lodashGet } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import Input from "../../common/Input";
import { LoadingButton } from "../../common/LoadingButton";
import { getUserScore } from './helpers/getUserScore';
import { getUserAffiliatedScore } from './helpers/getUserAffiliatedScore';

// Render scoring panel in Gene Curation Interface
export const CaseControlScore = ({
  auth,
  caseControl,
  handleUserScoreObj,
  isDisabled,
  isSubmitting,
  error
}) => {

  const [scoreAffiliation, setScoreAffiliation] = useState(null); // Affiliation associated with the score
  const [scoreData, setScoreData] = useState({});
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [willNotCountScore, setWillNotCountScore] = useState(false); // TRUE if "Review" is selected

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isDisabled && !isEmpty(scoreData) && scoreData.scoreStatus !== "none") {
      let newData = {...scoreData, scoreStatus: "none", score: "none", scoreExplanation: ""};
      setScoreData(newData);
      setShowScoreInput(false);
      setWillNotCountScore(false);
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
        const modifiedScore = "score" in matchedScore && matchedScore.score >= 0 ? matchedScore.score.toString() : "none";
        const scoreStatus = "scoreStatus" in matchedScore ? matchedScore.scoreStatus
          : (modifiedScore !== "none")
            ? "Score"
            : "none";
        const newScore = {
          PK: matchedScore.PK,
          evidenceType: "Case control",
          evidenceScored: matchedScore.evidenceScored,
          scoreStatus: scoreStatus,
          score: modifiedScore,
          scoreExplanation: lodashGet(matchedScore, "scoreExplanation") ? matchedScore.scoreExplanation : ""
        };
        setScoreData(newScore);
        updateUserScoreObj(newScore);
        if (scoreStatus === "Score" || scoreStatus === "Review") {
          setShowScoreInput(true);
          setWillNotCountScore(scoreStatus === "Review");
        } else {
          setShowScoreInput(false);
          setWillNotCountScore(false);
        }
      }
    } else {
      const newScore = {
        evidenceType: "Case control",
        evidenceScored: lodashGet(caseControl, "PK", null),
        scoreStatus: "none",
        score: "none",
        scoreExplanation: ""
      };
      setScoreData(newScore);
      updateUserScoreObj(newScore);
    }
  };

  const handleChange = (e) => {
    const newData = cloneDeep(scoreData);

    if (e.target.name === "scoreStatus") {
      // Parse score status value and set the state
      const selectedScoreStatus = e.target.value;
      newData["scoreStatus"] = selectedScoreStatus;
      if (selectedScoreStatus === "Score" || selectedScoreStatus === "Review") {
        setShowScoreInput(true);
        setWillNotCountScore(selectedScoreStatus === "Review");
      } else if (selectedScoreStatus === "Contradicts") {
        setShowScoreInput(false);
        setWillNotCountScore(false);
      } else {
        setShowScoreInput(false);
        setWillNotCountScore(false);
      }
      newData["score"] = "none";
      newData["scoreExplanation"] = "";
    } else if (e.target.name === "scoreRange") {
      newData["score"] = e.target.value;
    } else if (e.target.name === "scoreExplanation") {
      newData["scoreExplanation"] = e.target.value;
    }
    updateUserScoreObj(newData);
    setScoreData(newData);
  };

  // Put together the score object based on the form values for
  // the currently logged-in user
  const updateUserScoreObj = (newScore) => {
    let newUserScoreObj = cloneDeep(newScore);

    // Call parent function to update user object state
    if (!isEmpty(newUserScoreObj)) {
      newUserScoreObj["evidenceType"] = "Case control";
      newUserScoreObj["scoreStatus"] = newScore["scoreStatus"] !== "none" ? newScore["scoreStatus"] : null;
      // Convert score from string to number
      const score = newScore["score"];
      newUserScoreObj["score"] = score !== "none" && !isNaN(parseFloat(score)) ? parseFloat(score) : null;
      newUserScoreObj["scoreExplanation"] = newScore["scoreExplanation"] || null;
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
      <Input
        type="select"
        name="scoreStatus"
        label="Select Status:"
        value={lodashGet(scoreData, "scoreStatus")}
        onChange={handleChange}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        disabled={isDisabled}
      >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="Score">Score</option>
        <option value="Review">Review</option>
        <option value="Contradicts">Contradicts</option>
      </Input>
      {willNotCountScore ?
        <Row>
          <Col sm="5"></Col>
          <Col sm="7" className="score-alert-message">
            <p className="alert alert-warning"><FontAwesomeIcon className="text-info" icon={faInfoCircle}/> This is marked with the status "Review" and will not be included in the final score.</p>
          </Col>
        </Row>
        : null
      }
      {showScoreInput ?
        <Input type="select" name="scoreRange" label="Score:" onChange={handleChange}
          value={lodashGet(scoreData, "score")} disabled={isDisabled}
          error={error} labelClassName="col-sm-5 control-label"
          wrapperClassName="col-sm-7" groupClassName="row mb-3">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="0">0</option>
          <option value="0.25">0.25</option>
          <option value="0.5">0.5</option>
          <option value="0.75">0.75</option>
          <option value="1">1</option>
          <option value="1.25">1.25</option>
          <option value="1.5">1.5</option>
          <option value="1.75">1.75</option>
          <option value="2">2</option>
          <option value="2.25">2.25</option>
          <option value="2.5">2.5</option>
          <option value="2.75">2.75</option>
          <option value="3">3</option>
          <option value="3.25">3.25</option>
          <option value="3.5">3.5</option>
          <option value="3.75">3.75</option>
          <option value="4">4</option>
          <option value="4.25">4.25</option>
          <option value="4.5">4.5</option>
          <option value="4.75">4.75</option>
          <option value="5">5</option>
          <option value="5.25">5.25</option>
          <option value="5.5">5.5</option>
          <option value="5.75">5.75</option>
          <option value="6">6</option>
        </Input>
        : null
      }
      {lodashGet(scoreData, "scoreStatus") === "Contradicts" ?
        <Input
          type="textarea"
          name="scoreExplanation"
          label="Explanation:"
          value={lodashGet(scoreData, "scoreExplanation")}
          onChange={handleChange}
          rows="3"
          groupClassName="row mb-4"
          wrapperClassName="col-sm-7"
          labelClassName="col-sm-5 control-label"
        />
        : null
      }
      {isDisabled ?
        <div className="col-sm-7 col-sm-offset-5 score-alert-message">
          <p className="alert alert-warning"><i className="icon icon-info-circle"></i> A Study type must be selected
            to Score this Case-Control evidence.</p>
        </div>
        : null
      }
    </div>
  );
}
