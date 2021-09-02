import React, { useState, useEffect } from 'react';
import { Row, Col } from "react-bootstrap";
import { cloneDeep, get as lodashGet } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import Input from "../../../common/Input";
import Popover from "../../../common/Popover";

import { getModeInheritanceType, getScoreMOIString, getDefaultScore } from '../../score/helpers/getDefaultScore';
import { getScoreRange } from '../../score/helpers/getScoreRange';
import VARIANT_SCORE_VARIANT_TYPES from '../../score/constants/variantScoreTypes';


export const IndividualVariantScore = ({
  gdm,
  index,
  variantScore,
  probandSelected,
  probandIs,
  updateVariantScore,
  scoreErrors,
}) => {

  const [ modeInheritanceType, setModeInheritanceType ] = useState(null); // Mode of Inheritance types
  const [ priorScoreStatus, setPriorScoreStatus ] = useState(undefined); // Placeholder score status for clearing explanation text field given the comparison
  const [ scoreRange, setScoreRange ] = useState([]); // Calculated score range

  const [ disableScoreStatus, setDisableScoreStatus ] = useState(false); // TRUE if variants info has not been filled
  const [ requiredScoreExplanation, setRequiredScoreExplanation ] = useState(false); // TRUE if a different score is selected from the range ` 
  const [ showScoreInput, setShowScoreInput ] = useState(false); // TRUE if either 'Score' or 'Review' is selected
  const [ willNotCountScore, setWillNotCountScore ] = useState(false); // TRUE if 'Review' is selected when Mode of Inheritance is not AD, AR, or X-Linked

  const [ formData, setFormData ] = useState({});

  useEffect(() => {
    loadVariantScoreData();
  }, []);

  useEffect(() => {
    if (variantScore) {
      loadVariantScoreData();
    }
  }, [variantScore]);

  const loadVariantScoreData = () => {
    let data = {};
    let calcDefaultScore = null;
    let calcScoreRange = null;

    const moiType = getModeInheritanceType(lodashGet(gdm, "modeInheritance", null));
    setModeInheritanceType(moiType); 

    if (variantScore) {
      // Populate input and select option values
      data['variantType'] = variantScore.variantType || "none";
      data['deNovo'] = variantScore.deNovo || "none";
      data['maternityPaternityConfirmed'] =  variantScore.maternityPaternityConfirmed || "none";
      data['functionalDataSupport'] = variantScore.functionalDataSupport || "none";
      data['functionalDataExplanation'] = variantScore.functionalDataExplanation || '';
      data['scoreStatus'] = variantScore.scoreStatus || 'none';

      if (data["variantType"] !== "none" &&
        (data["deNovo"] === "No" || data["deNovo"] === "Unknown" || (data["deNovo"] === "Yes" && data["maternityPaternityConfirmed"] !== "none")) &&
        (data["functionalDataSupport"] === "No" || (data["functionalDataSupport"] === "Yes" && data["functionalDataExplanation"] !== ""))) {
        calcDefaultScore = getDefaultScore(getScoreMOIString(moiType, probandIs), data);
        calcScoreRange = getScoreRange(getScoreMOIString(moiType, probandIs), data, null, parseFloat(calcDefaultScore));
        data['calculatedScore'] = calcDefaultScore;
        setScoreRange(calcScoreRange);
      }

      /**************************************************************************************/
      /* Curators are allowed to access the score form fields when the 'Score' is selected, */
      /* or when 'Review' is selected given the matched Mode of Inheritance types           */
      /* (although its score won't be counted from the summary).                            */
      /**************************************************************************************/
      if (variantScore.scoreStatus && (variantScore.scoreStatus === 'Score' || (variantScore.scoreStatus === 'Review' && moiType !== ''))) {
        const modifiedScore = lodashGet(variantScore, "score", null) !== null && variantScore.score >= 0 ? variantScore.score.toString() : 'none';
        // Setting UI and score object property states
        setShowScoreInput(true);
        setDisableScoreStatus(false);
        setWillNotCountScore(variantScore.scoreStatus === 'Review');
        setRequiredScoreExplanation(!isNaN(parseFloat(modifiedScore)) && variantScore.scoreExplanation);

        // Populate input and select score values
        data['calculatedScore'] = parseFloat(variantScore.calculatedScore) ? variantScore.calculatedScore : null;
        data['modifiedScore'] = modifiedScore && calcScoreRange ? modifiedScore : 'none';
        data['scoreExplanation'] = variantScore.scoreExplanation || '';
      } else if (variantScore.scoreStatus && variantScore.scoreStatus === 'Supports') {
        // Setting UI and score object property states
        setDisableScoreStatus(false);
        setShowScoreInput(false);
      } else {
        // Setting UI and score object property states
        // Enable scoreStatus if variantType, deNovo, functionalDataSupport and related fields are set
        if (data["variantType"] !== "none" &&
          (data["deNovo"] === "No" || data["deNovo"] === "Unknown" || (data["deNovo"] === "Yes" && data["maternityPaternityConfirmed"] !== "none")) &&
          (data["functionalDataSupport"] === "No" || (data["functionalDataSupport"] === "Yes" && data["functionalDataExplanation"] !== ""))) {
          setDisableScoreStatus(false);
          setShowScoreInput(false);
        } else {
          setDisableScoreStatus(true);
          setShowScoreInput(false);
        }
      }
    } else {
      // Initialize defaults
      data['variantType'] = "none";
      data['deNovo'] = "none";
      data['maternityPaternityConfirmed'] = "none";
      data['functionalDataSupport'] = "none";
      data['functionalDataExplanation'] = '';
      data['scoreStatus'] = 'none';
      data['calculatedScore'] = null;
      data['score'] = null;
      data['scoreExplanation'] = null;
      setDisableScoreStatus(true);
      setShowScoreInput(false);
    }

    setFormData(data);
  }

  // Put together the variantScore object based on the form values for
  // the currently logged-in user
  const updateVariantScoreObj = (newFormData) => {
    let newVariantScoreObj = {};

    newVariantScoreObj['variantType'] = newFormData['variantType'] !== 'none' ? newFormData['variantType'] : null;
    newVariantScoreObj['deNovo'] = newFormData['deNovo'] !== 'none' ? newFormData['deNovo'] : null;
    newVariantScoreObj['maternityPaternityConfirmed'] = newFormData['maternityPaternityConfirmed'] !== 'none'
      ? newFormData['maternityPaternityConfirmed'] : null;
    newVariantScoreObj['functionalDataSupport'] = newFormData['functionalDataSupport'] !== 'none'
      ? newFormData['functionalDataSupport'] : null;
    newVariantScoreObj['functionalDataExplanation'] = newFormData['functionalDataExplanation'];
    newVariantScoreObj['scoreStatus'] = newFormData['scoreStatus'] !== 'none' ? newFormData['scoreStatus'] : null;
    let score = newFormData['calculatedScore'];
    newVariantScoreObj['calculatedScore'] = score && !isNaN(parseFloat(score)) ? parseFloat(score) : null;
    // Convert score from string to number
    score = newFormData['modifiedScore'];
    newVariantScoreObj['score'] = score !== 'none' && !isNaN(parseFloat(score)) ? parseFloat(score) : null;
    newVariantScoreObj['scoreExplanation'] = newFormData['scoreExplanation'] || null;

    newVariantScoreObj['PK'] = lodashGet(variantScore, "PK", null);
    newVariantScoreObj['evidenceType'] = "Individual";
    newVariantScoreObj['evidenceScored'] = lodashGet(variantScore, "evidenceScored", null);
    newVariantScoreObj['variantScored'] = lodashGet(variantScore, "variantScored", null);

    // Call parent function to update user object state
    updateVariantScore(index, newVariantScoreObj);

  };

  const handleVariantScoreChange = (e) => {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;

    let newData = cloneDeep(formData);
    newData[fieldName] = fieldValue;

    // If any of this field is changed, need to remove modified score since the score range is different
    if (fieldName === "variantType" || fieldName === "deNovo" || fieldName === "functionalDataSupport") {
      newData["modifiedScore"] = 'none';
    }

    // If required variantType, deNovo, functionalDataSupport and related fields have data, enable select score  
    if (newData["variantType"] !== "none" &&
      (newData["deNovo"] === "No" || newData["deNovo"] === "Unknown" || (newData["deNovo"] === "Yes" && newData["maternityPaternityConfirmed"] !== "none")) &&
      (newData["functionalDataSupport"] === "No" || (newData["functionalDataSupport"] === "Yes" && newData["functionalDataExplanation"] !== ""))) {
      const calcDefaultScore = getDefaultScore(getScoreMOIString(modeInheritanceType, probandIs), newData);
      const calcScoreRange = getScoreRange(getScoreMOIString(modeInheritanceType, probandIs), newData, null, parseFloat(calcDefaultScore));
      newData['calculatedScore'] = calcDefaultScore;
      setScoreRange(calcScoreRange);
      setDisableScoreStatus(false);
    } else {
      newData['calculatedScore'] = 0;
      newData["modifiedScore"] = 'none';
      newData['scoreStatus'] = 'none';
      newData['scoreExplanation'] = '';
      setDisableScoreStatus(true);
      setShowScoreInput(false);
      setScoreRange([]);
    } 

    if (fieldName === "scoreRange") {
      newData['modifiedScore'] = fieldValue;
      /****************************************************/
      /* If a different score is selected from the range, */
      /* make explanation text box "required".            */
      /****************************************************/
      if (fieldValue !== 'none') {
        setRequiredScoreExplanation(true);
      } else {
        // Reset explanation if default score is kept
        setRequiredScoreExplanation(false);
        newData['scoreExplanation'] = '';
      }
    }

    updateVariantScoreObj(newData);
    setFormData(newData);
  }

  const handleScoreStatusChange = (e) => {
    const moiType = modeInheritanceType;
    const selectedScoreStatus = e.target.value;
    let newData = cloneDeep(formData);
    newData['scoreStatus'] = selectedScoreStatus;

    // Render or remove the case info types, default score, score range, and explanation fields
    // Parse score status value and set the state
    if (selectedScoreStatus === 'Score' || (selectedScoreStatus === 'Review' && moiType !== '')) {
      selectedScoreStatus === 'Review' ? setWillNotCountScore(true) : setWillNotCountScore(false);
      // Reset the states and update the calculated default score
      // Reset variant scenario dropdown options if any changes
      // Reset score range dropdown options if any changes
      // Reset explanation if score status is changed
      setShowScoreInput(true);
      if (selectedScoreStatus === 'Score' && formData['variantType'] === 'none') {
        newData['scoreExplanation'] = '';
      }
      if (formData['scoreExplanation'] !== '' && priorScoreStatus === 'Contradicts') {
        newData['scoreExplanation'] = '';
        setPriorScoreStatus(undefined);
      }
    } else if (selectedScoreStatus === 'Supports' || (selectedScoreStatus === 'Review' && moiType !== '')) {
      setShowScoreInput(false);
      if (formData['scoreExplanation'] !== '' && priorScoreStatus === 'Contradicts') {
        newData['scoreExplanation'] = '';
        setPriorScoreStatus(undefined);
      }
    } else {
      setShowScoreInput(false);
      setWillNotCountScore(false);
      setRequiredScoreExplanation(false);
      setPriorScoreStatus(formData['scoreStatus'] === 'Contradicts' ? 'Contradicts' : undefined);
      newData["modifiedScore"] = 'none';
      newData['scoreExplanation'] = '';
    }

    updateVariantScoreObj(newData);
    setFormData(newData);
  };

  const renderVariantScore = () => {
    // TRUE if Mode of Inheritance is either AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, MITOCHONDRIAL, SEMIDOMINANT, or X_LINKED
    const shouldCalcScore = modeInheritanceType && modeInheritanceType.length;
    const isMatPatRequired = formData["deNovo"] ? formData["deNovo"] === "Yes" : false;
    const isFuncExpRequired = formData["functionalDataSupport"] ? formData["functionalDataSupport"] === "Yes" : false;
    const infoText = 'Both parents have been tested, and neither carries the variant.  For X-linked disorders, only the mother needs to be tested.';
    const deNovoPopover = <Popover
      triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
      content={infoText}
      placement="top"
    />

    return (
      <>
        <Input type="select" name="variantType" label="Variant Type:"
          required value={formData["variantType"]} onChange={handleVariantScoreChange}
          error={(scoreErrors && scoreErrors[index] && scoreErrors[index]["variantType"]) || null}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="PREDICTED_OR_PROVEN_NULL">{VARIANT_SCORE_VARIANT_TYPES["PREDICTED_OR_PROVEN_NULL"]}</option>
          <option value="OTHER_VARIANT_TYPE">{VARIANT_SCORE_VARIANT_TYPES["OTHER_VARIANT_TYPE"]}</option>
        </Input>
        <Input type="select" name="deNovo" label={<span>Is this variant de novo{deNovoPopover}?:</span>}
          required value={formData["deNovo"]} onChange={handleVariantScoreChange}
          error={(scoreErrors && scoreErrors[index] && scoreErrors[index]["deNovo"]) || null}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          <option value="Unknown">Unknown</option>
        </Input>
        <Input type="select" name="maternityPaternityConfirmed" label="If yes, is the variant maternity and paternity confirmed?:"
          value={formData["maternityPaternityConfirmed"]} onChange={handleVariantScoreChange} required={isMatPatRequired}
          error={(scoreErrors && scoreErrors[index] && scoreErrors[index]["maternityPaternityConfirmed"]) || null}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Input>
        <Input type="select" name="functionalDataSupport" label="Is there functional data to support this variant?:"
          required value={formData["functionalDataSupport"]} onChange={handleVariantScoreChange}
          error={(scoreErrors && scoreErrors[index] && scoreErrors[index]["functionalDataSupport"]) || null}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Input>
        <Input type="textarea" name="functionalDataExplanation"
          label={<span>If yes, please describe functional data:{isFuncExpRequired ? " *" : ''} <i>(<strong>Required</strong> if selected yes above)</i></span>}
          rows="2" value={formData['functionalDataExplanation']} onChange={handleVariantScoreChange}
          error={(scoreErrors && scoreErrors[index] && scoreErrors[index]["functionalDataExplanation"]) || null}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" />
        <Input type="select" name="scoreStatus" label="Select Status:"
          value={formData["scoreStatus"]} onChange={handleScoreStatusChange} disabled={disableScoreStatus}
          error={(scoreErrors && scoreErrors[index] && scoreErrors[index]["scoreStatus"]) || null}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value={shouldCalcScore ? 'Score' : 'Supports'}>{shouldCalcScore ? 'Score' : 'Supports'}</option>
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
          : null}

        {showScoreInput ?
          <>
          <Row className="mb-3 calculated-score">
            <label className="col-sm-5 control-label">Default Score:</label>
            <Col sm="7">{formData["calculatedScore"] ? formData["calculatedScore"] : 'Insufficient information to obtain score'}</Col>
          </Row>
          <Input type="select" name="scoreRange" label={<span>Select a score different from default score:<i>(optional)</i></span>}
            value={formData["modifiedScore"]} onChange={handleVariantScoreChange}
            disabled={scoreRange && scoreRange.length ? false : true}
            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
          >
            <option value="none">No Selection</option>
            <option disabled="disabled"></option>
            {scoreRange.map((score, i) => {
              return <option key={i} value={score}>{score}</option>;
            })}
          </Input>
          </>
          : null}

        {formData['scoreStatus'] !== 'none' ?
            <Input type="textarea" name="scoreExplanation"
              label={formData['scoreStatus'] === 'Score' || (formData['scoreStatus'] === 'Review' && modeInheritanceType.length) ?
              <span>Explanation:{requiredScoreExplanation ? " *" : ''}<i>(<strong>Required</strong> if selecting score different from default score)</i></span>
              : <span>Explanation:</span>}
              rows="2" value={formData['scoreExplanation']} onChange={handleVariantScoreChange}
              error={(scoreErrors && scoreErrors[index] && scoreErrors[index]["scoreExplanation"]) || null}
              placeholder={formData['scoreStatus'] === 'Score' || (formData['scoreStatus'] === 'Review' && modeInheritanceType.length) ?
                  'Note: Please use this box to describe the types of evidence about the variant that support your score. If you selected a score different from the default score you must provide a reason to change here.'
                  : null}
              labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" />
          : null}
      </>
    );
  }

  return (
    <>
      {renderVariantScore()}
    </>
  );

};


