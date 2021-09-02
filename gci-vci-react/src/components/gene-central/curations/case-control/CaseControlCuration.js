import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import { useHistory, Link } from "react-router-dom";
import { cloneDeep, isEmpty, get as lodashGet } from "lodash";
import { Row, Col, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../../../utils';

import { GroupDisease } from '../disease/GroupDisease';
import { EvaluationScore } from './EvaluationScore';
import { HpoTermModal } from '../common/HpoTermModal';
import { DeleteCurationModal } from '../common/DeleteCurationModal';
import { CaseControlScore } from '../../score/CaseControlScore'
import { LoadingButton } from "../../../common/LoadingButton";
import LoadingSpinner from '../../../common/LoadingSpinner';
import { COUNTRY_CODES } from '../../../../constants/countryCodes.js';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { setGdmAction } from "../../../../actions/gdmActions";
import { updateAnnotationAction } from "../../../../actions/annotationActions";
import { MethodsPanel, createMethod } from '../common/Methods';
import { ExternalLink } from "../../../common/ExternalLink";
import { renderLabelNote, renderLabelPhenoTerms, renderAlleleFrequency, getGenesFromList, getPmidsFromList } from '../common/commonFunc';
import CardPanel from "../../../common/CardPanel";
import Input from "../../../common/Input";

import { gdmParticipantReducer } from '../../../../utilities/gdmUtilities';
import { useAmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';

export const CaseControlCuration = ({
  editCaseControl = null
}) => {

  const history = useHistory();
  const dispatch = useDispatch();
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  });
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);

  const auth = useSelector((state) => state.auth);

  const [caseControl, setCaseControl] = useState(editCaseControl);
  //const [caseCohort, setCaseCohort] = useState(null);
  //const [controlCohort, setControlCohort] = useState(null);

  const [diseaseObj, setDiseaseObj] = useState(null);
  const [diseaseError, setDiseaseError] = useState(null);
  const [diseaseRequired, setDiseaseRequired] = useState(false);
  const [caseCohortGenotyping2Disabled, setCaseCohortGenotyping2Disabled] = useState(true); // True if genotyping method 2 dropdown disabled
  const [controlCohortGenotyping2Disabled, setControlCohortGenotyping2Disabled] = useState(true); // True if genotyping method 2 dropdown disabled

  const [userScore, setUserScore] = useState(null);

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [badCaseCohortPmids, setBadCaseCohortPmids ] = useState([]);
  const [badControlCohortPmids, setBadControlCohortPmids ] = useState([]);
  const [badGenes, setBadGenes] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [scoreDisabled, setScoreDisabled] = useState(true);

  const [hpoWithTerms, setHpoWithTerms] = useState([]);
  const [hpoElimWithTerms, setHpoElimWithTerms] = useState([]);
  

  useEffect(() => {
    setCaseControl(editCaseControl);
    loadCaseControlData();
  }, []);

  const loadCaseControlData = () => {
    const caseCohort = lodashGet(caseControl, "caseCohort", null);
    const controlCohort = lodashGet(caseControl, "controlCohort", null);

    let data = {};

    // Case Control Labels
    data['caseControlName'] = caseControl && caseControl.label ? caseControl.label : '';
    data['caseCohort_groupName'] = caseCohort && caseCohort.label ? caseCohort.label : '';
    data['controlCohort_groupName'] = controlCohort && controlCohort.label ? controlCohort.label : '';

    // Disease & Phenotype (only for caseCohort)
    if (caseCohort && caseCohort.commonDiagnosis && caseCohort.commonDiagnosis.length > 0) {
      setDiseaseObj(caseCohort.commonDiagnosis[0]);
    }
    data['caseCohort_phenoTerms'] = caseCohort && caseCohort.termsInDiagnosis ? caseCohort.termsInDiagnosis : '';
    data['caseCohort_notPhenoTerms'] = caseCohort && caseCohort.termsInElimination ? caseCohort.termsInElimination : '';
    if (caseCohort && caseCohort.hpoIdInDiagnosis) {
      setHpoWithTerms(caseCohort.hpoIdInDiagnosis);
    }
    if (caseCohort && caseCohort.hpoIdInElimination) {
      setHpoElimWithTerms(caseCohort.hpoIdInElimination);
    }
    // ??? control cohort has no data
    // ???data['controlCohort_phenoTerms'] = caseCohort && caseCohort.termsInDiagnosis ? caseCohort.termsInDiagnosis : '';
    // ???data['controlCohort_notPhenoterms'] = caseCohort && caseCohort.termsInElimination ? caseCohort.termsInElimination : '';

    // Demographics
    data['caseCohort_maleCount'] = caseCohort && caseCohort.numberOfMale ? caseCohort.numberOfMale : '';
    data['caseCohort_femaleCount'] = caseCohort && caseCohort.numberOfFemale ? caseCohort.numberOfFemale : '';
    data['caseCohort_country'] = caseCohort && caseCohort.countryOfOrigin ? caseCohort.countryOfOrigin : 'none';
    data['caseCohort_ethnicity'] = caseCohort && caseCohort.ethnicity ? caseCohort.ethnicity : 'none';
    data['caseCohort_race'] = caseCohort && caseCohort.race ? caseCohort.race : 'none';
    data['caseCohort_ageRangeType'] = caseCohort && caseCohort.ageRangeType ? caseCohort.ageRangeType : 'none';
    data['caseCohort_ageFrom'] = caseCohort && caseCohort.ageRangeFrom ? caseCohort.ageRangeFrom : '';
    data['caseCohort_ageTo'] = caseCohort && caseCohort.ageRangeTo ? caseCohort.ageRangeTo : '';
    data['caseCohort_ageUnit'] = caseCohort && caseCohort.ageRangeUnit ? caseCohort.ageRangeUnit : 'none';
    data['controlCohort_maleCount'] = controlCohort && controlCohort.numberOfMale ? controlCohort.numberOfMale : '';
    data['controlCohort_femaleCount'] = controlCohort && controlCohort.numberOfFemale ? controlCohort.numberOfFemale : '';
    data['controlCohort_country'] = controlCohort && controlCohort.countryOfOrigin ? controlCohort.countryOfOrigin : 'none';
    data['controlCohort_ethnicity'] = controlCohort && controlCohort.ethnicity ? controlCohort.ethnicity : 'none';
    data['controlCohort_race'] = controlCohort && controlCohort.race ? controlCohort.race : 'none';
    data['controlCohort_ageRangeType'] = controlCohort && controlCohort.ageRangeType ? controlCohort.ageRangeType : 'none';
    data['controlCohort_ageFrom'] = controlCohort && controlCohort.ageRangeFrom ? controlCohort.ageRangeFrom : '';
    data['controlCohort_ageTo'] = controlCohort && controlCohort.ageRangeTo ? controlCohort.ageRangeTo : '';
    data['controlCohort_ageUnit'] = controlCohort && controlCohort.ageRangeUnit ? controlCohort.ageRangeUnit : 'none';

    // Methods
    data["caseCohort_prevtesting"] = caseCohort && caseCohort.method && caseCohort.method.previousTesting === true
      ? "Yes"
      : (caseCohort && caseCohort.method && caseCohort.method.previousTesting === false ? "No" : "none");
    data['caseCohort_prevtestingdesc'] = caseCohort && caseCohort.method.previousTestingDescription ? caseCohort.method.previousTestingDescription : '';
    data['caseCohort_genomewide'] = caseCohort && caseCohort.method && caseCohort.method.genomeWideStudy === true
    ? "Yes"
    : (caseCohort && caseCohort.method && caseCohort.method.genomeWideStudy === false ? "No" : 'none');
    data['caseCohort_genotypingmethod1'] = caseCohort && caseCohort.method && caseCohort.method.genotypingMethods && caseCohort.method.genotypingMethods[0] ? caseCohort.method.genotypingMethods[0] : "none";
    setCaseCohortGenotyping2Disabled(data['caseCohort_genotypingmethod1'] === "none" ? true : false);
    data['caseCohort_genotypingmethod2'] = caseCohort && caseCohort.method && caseCohort.method.genotypingMethods && caseCohort.method.genotypingMethods[1] ? caseCohort.method.genotypingMethods[1] : "none";
    data['caseCohort_specificmutation'] = caseCohort && caseCohort.method && caseCohort.method.specificMutationsGenotypedMethod ? caseCohort.method.specificMutationsGenotypedMethod : '';
    data["controlCohort_prevtesting"] = controlCohort && controlCohort.method && controlCohort.method.previousTesting === true
      ? "Yes"
      : (controlCohort && controlCohort.method && controlCohort.method.previousTesting === false ? "No" : "none");
    data['controlCohort_prevtestingdesc'] = controlCohort && controlCohort.method.previousTestingDescription ? controlCohort.method.previousTestingDescription : '';
    data['controlCohort_genomewide'] = controlCohort && controlCohort.method && controlCohort.method.genomeWideStudy === true
    ? "Yes"
    : (controlCohort && controlCohort.method && controlCohort.method.genomeWideStudy === false ? "No" : 'none');
    data['controlCohort_genotypingmethod1'] = controlCohort && controlCohort.method && controlCohort.method.genotypingMethods && controlCohort.method.genotypingMethods[0] ? controlCohort.method.genotypingMethods[0] : "none";
    setControlCohortGenotyping2Disabled(data['controlCohort_genotypingmethod1'] === "none" ? true : false);
    data['controlCohort_genotypingmethod2'] = controlCohort && controlCohort.method && controlCohort.method.genotypingMethods && controlCohort.method.genotypingMethods[1] ? controlCohort.method.genotypingMethods[1] : "none";
    data['controlCohort_specificmutation'] = controlCohort && controlCohort.method && controlCohort.method.specificMutationsGenotypedMethod ? controlCohort.method.specificMutationsGenotypedMethod : ''

    // Power
    data['caseCohort_numGroupVariant'] = caseCohort && caseCohort.numberWithVariant ? caseCohort.numberWithVariant : '';
    data['caseCohort_numGroupGenotyped'] = caseCohort && caseCohort.numberAllGenotypedSequenced ? caseCohort.numberAllGenotypedSequenced : '';
    data['controlCohort_numGroupVariant'] = controlCohort && controlCohort.numberWithVariant ? controlCohort.numberWithVariant : '';
    data['controlCohort_numGroupGenotyped'] = controlCohort && controlCohort.numberAllGenotypedSequenced ? controlCohort.numberAllGenotypedSequenced : '';

    // Additional
    data['caseCohort_otherGeneVariants'] = caseCohort && caseCohort.otherGenes ? caseCohort.otherGenes.map((gene) => { return gene; }).join(', ') : '';
    data['caseCohort_additionalInfoGroup'] = caseCohort && caseCohort.additionalInformation ? caseCohort.additionalInformation : '';
    data['caseCohort_otherPmids'] = caseCohort && caseCohort.otherPMIDs ? caseCohort.otherPMIDs.map((article) => { return article; }).join(', ') : '';
    data['controlCohort_additionalInfoGroup'] = controlCohort && controlCohort.additionalInformation ? controlCohort.additionalInformation : '';
    data['controlCohort_otherPmids'] = controlCohort && controlCohort.otherPMIDs ? controlCohort.otherPMIDs.map((article) => { return article; }).join(', ') : '';

    // Case Control Evaluation
    data['studyType'] = caseControl && caseControl.studyType ? caseControl.studyType : 'none';
    setScoreDisabled(data['studyType'] === 'none');
    data['detectionMethod'] = caseControl && caseControl.detectionMethod ? caseControl.detectionMethod : 'none';
    data['statisticValueType'] = lodashGet(caseControl, "statisticalValues[0].valueType", null) ? caseControl.statisticalValues[0].valueType : 'none';
    data['statisticOtherType'] = lodashGet(caseControl, "statisticalValues[0].otherType", null) ? caseControl.statisticalValues[0].otherType : '';
    data['statisticValue'] = lodashGet(caseControl, "statisticalValues[0].value", null) ? caseControl.statisticalValues[0].value : null;
    data['statisticOtherTypeState'] = data['statisticValueType'] === "Other" ? 'expanded' : 'collapsed';
    data['pValue'] = caseControl && caseControl.pValue ? caseControl.pValue : '';
    data['confidenceIntervalFrom'] = caseControl && caseControl.confidenceIntervalFrom ? caseControl.confidenceIntervalFrom : '';
    data['confidenceIntervalTo'] = caseControl && caseControl.confidenceIntervalTo ? caseControl.confidenceIntervalTo : '';
    data['demographicInfoMatched'] = caseControl && caseControl.demographicInfoMatched ? caseControl.demographicInfoMatched : 'none';
    data['factorOfDemographicInfoMatched'] = caseControl && caseControl.factorOfDemographicInfoMatched ? caseControl.factorOfDemographicInfoMatched : 'none';
    data['explanationForDemographicMatched'] = caseControl && caseControl.explanationForDemographicMatched ? caseControl.explanationForDemographicMatched : '';
    data['geneticAncestryMatched'] = caseControl && caseControl.geneticAncestryMatched ? caseControl.geneticAncestryMatched : 'none';
    data['factorOfGeneticAncestryNotMatched'] = caseControl && caseControl.factorOfGeneticAncestryNotMatched ? caseControl.factorOfGeneticAncestryNotMatched : 'none';
    data['explanationForGeneticAncestryNotMatched'] = caseControl && caseControl.explanationForGeneticAncestryNotMatched ? caseControl.explanationForGeneticAncestryNotMatched : '';
    data['diseaseHistoryEvaluated'] = caseControl && caseControl.diseaseHistoryEvaluated ? caseControl.diseaseHistoryEvaluated : 'none';
    data['explanationForDiseaseHistoryEvaluation'] = caseControl && caseControl.explanationForDiseaseHistoryEvaluation ? caseControl.explanationForDiseaseHistoryEvaluation : '';
    data['differInVariables'] = caseControl && caseControl.differInVariables ? caseControl.differInVariables : 'none';
    data['explanationForDifference'] = caseControl && caseControl.explanationForDifference ? caseControl.explanationForDifference : '';
    data['comments'] = caseControl && caseControl.comments ? caseControl.comments : '';

    setFormData(data);
  };

  const handleCancel = () => {
    // define where pressing the Cancel button should take you to
    /* ??? need to identify editShortcut if click on edit group button
    // If created new group, go to /group-submit, else back to /curation-central
    if (gdm) {
      cancelUrl = (!this.queryValues.groupUuid || this.queryValues.editShortcut) ?
      '/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')
      : '/group-submit/?gdm=' + gdm.uuid + (group ? '&group=' + group.uuid : '') + (annotation ? '&evidence=' + annotation.uuid : '');
    }
    */
    const cancelUrl = lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null)
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
      : "/dashboard";

    requestRecycler.cancelAll();
    history.push(cancelUrl);
  };

  const handleSubmitError = (msg, error) => {
    let errorDetailMessage;

    // default get detail error reason from amplify's API request
    // https://stackoverflow.com/a/49778338/9814131
    const serverDetailMessage = lodashGet(error, "response.data.error");

    if (serverDetailMessage) {
      errorDetailMessage = serverDetailMessage;
    }
    else if (error instanceof Error) {
      errorDetailMessage = error.message;
    } else if (typeof error === "string") {
      errorDetailMessage = error;
    } else {
      errorDetailMessage = JSON.stringify(error);
    }
    
    setSubmitError(
      `Something went wrong whlie trying to save this evidence! Detail: ${msg} - ${errorDetailMessage}`
    );
    setIsSubmitting(false);
  };

  const clearFieldError = (fieldName) => {
    if (formErrors[fieldName]) {
      const errors = Object.keys(formErrors).reduce((obj, key) => {
        if (key !== fieldName) {
          obj[key] = formErrors[key]
        }
        return obj;
      }, {})
      setFormErrors(errors);
    }
  };

  const renderGenesError = () => {
    if (formErrors["caseCohort_otherGeneVariants"]) {
      return (
        <>
        {formErrors["caseCohort_otherGeneVariants"]}
        </>
      );
    } else if (badGenes.length > 0) {
      return (
        <span>{badGenes.join(', ')} not found</span>
      );
    } else {
      return null;
    }
  };

  const validateGenes = () => {
    let valid = true;
    const geneSymbols = getGenesFromList(formData["caseCohort_otherGeneVariants"]);
    // At least one gene symbol entered; search the DB for them.
    return new Promise((resolve, reject) => {
      if (geneSymbols && geneSymbols.length) {
        let i = 0;
        geneSymbols.forEach(symbol => {
          requestRecycler.capture(API.get(API_NAME, '/genes/' + symbol))
          .then(result => {
            i++;
            if (i === geneSymbols.length) {
              if (valid) {
                resolve(valid);
              } else {
                reject(valid);
              }
            }
          }).catch(err => {
            setBadGenes(badGenes => [...badGenes, symbol]);
            valid = false;
            i++;
            if (i === geneSymbols.length) {
              reject(valid);
            }
          });
        })
      } else {
        resolve(valid);
      }
    });
  };

  const renderPmidsError = (groupType) => {
    let otherPmids = '';
    let badPmids = [];
    if (groupType === 'case-cohort') {
      otherPmids = 'caseCohort_otherPmids';
      badPmids = badCaseCohortPmids;
    }
    if (groupType === 'control-cohort') {
      otherPmids = 'controlCohort_otherPmids';
      badPmids = badControlCohortPmids;
    }
    if (formErrors[otherPmids]) {
      return (
        <>
        {formErrors[otherPmids]}
        </>
      );
    } else if (badPmids.length > 0) {
      return (
        <>
        <span>{badPmids.join(', ')} not found</span>
        </>
      );
    } else {
      return null;
    }
  };

  const saveArticle = async (article) => {
    // POST the article to get the pk
    const createArticleRequest = API.post(API_NAME, `/articles/`, {
      body: { article },
    });
    try {
      article = await requestRecycler.capture(createArticleRequest);
    } catch (error) {
      if (!API.isCancel(error)) {
        handleSubmitError("Failed to save article to database", error);
        console.error("Failed to save article to database", error);
      }
    }
  };

  const validatePmids = (groupType) => {
    let valid = true;
    let otherPmids = '';
    if (groupType === 'case-cohort') {
      otherPmids = 'caseCohort_otherPmids';
    }
    if (groupType === 'control-cohort') {
      otherPmids = 'controlCohort_otherPmids';
    }

    const pmids = getPmidsFromList(formData[otherPmids]);
    // At least one pmid entered; search the DB for them.
    return new Promise((resolve, reject) => {
      if (pmids && pmids.length) {
        let i = 0;
        pmids.forEach(pmid => {
          requestRecycler.capture(API.get(API_NAME, '/articles/' + pmid))
          .then(article => {
            i++;
            if (!article.PK) {
              saveArticle(article);
            }
            if (i === pmids.length) {
              if (valid) {
                resolve(valid);
              } else {
                reject(valid);
              }
            }
          }).catch(err => {
            i++;
            if (groupType === 'case-cohort') {
              setBadCaseCohortPmids(badCaseCohortPmids => [...badCaseCohortPmids, pmid]);
            } else {
              setBadControlCohortPmids(badCohortPmidsPmids => [...badCohortPmidsPmids, pmid]);
            }
            valid = false;
            if (i === pmids.length) {
              reject(valid);
            }
          });
        })
      } else {
        resolve(valid);
      }
    });
  };

  const validateFormFields = () => {
    const errors = {};

    // Check all required fields have value
    // Check case-control label, Case Cohort Label, and Control Cohort Label all have value
    if (formData["caseControlName"] === '') {
      errors["caseControlName"] = "Case-Control Label is required";
    }
    if (formData["caseCohort_groupName"] === '') {
      errors["caseCohort_groupName"] = "Case Cohort  Label is required";
    }
    if (formData["controlCohort_groupName"] === '') {
      errors["controlCohort_groupName"] = "Control Cohort Label is required";
    }

    // Validate if either disease and/or HPO Id(s) and/or Phenotype free text is entered
    let has_disease = true;
    if (!diseaseObj || (diseaseObj && !diseaseObj['term'])) {
      has_disease = false;
    }
    if (!has_disease && formData["caseCohort_phenoTerms"] === '' && hpoWithTerms.length < 1) {
      setDiseaseRequired(true);
      setDiseaseError("Enter disease term and/or HPO Id(s) and/or Phenotype free text disease.");
      errors["diseaseError"] = "Enter disease term and/or HPO Id(s) and/or Phenotype free text disease.";
      errors["caseCohort_phenoTerms"] = "Enter disease term and/or HPO Id(s) and/or Phenotype free text phenoterms.";
      errors["controlCohort_phenoTerms"] = "Enter disease term and/or HPO Id(s) and/or Phenotype free text phenoterms.";
    }

    // Powers
    if (formData["caseCohort_numGroupVariant"] === '') {
      errors["caseCohort_numGroupVariant"] = "A number is required";
    }
    if (formData["caseCohort_numGroupGenotyped"] === '') {
      errors["caseCohort_numGroupGenotyped"] = "A number is required";
    }
    if (formData["controlCohort_numGroupVariant"] === '') {
      errors["controlCohort_numGroupVariant"] = "A number is required";
    }
    if (formData["controlCohort_numGroupGenotyped"] === '') {
      errors["controlCohort_numGroupGenotyped"] = "A number is required";
    }

    // Validate gene symbols have the proper format (will check for existence later)
    const geneSymbols = getGenesFromList(formData["caseCohort_otherGeneVariants"]);
    if (geneSymbols && geneSymbols.length && geneSymbols.includes(null)) {
      // Gene symbol list is bad
      errors["caseCohort_otherGeneVariants"] = "Use gene symbols (e.g. SMAD3) separated by commas";
    }

    // Validate pmids have the proper format (will check for existence later)
    let pmids = getPmidsFromList(formData["caseCohort_otherPmids"]);
    if (pmids && pmids.length && pmids.includes(null)) {
      // PMID list is bad
      errors["caseCohort_otherPmids"] = "Use PubMed IDs (e.g. 12345678) separated by commas";
    }
    pmids = getPmidsFromList(formData["controlCohort_otherPmids"]);
    if (pmids && pmids.length && pmids.includes(null)) {
      // PMID list is bad
      errors["controlCohort_otherPmids"] = "Use PubMed IDs (e.g. 12345678) separated by commas";
    }

    if (!isEmpty(errors)) {
      setFormErrors(errors);
      return false;
    } else {
      return true;
    }
  };


  const handleChange = (e) => {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;

    let newData = cloneDeep(formData);
    newData[fieldName] = fieldName === "caseCohort_otherGeneVariants" ? fieldValue.toUpperCase() : fieldValue;

    if (fieldName === "caseCohort_otherGeneVariants") {
      setBadGenes([]);
    }
    if (fieldName === "caseCohort_otherPmids") {
      setBadCaseCohortPmids([]);
    }
    if (fieldName === "controlCohort_otherPmids") {
      setBadControlCohortPmids([]);
    }

    // Disable the Genotyping Method 2 if Genotyping Method 1 has no value
    if (fieldName === 'caseCohort_genotypingmethod1') {
      setCaseCohortGenotyping2Disabled(fieldValue === "none" ? true : false);
      if (fieldValue === "none") {
        newData['caseCohort_genotypingmethod2'] = "none";
      }
    }
    if (fieldName === 'controlCohort_genotypingmethod1') {
      setControlCohortGenotyping2Disabled(fieldValue === "none" ? true : false);
      if (fieldValue === "none") {
        newData['controlCohort_genotypingmethod2'] = "none";
      }
    }

    // If Test statistic is 'Other', show Other test statistic field
    if (fieldName === 'statisticValueType') {
      newData['statisticOtherTypeState'] = fieldValue === 'Other' ? 'expanded' : 'collapsed';
      newData['statisticOtherType'] = fieldValue !== 'Other' ? '' : newData['statisticOtherType'];
    }

    if (fieldName === 'caseCohort_phenoTerms' && fieldValue !== "") {
      setDiseaseError(null);
      setDiseaseRequired(false);
    }

    // If no Study Type selected, disable score
    if (fieldName === 'studyType') {
      setScoreDisabled(fieldValue && fieldValue === 'none');
    }

    clearFieldError(fieldName);
    setFormData(newData);
  }

  const saveCohortGroup = async (type) => {
    let newGroup = null;
    let prefix = '';
    let groupType = '';
    if (type === 'case-cohort') {
      newGroup = caseControl && caseControl.caseCohort ? cloneDeep(caseControl.caseCohort) : {};
      prefix = 'caseCohort_';
      groupType = ['Case cohort'];
    } else {
      newGroup = caseControl && caseControl.controlCohort ? cloneDeep(caseControl.controlCohort) : {};
      prefix = 'controlCohort_';
      groupType = ['Control cohort'];
    }

    // Set group label
    newGroup.label = formData[prefix + "groupName"];

    // Set the Group disease & Phenotypes for Case Cohort only
    if (type === 'case-cohort') {
      newGroup.commonDiagnosis = (diseaseObj && !isEmpty(diseaseObj)) ? [diseaseObj] : null;
      // Fill in the group fields from the Common Diseases & Phenotypes panel
      newGroup.hpoIdInDiagnosis = (hpoWithTerms && hpoWithTerms.length) ? hpoWithTerms : null;
      newGroup.termsInDiagnosis = formData["caseCohort_phenoTerms"] ? formData["caseCohort_phenoTerms"] : null;
      newGroup.hpoIdInElimination = (hpoElimWithTerms && hpoElimWithTerms.length) ?  hpoElimWithTerms : null;
      newGroup.termsInElimination = formData["caseCohort_notPhenoTerms"] ? formData["caseCohort_notPhenoTerms"] : null;
    }

    // Fill in the group fields from the Group Demographics panel
    newGroup.numberOfMale = formData[prefix + "maleCount"] ? parseInt(formData[prefix + "maleCount"], 10) : null;
    newGroup.numberOfFemale = formData[prefix + "femaleCount"] ? parseInt(formData[prefix + "femaleCount"], 10) : null;
    newGroup.countryOfOrigin = formData[prefix + "country"] !== 'none' ? formData[prefix + "country"] : null;
    newGroup.ethnicity = formData[prefix + "ethnicity"] !== 'none' ? formData[prefix + "ethnicity"] : null;
    newGroup.race = formData[prefix + "race"] !== 'none' ? formData[prefix + "race"] : null;
    // Age Type for Case Cohort only
    if (type === 'case-cohort') {
      newGroup.ageRangeType = formData[prefix + "ageRangeType"] !== 'none' ? formData[prefix + "ageRangeType"] : null;
    }
    newGroup.ageRangeFrom = formData[prefix + "ageFrom"] ?  parseInt(formData[prefix + "ageFrom"], 10) : null;
    newGroup.ageRangeTo = formData[prefix + "ageTo"] ?  parseInt(formData[prefix + "ageTo"], 10) : null;
    newGroup.ageRangeUnit = formData[prefix + "ageUnit"] !== 'none' ? formData[prefix + "ageUnit"] : null;

    // If a method object was created (at least one method field set), get its new object's
    const newMethod = createMethod(formData, prefix);
    newGroup.method = (newMethod && !isEmpty(newMethod)) ? newMethod : {};

    // Group Power form fields
    // Case/Control Allele Frequency is calculated
    newGroup.numberWithVariant = formData[prefix + "numGroupVariant"] ?  parseInt(formData[prefix + "numGroupVariant"], 10) : null;
    newGroup.numberAllGenotypedSequenced = formData[prefix + "numGroupGenotyped"] ?  parseInt(formData[prefix + "numGroupGenotyped"], 10) : null;
    if ((newGroup.numberWithVariant || newGroup.numberWithVariant === 0) && newGroup.numberAllGenotypedSequenced) {
      newGroup.alleleFrequency = newGroup.numberWithVariant / newGroup.numberAllGenotypedSequenced;
    } else {
      newGroup.alleleFrequency = null;
    }

    // Save Other genes list for Case Cohort only
    if (type === 'case-cohort') {
      if (formData["caseCohort_otherGeneVariants"]) {
        const genes = getGenesFromList(formData["caseCohort_otherGeneVariants"]);
        newGroup.otherGenes = genes.map(gene => { return gene; });
      } else {
        newGroup.otherGenes = null;
      }
    }

    newGroup.additionalInformation = formData[prefix + "additionalInfoGroup"] ? formData[prefix + "additionalInfoGroup"] : null;

    // Save other PMIDs
    if (formData[prefix + "otherPmids"]) {
      const pmids = getPmidsFromList(formData[prefix + "otherPmids"]);
      newGroup.otherPMIDs = pmids.map(pmid => { return pmid; });
    } else {
      newGroup['otherPMIDs'] = null;
    }

    // If adding new group, add affiliation if the user is associated with an affiliation
    // and if the data object has no affiliation
    const isNew = newGroup.PK ? false : true;
    if (isNew) {
      newGroup.item_type = "group";
      newGroup.groupType = groupType;
      if (!newGroup.affiliation) {
        if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
          newGroup.affiliation = auth.currentAffiliation.affiliation_id;
        }
      }
      newGroup.submitted_by = lodashGet(auth, "PK", null);
    }
    newGroup.modified_by = lodashGet(auth, "PK", null);

    // Save group to database
    let groupResult = null;
    const postOrPutRequestArgs = [
      API_NAME,
      isNew
      ? "/groups"
      : `/groups/${newGroup.PK}`,
      { body: { newGroup } }
    ];
    try {
      groupResult = await (isNew
      ? requestRecycler.capture(API.post(...postOrPutRequestArgs))
      : requestRecycler.capture(API.put(...postOrPutRequestArgs)));
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      throw new Error(
        "Failed to update or create new group"
      );
    }
    if (!groupResult || !groupResult.PK) {
      console.log("no groupResult");
      throw new Error("Empty response from server when saving group");
    } else {
      console.log(groupResult.PK);
    }

    return (groupResult);
  };

  const saveScore = async () => {
    const existingScores = lodashGet(caseControl, "scores", null) ? caseControl.scores : [];
    if (formData['studyType'] !== 'none' && lodashGet(userScore, "score", null) !== null && userScore.score >= 0) {
      // Update or create score object when the score object has the scoreStatus key/value pair
      let scoreResult;
      const isNew = userScore.PK ? false : true;
      let newScore = cloneDeep(userScore);
      if (isNew) {
        newScore.submitted_by = lodashGet(auth, "PK", null);
        newScore.evidenceScored = lodashGet(caseControl, "PK", null);
      }
      newScore.modified_by = lodashGet(auth, "PK", null);
      newScore.item_type = "evidenceScore";
      const postOrPutRequestArgs = [
        API_NAME,
        isNew
          ? "/evidencescore"
          : `/evidencescore/${userScore.PK}`,
        { body: { newScore } }
      ];
      try {
        scoreResult = await (isNew
          ? requestRecycler.capture(API.post(...postOrPutRequestArgs))
          : requestRecycler.capture(API.put(...postOrPutRequestArgs)));
      } catch (error) {
        if (API.isCancel(error)) {
          return;
        }
        throw new Error(
          "Failed to update or create evidence score"
        );
      }
      if (!scoreResult || !scoreResult.PK) {
        // console.log("no scoreResult");
        throw new Error("Empty response from server when saving evidence score");
      } else {
        // console.log(scoreResult.PK);
      }
      if (isNew) {
        // Add the new score to array
        existingScores.push(scoreResult);
        return Promise.resolve(existingScores);
      } else {
        // Only need to return existing evidence score object
        return Promise.resolve(existingScores);
      }
    } else if (userScore && userScore.PK) {
      // If an existing score object has no score, the user likely removed score
      // Then delete the score entry from the score list associated with the evidence
      // delete score obj and remove from exisiting scores array
      let scoreResult = null;
      let newScore = cloneDeep(userScore);
      newScore['modified_by'] = lodashGet(auth, "PK", null);
      newScore['status'] = 'deleted';
      const putRequestArgs = [
        API_NAME,
        `/evidencescore/${userScore.PK}`,
        { body: { newScore } }
      ];
      try {
        scoreResult = await ( requestRecycler.capture(API.put(...putRequestArgs)));
      } catch (error) {
        if (API.isCancel(error)) {
          return;
        }
        throw new Error(
          "Failed to update deleted evidence score"
        );
      }
      if (!scoreResult || !scoreResult.PK) {
        console.log("no scoreResult");
        throw new Error("Empty response from server when saving evidence score");
      } else {
        console.log(scoreResult.PK);
      }
      // Remove deleted score from individual scores array
      existingScores.forEach(score => {
        if (score.PK === scoreResult.PK) {
          let index = existingScores.indexOf(score);
          existingScores.splice(index, 1);
        }
      });
      // Return the evidence score array without the deleted object
      return Promise.resolve(existingScores);
    } else {
      return Promise.resolve(existingScores);
    }
  };

  const setEvaluationData = (newCaseControl) => {
    // ??? save even when not selected
    const statisticalValuesObj = {
      valueType: formData['statisticValueType'] !== 'none' ? formData['statisticValueType'] : null,
      otherType: formData['statisticOtherType'] !== 'none' ? formData['statisticOtherType'] : null,
      value: formData['statisticValue'] ? parseFloat(formData['statisticValue']) : null
    };
    if (statisticalValuesObj.value === null || statisticalValuesObj.value === 0) {
      delete statisticalValuesObj.value;
    }

    // Save Evalutaion data to new Case Control object
    newCaseControl.studyType = formData['studyType'] !== 'none' ? formData['studyType'] : null;
    newCaseControl.detectionMethod = formData['detectionMethod'] !== 'none' ? formData['detectionMethod'] : null;
    newCaseControl.statisticalValues = [statisticalValuesObj];
    newCaseControl.pValue = formData['pValue'] ? parseFloat(formData['pValue']) : null;
    newCaseControl.confidenceIntervalFrom = formData['confidenceIntervalFrom'] ? parseFloat(formData['confidenceIntervalFrom']) : null;
    newCaseControl.confidenceIntervalTo = formData['confidenceIntervalTo'] ? parseFloat(formData['confidenceIntervalTo']) : null;
    newCaseControl.demographicInfoMatched = formData['demographicInfoMatched'] !== 'none' ? formData['demographicInfoMatched'] : null;
    newCaseControl.factorOfDemographicInfoMatched = formData['factorOfDemographicInfoMatched'] !== 'none' ? formData['factorOfDemographicInfoMatched'] : null;
    newCaseControl.explanationForDemographicMatched = formData['explanationForDemographicMatched'];
    newCaseControl.geneticAncestryMatched = formData['geneticAncestryMatched'] !== 'none' ? formData['geneticAncestryMatched'] : null;
    newCaseControl.factorOfGeneticAncestryNotMatched = formData['factorOfGeneticAncestryNotMatched'] !== 'none' ? formData['factorOfGeneticAncestryNotMatched'] : null;
    newCaseControl.explanationForGeneticAncestryNotMatched = formData['explanationForGeneticAncestryNotMatched'] ? formData['explanationForGeneticAncestryNotMatched'] : null;
    newCaseControl.diseaseHistoryEvaluated = formData['diseaseHistoryEvaluated'] !== 'none' ? formData['diseaseHistoryEvaluated'] : null;
    newCaseControl.explanationForDiseaseHistoryEvaluation = formData['explanationForDiseaseHistoryEvaluation'] ? formData['explanationForDiseaseHistoryEvaluation'] : null;
    newCaseControl.differInVariables = formData['differInVariables'] !== 'none' ? formData['differInVariables'] : null;
    newCaseControl.explanationForDifference = formData['explanationForDifference'] ? formData['explanationForDifference'] : null;
    newCaseControl.comments = formData['comments'] ? formData['comments'] : null;
  }

  const createNewCaseControlData = async (
    newCaseCohortPK,
    newControlCohortPK,
    newScores
  ) => {
    let newCaseControl = caseControl ? cloneDeep(caseControl) : {};

    // Set Evaluation data
    setEvaluationData(newCaseControl);

    // Set Case-Control label
    newCaseControl.label = formData["caseControlName"];

    // Update to new Case Cohort and Control Cohort groups
    newCaseControl.caseCohort = newCaseCohortPK;
    newCaseControl.controlCohort = newControlCohortPK;

    // Update scores array
    newCaseControl.scores = newScores;

    // ??? set affiliation even when editing
    // Add affiliation if the user is associated with an affiliation
    // and if the data object has no affiliation
    if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
      if (!newCaseControl.affiliation) {
        newCaseControl.affiliation = auth.currentAffiliation.affiliation_id;
      }
    }

    if (!newCaseControl.PK) {
      newCaseControl.submitted_by = lodashGet(auth, "PK", null);
      newCaseControl.item_type = "caseControl";
    }
    newCaseControl.modified_by = lodashGet(auth, "PK", null);

    return newCaseControl;
  };

  const updateAnnotationObject = async () => {
    // successfully added or updated family to group --
    // GET annotation so that backend can auto-collect the added or edited family (on group)
    // for us when embedding related objects
    let latestAnnotation;
    try {
      latestAnnotation = await requestRecycler.capture(API.get(API_NAME, `/annotations/${annotation.PK}`));
      if (!latestAnnotation) {
        throw new Error(`Server returned empty response when GET /annotations/${annotation.PK}`)
      }
    } catch (error) {
      if (!API.isCancel(error)) {
        throw error;
      }
      // when request canceled (e.g. page navigated away which cause unmounting)
      // still try to proceed to update redux, since the db changes are already made
    }

    if (latestAnnotation) {
      dispatch(updateAnnotationAction(latestAnnotation));
    }
  };

  const saveCaseControl = async (newCaseControl) => {
    let caseControlResult;
    const isNew = newCaseControl.PK ? false : true;
    const postOrPutRequestArgs = [
      API_NAME,
      isNew
      ? "/casecontrol"
      : `/casecontrol/${newCaseControl.PK}`,
      { body: { newCaseControl } }
    ];
    try {
      caseControlResult = await (isNew
      ? requestRecycler.capture(API.post(...postOrPutRequestArgs))
      : requestRecycler.capture(API.put(...postOrPutRequestArgs)));
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      throw new Error(
        "Failed to update or create new case control"
      );
    }

    if (!caseControlResult || !caseControlResult.PK) {
      throw new Error("Empty response from server when saving case control");
    } else {
      // console.log(caseControlResult.PK);
    }

    // Add case control to annonation if new case control
    let annotationResult = null;
    if (isNew) {
      const updateAnnotation = {
        ...annotation,
        caseControlStudies: [...(annotation.caseControlStudies || []), caseControlResult.PK],
        modified_by: lodashGet(auth, "PK", null),
      };

      // PUT annotation
      try {
        annotationResult = await requestRecycler.capture(
          API.put(API_NAME, `/annotations/${annotation.PK}`, { body: { updateAnnotation } })
        );
      } catch (error) {
        throw new Error(
          "Failed to append new case ccontrol to annotation"
        );
      }
      if (!annotationResult ||
        !Array.isArray(annotationResult.caseControlStudies) ||
        annotationResult.caseControlStudies.length !== updateAnnotation.caseControlStudies.length) {
        throw new Error("Empty response from server when updating annotation");
      } else {
        // update redux for annotations
        dispatch(updateAnnotationAction(annotationResult));
      }
    }
    // Edit existing group so no need to PUT annotation,
    // but need to sync redux annotation, which embeds case control and related group & score objects
    else {
      await updateAnnotationObject();
    }

    // add contributor to gdm if needed
    if (lodashGet(auth, "PK", null)) {
      let gdmResult = null;
      const updateGdm = {
        ...gdm,
        ...gdmParticipantReducer(gdm, auth)
      };
      // PUT gdm
      try {
        gdmResult = await requestRecycler.capture(
          API.put(API_NAME, `/gdms/${gdm.PK}`, { body: { updateGdm } })
        );
      } catch (error) {
        throw new Error(
          "Failed to append contributor to GDM"
        );
      }
      if (!gdmResult) {
        throw new Error("Empty response from server when updating contributors in gdm");
      } else {
        // update redux for gdm
        dispatch(setGdmAction(gdmResult));
      }
    }

    return (caseControlResult);
  };

  // Called to update case control PK to evidenceScore obj
  const updateScoreWithCaseControl = (caseControlObj) => {
    if (caseControlObj.scores && !isEmpty(caseControlObj.scores)) {
      const objPromises = caseControlObj.scores.map(async obj => {
        // Update score object if it has no evidenceScored PK
        if (!obj.evidenceScored) {
          let newScore = cloneDeep(obj);
          newScore.evidenceScored = caseControlObj.PK;
          const url = `/evidencescore/${newScore.PK}`;
          return await requestRecycler.capture(API.put(API_NAME, url, { body: { newScore } }));
        }
      });
      return Promise.all(objPromises);
    } else {
      return Promise.resolve(null);
    }
  };

  const submitForm = async (e) => {
    e.preventDefault(); e.stopPropagation();

    console.log(formData);

    setIsSubmitting(true);

    if (badGenes.length === 0  && badCaseCohortPmids.length === 0  && badControlCohortPmids.length === 0  && validateFormFields()) {
      // validate genes list
      validateGenes().then(res1 => {
        // validate pmids list
        validatePmids('case-cohort').then(res2 => {
          validatePmids('control-cohort').then(res3 => {
            saveCohortGroup('case-cohort').then(newCaseCohort => {
              saveCohortGroup('control-cohort').then(newControlCohort => {
                saveScore().then(newScores => {
                  createNewCaseControlData(lodashGet(newCaseCohort, "PK", null), lodashGet(newControlCohort, "PK", null), newScores).then(newCaseControl => {
                    saveCaseControl(newCaseControl).then(savedCaseControl => {
                      updateScoreWithCaseControl(savedCaseControl).then((results) => {
                        // Save all form values from the DOM.
                        // Navigate to Curation Central or Submit page, depending on previous page
                        const redirectUrl = (editCaseControl && editCaseControl.PK)
                          ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
                          : (savedCaseControl && savedCaseControl.PK
                            ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/case-control-curation/${savedCaseControl.PK}/submit`
                            : `/curation-central/${gdm.PK}/annotation/${annotation.PK}`);
                        setIsSubmitting(false);
                        history.push(redirectUrl);
                      }).catch(error => {
                        if (API.isCancel(error)) {
                          setIsSubmitting(false);
                          return;
                        }
                        //throw new Error
                        handleSubmitError("Error in updating case control object's evidenceScores", error);
                      });
                    }).catch(error => {
                      if (API.isCancel(error)) {
                        setIsSubmitting(false);
                        return;
                      }
                      //throw new Error
                      handleSubmitError("Error in adding/updating case control object", error);
                    });
                  }).catch(error => {
                    if (API.isCancel(error)) {
                      setIsSubmitting(false);
                      return;
                    }
                    //throw new Error
                    handleSubmitError("Error in creating new case control object", error);
                  });
                }).catch(error => {
                  // console.log('save evidenceScore : %o', error);
                  // setIsSubmitting(false);
                  //throw new Error
                  handleSubmitError("Error in adding/updating evidence score object", error);
                });
              }).catch(error => {
                // console.log('save control cohort group : %o', error);
                // setIsSubmitting(false);
                //throw new Error
                handleSubmitError("Error in adding/updating control cohort group object", error);
              });
            }).catch(error => {
              // console.log('validatePmids : %o', error);
              //setIsSubmitting(false);
              handleSubmitError("Error in adding/updating case cohort group object", error);
            });
          }).catch(error => {
            // console.log('validatePmids : %o', error);
            setIsSubmitting(false);
          });
        }).catch(err => {
          // console.log('validatePmids : %o', error);
          setIsSubmitting(false);
        });
      }).catch(error => {
        // console.log('validateGenes : %o', error);
        setIsSubmitting(false);
      });
    } else {
      setIsSubmitting(false);
    }
  };

  // Case-Control Name above other group curation panels.
  const renderCaseControlName = () => {
    return (
      <div>
        <Input type="text" label="Case-Control Label" onChange={handleChange} name="caseControlName"
          value={formData['caseControlName']} error={formErrors['caseControlName']}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3" required />
      </div>
    );
  };

  // Group Name group curation panel. Call with .call(this) to run in the same context
  // as the calling component.
  const renderGroupName = (groupType) => {
    let type, label, groupName;
    if (groupType === 'case-cohort') {
      type = 'Case Cohort';
      label = 'Case Cohort Label:';
      groupName = 'caseCohort_groupName';
    }
    if (groupType === 'control-cohort') {
      type = 'Control Cohort';
      label = 'Control Cohort Label:';
      groupName = 'controlCohort_groupName';
    }

    return (
      <div className="section section-label">
        <Input type="text" label={label} maxLength="60" onChange={handleChange} name={groupName}
          value={formData[`${groupName}`]} error={formErrors[`${groupName}`]} 
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-4" required />
        <p className="col-sm-7 col-sm-offset-5 input-note-below">{renderLabelNote(type)}</p>
      </div>
    );
  };

  // Common diseases group curation panel.
  const renderGroupCommonDiseases = (groupType) => {
    let phenoTerms, notPhenoTerms, group, cohortLabel;
    if (groupType === 'case-cohort') {
      phenoTerms = 'caseCohort_phenoTerms';
      notPhenoTerms = 'caseCohort_notPhenoTerms';
      cohortLabel = 'Case Cohort';
      group = lodashGet(caseControl, "caseCohort", null);
    }
    if (groupType === 'control-cohort') {
      phenoTerms = 'controlCohort_phenoTerms';
      notPhenoTerms = 'controlCohort_notPhenoTerms';
      cohortLabel = 'Control Cohort';
      group = lodashGet(caseControl, "controlCohort", null);
    }

    return (
      <div className="section section-disease">
        <Col sm="12">
          <h3><i className="icon icon-chevron-right"></i> Disease(s) & Phenotype(s)</h3>
        </Col>
        <Col sm={{ span: 7, offset: 5 }}>
          <p className="alert alert-warning">Please enter a disease term and/or phenotype(s); phenotypes may be entered using HPO ID(s) (preferred)
            or free text when there is no appropriate HPO ID.</p>
        </Col>
        <GroupDisease gdm={gdm} group={group} updateDiseaseObj={updateDiseaseObj} diseaseObj={diseaseObj}
          error={diseaseError} clearErrorInParent={clearErrorInParent} required={diseaseRequired} />
        <Row className="mb-3">
          <Col sm="5" className="control-label">
            <span>
              <label>Phenotype(s) in Common&nbsp;</label>
              <span className="normal">(<ExternalLink href={`${EXTERNAL_API_MAP['HPOBrowser']}`} title="Open HPO Browser in a new tab">HPO</ExternalLink> ID(s))</span>:
            </span>
          </Col>
          <Col sm="7" className="form-group hpo-term-container">
            {hpoWithTerms.length ?
              <ul>
                {hpoWithTerms.map((term, i) => {
                  return (
                    <li key={i}>{term}</li>
                  );
                })}
              </ul>
              : null}
            <HpoTermModal
              isNew={hpoWithTerms && hpoWithTerms.length ? false : true}
              passHpoToParent={updateHpo}
              savedHpo={hpoWithTerms}
            />
          </Col>
        </Row>
        <Input type="textarea" name={`${phenoTerms}`} groupClassName="row mb-3" rows="2"
          value={formData[`${phenoTerms}`]} onChange={handleChange} error={formErrors[`${phenoTerms}`] || null}
          label={renderLabelPhenoTerms(false)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        />
        <Col sm={{ span: 7, offset: 5 }}>
          <p>Enter <em>phenotypes that are NOT present in {cohortLabel}</em> if they are specifically noted in the paper.</p>
        </Col>
        <Row className="mb-3">
          <Col sm="5" className="control-label">
            <span>
              <label className="emphasis">NOT Phenotype(s)&nbsp;</label>
              <span className="normal">(<ExternalLink href={`${EXTERNAL_API_MAP['HPOBrowser']}`} title="Open HPO Browser in a new tab">HPO</ExternalLink> ID(s))</span>:
            </span>
          </Col>
          <Col sm="7" className="form-group hpo-term-container">
            {hpoElimWithTerms.length ?
              <ul>
                {hpoElimWithTerms.map((term, i) => {
                  return (
                    <li key={i}>{term}</li>
                  );
                })}
              </ul>
              : null}
            <HpoTermModal
              isNew={hpoElimWithTerms && hpoElimWithTerms.length ? false : true}
              passHpoToParent={updateElimHpo}
              savedHpo={hpoElimWithTerms}
            />
          </Col>
        </Row>
        <Input type="textarea" name={`${notPhenoTerms}`} groupClassName="row mb-3" rows="2"
          value={formData[`${notPhenoTerms}`]} onChange={handleChange} error={formErrors[`${notPhenoTerms}`] || null}
          label={renderLabelPhenoTerms(true)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        />
      </div>
    );
  };

  // Demographics group curation panel.
  const renderGroupDemographics = (groupType) => {
    const ageRangeTypeDisabled = (groupType === 'control-cohort') ? true : false;
    let maleCount, femaleCount, country, ethnicity, race, ageRangeType, ageFrom, ageTo, ageUnit, headerLabel, groupClass;
    if (groupType === 'case-cohort') {
      maleCount = 'caseCohort_maleCount';
      femaleCount = 'caseCohort_femaleCount';
      country = 'caseCohort_country';
      ethnicity = 'caseCohort_ethnicity';
      race = 'caseCohort_race';
      ageRangeType = 'caseCohort_ageRangeType';
      ageFrom = 'caseCohort_ageFrom';
      ageTo = 'caseCohort_ageTo';
      ageUnit = 'caseCohort_ageUnit';
      headerLabel = 'CASE';
    }
    if (groupType === 'control-cohort') {
      maleCount = 'controlCohort_maleCount';
      femaleCount = 'controlCohort_femaleCount';
      country = 'controlCohort_country';
      ethnicity = 'controlCohort_ethnicity';
      race = 'controlCohort_race';
      ageFrom = 'controlCohort_ageFrom';
      ageTo = 'controlCohort_ageTo';
      ageUnit = 'controlCohort_ageUnit';
      headerLabel = 'CONTROL';
      groupClass = 'control-demo-header'
    }

    return (
      <div className={`section section-demographics ${groupClass}`}>
        <Col>
          <h3><i className="icon icon-chevron-right"></i> Demographics <span className="label label-group">{headerLabel}</span></h3>
        </Col>
        <Input type="number" name={`${maleCount}`} groupClassName="row mb-3"
          value={formData[`${maleCount}`]} onChange={handleChange} error={formErrors[`${maleCount}`] || null}
          label="# males:" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        />
        <Input type="number" name={`${femaleCount}`} groupClassName="row mb-3"
          value={formData[`${femaleCount}`]} onChange={handleChange} error={formErrors[`${femaleCount}`] || null}
          label="# females:" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        />
        <Input type="select" name={`${country}`} label="Country of Origin:" groupClassName="row mb-3"
          value={formData[`${country}`]} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          {COUNTRY_CODES.map((countryCode) => {
            return <option key={countryCode.code} value={countryCode.name}>{countryCode.name}</option>;
          })}
        </Input>
        <Input type="select" name={`${ethnicity}`} label="Ethnicity:" groupClassName="row mb-3"
          value={formData[`${ethnicity}`]} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Hispanic or Latino">Hispanic or Latino</option>
          <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
          <option value="Unknown">Unknown</option>
        </Input>
        <Input type="select" name={`${race}`} label="Race:" groupClassName="row mb-3"
          value={formData[`${race}`]} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
          <option value="Asian">Asian</option>
          <option value="Black">Black</option>
          <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
          <option value="White">White</option>
          <option value="Mixed">Mixed</option>
          <option value="Unknown">Unknown</option>
        </Input>
        <div className="form-group">
          <Row className="mb-3">
            <Col sm={{ span: 7, offset: 5 }}>
              <h4>Age Range</h4>
            </Col>
          </Row>
          {ageRangeTypeDisabled ?
            <Input type="select" name={`${ageRangeType}`} label="Type:" groupClassName="row mb-3 invisible-placeholder"
              value={formData[`${ageRangeType}`]} disabled={true}
              labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7">
            </Input>
            :
            <Input type="select" name={`${ageRangeType}`} label="Type:" groupClassName="row mb-3"
              value={formData[`${ageRangeType}`]} onChange={handleChange}
              labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
            >
              <option value="none">No Selection</option>
              <option disabled="disabled"></option>
              <option value="Onset">Onset</option>
              <option value="Report">Report</option>
              <option value="Diagnosis">Diagnosis</option>
              <option value="Death">Death</option>
            </Input>
          }
          <Row className="mb-3">
            <Col sm="5" className="control-label">
              <label>Value:</label>
            </Col>
            <Col sm="7">
              <div className="group-age-input">
                <Input type="number" name={`${ageFrom}`} className="form-control"
                  value={formData[`${ageFrom}`]} min={0}
                  onChange={handleChange} error={formErrors[`${ageFrom}`] || null}
                />
              </div>
              <span className="group-age-inter">to</span>
              <div className="group-age-input">
                <Input type="number" name={`${ageTo}`} className="form-control"
                  value={formData[`${ageTo}`]} min={0}
                  onChange={handleChange} error={formErrors[`${ageTo}`] || null}
                />
              </div>
            </Col>
          </Row>
          <Input type="select" name={`${ageUnit}`} label="Unit:" groupClassName="row mb-3"
            value={formData[`${ageUnit}`]} onChange={handleChange}
            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
          >
            <option value="none">No Selection</option>
            <option disabled="disabled"></option>
            <option value="Hours">Hours</option>
            <option value="Days">Days</option>
            <option value="Weeks">Weeks</option>
            <option value="Weeks gestation">Weeks gestation</option>
            <option value="Months">Months</option>
            <option value="Years">Years</option>
          </Input>
        </div>
      </div>
    );
  };

  // HTML labels for inputs follow.
  const renderLabelOtherGenes = () => {
    return (
      <span>Other genes found to have variants in them (<ExternalLink href={EXTERNAL_API_MAP['HGNCHome']} title="HGNC home page in a new tab">HGNC</ExternalLink> symbol):</span>
    );
  };

  const renderMethods = (groupType) => {
    let headerLabel;
    if (groupType === 'case-cohort') {
      headerLabel = 'CASE';

      return (
        <div className="section">
          <Col>
            <h3><i className="icon icon-chevron-right"></i> Methods <span className="label label-group">{headerLabel}</span></h3>
          </Col>
          <MethodsPanel
            formData={formData}
            genotyping2Disabled={caseCohortGenotyping2Disabled}
            handleChange={handleChange}
            method={lodashGet(caseControl, "caseCohort.method", null)}
            evidenceType="case-control"
            prefix="caseCohort_"
          />
        </div>
      );
    }

    if (groupType === 'control-cohort') {
      headerLabel = 'CONTROL';

      return (
        <div className="section">
          <Col>
            <h3><i className="icon icon-chevron-right"></i> Methods <span className="label label-group">{headerLabel}</span></h3>
          </Col>
          <MethodsPanel
            formData={formData}
            genotyping2Disabled={controlCohortGenotyping2Disabled}
            handleChange={handleChange}
            method={lodashGet(caseControl, "controlCohort.method", null)}
            evidenceType="case-control"
            prefix="controlCohort_"
          />
        </div>
      );
    }
  };

  // Group information group curation panel. Call with .call(this) to run in the same context
  // as the calling component.
  const renderGroupPower = (groupType) => {
    let type, numGroupVariant, numGroupGenotyped, alleleFreqDisplay, headerLabel;
    if (groupType === 'case-cohort') {
      type = 'Case';
      numGroupVariant = 'caseCohort_numGroupVariant';
      numGroupGenotyped = 'caseCohort_numGroupGenotyped';
      alleleFreqDisplay = renderAlleleFrequency(lodashGet(formData, numGroupVariant, null), lodashGet(formData, numGroupGenotyped, null));
      headerLabel = 'CASE';
    }
    if (groupType === 'control-cohort') {
      type = 'Control';
      numGroupVariant = 'controlCohort_numGroupVariant';
      numGroupGenotyped = 'controlCohort_numGroupGenotyped';
      alleleFreqDisplay = renderAlleleFrequency(lodashGet(formData, numGroupVariant, null), lodashGet(formData, numGroupGenotyped, null));
      headerLabel = 'CONTROL';
    }

    return (
      <div className="section section-power">
        <Col>
          <h3><i className="icon icon-chevron-right"></i> Power <span className="label label-group">{headerLabel}</span></h3>
        </Col>
        <Input type="number" name={`${numGroupVariant}`} label={'Number of ' + type + 's with variant(s) in the gene in question:'}
          onChange={handleChange} value={formData[`${numGroupVariant}`]}
          error={formErrors[`${numGroupVariant}`]} placeholder="Number only" labelClassName="col-sm-5 control-label"
          wrapperClassName="col-sm-7" groupClassName="row mb-3" required />
        <Input type="number" name={`${numGroupGenotyped}`} label={'Number of all ' + type + 's genotyped/sequenced:'}
          onChange={handleChange} value={formData[`${numGroupGenotyped}`]}
          error={formErrors[`${numGroupGenotyped}`]} placeholder="Number only" labelClassName="col-sm-5 control-label"
          wrapperClassName="col-sm-7" groupClassName="row mb-3" required />
        <div className="row form-group allele-frequency">
          <div className="control-label col-sm-5">
            <span>{type + ' Frequency:'}</span>
          </div>
          <div className="col-sm-7">
            {alleleFreqDisplay}
          </div>
        </div>
      </div>
    );
  };

  // Additional Information group curation panel. Call with .call(this) to run in the same context
  // as the calling component.
  const renderGroupAdditional = (groupType) => {
    const inputDisabled = (groupType === 'control-cohort') ? true : false;
    let type, otherGeneVariants, additionalInfoGroup, otherPmids, headerLabel;
    if (groupType === 'case-cohort') {
      type = 'Case Cohort';
      otherGeneVariants = 'caseCohort_otherGeneVariants';
      additionalInfoGroup = 'caseCohort_additionalInfoGroup';
      otherPmids = 'caseCohort_otherPmids';
      headerLabel = 'CASE';
    }
    if (groupType === 'control-cohort') {
      type = 'Control Cohort';
      additionalInfoGroup = 'controlCohort_additionalInfoGroup';
      otherPmids = 'controlCohort_otherPmids';
      headerLabel = 'CONTROL';
    }

    return (
      <div className="section section-additional-info">
        <h3><i className="icon icon-chevron-right"></i> Additional Information <span className="label label-group">{headerLabel}</span></h3>
        <Input type="text" name={`${otherGeneVariants}`}
          label={renderLabelOtherGenes()} value={formData[`${otherGeneVariants}`]}
          placeholder="e.g. DICER1, SMAD3" error={renderGenesError()}
          disabled={inputDisabled} wrapperClassName="col-sm-7" onChange={handleChange}
          labelClassName="col-sm-5 control-label" groupClassName="row mb-3 other-genes"
        />
        <Input type="textarea" name={`${additionalInfoGroup}`}
          label={'Additional Information about this ' + type + ':'} rows="5"
          value={formData[`${additionalInfoGroup}`]} labelClassName="col-sm-5 control-label"
          wrapperClassName="col-sm-7" groupClassName="row mb-3" onChange={handleChange}
        />
        <Input type="textarea" name={`${otherPmids}`}
          label={'Enter PMID(s) that report evidence about this ' + type + ':'} rows="5"
          placeholder="e.g. 12089445, 21217753" error={renderPmidsError(groupType)}
          value={formData[`${otherPmids}`]} labelClassName="col-sm-5 control-label"
          wrapperClassName="col-sm-7" groupClassName="row mb-3" onChange={handleChange}
        />
      </div>
    );
  };

  const renderCohortGroup = (type) => {
    return (
      <>
      {renderGroupName(type)}
      {renderGroupCommonDiseases(type)}
      {renderGroupDemographics(type)}
      {renderMethods(type)}
      {renderGroupPower(type)}
      {renderGroupAdditional(type)}
      </>
    );
  };

  // Called by child function props to update user score obj
  const handleUserScoreObj = (newUserScoreObj) => {
    setUserScore(newUserScoreObj);
  }

  /**
   * Update the 'diseaseObj' state used to save data upon form submission
   */
  const updateDiseaseObj = (newDisease) => {
    setDiseaseObj(newDisease);
    setDiseaseRequired(false);
    const errors = cloneDeep(formErrors);
    // Set all errors at the same time to reduce overhead
    delete errors["diseaseError"];
    delete errors["caseCohort_phenoTerms"];
    delete errors["controlCohort_phenoTerms"];
    setFormErrors(errors);
  };

  const updateHpo = (hpoTerms) => {
    if (hpoTerms) {
      setHpoWithTerms(hpoTerms);
      setDiseaseRequired(false);
      setDiseaseError(null);
      const errors = cloneDeep(formErrors);
      // Set all errors at the same time to reduce overhead
      delete errors["diseaseError"];
      delete errors["caseCohort_phenoTerms"];
      delete errors["controlCohort_phenoTerms"];
      setFormErrors(errors);
    }
  };

  const updateElimHpo = (hpoTerms) => {
    if (hpoTerms) {
      setHpoElimWithTerms(hpoTerms);
    }
  };

  /**
   * Clear error msg on missing disease
   */
  const clearErrorInParent = () => {
    setDiseaseError(null);
  };

  const renderCaseControlLabels = () => {
    const caseControlName = lodashGet(formData, 'caseControlName', null);
    const caseCohortName = lodashGet(formData, 'caseCohort_groupName', null);
    const controlCohortName = lodashGet(formData, 'controlCohort_groupName', null);
    const fullLabel = `${caseControlName}` +
      (caseCohortName || controlCohortName ? ' (' : '') +
      (caseCohortName ? `Case: ${caseCohortName}` : '') +
      (caseCohortName && controlCohortName ? ';' : '') +
      (controlCohortName ? ` Control: ${controlCohortName}` : '') +
      (caseCohortName || controlCohortName ? ')' : '');

    return (
      (caseControlName || caseCohortName || controlCohortName)
      ? <span>{fullLabel}</span>
      : <span className="no-entry">No entry</span>
    );
  };

  const submitErrClass = 'submit-err float-right ' + (!isEmpty(formErrors) || badGenes.length > 0 || badCaseCohortPmids.length > 0 || badControlCohortPmids.length > 0 ? '' : ' hidden');
  const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
  ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
    : (lodashGet(gdm, "PK", null))
      ? `/curation-central/${gdm.PK}`
      : null;

  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : (
    <>
    <div className="viewer-titles">
      <h1>{(caseControl ? 'Edit' : 'Curate') + ' Case Control Evidence'}</h1>
      <h2>
        { curationLink ? <Link to={curationLink}><FontAwesomeIcon icon={faBriefcase}/></Link> : null }
        <span> &#x2F;&#x2F; {renderCaseControlLabels()}</span>
      </h2>
    </div>
    <Row className="case-control-curation-content"><Col sm="12">
      <form onSubmit={submitForm} className="row group-curation-content">
        <div className="col-sm-12 case-control-label">
          <CardPanel title="Case-Control Label" className="case-control-label-panel">
            {renderCaseControlName()}
          </CardPanel>
        </div>
        <div className="col-sm-6 case-cohort-curation">
          <CardPanel title="Case Cohort" className="case-cohort">
            {renderCohortGroup('case-cohort')}
          </CardPanel>
        </div>
        <div className="col-sm-6 control-cohort-curation">
          <CardPanel title="Control Cohort" className="control-cohort">
            {renderCohortGroup('control-cohort')}
          </CardPanel>
        </div>
        <div className="col-sm-12 case-control-curation">
          <CardPanel title="Case-Control Evaluation" className="case-control-eval-score">
            <EvaluationScore formData={formData} formErrors={formErrors} handleChange={handleChange} />
          </CardPanel>
          <CardPanel title="Case-Control Score" className="case-control-evidence-score">
            <CaseControlScore
              auth={auth}
              caseControl={caseControl}
              handleUserScoreObj={handleUserScoreObj}
              isDisabled={scoreDisabled}
              isSubmitting={isSubmitting}
            />
          </CardPanel>
          <div className="curation-submit clearfix">
            <LoadingButton
              type="submit"
              className="align-self-end mb-2 ml-2 float-right "
              variant="primary"
              text="Save"
              textWhenLoading="Submitting"
              isLoading={isSubmitting}
            />
            {gdm ?
              <Button variant="secondary" className="float-right align-self-end mb-2 ml-2" onClick={() => handleCancel()} disabled={isSubmitting}>Cancel</Button>
              : null}
            {caseControl ?
              <DeleteCurationModal
                gdm={gdm}
                parent={annotation}
                item={caseControl}
                disabled={isSubmitting}
              />
              : null}
            <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
            <div className="submit-error float-right">{submitError ? submitError : null}</div>
          </div>
        </div>
      </form>
    </Col></Row>
    </>
  );
}

export default CaseControlCuration;
