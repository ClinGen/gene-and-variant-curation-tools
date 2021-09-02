import React, { useState, useEffect } from 'react';
import { Row, Col } from "react-bootstrap";
import { cloneDeep, isEmpty, get as lodashGet } from "lodash";
import { API } from 'aws-amplify';
import { API_NAME } from '../../../utils';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import LoadingSpinner from '../../common/LoadingSpinner';
import Input from "../../common/Input";
import { LoadingButton } from "../../common/LoadingButton";
import { ExternalLink } from "../../common/ExternalLink";
import { AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, MITOCHONDRIAL, X_LINKED, SEMIDOMINANT } from './constants/evidenceTypes';
import CASE_INFO_TYPES from './constants/caseInfoTypes';
import { getDefaultScore } from './helpers/getDefaultScore';
import { getScoreRange } from './helpers/getScoreRange';
import { getUserScore } from './helpers/getUserScore';
import { getUserAffiliatedScore } from './helpers/getUserAffiliatedScore';

import { useAmplifyAPIRequestRecycler } from '../../../utilities/fetchUtilities';

// Render scoring panel in Gene Curation Interface
export const IndividualScore = ({
  auth,
  gdm,
  annotation,
  individual,
  variantInfo,
  submitScore,
  isSubmitting,
  handleUserScoreObj,
  scoreErrorMsg,
}) => {

  const requestRecycler = useAmplifyAPIRequestRecycler();

  const [ isLoading, setIsLoading ] = useState(false);
  const [ modeInheritanceType, setModeInheritanceType ] = useState(null); // Mode of Inheritance types
  const [ priorScoreStatus, setPriorScoreStatus ] = useState(undefined); // Placeholder score status for clearing explanation text field given the comparison
  const [ caseInfoTypeGroup, setCaseInfoTypeGroup ] = useState([]); // Array of Case Information types given the Mode of Inheritance type
  const [ scoreRange, setScoreRange ] = useState([]); // Calculated score range
  const [pathogenicitiesList, setPathogenicitiesList] = useState([]);

  const [ disableScoreStatus, setDisableScoreStatus ] = useState(false); // TRUE if Individual evidence has no variants at all
  const [ requiredScoreExplanation, setRequiredScoreExplanation ] = useState(false); // TRUE if a different score is selected from the range ` 
  const [ showCaseInfoTypeOnly, setShowCaseInfoTypeOnly ] = useState(false); // TRUE if Mode of Inheritance is not AD, AR, or X-Linked
  const [ showScoreInput, setShowScoreInput ] = useState(false); // TRUE if either 'Score' or 'Review' is selected
  const [ willNotCountScore, setWillNotCountScore ] = useState(false); // TRUE if 'Review' is selected when Mode of Inheritance is not AD, AR, or X-Linked

  const [ formData, setFormData ] = useState({});

  useEffect(() => {
    const getPathogenicities = async () => {
      setIsLoading(true);

      const promises = gdm.variantPathogenicity.map(async (pathogenicityId) => {
        const url = `/pathogenicity/${pathogenicityId}`;
        return await requestRecycler.capture(API.get(API_NAME, url));
      });

      Promise.all(promises).then((results) => {
        if (results && results.length) {
          setPathogenicitiesList(results);
        }
        setIsLoading(false);
      }).catch((error) => {
        if (API.isCancel(error)) {
          console.log('Cancel');
        }
        setIsLoading(false);
        console.log(error);
      });
    };
    loadData();
    if (gdm && gdm.variantPathogenicity && gdm.variantPathogenicity.length > 0) {
      getPathogenicities();
    }
    return () => {
      setIsLoading(false);
      requestRecycler.cancelAll();
    }
  }, []);

  useEffect(() => {
    if (variantInfo && variantInfo.length > 0) {
      setDisableScoreStatus(false);
    } else {
      setDisableScoreStatus(true);
      setShowScoreInput(false);
      setShowCaseInfoTypeOnly(true);
      setWillNotCountScore(false);
      setFormData({
        defaultScore: null,
        scoreStatus: 'none',
        caseInfoType: 'none',
        modifiedScore: 'none',
        scoreExplanation: '',
      });
    }
  }, [variantInfo]);


  const loadData = () => {
    let data = {};

    // Prep the following when the component is loaded
    const moiType = getModeInheritanceType(lodashGet(gdm, "modeInheritance", null));
    setModeInheritanceType(moiType); 
    setCaseInfoTypeGroup(getCaseInfoTypeGroup(moiType));

    // If the individual evidence has no variants at all, disable the Score Status form field
    if (variantInfo && !isEmpty(variantInfo)) {
      setDisableScoreStatus(false);
    } else {
      setDisableScoreStatus(true);
    }

    // Get evidenceScore object for the logged-in user if exists
    if (individual && individual.scores && individual.scores.length) {
      const userAffiliatedScore = getUserAffiliatedScore(individual.scores, auth);
      const loggedInUserScore = getUserScore(individual.scores, lodashGet(auth, "PK", null));
      let matchedScore = null;
      const affiliation = lodashGet(auth, "currentAffiliation", null);
      if (userAffiliatedScore) {
        matchedScore = userAffiliatedScore;
      } else {
        matchedScore = loggedInUserScore && !loggedInUserScore.affiliation && !affiliation ? loggedInUserScore : null;
      }
      if (matchedScore) {
        // Render or remove the default score, score range, and explanation fields
        const msScoreStatus = matchedScore.scoreStatus;
        const msCaseInfoType = matchedScore.caseInfoType;
        const msDefaultScore = matchedScore.calculatedScore;
        const msScoreExplanation = matchedScore.scoreExplanation;
        const msCalcScoreRange = getCalcScoreRange(moiType, msCaseInfoType, parseFloat(msDefaultScore));
        const msModifiedScore = lodashGet(matchedScore, "score", null) !== null && matchedScore.score >= 0 ? matchedScore.score.toString() : 'none';
    
        data["PK"] = matchedScore.PK;
        data["affiliation"] = lodashGet(matchedScore, affiliation, null);

        /**************************************************************************************/
        /* Curators are allowed to access the score form fields when the 'Score' is selected, */
        /* or when 'Review' is selected given the matched Mode of Inheritance types           */
        /* (although its score won't be counted from the summary).                            */
        /**************************************************************************************/
        if (msScoreStatus && (msScoreStatus === 'Score' || (msScoreStatus === 'Review' && moiType !== ''))) {
          // Setting UI and score object property states
          setShowScoreInput(true);
          setWillNotCountScore(msScoreStatus === 'Review');
          setScoreRange(msCalcScoreRange);
          setRequiredScoreExplanation(!isNaN(parseFloat(msModifiedScore)) && msScoreExplanation);
          // Populate input and select option values
          data["defaultScore"] = parseFloat(msDefaultScore) ? msDefaultScore : null;
          data["scoreStatus"] = msScoreStatus || 'none';
          data["caseInfoType"] = msCaseInfoType || 'none';
          data["modifiedScore"] = msModifiedScore && msCalcScoreRange ? msModifiedScore : 'none';
          data["scoreExplanation"] = msScoreExplanation || '';
        } else if (msScoreStatus && (msScoreStatus === 'Supports' || (msScoreStatus === 'Review' && moiType !== ''))) {
          setShowScoreInput(true);
          setShowCaseInfoTypeOnly(true);
          data["scoreStatus"] = msScoreStatus || 'none';
          data["caseInfoType"] = msCaseInfoType || 'none';
        } else {
          setShowScoreInput(false);
          setShowCaseInfoTypeOnly(true);
          data["scoreStatus"] = msScoreStatus || 'none';
          data["scoreExplanation"] = msScoreExplanation || '';
        }
      } else {
        data["defaultScore"] = null;
        data["scoreStatus"] = 'none';
        data["caseInfoType"] = 'none';
        data["modifiedScore"] = 'none';
        data["scoreExplanation"] = '';
      }
    } else {
      data["defaultScore"] = null;
      data["scoreStatus"] = 'none';
      data["caseInfoType"] = 'none';
      data["modifiedScore"] = 'none';
      data["scoreExplanation"] = '';
    }

    updateUserScoreObj(data);
    setFormData(data);
  };

  // Determine mode of inheritance type via modeInheritance
  const getModeInheritanceType = (moi) => {
    let moiType = '';

    if (moi && moi.length) {
      if (moi.indexOf('Autosomal dominant inheritance') > -1) {
        moiType = AUTOSOMAL_DOMINANT;
      } else if (moi.indexOf('Autosomal recessive inheritance') > -1) {
        moiType = AUTOSOMAL_RECESSIVE;
      } else if (moi.indexOf('X-linked') > -1) {
        moiType = X_LINKED;
      } else if (moi.indexOf('Semidominant inheritance') > -1) {
        moiType = SEMIDOMINANT;
      } else if (moi.indexOf('Mitochondrial inheritance') > -1) {
        moiType = MITOCHONDRIAL;
      } else {
        // Mode of Inheritance is not either AD, AR, SD, or X-Linked
        moiType = '';
      }
    }

    return moiType;
  };

  // Find the group of Case Information types given the Mode of Inheritance
  const getCaseInfoTypeGroup = (moiType) => {
    // Put CASE_INFO_TYPES object keys into an array
    const caseInfoTypeKeys = Object.keys(CASE_INFO_TYPES);
    // Default group of Case Information types in dropdown selection
    let caseInfoTypeGroupResult = CASE_INFO_TYPES.OTHER;
    // Assign different group of Case Information types given the matched Mode of Inheritance type
    caseInfoTypeKeys.forEach(key => {
      if (moiType && moiType === key) {
        caseInfoTypeGroupResult = CASE_INFO_TYPES[moiType];
      }
    });

    return caseInfoTypeGroupResult;
  };

  // Find the default calculated score given the types of
  // Mode of Inheritance and Case Information
  const getCalcDefaultScore = (moiType, caseInfoType, loggedInUserScore, updateDefaultScore) => {
    let calcDefaultScore;

    if (loggedInUserScore && loggedInUserScore.calculatedScore) {
      if (updateDefaultScore) {
        // A different scenario is selected after a pre-existing score is loaded from db
        calcDefaultScore = getDefaultScore(moiType, caseInfoType);
      } else {
        // A pre-existing score is loaded from db
        calcDefaultScore = getDefaultScore(moiType, caseInfoType, null, loggedInUserScore.calculatedScore);
      }
    } else {
      // New. No pre-exisitng score for the currently logged-in user
      calcDefaultScore = getDefaultScore(moiType, caseInfoType);
    }
        
    return calcDefaultScore;
  };

  // Find the calculated score range given the types of
  // Mode of Inheritance and Case Information
  const getCalcScoreRange = (moiType, caseInfoType, useDefaultScore) => {
    let calcScoreRange = [];

    if (getScoreRange(moiType, caseInfoType, null, useDefaultScore).length) {
      calcScoreRange = getScoreRange(moiType, caseInfoType, null, useDefaultScore);
    }

    return calcScoreRange;
  };

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
      setShowCaseInfoTypeOnly(false);
      if (selectedScoreStatus === 'Score' && formData['caseInfoType'] === 'none') {
        newData['scoreExplanation'] = '';
      }
      if (formData['scoreExplanation'] !== '' && priorScoreStatus === 'Contradicts') {
        newData['scoreExplanation'] = '';
        setPriorScoreStatus(undefined);
      }
    } else if (selectedScoreStatus === 'Supports' || (selectedScoreStatus === 'Review' && moiType !== '')) {
      setShowScoreInput(true);
      setShowCaseInfoTypeOnly(true);
      if (formData['scoreExplanation'] !== '' && priorScoreStatus === 'Contradicts') {
        newData['scoreExplanation'] = '';
        setPriorScoreStatus(undefined);
      }
    } else {
      setScoreRange([]);
      setShowScoreInput(false);
      setShowCaseInfoTypeOnly(false);
      setWillNotCountScore(false);
      //setDefaultScore(null);
      setRequiredScoreExplanation(false);
      setPriorScoreStatus(formData['scoreStatus'] === 'Contradicts' ? 'Contradicts' : undefined);
      newData["defaultScore"] = null;
      newData["caseInfoType"] = 'none';
      newData["modifiedScore"] = 'none';
      newData['scoreExplanation'] = '';
    }

    updateUserScoreObj(newData);
    setFormData(newData);
  };

  const handleCaseInfoTypeChange = (e) => {
    const moiType = modeInheritanceType;
    const selectedCaseInfoType = e.target.value;
    let newData = cloneDeep(formData);

    newData['caseInfoType'] = selectedCaseInfoType;

    // Get the variant case info type for determining the default score and score range
    // Parse Case Information type value and set the state
    if (selectedCaseInfoType && selectedCaseInfoType !== 'none') {
      const calcDefaultScore = getCalcDefaultScore(moiType, selectedCaseInfoType, null, true);
      setRequiredScoreExplanation(false);
      const calcScoreRange = getCalcScoreRange(moiType, selectedCaseInfoType, calcDefaultScore);
      setScoreRange(calcScoreRange);
      newData['defaultScore'] = calcDefaultScore;
      newData['scoreExplanation'] = '';
      newData['modifiedScore'] = 'none';
      newData['scoreExplanation'] = '';
    } else {
      setScoreRange([]);
      setRequiredScoreExplanation(false);
      newData['defaultScore'] = null;
      newData['modifiedScore'] = 'none';
      newData['scoreExplanation'] = '';
    }

    updateUserScoreObj(newData);
    setFormData(newData);
  };

  const handleScoreRangeChange = (e) => {
    /****************************************************/
    /* If a different score is selected from the range, */
    /* make explanation text box "required".            */
    /****************************************************/
    // Parse the modified score selected by the curator
    const selectedModifiedScore = e.target.value;
    let newData = cloneDeep(formData);
    newData['modifiedScore'] = selectedModifiedScore;

    if (selectedModifiedScore !== 'none') {
      setRequiredScoreExplanation(true);
    } else {
      // Reset explanation if default score is kept
      setRequiredScoreExplanation(false);
      newData['scoreExplanation'] = '';
    }

    setFormData(newData);
    updateUserScoreObj(newData);
   };

  const handleScoreExplanation = (e) => {
    // Parse the score explanation entered by the curator
    let newData = cloneDeep(formData);
    newData['scoreExplanation'] = e.target.value;
    updateUserScoreObj(newData);

    setFormData(newData);
  };

  // Put together the score object based on the form values for
  // the currently logged-in user
  const updateUserScoreObj = (newFormData) => {
    let newUserScoreObj = {};

    newUserScoreObj['evidenceType'] = "Individual";
    newUserScoreObj['scoreStatus'] = newFormData['scoreStatus'] !== 'none' ? newFormData['scoreStatus'] : null;
    newUserScoreObj['caseInfoType'] = newFormData['caseInfoType'] !== 'none' ? newFormData['caseInfoType'] : '';
    let score = newFormData['defaultScore'];
    newUserScoreObj['calculatedScore'] = score && !isNaN(parseFloat(score)) ? parseFloat(score) : null;
    // Convert score from string to number
    score = newFormData['modifiedScore'];
    newUserScoreObj['score'] = score !== 'none' && !isNaN(parseFloat(score)) ? parseFloat(score) : null;
    newUserScoreObj['scoreExplanation'] = newFormData['scoreExplanation'] || null;
    newUserScoreObj['PK'] = newFormData.PK;
    newUserScoreObj['evidenceScored'] = lodashGet(individual, "PK", null);

    // Call parent function to update user object state
    // Add affiliation to score object
    // if the user is associated with an affiliation
    // and if the data object has no affiliation
    // and only when there is score data to be saved
    if (formData["scoreAffiliation"]) {
      newUserScoreObj['affiliation'] = formData["scoreAffiliation"];
    } else if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
      newUserScoreObj['affiliation'] = auth.currentAffiliation.affiliation_id;
    }

    handleUserScoreObj(newUserScoreObj);
  };

  // Get the pathogenicity made by the curator with the given user PK from the given variant
  const getPathogenicityFromVariant = (gdm, curatorPK, variantPK, affiliation) => {
    let pathogenicity = null;
    if (lodashGet(gdm, "variantPathogenicity", null) && pathogenicitiesList.length > 0) {
      for (let object of pathogenicitiesList) {
        if (affiliation && object.affiliation && object.affiliation === affiliation.affiliation_id && object.variant.PK === variantPK) {
          pathogenicity = object;
        } else if (!affiliation && !object.affiliation && object.submitted_by.PK === curatorPK && object.variant.PK === variantPK) {
          pathogenicity = object;
        }
      }
    }
    return pathogenicity;
  };

  const renderVariantCurationLinks = (variants) => {
    const affiliation = lodashGet(auth, "currentAffiliation", null);
    const userPK = lodashGet(auth, "PK", null);

    return (
      <span className="variant-gene-impact-curation-links-wrapper">
        <strong>Curate Variant's Gene Impact:</strong>
        {variants.map((variant, i) => {
          // See if the variant has a pathogenicity curated in the current GDM
          const userPathogenicity = getPathogenicityFromVariant(gdm, userPK, variant.PK, affiliation);
          let variantCurationUrl = '';
          if (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(variant, "PK", null)) {
            variantCurationUrl = `/curation-central/${gdm.PK}/annotation/${annotation.PK}/variant/${variant.PK}` +
              (lodashGet(userPathogenicity, "PK", null) ? `/pathogenicity/${userPathogenicity.PK}` : '');
          }
                            
          return (
            <span key={i} className="ml-3 variant-gene-impact-curation-link-item">
              <ExternalLink href={variantCurationUrl} title={variant.preferredTitle}>
                {variant.preferredTitle}
              </ExternalLink>
            </span>
          );
        })}
      </span>
    );
  };


  // TRUE if Mode of Inheritance is either AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, MITOCHONDRIAL, SEMIDOMINANT, or X_LINKED
  const shouldCalcScore = modeInheritanceType && modeInheritanceType.length;
  const variants = variantInfo && !isEmpty(variantInfo) ? variantInfo : []; 

  return isLoading
    ? <LoadingSpinner className="mt-3" />
    : (
    <>
    <Row className="mb-3">
      <Col>
        <p className="alert alert-warning">
          The gene impact for each variant associated with this proband must be specified in order to score this proband (see variant(s) and links to curating their gene impact in variant section for this Individual, above).
          <br />
          {variants.length ? renderVariantCurationLinks(variants) : null}
        </p>
      </Col>
    </Row>

    <Row className="mb-3">
      <label className="col-sm-5 control-label"><span>Select Status:</span></label>
      <Col sm="7">
        <Input type="select" name="scoreStatus" value={formData['scoreStatus']}
          onChange={handleScoreStatusChange} disabled={disableScoreStatus}
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value={shouldCalcScore ? 'Score' : 'Supports'}>{shouldCalcScore ? 'Score' : 'Supports'}</option>
          <option value="Review">Review</option>
          <option value="Contradicts">Contradicts</option>
        </Input>
      </Col>
    </Row>

    {disableScoreStatus ?
      <Row>
        <Col sm="5"></Col>
        <Col sm="7" className="score-alert-message">
          <p className="alert alert-warning"><FontAwesomeIcon className="text-info" icon={faInfoCircle}/> Proband must be associated with at least one variant to Score this evidence.</p>
        </Col>
      </Row>
      : null}

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
      <Row className="mb-3">
        <label className="col-sm-5 control-label">Confirm Case Information type:</label>
        <Col sm="7">
          <Input type="select" name="caseInfoType"
            value={formData['caseInfoType']} onChange={handleCaseInfoTypeChange}
          >
            <option value="none">No Selection</option>
            <option disabled="disabled"></option>
            {caseInfoTypeGroup.map((item, i) => {
              return <option key={i} value={item.TYPE}>{item.DESCRIPTION}</option>;
            })}
          </Input>
        </Col>
      </Row>
      {!showCaseInfoTypeOnly ?
        <div>
          <Row className="mb-3 calculated-score">
            <label className="col-sm-5 control-label">Default Score:</label>
            <Col sm="7">{formData["defaultScore"] ? formData["defaultScore"] : 'Insufficient information to obtain score'}</Col>
          </Row>
          <Row className="mb-3">
            <label className="col-sm-5 control-label">Select a score different from default score:<i>(optional)</i></label>
            <Col sm="7">
              <Input type="select" name="scoreRange"
                value={formData['modifiedScore']} onChange={handleScoreRangeChange}
                disabled={scoreRange && scoreRange.length ? false : true}
              >
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {scoreRange.map((score, i) => {
                  return <option key={i} value={score}>{score}</option>;
                })}
              </Input>
            </Col>
          </Row>
        </div>
        : null}
      </>
      : null}

      {formData['scoreStatus'] !== 'none' ?
        <>
        <Row className="mb-3">
          <label className="col-sm-5 control-label">Explanation:{formData['scoreStatus'] === 'Score' || (formData['scoreStatus'] === 'Review' && modeInheritanceType.length) ?
            <span><i>(<strong>Required</strong> when selecting score different from default score)</i></span>
            : null}
          </label>
          <Col sm="7">
            <Input type="textarea" name="scoreExplanation"
              rows="3" required={requiredScoreExplanation}
              disabled={formData['scoreStatus'] === 'Score' && formData['caseInfoType'] === 'none'}
              value={formData['scoreExplanation']} onChange={handleScoreExplanation}
              placeholder={formData['scoreStatus'] === 'Score' || (formData['scoreStatus'] === 'Review' && modeInheritanceType.length) ?
                'Note: If you selected a score different from the default score, you must provide a reason for the change here.'
                : null}
            />
          </Col>
        </Row>
        {scoreErrorMsg ?
          <Col sm={{ span: 7, offset: 5 }} className="score-alert-message">
            <p className="alert alert-warning"><i className="icon icon-exclamation-triangle"></i> {scoreErrorMsg}</p>
          </Col>
          : null}
        </>
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
    </>
  );
};


