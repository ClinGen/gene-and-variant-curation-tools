import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import  _ from "lodash";
import moment from 'moment';
import { cloneDeep, isEmpty, get as lodashGet } from "lodash";
import { useHistory, Link } from "react-router-dom";
import { Row, Col, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase, faChevronRight, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../../../utils';
import { gdmParticipantReducer } from '../../../../utilities/gdmUtilities';
import { getEvidenceByPKFromActiveAnnotation } from "../../../../utilities/gdmEvidenceUtilities";
import { setGdmAction } from "../../../../actions/gdmActions";
import { updateAnnotationAction } from "../../../../actions/annotationActions";
import CardPanel from "../../../common/CardPanel";
import Input from "../../../common/Input";
import Alert from '../../../common/Alert';
import LoadingSpinner from '../../../common/LoadingSpinner';
import { LoadingButton } from "../../../common/LoadingButton";
import Popover from "../../../common/Popover";
import { COUNTRY_CODES } from '../../../../constants/countryCodes';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import { renderLabelNote, renderDiseaseList, renderPhenotype, renderLabelPhenoTerms, renderParentEvidence, getPmidsFromList } from '../common/commonFunc';
import { HpoTermModal } from '../common/HpoTermModal';
import { MethodsPanel, createMethod } from '../common/Methods';
import { DeleteCurationModal } from '../common/DeleteCurationModal';
import { VariantDisplay } from '../common/VariantDisplay';
import { SelectVariantModal } from '../common/SelectVariantModal';
import { RetiredVariantTable } from '../common/RetiredVariantTable';


import { FamilyDisease } from '../disease/FamilyDisease';
import { FamilyProbandDisease } from '../disease/FamilyProbandDisease';

import { useAmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';

// Maps segregation field names to schema properties
const formMapSegregation = {
  'SEGnumberOfAffectedWithGenotype': 'numberOfAffectedWithGenotype',
  'SEGnumberOfUnaffectedWithoutBiallelicGenotype': 'numberOfUnaffectedWithoutBiallelicGenotype',
  'SEGnumberOfSegregationsForThisFamily': 'numberOfSegregationsForThisFamily',
  'SEGinconsistentSegregationAmongstTestedIndividuals': 'inconsistentSegregationAmongstTestedIndividuals',
  'SEGexplanationForInconsistent': 'explanationForInconsistent',
  'SEGmoiDisplayedForFamily': 'moiDisplayedForFamily',
  'SEGprobandIs': 'probandIs',
  'SEGfamilyConsanguineous': 'familyConsanguineous',
  'SEGpedigreeLocation': 'pedigreeLocation',
  'SEGlodRequirements': 'lodRequirements',
  'SEGlodPublished': 'lodPublished',
  'SEGpublishedLodScore': 'publishedLodScore',
  'SEGestimatedLodScore': 'estimatedLodScore',
  'SEGincludeLodScoreInAggregateCalculation': 'includeLodScoreInAggregateCalculation',
  'SEGsequencingMethod': 'sequencingMethod',
  'SEGreasonExplanation': 'reasonExplanation',
  'SEGaddedsegregationinfo': 'additionalInformation'
};


export const FamilyCuration = ({
  associatedGroup = null,
  editFamily = null,
  ...props }) => {

  const history = useHistory();
  const dispatch = useDispatch();
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotations = useSelector(state => state.annotations);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  })
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);
  const auth = useSelector((state) => state.auth);

  // If adding a new family, group is set to associatedGroup that is adding to
  // If editing a family, group is set to family.associatedGroups[0] if exists
  const [ group, setGroup ] = useState(associatedGroup);
  const [ family, setFamily ] = useState(editFamily);

  const [ dataIsLoading, setDataIsLoading] = useState({});

  const [ formData, setFormData ] = useState({});
  const [ formErrors, setFormErrors ] = useState({});
  const [ variantAlert, setVariantAlert ] = useState({});
  const [ formSegData, setFormSegData ] = useState({});
  const [ badPmids, setBadPmids ] = useState([]);

  const [ variantCount, setVariantCount ] = useState(0);
  const [ variantInfo, setVariantInfo ] = useState([]);
  const [ probandIndividual, setProbandIndividual ] = useState(null);
  const [ individualRequired, setIndividualRequired ] = useState(false);
  const [ isSemidominant, setIsSemidominant ] = useState(null);
  const [ genotyping2Disabled, setGenotyping2Disabled ] = useState(true);
  const [ isTwoTrans, setIsTwoTrans ] = useState(false);
  const [ isHomozygous, setIsHomozygous ] = useState(false);
  const [ isHemizygous, setIsHemizygous ] = useState(false);

  // set true if segregation.includeLodScoreInAggregateCalculation is true
  const [ includeLodScore, setIncludeLodScore ] = useState(false);
  // indicate whether or not the LOD score field should be user-editable or not
  const [ lodLocked, setLodLocked ] = useState(true); 
  // track which type of calculation we should do for LOD score, if applicable
  const [ lodCalcMode, setLodCalcMode ] = useState(null); 

  const [ hpoWithTerms, setHpoWithTerms ] = useState([]);
  const [ hpoElimWithTerms, setHpoElimWithTerms ] = useState([]);

  const [ diseaseObj, setDiseaseObj ] = useState({});
  const [ diseaseError, setDiseaseError ] = useState(null);
  const [ probandDiseaseObj, setProbandDiseaseObj ] = useState({});
  const [ probandDiseaseError, setProbandDiseaseError ] = useState(null);

  const [ isSubmitting, setIsSubmitting ] = useState(false);
  const [ submitError, setSubmitError ] = useState(null);

  useEffect(() => {
    setFamily(editFamily);
    setGroup(associatedGroup);
    loadData();
  }, []);

  const calculateEstimatedLOD = (lodCalculatedMode, numAffected=0, numUnaffected=0, numSegregation=0, currentSegData) => {
    let estimatedLodScore = null;
    if (lodCalculatedMode === 'ADX') {
      // LOD scoring if GDM is Autosomal dominant or X-Linked
      if (numSegregation !== '') {
        numSegregation = parseInt(numSegregation);
        estimatedLodScore = Math.log(1 / Math.pow(0.5, numSegregation)) / Math.log(10);
      }
    } else if (lodCalculatedMode === 'AR') {
      // LOD scoring if GDM is Autosomal recessive
      if (numAffected !== '' && numUnaffected !== '') {
        numAffected = parseInt(numAffected);
        numUnaffected = parseInt(numUnaffected);
        estimatedLodScore = Math.log(1 / (Math.pow(0.25, numAffected - 1) * Math.pow(0.75, numUnaffected))) / Math.log(10);
      }
    }
    if (lodCalculatedMode === 'ADX' || lodCalculatedMode === 'AR') {
      if (estimatedLodScore && !isNaN(estimatedLodScore)) {
        estimatedLodScore = parseFloat(estimatedLodScore.toFixed(2));
      } else {
        estimatedLodScore = '';
      }
      // Update state and form field if relevant
      currentSegData['SEGestimatedLodScore'] = estimatedLodScore;
      if (!estimatedLodScore && currentSegData['SEGincludeLodScoreInAggregateCalculation']) {
        currentSegData['SEGincludeLodScoreInAggregateCalculation'] = "none";
      }
    }
    return estimatedLodScore; 
  };

  const loadData = () => {
    let data = {};
    let segData = {}

    setDataIsLoading(true);

    // If editing family, check if family has associatedGroups, retrieve the group object
    if (family && family.associatedGroups && family.associatedGroups.length > 0) {
      setGroup(
        getEvidenceByPKFromActiveAnnotation(annotations, family.associatedGroups[0])
      );
    }

    // Used in LOD Score panel 
    // Set LOD locked and calculation modes based on GDM
    if (gdm && gdm.modeInheritance) {
      if (gdm.modeInheritance.indexOf('Autosomal dominant') > -1 || gdm.modeInheritance.indexOf('X-linked inheritance') > -1) {
        setLodLocked(true);
        setLodCalcMode('ADX');
      } else if (gdm.modeInheritance.indexOf('Autosomal recessive') > -1) {
        setLodLocked(true);
        setLodCalcMode('AR');
      } else {
        setLodLocked(false);
      }
    }

    // Update LOD locked and calculation modes based on family moi question for semidom
    if (family && family.segregation && family.segregation.moiDisplayedForFamily) {
      if (family.segregation.moiDisplayedForFamily.indexOf('Autosomal dominant/X-linked') > -1) {
        segData.SEGmoiDisplayedForFamily = family.segregation.moiDisplayedForFamily;
        setLodLocked(true);
        setLodCalcMode('ADX');
        setIsSemidominant(false);
      } else if (family.segregation.moiDisplayedForFamily.indexOf('Autosomal recessive') > -1) {
        segData.SEGmoiDisplayedForFamily = family.segregation.moiDisplayedForFamily;
        setLodLocked(true);
        setLodCalcMode('AR');
        setIsSemidominant(false);
      } else if (family.segregation.moiDisplayedForFamily.indexOf('Semidominant') > -1) {
        segData.SEGmoiDisplayedForFamily = family.segregation.moiDisplayedForFamily;
        setLodLocked(false);
        setIsSemidominant(true);
        if (family.segregation.lodRequirements) {
          if (family.segregation.lodRequirements === 'Yes - autosomal dominant/X-linked') {
            setLodLocked(true);
            setLodCalcMode('ADX');
            segData.SEGlodRequirements = family.segregation.lodRequirements;
          } else if (family.segregation.lodRequirements === 'Yes - autosomal recessive') {
            setLodLocked(true);
            setLodCalcMode('AR');
            segData.SEGlodRequirements = family.segregation.lodRequirements;
          } else {
            segData.SEGlodRequirements = "none";
          }
        } else {
          segData.SEGlodRequirements = "none";
        }
      } else {
        segData.SEGmoiDisplayedForFamily = "none";
        setLodLocked(true);
        setIsSemidominant(true);
      }
    }

    if (family && family.segregagion) {
      // Load the previously stored 'Published Calculated LOD score' if any
      segData.SEGpublishedLodScore = family.segregation.publishedLodScore ? family.segregation.publishedLodScore : null;
      // Calculate LOD from stored values, if applicable...
      if (lodLocked) {
        segData.SEGestimatedLodScore = calculateEstimatedLOD(
          lodCalcMode,
          family.segregation.numberOfAffectedWithGenotype ? family.segregation.numberOfAffectedWithGenotype : null,
          family.segregation.numberOfUnaffectedWithoutBiallelicGenotype ? family.segregation.numberOfUnaffectedWithoutBiallelicGenotype : null,
          family.segregation.numberOfSegregationsForThisFamily ? family.segregation.numberOfSegregationsForThisFamily : null,
          segData
        );
      } else {
        // ... otherwise, show the stored LOD score, if available
        segData.SEGestimatedLodScore = family.segregation.estimatedLodScore ? family.segregation.estimatedLodScore : null;
      }
    }

    // Family label, Diseases & Phenotypes
    data['familyname'] = family && family.label ? family.label : "" ;
    if (family && family.commonDiagnosis && family.commonDiagnosis.length > 0) {
      setDiseaseObj(family['commonDiagnosis'][0]);
    }
    if (family && family['hpoIdInDiagnosis'] && family['hpoIdInDiagnosis'].length > 0) {
      setHpoWithTerms(family['hpoIdInDiagnosis']);
    }
    data["phenoterms"] = family && family.termsInDiagnosis ? family.termsInDiagnosis : '';
    if (family && family['hpoIdInElimination'] && family['hpoIdInElimination'].length > 0) {
      setHpoElimWithTerms(family['hpoIdInElimination']);
    }
    data["notphenoterms"] = family && family.termsInElimination ? family.termsInElimination : '';

    // Demographics
    data["country"] = family && family.countryOfOrigin ? family.countryOfOrigin : 'none';
    data["ethnicity"] = family && family.ethnicity ? family.ethnicity : 'none';
    data["race"] = family && family.race ? family.race : 'none';

    data["additionalinfofamily"] = family && family.additionalInformation ? family.additionalInformation : '';
    data["otherpmids"] = family && family.otherPMIDs ? family.otherPMIDs.map((article) => { return article; }).join(', ') : '';

    // methods data
    data["prevtesting"] = family && family.method && family.method.previousTesting === true
      ? "Yes"
      : (family && family.method && family.method.previousTesting === false ? "No" : "none");
    data["prevtestingdesc"] = family && family.method && family.method.previousTestingDescription ? family.method.previousTestingDescription : '';
    data["genomewide"] = family && family.method && family.method.genomeWideStudy === true
      ? "Yes"
      : (family && family.method && family.method.genomeWideStudy === false ? "No" : "none");
    data["genotypingmethod1"] = family && family.method && family.method.genotypingMethods && family.method.genotypingMethods[0] ? family.method.genotypingMethods[0] : "none";
    data["genotypingmethod2"] = family && family.method && family.method.genotypingMethods && family.method.genotypingMethods[1] ? family.method.genotypingMethods[1] : "none";
    data["additionalinfomethod"] = family && family.method && family.method.additionalInformation ? family.method.additionalInformation : '';
    // Based on the loaded method data, see if the second genotyping method drop-down needs to be disabled.
    setGenotyping2Disabled(!(family && family.method && family.method.genotypingMethods && family.method.genotypingMethods.length));
    data["specificmutation"] = family && family.method && family.method.specificMutationsGenotypedMethod ? family.method.specificMutationsGenotypedMethod : '';

    // See if any associated individual is a proband
    // Should only have one proband individual
    let familyProbandIndList = [];
    let familyProbandInd = null
    if (family && family.individualIncluded && family.individualIncluded.length) {
      (family.individualIncluded).forEach(indivPK => {
        const indiv = getEvidenceByPKFromActiveAnnotation(annotations, indivPK)
        if (indiv.proband) {
          familyProbandIndList = [...familyProbandIndList, indiv];
        }
      });
      familyProbandInd = familyProbandIndList && familyProbandIndList.length ? familyProbandIndList[0] : null;
      setProbandIndividual(familyProbandInd);
    }

    data['individualName'] = '';

    // segregation SEG
    const segregation = family && family.segregation ? family.segregation : {}; 
    segData.SEGaddedsegregationinfo = segregation && segregation.additionalInformation ? segregation.additionalInformation : '';
    segData.SEGnumberOfAffectedWithGenotype = segregation && segregation.numberOfAffectedWithGenotype ? segregation.numberOfAffectedWithGenotype : ''; 
    segData.SEGnumberOfUnaffectedWithoutBiallelicGenotype = segregation && segregation.numberOfUnaffectedWithoutBiallelicGenotype ? segregation.numberOfUnaffectedWithoutBiallelicGenotype : '';
    segData.SEGnumberOfSegregationsForThisFamily = segregation && segregation.numberOfSegregationsForThisFamily ? segregation.numberOfSegregationsForThisFamily : '';
    segData.SEGinconsistentSegregationAmongstTestedIndividuals = segregation && segregation.inconsistentSegregationAmongstTestedIndividuals ? segregation.inconsistentSegregationAmongstTestedIndividuals : 'none'; 
    segData.SEGexplanationForInconsistent = segregation && segregation.explanationForInconsistent ? segregation.explanationForInconsistent : '';
    segData.SEGfamilyConsanguineous = segregation && segregation.familyConsanguineous ? segregation.familyConsanguineous : 'none';
    segData.SEGprobandIs = segregation && segregation.probandIs ? segregation.probandIs : 'none';
    segData.SEGpedigreeLocation = segregation && segregation.pedigreeLocation ? segregation.pedigreeLocation : '';
    segData.SEGlodPublished = segregation && segregation.lodPublished === true
      ? 'Yes'
      : (segregation && segregation.lodPublished === false ? 'No' : 'none');
    segData.SEGpublishedLodScore = segregation && segregation.publishedLodScore ? segregation.publishedLodScore : '';
    segData.SEGestimatedLodScore = segregation && segregation.estimatedLodScore ? segregation.estimatedLodScore : '';
    segData.SEGincludeLodScoreInAggregateCalculation = segregation && segregation.includeLodScoreInAggregateCalculation === true
      ? 'Yes'
      : (segregation && segregation.includeLodScoreInAggregateCalculation === false ? 'No' : 'none');
    segData.SEGsequencingMethod = segregation && segregation.sequencingMethod ? segregation.sequencingMethod : 'none';
    segData.SEGreasonExplanation = segregation && segregation.reasonExplanation ? segregation.reasonExplanation : '';
    // Check whether a saved LOD score is included for classification calculation
    if (segregation.includeLodScoreInAggregateCalculation) {
      setIncludeLodScore(true);
    }

    // Variants Segregating with Proband panel
    // See if we need to disable the Add Variant button based on the number of variants configured
      // Adjust the form for incoming variants
      // SOP8 - show the variant data from proband individual's variantScores list, not from segregation
      if (familyProbandInd && familyProbandInd.variantScores) {
        // We have variants
        setVariantCount(familyProbandInd.variantScores.length);
        let variantList = [];
        // For each incoming variant, set the form value
        // SOP8 - Get variant objects from family's proband individual variantScores[] 
        for (let i = 0; i < familyProbandInd.variantScores.length; i++) {
          const variantScore = familyProbandInd.variantScores[i];
          if (variantScore && lodashGet(variantScore, "variantScored", null)) {
            variantList[i] = {
              'clinvarVariantId': lodashGet(variantScore, "variantScored.clinvarVariantId", null),
              'clinvarVariantTitle': lodashGet(variantScore, "variantScored.clinvarVariantTitle", null),
              'preferredTitle': lodashGet(variantScore, "variantScored.preferredTitle", null),
              'carId': lodashGet(variantScore, "variantScored.carId", null),
              'canonicalTranscriptTitle': lodashGet(variantScore, "variantScored.canonicalTranscriptTitle", null),
              'maneTranscriptTitle': lodashGet(variantScore, "variantScored.maneTranscriptTitle", null),
              'hgvsNames': lodashGet(variantScore, "variantScored.hgvsNames", null),
              'PK': lodashGet(variantScore, "variantScored.PK", null)
            };
          }
        }
        setVariantInfo(variantList);
      } else {
        setVariantCount(0);
        setVariantInfo([]);
      }

      setFormData(data);
      setFormSegData(segData);
      setDataIsLoading(false);
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

  // Handle value changes in genotyping method 1
  const handleChange = (e) => {
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    const fieldName = e.target.name;
    const fieldValue = e.target.value;
    // Clear variant related alert
    setVariantAlert({});

    let newData = cloneDeep(formData);
    let newSegData = cloneDeep(formSegData);

    if (fieldName === "otherpmids") {
      setBadPmids([]);
    }

    // Set basic form and segregation form data
    if (fieldName.substring(0, 3) === "SEG") {
      newSegData[fieldName] = fieldValue; 
    } else {
      newData[fieldName] = fieldValue;
    }

    if (fieldName === 'individualName') {
      if (newData['individualName'] !== "" || !isEmpty(probandDiseaseObj)) {
        setIndividualRequired(true);
      } else if (newData['individualName'] === "" && isEmpty(probandDiseaseObj)) {
        setIndividualRequired(false);
      }
      setProbandDiseaseError(null);
    }

    if (fieldName === 'SEGlodPublished') {
      // Find out whether there is pre-existing score in db
      let familyPublishedLodScore = null;
      if (family && family.segregation && family.segregation.publishedLodScore) {
        familyPublishedLodScore = family.segregation.publishedLodScore;
      }
      newSegData['SEGlodPublished'] = fieldValue;
      if (fieldValue === 'Yes') {
        if (semiDom) {
          newSegData['SEGnumberOfUnaffectedWithoutBiallelicGenotype'] = '';
          newSegData['SEGnumberOfAffectedWithGenotype'] = '';
          newSegData['SEGnumberOfSegregationsForThisFamily'] = '';
        }
        newSegData['SEGpublishedLodScore'] = familyPublishedLodScore ? familyPublishedLodScore : '';
        newSegData['SEGlodRequirements'] = 'none';
        setIncludeLodScore(false);
        if (newSegData['SEGpublishedLodScore'] === '') {
          newSegData['SEGincludeLodScoreInAggregateCalculation'] = 'none';
        }
      } else if (fieldValue === 'No') {
        if (semiDom) {
          const familyMoiDisplayed = newSegData['SEGmoiDisplayedForFamily'];
          const familyLodLocked = familyMoiDisplayed === 'Autosomal dominant/X-linked' || familyMoiDisplayed === 'Autosomal recessive';
          newSegData['SEGpublishedLodScore'] = '';
          setLodLocked(familyLodLocked);
          setIncludeLodScore(false);
        } else {
          newSegData['SEGpublishedLodScore'] = '';
          newSegData['SEGincludeLodScoreInAggregateCalculation'] = 'none';
          newSegData['SEGsequencingMethod'] = 'none';
          setIncludeLodScore(false);
        }
        if (formSegData['SEGestimatedLodScore'] === '') {
          newSegData['SEGincludeLodScoreInAggregateCalculation'] = 'none';
        }
      } else {
        newSegData['SEGincludeLodScoreInAggregateCalculation'] = 'none';
        newSegData['SEGpublishedLodScore'] = '';
        newSegData['SEGlodRequirements'] = 'none';
        newSegData['SEGsequencingMethod'] = 'none';
        setIncludeLodScore(false);
      }
    }

    if (fieldName === 'SEGincludeLodScoreInAggregateCalculation') {
      setIncludeLodScore(fieldValue === "Yes" ? true : false); 
      newSegData['SEGsequencingMethod'] = 'none';
    }

    if (fieldName === 'SEGmoiDisplayedForFamily') {
      let familyMoiDisplayed = fieldValue;
      if (familyMoiDisplayed === 'Autosomal dominant/X-linked') {
        if (newSegData.SEGlodPublished !== 'Yes') {
          newSegData.SEGnumberOfUnaffectedWithoutBiallelicGenotype = '';
          if (newSegData.SEGlodPublished === 'No') {
            calculateEstimatedLOD('ADX', newSegData.SEGnumberOfAffectedWithGenotype,
              '', newSegData.SEGnumberOfSegregationsForThisFamily, newSegData);
          }
        }
        setLodLocked(true);
        setLodCalcMode('ADX');
        setIsSemidominant(false);
        newSegData.SEGlodRequirements = "none";
      } else if (familyMoiDisplayed === 'Autosomal recessive') {
        if (newSegData.SEGlodPublished !== 'Yes') {
          newSegData.SEGnumberOfSegregationsForThisFamily = '';
          if (newSegData.SEGlodPublished === 'No') {
            calculateEstimatedLOD('AR', newSegData['SEGnumberOfAffectedWithGenotype'],
            newSegData['SEGnumberOfUnaffectedWithoutBiallelicGenotype'], '', newSegData);
          }
        }
        setLodLocked(true);
        setLodCalcMode('AR');
        setIsSemidominant(false);
        newSegData.SEGlodRequirements = "none";
      } else if (familyMoiDisplayed === 'Semidominant') {
        if (newSegData.lodPublished !== 'Yes') {
          newSegData['SEGnumberOfUnaffectedWithoutBiallelicGenotype'] = '';
          newSegData['SEGnumberOfAffectedWithGenotype'] = '';
          newSegData['SEGnumberOfSegregationsForThisFamily'] = '';
        }
        setLodLocked(false);
        setLodCalcMode(null);
        setIsSemidominant(true);
      } else {
        setLodLocked(false);
        setLodCalcMode(null);
        setIsSemidominant(false);
        newSegData.SEGlodRequirements = "none";
      }
    } 

    if (fieldName === 'SEGlodRequirements') {
      // Handle LOD score based on semidominant family requirements question
      newSegData['SEGlodRequirements'] = fieldValue;
      if (fieldValue === 'Yes - autosomal dominant/X-linked') {
        setLodLocked(true);
        setLodCalcMode("ADX");
        newSegData['SEGnumberOfUnaffectedWithoutBiallelicGenotype'] = '';
        newSegData['SEGestimatedLodScore'] = '';
      } else if (fieldValue === 'Yes - autosomal recessive') {
        setLodLocked(true);
        setLodCalcMode("AR");
        newSegData['SEGnumberOfSegregationsForThisFamily'] = '';
        newSegData['SEGestimatedLodScore'] = '';
      } else if (fieldValue === 'No' || fieldValue === 'none') {
        setLodLocked(false);
        setLodCalcMode(null);
        newSegData['SEGnumberOfUnaffectedWithoutBiallelicGenotype'] = '';
        newSegData['SEGnumberOfAffectedWithGenotype'] = '';
        newSegData['SEGnumberOfSegregationsForThisFamily'] = '';
      }
    }

    // Update states for LOD scores; reset SEGincludeLodScoreInAggregateCalculation dropdown if blank
    if (fieldName === 'SEGestimatedLodScore') {
      if (fieldValue === '') {
        newSegData['SEGincludeLodScoreInAggregateCalculation'] = "none";
        //this.refs['SEGincludeLodScoreInAggregateCalculation'].resetValue();
      }
    }
    if (fieldName === 'SEGpublishedLodScore') {
      if (fieldValue === '') {
        newSegData['SEGincludeLodScoreInAggregateCalculation'] = "none";
      }
    }

    // Update Estimated LOD if it should be automatically calculated
    if (lodLocked && (fieldName === 'SEGnumberOfAffectedWithGenotype'
      || fieldName === 'SEGnumberOfUnaffectedWithoutBiallelicGenotype'
      || fieldName === 'SEGnumberOfSegregationsForThisFamily')) {
      calculateEstimatedLOD(
        lodCalcMode,
        newSegData['SEGnumberOfAffectedWithGenotype'],
        newSegData['SEGnumberOfUnaffectedWithoutBiallelicGenotype'],
        newSegData['SEGnumberOfSegregationsForThisFamily'],
        newSegData
      );
    }

    if (fieldName === 'SEGprobandIs') {
      if (fieldValue === "Biallelic homozygous" && variantInfo && variantCount > 1) {
        // SOP8 - For semiDom, only one variantScore is allowed if probandIs set to "Biallelic homozygous"
        alert("Please clear one of the variant(s) before changing proband is to Biallelic homozygous");
        setVariantAlert({
          type: "danger",
          message: 'Please clear one of the variant selection before changing proband is to Biallelic homozygous.',
        });
        // reset to old value
        newSegData['SEGprobandIs'] = formSegData['SEGprobandIs']; 
      } else if (fieldValue === "Biallelic homozygous") {
        // SOP8 - For semiDom, if probandIs set to "Biallelic homozygous", force Homozygous to be checked
         if (!isHomozygous) {
          newData['recessiveZygosity'] = 'Homozygous';
          setIsTwoTrans(false);
          setIsHomozygous(!isHomozygous);
        } else {
          // ??? newData['recessiveZygosity'] = null;
        }
      }
    }

    // Only either homozygous or hemizygous should be checked
    // SOP8 - For SD/AR, either 2 variants both trans or homozygous should be checked
    if (fieldName === 'zygosityHomozygous') {
      // If selecting Homozygous and has more than 1 variantInfo, cannot change
      if (isHomozygous && (variantInfo && variantCount > 0)) {
        alert("Please clear the variant selection before unchecking homozygous selection.");
        setVariantAlert({
          type: "danger",
          message: 'Please clear the variant selection before unchecking homozygous selection.',
        });
      } else if (isHomozygous && newSegData["SEGprobandIs"] === "Biallelic homozygous") {
        alert("The proband is set to Biallelic homozygous so Homozygous has to be selected.");
        setVariantAlert({
          type: "danger",
          message: 'The proband is set to Biallelic homozygous so Homozygous has to be selected.',
        });
      } else if (!isHomozygous && (variantInfo && variantCount > 1)) {
        alert("Please clear one of the variant selection before checking to Homozygous.");
        setVariantAlert({
          type: "danger",
          message: 'Please clear one of the variant selection before changing to Homozygous.',
        });
      } else {
        if (!isHomozygous) {
          newData['recessiveZygosity'] = 'Homozygous';
          setIsTwoTrans(false);
        } else {
          newData['recessiveZygosity'] = null;
        }
        setIsHomozygous(!isHomozygous);
      }
    }

    if (fieldName === 'zygosityTwoTrans') {
      // If de-select TwoTrans and has variant(s) or variantScore(s), cannot change
      if (isTwoTrans && ((variantInfo && variantCount > 1))) {
        alert("Please clear the variant(s) before unchecking this 2 variants in trans selection...");
        setVariantAlert({
          type: "danger",
          message: 'Please clear the variant(s) before unchecking this 2 variants in trans selection...',
        });
      } else {
        // If select TwoTrans and probandIs is "Biallelic homozygous", cannot change
        if (!isTwoTrans && formSegData['SEGprobandIs'] === "Biallelic homozygous") {
          alert("The proband is set to Biallelic homozygous so cannot changed to 2 variants...");
          setVariantAlert({
            type: "danger",
            message: 'The proband is set to Biallelic homozygous so cannot changed to 2 variants...',
          });
        } else {
          if (!isTwoTrans) {
            newData['recessiveZygosity'] = 'TwoTrans';
            setIsHomozygous(false);
          } else {
            newData['recessiveZygosity'] = null;
          }
          setIsTwoTrans(!isTwoTrans);
        }
      }
    }

    if (fieldName === 'zygosityHemizygous') {
      if (!isHemizygous) {
        newData['recessiveZygosity'] = 'Hemizygous';
      } else {
        newData['recessiveZygosity'] = null;
      }
      setIsHemizygous(!isHemizygous);
    }

    // Disable the Genotyping Method 2 if Genotyping Method 1 has no value
    if (fieldName === 'genotypingmethod1') {
      setGenotyping2Disabled(fieldValue === "none" ? true : false);
      if (e.target.value === "none") {
        newData['genotypingmethod2'] = "none";
      }
    }

    setFormData(newData);
    setFormSegData(newSegData);

    setFormErrors({});
  };

  /**
   * Handle a click on a copy phenotype button
   * @param {*} e - Event
   */
  const handleCopyGroupPhenotypes = (e) => {
    e.preventDefault(); e.stopPropagation();

    if (group) {
      // Only has the most one associated group
      if (group.hpoIdInDiagnosis && group.hpoIdInDiagnosis.length) {
        const hpoIds = group.hpoIdInDiagnosis.map((hpoid, i) => {
          return hpoid;
        });
        setHpoWithTerms(hpoIds);
      } else {
        setHpoWithTerms([]);
      }
      if (group.termsInDiagnosis) {
        let newData = cloneDeep(formData);
        newData["phenoterms"] = group.termsInDiagnosis;
        setFormData(newData);
      }
    }
  };

  const handleCopyGroupNotPhenotypes = (e) => {
    e.preventDefault(); e.stopPropagation();

    if (group) {
      if (group.hpoIdInElimination && group.hpoIdInElimination.length) {
        const hpoIds = group.hpoIdInElimination.map((hpoid, i) => {
          return hpoid;
        });
        setHpoElimWithTerms(hpoIds);
      } else {
        setHpoElimWithTerms([]);
      }
      if (group.termsInElimination) {
        let newData = cloneDeep(formData);
        newData["notphenoterms"] = group.termsInElimination;
        setFormData(newData);
      }
    }
  };

  // Handle a click on a copy demographics button
  const handleCopyGroupDemographics = (e) => {
    e.preventDefault(); e.stopPropagation();
    let newData = cloneDeep(formData);

    // Copy demographics data from associated group to form fields
    if (group.countryOfOrigin) {
      newData['country'] = group.countryOfOrigin;
    }

    if (group.ethnicity) {
      newData['ethnicity'] = group.ethnicity;
    }

    if (group.race) {
      newData['race'] = group.race;
    }

    setFormData(newData);
  };

  const updateHpo = (hpoTerms) => {
    if (hpoTerms) {
      setHpoWithTerms(hpoTerms);
    }
  };

  const updateElimHpo = (hpoTerms) => {
    if (hpoTerms) {
      setHpoElimWithTerms(hpoTerms);
    }
  };

  const updateDiseaseObj = (newDisease) => {
    setDiseaseObj(newDisease);
    setDiseaseError(null);
  };

  /**
   * Update the 'probandDiseaseObj' state used for the proband individual
   */
  const updateFamilyProbandDiseaseObj = (action, probandDiseaseObj) => {
    if (action === 'add' && (probandDiseaseObj && Object.keys(probandDiseaseObj).length > 0)) {
      setProbandDiseaseObj(probandDiseaseObj);
      setIndividualRequired(true);
      // Clear 'probandDisease' key in formErrors object
      clearFieldError('probandDisease');
    } else if (action === 'copy' && diseaseObj && !isEmpty(diseaseObj)) {
      setProbandDiseaseObj(diseaseObj);
      setIndividualRequired(true);
      // Clear 'probandDisease' key in formErrors object
      clearFieldError('probandDisease');
    } else if (action === 'delete') {
      setProbandDiseaseObj({});
      // Clear 'probandDisease' key in formErrors object
      clearFieldError('probandDisease');
      if (formData['individualName'] && formData['individualName'] !== '') {
        setIndividualRequired(true);
      } else {
        setIndividualRequired(false);
      }
    }
    setProbandDiseaseError(null);
    clearFieldError("individualName");
  };

  const handleCancel = () => {
    // If created new family, go to /family-submit, else back to /curation-central
    let cancelUrl = "/dashboard";
    if (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null)) {
      cancelUrl = `/curation-central/${gdm.PK}/annotation/${annotation.PK}`;
    }
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

  const renderPmidsError = () => {
    if (formErrors["otherpmids"]) {
      return (
        <>
        {formErrors["otherpmids"]}
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
      article = await createArticleRequest;
    } catch (error) {
      if (!API.isCancel(error)) {
        console.error("Failed to save article to database", error);
        return;
      }
    }
  };

  const validatePmids = () => {
    let valid = true;
    const pmids = getPmidsFromList(formData["otherpmids"]);
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
            setBadPmids(badPmids => [...badPmids, pmid]);
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
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    const lodPublished = semiDom && formSegData.SEGlodPublished === 'Yes';

    const errors = {};

    // Check all required fields have value
    // Check family name has value
    if (formData["familyname"] === '') {
      errors["familyname"] = "A Family name is required";
    }

    if (!lodPublished && !isSemidominant && formSegData['SEGnumberOfAffectedWithGenotype'] === '') {
      errors["SEGnumberOfAffectedWithGenotype"] = "A number is required";
    }

    // Validate pmids have the proper format (will check for existence later)
    const pmids = getPmidsFromList(formData["otherpmids"]);
    if (pmids && pmids.length && pmids.includes(null)) {
      // PMID list is bad
      errors["otherpmids"] = "Use PubMed IDs (e.g. 12345678) separated by commas";
    }

    /**
     * If adding proband user, check following
     */
    const hasVariant = variantInfo.filter(obj => lodashGet(obj, "PK", null));
    if (!probandIndividual) {
      if (formData["individualName"] && (probandDiseaseObj && isEmpty(probandDiseaseObj))) {
        errors["probandDisease"] = "Required for proband";
        setProbandDiseaseError("Disease is equired for proband");
      }
      if ((probandDiseaseObj && !isEmpty(probandDiseaseObj)) && formData["individualName"] === "") {
        errors["individualName"] = "Required for proband";
      }
      if (hasVariant.length > 0) {
        if (formData["individualName"] === '') {
          errors["individualName"] = "Required for proband";
        }
        if (probandDiseaseObj && isEmpty(probandDiseaseObj)) {
          errors["probandDisease"] = "Required for proband";
          setProbandDiseaseError("Disease is required for proband");
        }
      }
    }
    if (semiDom) {
      if ((formData["individualName"] || !isEmpty(probandDiseaseObj)) && formSegData["SEGprobandIs"] === "none") {
        errors["SEGprobandIs"] = "Required for proband";
      }
      if (hasVariant.length > 0 && formSegData["SEGprobandIs"] === "none") {
        errors["SEGprobandIs"] = "Required for proband";
      }
    }

    // Check that "Published Calculated LOD score" is greater than zero
    if (formSegData["SEGlodPublished"] === 'Yes') {
      const publishedLodScore = parseFloat(formSegData["SEGpublishedLodScore"]);
      if (!isNaN(publishedLodScore) && publishedLodScore <= 0) {
        errors["SEGpublishedLodScore"] = "The published calculated LOD score must be greater than 0";
      }
    }

    // Check that segregation sequencing type value is not 'none'
    // when LOD score is included for calculation
    if (formSegData["SEGincludeLodScoreInAggregateCalculation"] === 'Yes' && formSegData["SEGsequencingMethod"] === 'none') {
      errors["SEGsequencingMethod"] = "A sequencing method is required";
    }

    if (!isEmpty(errors)) {
      setFormErrors(errors);
      return false;
    } else {
      return true;
    }
  };

  const getFamilyVariants = (maxVariants) => {
    let familyVariants = [];
    for (let i = 0; i < maxVariants; i++) {
      // Grab the values from the variant form panel
      const variantId = variantInfo[i] && variantInfo[i].PK ? variantInfo[i].PK : null;

      // Build the search string depending on what the user entered
      if (variantId) {
        familyVariants = [...familyVariants, variantId];
      }
    }
    return familyVariants;
  };

  // Create segregation object based on the form values
  const createSegregation = (newFamily) => {
    // SD, AR, AD, XL
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    const autoRec = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Autosomal recessive') > -1 : false;
    const noProbandIs = formSegData["SEGprobandIs"] === "none";
    const biallelicHetOrHom = formSegData["SEGprobandIs"].indexOf('Biallelic') > -1 ? true : false;
    const biallelicHomozygous = formSegData["SEGprobandIs"].indexOf('Biallelic homozygous') > -1 ? true : false;
    let maxVariants = 2;
    if (semiDom) {
      if (noProbandIs) {
        maxVariants = 0;
      } else {
        if (biallelicHetOrHom) {
          if (biallelicHomozygous) {
            maxVariants = 1;
          } else {
            maxVariants = isTwoTrans ? 2 : (isHomozygous ? 1 : 0);
          }
        }
      }
    }
    if (autoRec) {
      maxVariants = isTwoTrans ? 2 : (isHomozygous ? 1 : 0);
    }

    let newSegregation = {}
    let value;

    value = formSegData['SEGnumberOfAffectedWithGenotype'];
    if (value && !isNaN(parseInt(value, 10))) {
      newSegregation[formMapSegregation['SEGnumberOfAffectedWithGenotype']] = parseInt(value, 10);
    }
    value = formSegData['SEGnumberOfUnaffectedWithoutBiallelicGenotype'];
    if (value && !isNaN(parseInt(value, 10))) {
      newSegregation[formMapSegregation['SEGnumberOfUnaffectedWithoutBiallelicGenotype']] = parseInt(value, 10);
    }
    value = formSegData['SEGnumberOfSegregationsForThisFamily'];
    if (value && !isNaN(parseInt(value, 10))) {
      newSegregation[formMapSegregation['SEGnumberOfSegregationsForThisFamily']] = parseInt(value, 10);
    }
    value = formSegData['SEGinconsistentSegregationAmongstTestedIndividuals'];
    if ( value !== 'none') {
      newSegregation[formMapSegregation['SEGinconsistentSegregationAmongstTestedIndividuals']] = value;
    }
    value = formSegData['SEGexplanationForInconsistent'];
    if (value) {
      newSegregation[formMapSegregation['SEGexplanationForInconsistent']] = value;
    }
    // Fields only available on GDMs with Semidominant MOI
    if (semiDom) {
      value = formSegData['SEGmoiDisplayedForFamily'];
      if (value !== 'none') {
        newSegregation[formMapSegregation['SEGmoiDisplayedForFamily']] = value;
      }
      value = formSegData['SEGprobandIs'];
      if (value !== 'none') {
        newSegregation[formMapSegregation['SEGprobandIs']] = value;
      }
      value = formSegData['SEGlodRequirements'];
      if (value !== 'none') {
        newSegregation[formMapSegregation['SEGlodRequirements']] = value;
      }
    }
    value = formSegData['SEGfamilyConsanguineous'];
    if (value !== 'none') {
      newSegregation[formMapSegregation['SEGfamilyConsanguineous']] = value;
    }
    value = formSegData['SEGpedigreeLocation'];
    if (value) {
      newSegregation[formMapSegregation['SEGpedigreeLocation']] = value;
    }
    value = formSegData['SEGlodPublished'];
    if (value !== 'none') {
      newSegregation[formMapSegregation['SEGlodPublished']] = value === 'Yes';
    }
    value = formSegData['SEGpublishedLodScore'];
    if (value && !isNaN(parseFloat(value, 10))) {
      newSegregation[formMapSegregation['SEGpublishedLodScore']] = parseFloat(value);
    }
    value = formSegData['SEGestimatedLodScore'];
    if (value && !isNaN(parseFloat(value, 10))) {
      newSegregation[formMapSegregation['SEGestimatedLodScore']] = parseFloat(value);
    }
    value = formSegData['SEGincludeLodScoreInAggregateCalculation'];
    if (value !== 'none') {
      newSegregation[formMapSegregation['SEGincludeLodScoreInAggregateCalculation']] = value === 'Yes';
    }
    value = formSegData['SEGsequencingMethod'];
    if (value !== 'none') {
      newSegregation[formMapSegregation['SEGsequencingMethod']] = value;
    }
    value = formSegData['SEGreasonExplanation'];
    if (value) {
      newSegregation[formMapSegregation['SEGreasonExplanation']] = value;
    }
    value = formSegData['SEGaddedsegregationinfo'];
    if (value) {
      newSegregation[formMapSegregation['SEGaddedsegregationinfo']] = value;
    }
 
    const familyVariants = getFamilyVariants(maxVariants);
    if (familyVariants) {
      newSegregation.variants = familyVariants;
    } else {
      newSegregation.variants = [];
    }

    if (!isEmpty(newSegregation)) {
      newFamily.segregation = newSegregation;
    }
  };

  const createFamily = () => {
    // If editing family, copy over old family data
    let newFamily = family ? cloneDeep(family) : {};

    // Set family name
    newFamily.label = formData["familyname"];

    // Get the disease (only one)
    newFamily.commonDiagnosis = (diseaseObj && !isEmpty(diseaseObj)) ? [diseaseObj] : null;

    // Add array of other PMIDs
    if (formData["otherpmids"]) {
      const pmids = getPmidsFromList(formData["otherpmids"]);
      newFamily.otherPMIDs = pmids.map(pmid => { return pmid; });
    } else {
      newFamily['otherPMIDs'] = null;
    }

    // Fill in the family fields from the Common Diseases & Phenotypes panel
    newFamily.hpoIdInDiagnosis = (hpoWithTerms && hpoWithTerms.length) ? hpoWithTerms : null;
    newFamily.termsInDiagnosis = formData["phenoterms"] ? formData["phenoterms"] : null;
    newFamily.hpoIdInElimination = (hpoElimWithTerms && hpoElimWithTerms.length) ?  hpoElimWithTerms : null;
    newFamily.termsInElimination = formData["notphenoterms"] ? formData["notphenoterms"] : null;

    // Fill in the family fields from the Family Demographics panel
    newFamily.countryOfOrigin = formData["country"] !== 'none' ? formData["country"] : null;
    newFamily.ethnicity = formData["ethnicity"] !== 'none' ? formData["ethnicity"] : null;
    newFamily.race = formData["race"] !== 'none' ? formData["race"] : null;

    newFamily.additionalInformation = formData["additionalinfofamily"] ? formData["additionalinfofamily"] : null;

    // Fill in the segregation fields to the family, if there was a form (no form if assessed)
    createSegregation(newFamily);

    // If a method and/or segregation object was created (at least one method/segregation field set), assign it to the family.
    // needs unique objects here.
    const newMethod = createMethod(formData);
    newFamily.method = (newMethod && !isEmpty(newMethod)) ? newMethod : {};

    // Add affiliation if the user is associated with an affiliation
    // and if the data object has no affiliation
    if (!newFamily.PK) {
      if (!newFamily.affiliation) {
        if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
          newFamily.affiliation = auth.currentAffiliation.affiliation_id;
        }
      }
      newFamily.submitted_by = lodashGet(auth, "PK", null);
    }
    newFamily.modified_by = lodashGet(auth, "PK", null);
    newFamily.item_type = "family";

    // SOP8 - add associated parent data to family
    if (group && group.PK) {
      newFamily.associatedParentType = 'group';
      newFamily.associatedParent = group.PK;
    } else {
      newFamily.associatedParentType = 'annotation';
      newFamily.associatedParent = annotation.PK;
    }

    return newFamily;
  };

  // SOP8 - for proband user, covert variant and save as variantScore objects 
  // Create variantScore objects from variant objects and save in database
  const saveVariantScores = async (variants) => {
    if (variants && !isEmpty(variants)) {
      const objPromises = variants.map(async variantPK => {
        // Create variantScore object
        let variantScore = {
          'item_type': 'variantScore',
          'variantScored': variantPK,
          'submitted_by': lodashGet(auth, "PK", null),
          'modified_by': lodashGet(auth, "PK", null),
          'evidenceType': 'individual',
          'evidenceScored': null,
          'variantType': null,
          'isDeNovo': null,
          'functionalDataSupport': null,
          'functionalDataExplanation': null,
          'scoreStatus': 'none',
          'calculatedScore': null,
          'score': null,
          'scoreExplanation': null,
        };

        if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
          variantScore.affiliation = auth.currentAffiliation.affiliation_id;
        }

        const url = "/variantscore";
        return requestRecycler.capture(await API.post(API_NAME, url, { body: { variantScore } }))
      });
      return Promise.all(objPromises);
    } else {
      return Promise.resolve(null);
    }
  };

  // For SOP8 - same codes as in IndividualCuration
  // Called to update individual data to variantScore obj
  const updateVariantScoresWithIndividual = (individualObj) => {
    if (individualObj.variantScores && !isEmpty(individualObj.variantScores)) {
      const objPromises = individualObj.variantScores.map(async obj => {
        // Update variantScore object if it has no evidenceScored PK
        if (!obj.evidenceScored) {
          let newVariantScore = cloneDeep(obj);
          newVariantScore.evidenceScored = individualObj.PK;
          const url = `/variantscore/${newVariantScore.PK}`;
          return await requestRecycler.capture(API.put(API_NAME, url, { body: { newVariantScore } }));
        }
      });
      return Promise.all(objPromises);
    } else {
      return Promise.resolve(null);
    }
  };


  /**
   * Make a starter individual from the family and write it to the DB; always called from
   * family curation. Pass an array of disease objects to add, as well as an array of variants.
   * Returns a promise once the Individual object is written.
   * @param {object} variants
   * @param {string} probandIs - Value of "The proband is" form field (expected to be null for none/"No Selection")
  **/
  const createProbandIndividual = (variantScores, probandIs) => {
    const zygosity = formData["recessiveZygosity"];
    const affiliationId = lodashGet(auth, "currentAffiliation.affiliation_id", null);
    let newIndividual = {};
    newIndividual.item_type = "individual";
    if (affiliationId) newIndividual.affiliation = affiliationId;
    newIndividual.submitted_by = lodashGet(auth, "PK", null);
    newIndividual.modified_by = lodashGet(auth, "PK", null);
    newIndividual.label = formData["individualName"];
    newIndividual.diagnosis = [probandDiseaseObj];
    newIndividual.proband = true;
    if (zygosity) newIndividual.recessiveZygosity = zygosity;
    if (probandIs) newIndividual.probandIs = probandIs;
    const newMethod = {dateTime: moment().format()};
    newIndividual.method = newMethod;

    // SOP8 - change from variant to variantScore objects
    if (variantScores && variantCount > 0) {
      newIndividual.variantScores = variantScores;
    }
    const postRequestArgs = [
      API_NAME,
      "/individuals",
      { body: { newIndividual } }
    ];
    return (requestRecycler.capture(API.post(...postRequestArgs)));
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

  // Save a family object to the DB.
  const saveFamily = async (newFamily) => {
    let familyResult;
    const isNew = newFamily.PK ? false : true;
    // Either update or create the family object in the DB
    const postOrPutRequestArgs = [
      API_NAME,
      isNew
      ? "/families"
      : `/families/${newFamily.PK}`,
      { body: { newFamily } }
    ];

    try {
      familyResult = await (isNew
      ? requestRecycler.capture(API.post(...postOrPutRequestArgs))
      : requestRecycler.capture(API.put(...postOrPutRequestArgs)));
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      throw new Error(
        "Failed to update or create new family"
      );
    }

    if (!familyResult || !familyResult.PK) {
      console.log("no familyResult");
      throw new Error("Empty response from server when saving family");
    } else {
      console.log(familyResult.PK);
    }

    // If adding new family
    if (isNew) {
      // Part of a group so add family to group
      if (associatedGroup) {
        let groupResult = null;
        const updateGroup = {
          ...associatedGroup,
          associatedParent: associatedGroup.associatedParent || annotation.PK,
          familyIncluded: [...(associatedGroup.familyIncluded || []), familyResult.PK],
          modified_by: lodashGet(auth, "PK", null),
        };
        // PUT group
        try {
          groupResult = await requestRecycler.capture(
            API.put(API_NAME, `/groups/${group.PK}`, { body: { updateGroup } })
          );
        } catch (error) {
          alert(`Failed to append family to group but family ${familyResult.PK} already created in db`);
          throw new Error(
            `Failed to append family to group but family ${familyResult.PK} already created in db`
          );
        }
        if (!groupResult ||
          !Array.isArray(groupResult.familyIncluded) ||
          groupResult.familyIncluded.length !== updateGroup.familyIncluded.length) {
          throw new Error("Empty response from server when updating group");
        } else {
          // successfully added family to group, update group in annotation
          await updateAnnotationObject();
        }
      } else {
        // Not part of a group, add family to annonation
        let annotationResult = null;
        const updateAnnotation = {
          ...annotation,
          families: [...(annotation.families || []), familyResult.PK],
          modified_by: lodashGet(auth, "PK", null),
        };
        // PUT annotation
        try {
          annotationResult = await requestRecycler.capture(
            API.put(API_NAME, `/annotations/${annotation.PK}`, { body: { updateAnnotation } })
          );
        } catch (error) {
          throw new Error(
            "Failed to append annotation to GDM"
          );
        }
        if (!annotationResult ||
          !Array.isArray(annotationResult.families) ||
          annotationResult.families.length !== updateAnnotation.families.length) {
          throw new Error("Empty response from server when updating annotation");
        } else {
          // update redux for annotations
          dispatch(updateAnnotationAction(annotationResult));
        }
      }
    } else {
      // Edit existing family so no need to PUT annotation or group,
      // but need to sync redux annotation/group, which embeds family objects
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

    return (familyResult);
  };

  const updateIndividiualWithFamily = async (savedIndividual, savedFamily) => {
    if (savedIndividual && savedIndividual.PK) {
      let individualResult = null;
      const updateIndividual = {
        ...savedIndividual,
        associatedParentType: 'family',
        associatedParent: savedFamily.PK,
      };
      // PUT individual
      try {
        individualResult = await requestRecycler.capture(
          API.put(API_NAME, `/individuals/${savedIndividual.PK}`, { body: { updateIndividual } })
        );
      } catch (error) {
        throw new Error(
          `Failed to add associatedParent to individual but individual ${individualResult.PK} already created in db`
        );
      }
      return Promise.resolve(individualResult);
    } else {
      return Promise.resolve(null);
    }
  };

  const submitForm = async (e) => {
    e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
    setIsSubmitting(true);
    
    let savedIndividual = null;
    let savedFamily = null;
    let hadVar = false;
    if (family) {
      if (family.segregation && family.segregation.variants && family.segregation.variants.length) {
        // The family being edited had variants; remember that for passing a query string var to family-submit
        hadVar = true;
      }
    }

    /*****************************************/
    /* Need to capture zygosity data and     */
    /* pass into the individual object       */
    /*****************************************/
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    const autoRec = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Autosomal recessive') > -1 : false;
    const noProbandIs = formSegData["SEGprobandIs"] === "none";
    const biallelicHetOrHom = formSegData["SEGprobandIs"].indexOf('Biallelic') > -1 ? true : false;
    const biallelicHomozygous = formSegData["SEGprobandIs"].indexOf('Biallelic homozygous') > -1 ? true : false;
    let maxVariants = 2;
    if (semiDom) {
      if (noProbandIs) {
        maxVariants = 0;
      } else {
        if (biallelicHetOrHom) {
          if (biallelicHomozygous) {
            maxVariants = 1;
          } else {
            maxVariants = isTwoTrans ? 2 : (isHomozygous ? 1 : 0);
          }
        }
      }
    }
    if (autoRec) {
      maxVariants = isTwoTrans ? 2 : (isHomozygous ? 1 : 0);
    }

    const familyVariants = getFamilyVariants(maxVariants);
    let probandIs = null;

    // Retrieve value of "The proband is" form field (should only be available when GDM has Semidominant MOI)
    if (semiDom) {
      if (formSegData["SEGprobandIs"] !== 'none') {
        probandIs = formSegData["SEGprobandIs"];
      }
    }

    if (!badPmids.length && validateFormFields()) {
      validatePmids().then(res => {
        // If adding a family proband individual
        if (!probandIndividual && individualRequired && formData["individualName"] && !isEmpty(probandDiseaseObj)) {
          // Save variantScore objects to DB
          return saveVariantScores(familyVariants).then(savedVariantScores => {
            // Create an empty proband individual and save to DB
            return createProbandIndividual(savedVariantScores, probandIs);
          }).then(individualResult => {
            // Update variantScore objects to associated individual object
            savedIndividual = individualResult;
            return updateVariantScoresWithIndividual(savedIndividual);
          }).then(results => {
            // Return created proband individual object
            return Promise.resolve(savedIndividual);
          }).catch(err => {
            return Promise.reject(err);
          });
        } else {
          // Not adding a family proband individual
          return Promise.resolve(null);
        }
      }).then(result => {
        // assessments - keep existing assessments as is

        // Make a new family object based on form fields.
        let newFamily = createFamily();

        // If a new proband individual has been added, assign to family
        if (savedIndividual && !probandIndividual) {
          if (!newFamily.individualIncluded) {
            newFamily.individualIncluded = [];
          }
          newFamily.individualIncluded.push(savedIndividual.PK);
        }

        // Save new family to DB and update related objects
        return saveFamily(newFamily);
      }).then(familyObj => {
        savedFamily = familyObj;
        // SOP8 - Update associatedParent in individual object with associated family 
        updateIndividiualWithFamily(savedIndividual, savedFamily).then(result => {
          // Navigate to Curation Central or Family Submit page, depending on previous page
          const redirectUrl = savedFamily && savedFamily.PK
            ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/family-curation/${savedFamily.PK}/submit` + (hadVar ? '?hadvar' : '') + (group ? (hadVar ? '&' : '?') : '') + (group ? `parentTypeCuration=group-curation&parentEvidencePK=${group.PK}` : '')
            : `/curation-central/${gdm.PK}/annotation/${annotation.PK}`;
          setIsSubmitting(false);
          history.push(redirectUrl);
        }).catch(error => {
          if (API.isCancel(error)) {
            setIsSubmitting(false);
            return;
          }
          //throw new Error
          handleSubmitError("Error in adding/updating family object", error);
        });
      }).catch(err => {
        console.log('validatePmids : %o', err);
        setIsSubmitting(false);
      });
    } else {
      setIsSubmitting(false);
    }
  };

  const clearErrorInParent = (target) => {
    if (target === 'family') {
      setDiseaseError(null);
    } else if (target === 'familyProband') {
      setProbandDiseaseError(null);
    }
  };

  const updateMethodsFormData = (newFormData) => {
    if (lodashGet(newFormData, "genotypingmethod1", null)) {
      setGenotyping2Disabled(newFormData.genotypingmethod1 === "none" ? true : false);
    }
    setFormData(newFormData);
  };

  // Update the Variant ID fields upon interaction with the Add Variant modal
  // const addVariant = (data, fieldNum) => {
  const updateVariantInfo = (data, fieldNum) => {
    let newVariantInfo = cloneDeep(variantInfo);
    let count = variantCount;
    if (data) {
      // Update the form and display values with new data
      newVariantInfo[fieldNum] = {
        'clinvarVariantId': data.clinvarVariantId ? data.clinvarVariantId : null,
        'clinvarVariantTitle': data.clinvarVariantTitle ? data.clinvarVariantTitle : null,
        'carId': data.carId ? data.carId : null,
        'canonicalTranscriptTitle': data.canonicalTranscriptTitle ? data.canonicalTranscriptTitle : null,
        'maneTranscriptTitle': data.maneTranscriptTitle ? data.maneTranscriptTitle : null,
        'hgvsNames': data.hgvsNames ? data.hgvsNames : null,
        'preferredTitle' : data.preferredTitle ? data.preferredTitle : null,
        'PK': data.PK
      };
      count++;
    } else {
      // Reset the form and display values
      newVariantInfo.splice(fieldNum, 1);
      newVariantInfo = newVariantInfo.filter(e => e !== undefined && e !== null);
      count--;
    }

    // if variant data entered, must enter proband individual name and disease
    // First check if data entered in either ClinVar Variant ID or Other description at each variant
    // If not entered at all, proband individua is not required and must be no error messages at individual fields.
    if (count === 0 && formData['individualName']) {
      if (formData['individualName'] || (probandDiseaseObj && probandDiseaseObj['PK'])) {
        setIndividualRequired(true);
      } else {
        setIndividualRequired(false);
      }
      clearFieldError('individualName');
    } else {
      setIndividualRequired(true);
    }

    setVariantCount(count);
    setVariantInfo(newVariantInfo);
    setProbandDiseaseError(null);
    clearFieldError('zygosityHemizygous');
    clearFieldError('zygosityHomozygous');
  };

  const handleDeleteVariant = (e) => {
    e.preventDefault(); e.stopPropagation();
    const index = (e.target.name).substring(14);
    updateVariantInfo(null, index);
  };

  // ??? should not displayNote any more
  const renderFamilyName = (displayNote) => {
    return (
      <>
      {!family && !group ?
          <Col sm={{ span: 7, offset: 5 }}>
            <p className="alert alert-warning">If this Family is a member of a Group, please curate the Group first and then add the Family to that Group.</p>
          </Col>
      : null}
      <Input type="text" name="familyname" required maxLength="60" groupClassName="row mb-3"
        value={formData["familyname"]} onChange={handleChange} error={formErrors["familyname"] || null}
        label="Family Label:" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"  
      />
      <Col sm={{ span: 7, offset: 5 }}>
        <p className="mt-3">{renderLabelNote('Family')}</p>
      </Col>
      {displayNote ?
          <Col sm={{ span: 7, offset: 5 }}>
            <p>Note: If there is more than one family with IDENTICAL information, you can indicate this at the bottom of this form.</p>
          </Col>
      : null}
      </>
    );
  };

  const renderFamilyCommonDiseases = () => {
    // If we're editing a family, make editable values of the complex properties
    // Make a list of diseases from the group, either from the given group,
    // or the family if we're editing one that has associated groups.renderPhenotype

    return (
      <>
      {group && group.commonDiagnosis && group.commonDiagnosis.length ? renderDiseaseList([group], 'Group') : null}
      <FamilyDisease
        gdm={gdm}
        group={group}
        diseaseObj={diseaseObj}
        updateDiseaseObj={updateDiseaseObj}
        clearErrorInParent={clearErrorInParent}
        error={diseaseError}
      />
      {group && ((group.hpoIdInDiagnosis && group.hpoIdInDiagnosis.length) || group.termsInDiagnosis) 
        ? renderPhenotype([group], 'Family', 'hpo', 'Group')
        : renderPhenotype(null, 'Family', 'hpo')
      }
      <Row className="mb-3">
        <Col sm="5" className="control-label">
          <span>
            <label>Phenotype(s) in Common&nbsp;</label>
            <span className="normal">(<ExternalLink href={EXTERNAL_API_MAP['HPOBrowser']} title="Open HPO Browser in a new tab">HPO</ExternalLink> ID(s))</span>:
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
      {group && ((group.hpoIdInDiagnosis && group.hpoIdInDiagnosis.length) || group.termsInDiagnosis)
        ? renderPhenotype([group], 'Family', 'ft', 'Group')
        : renderPhenotype(null, 'Family', 'ft')
      }
      <Input type="textarea" name="phenoterms" groupClassName="row mb-3" rows="2"
        value={formData["phenoterms"]} onChange={handleChange} error={formErrors["phenoterms"] || null}
        label={renderLabelPhenoTerms(false)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      />
      {group && ((group.hpoIdInDiagnosis && group.hpoIdInDiagnosis.length) || group.termsInDiagnosis) ?
        <Col sm={{ span: 7, offset: 5 }}> 
          <Button className="gdm-orphanet-copy btn-copy btn-last" onClick={e=>handleCopyGroupPhenotypes(e)} >Copy all Phenotype(s) from Associated Group</Button>
        </Col>
      : null}
      <Col sm={{ span: 7, offset: 5 }}> 
        <p>Enter <em>phenotypes that are NOT present in Family</em> if they are specifically noted in the paper.</p>
      </Col>
      {group && ((group.hpoIdInElimination && group.hpoIdInElimination.length) || group.termsInElimination)
        ? renderPhenotype([group], 'Family', 'nothpo', 'Group')
      : null}
      <Row className="mb-3">
        <Col sm="5" className="control-label">
          <span>
            <label className="">NOT Phenotype(s)&nbsp;</label>
            <span className="normal">(<ExternalLink href={EXTERNAL_API_MAP['HPOBrowser']} title="Open HPO Browser in a new tab">HPO</ExternalLink> ID(s))</span>:
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
      {group && ((group.hpoIdInElimination && group.hpoIdInElimination.length) || group.termsInElimination) ?
        renderPhenotype([group], 'Family', 'notft', 'Group') : null}
      <Input type="textarea" name="notphenoterms" groupClassName="row mb-3" rows="2"
        value={formData["notphenoterms"]} onChange={handleChange} error={formErrors["notphenoterms"] || null}
        label={renderLabelPhenoTerms(true)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      />
      {group && ((group.hpoIdInElimination && group.hpoIdInElimination.length) || group.termsInElimination) ?
        <Col sm={{ span: 7, offset: 5 }}> 
            <Button className="gdm-orphanet-copy btn-copy btn-last" onClick={e=>handleCopyGroupNotPhenotypes(e)} >Copy all NOT Phenotype(s) from Associated Group</Button>
        </Col>
      : null}
      </>
    );
  };

  const renderFamilyDemographics = () => {
    let hasGroupDemographics = false;

    // Check if associated group has any demographics data
    if (group && (group.countryOfOrigin || group.ethnicity || group.race)) {
      hasGroupDemographics = true;
    }

    return (
      <>
        {hasGroupDemographics ?
          <Col sm={{ span: 7, offset: 5 }}> 
            <Button className="gdm-demographics-copy btn-copy btn-last" onClick={e=>handleCopyGroupDemographics(e)} >Copy Demographics from Associated Group</Button>
          </Col>
        : null}
        {hasGroupDemographics ? renderParentEvidence('Country of Origin Associated with Group:', group.countryOfOrigin) : null}
        <Input type="select" name="country" label="Country of Origin:" groupClassName="row mb-3"
          value={formData['country']} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          {COUNTRY_CODES.map((countryCode) => {
            return <option key={countryCode.code} value={countryCode.name}>{countryCode.name}</option>;
          })}
        </Input>
        {hasGroupDemographics ? renderParentEvidence('Ethnicity Associated with Group:', group.ethnicity) : null}
        <Input type="select" name="ethnicity" label="Ethnicity:" groupClassName="row mb-3"
          value={formData['ethnicity']} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Hispanic or Latino">Hispanic or Latino</option>
          <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
          <option value="Unknown">Unknown</option>
        </Input>
        {hasGroupDemographics ? renderParentEvidence('Race Associated with Group:', group.race) : null}
        <Input type="select" name="race" label="Race:" groupClassName="row mb-3"
          value={formData['race']} onChange={handleChange}
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
      </>
    );
  };

  const renderMethods = () => {
    return (
      <MethodsPanel
        formData={formData}
        genotyping2Disabled={genotyping2Disabled}
        handleChange={handleChange}
        updateMethodsFormData={updateMethodsFormData}
        method={family && family.method ? family.method : null}
        evidenceType="family"
        prefix=""
        parentMethod={group && group.method ? group.method : null}
        parentName="Group"
      />
    ); 
  };

  const renderFamilySegregation = () => {
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    let isADX = false;
    let isAR = false;
    let lodReqNone, lodReqADX, lodReqAR;
    const lodRequirements = formSegData.SEGlodRequirements;

    // Creates boolean values for conditional disabling of inputs
    const lodPublished = semiDom && formSegData.SEGlodPublished === 'Yes';
    if (semiDom) {
      if (formSegData.SEGmoiDisplayedForFamily === 'Autosomal dominant/X-linked') {
        isADX = true;
      } else if (formSegData.SEGmoiDisplayedForFamily === 'Autosomal recessive') {
        isAR = true;
      } else if (formSegData.SEGmoiDisplayedForFamily === 'Semidominant') {
        if (lodRequirements === 'Yes - autosomal dominant/X-linked') {
          lodReqADX = true;
        } else if (lodRequirements === 'Yes - autosomal recessive') {
          lodReqAR = true;
        } else {
          lodReqNone = true;
          lodReqADX = false;
          lodReqAR = false;
        }
      }
    }

    return (
      <>
      <div className="mb-3 section section-family-segregation">
        <h3><FontAwesomeIcon icon={faChevronRight}/> Tested Individuals</h3>
      </div>
      {semiDom ?
        <>
        <Input type="select" name="SEGlodPublished" label="Published LOD score?:" groupClassName="row mb-3"
          value={formSegData['SEGlodPublished']} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Input>
        <Input type="select" name="SEGmoiDisplayedForFamily"
          label="Which mode of inheritance does this family display?:" groupClassName="row mb-3"
          value={formSegData['SEGmoiDisplayedForFamily']} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Autosomal dominant/X-linked">Autosomal dominant/X-linked</option>
          <option value="Autosomal recessive">Autosomal recessive</option>
          <option value="Semidominant">Semidominant</option>
        </Input>
        {formSegData.SEGlodPublished === 'No' && isSemidominant ? 
          <Input type="select" name="SEGlodRequirements"
            label="Does the family meet requirements for estimating LOD score for EITHER autosomal dominant/X-linked or autosomal recessive?:"
            groupClassName="row mb-3" value={formSegData['SEGlodRequirements']} onChange={handleChange}
            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
          >
            <option value="none">No Selection</option>
            <option disabled="disabled"></option>
            <option value="Yes - autosomal dominant/X-linked">Yes - autosomal dominant/X-linked</option>
            <option value="Yes - autosomal recessive">Yes - autosomal recessive</option>
            <option value="No">No</option>
          </Input>
        : null}
        </>
      : null}
      <Input type="number" name="SEGnumberOfAffectedWithGenotype" groupClassName="row mb-3"
        disabled={lodReqNone || lodPublished} required={!lodPublished && !isSemidominant}
        label={<span>For Dominant AND Recessive inheritance:<br/>Number of AFFECTED individuals <i>WITH</i> genotype?</span>}
        value={formSegData["SEGnumberOfAffectedWithGenotype"]}
        onChange={handleChange} error={formErrors["SEGnumberOfAffectedWithGenotype"] || null}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        placeholder="Number only"/>
      <Input type="number" name="SEGnumberOfUnaffectedWithoutBiallelicGenotype"
        disabled={lodPublished || isADX || lodReqNone || (isSemidominant && lodReqADX)}
        label={<span>For Recessive inheritance only:<br/>Number of UNAFFECTED individuals <i>WITHOUT</i> the biallelic genotype? (required for Recessive inheritance)</span>}
        value={formSegData["SEGnumberOfUnaffectedWithoutBiallelicGenotype"]}
        onChange={handleChange} error={formErrors['SEGnumberOfUnaffectedWithoutBiallelicGenotype']}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
        placeholder="Number only" />
      <Input type="number" name="SEGnumberOfSegregationsForThisFamily"
        disabled={lodPublished || isAR || lodReqNone || (isSemidominant && lodReqAR)}
        label={<span>Number of segregations reported for this Family:<br/>(required for calculating an estimated LOD score for Dominant or X-linked inheritance)</span>}
        value={formSegData['SEGnumberOfSegregationsForThisFamily']}
        onChange={handleChange} error={formErrors['SEGnumberOfSegregationsForThisFamily']}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
        placeholder="Number only" />
      <Input type="select" name="SEGinconsistentSegregationAmongstTestedIndividuals"
        label={<span>Were there any inconsistent segregations amongst TESTED individuals? <i>(i.e. affected individuals WITHOUT the genotype or unaffected individuals WITH the genotype?)</i></span>}
        value={formSegData['SEGinconsistentSegregationAmongstTestedIndividuals']}
        onChange={handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
      </Input>
      <Input type="textarea" name="SEGexplanationForInconsistent"
        label={<span>please provide explanation:<br/><i>(optional)</i></span>} rows="5"
        value={formSegData['SEGexplanationForInconsistent']}
        onChange={handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" />
      <Input type="select" name="SEGfamilyConsanguineous"
        label="Is this family consanguineous?:"
        value={formSegData['SEGfamilyConsanguineous']}
        onChange={handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3">
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
        <option value="Not Specified">Not Specified</option>
      </Input>
      <Input type="textarea" name="SEGpedigreeLocation"
        label="If pedigree provided in publication, please indicate location:" rows="3"
        value={formSegData['SEGpedigreeLocation']} onChange={handleChange}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
        placeholder="e.g. Figure 3A" />
      <div className="mb-3 section section-family-segregation">
        <h3><FontAwesomeIcon icon={faChevronRight}/> LOD Score (select one to include as score):</h3>
      </div>
      {!semiDom ? 
        <Input type="select" name="SEGlodPublished" label="Published LOD score?:"
          value={formSegData['SEGlodPublished']}
          onChange={handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Input>
      : null}
      {formSegData['SEGlodPublished'] === 'Yes' ?
        <Input type="number" name="SEGpublishedLodScore" label="Published Calculated LOD score:"
          value={formSegData['SEGpublishedLodScore']}
          onChange={handleChange} error={formErrors['SEGpublishedLodScore']}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" placeholder="Number only" />
      : null}
      {formSegData['SEGlodPublished'] === 'No' ?
        <Input type="number" name="SEGestimatedLodScore"
          label={<span>Estimated LOD score:<br/><i>(optional, and only if no published LOD score)</i></span>}
          disabled={lodLocked} value={formSegData['SEGestimatedLodScore']}
          onChange={handleChange} error={formErrors['SEGestimatedLodScore']}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
          placeholder={lodLocked && !formSegData['SEGestimatedLodScore'] ? "Not enough information entered to calculate an estimated LOD score" : "Number only"} />
      : null}
      <Input type="select" name="SEGincludeLodScoreInAggregateCalculation"
        label="Include LOD score in final aggregate calculation?"
        value={formSegData['SEGincludeLodScoreInAggregateCalculation']}
        disabled={(formSegData['SEGlodPublished'] === 'none') || (formSegData['SEGlodPublished'] === 'Yes' && !formSegData['SEGpublishedLodScore']) || (formSegData['SEGlodPublished'] === 'No' && !formSegData['SEGestimatedLodScore'])}
        onChange={handleChange}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
      </Input>
      <Col sm={{ span: 7, offset: 5 }} className="lod-score-inclusion-note">
        <p className="alert alert-warning">
          Note: For X-linked and autosomal dominant conditions, only include families with 4 or more segregations in the final calculation.
          For autosomal recessive conditions, only include families with at least 3 affected individuals. See the Gene Curation SOP for additional details.
        </p>
      </Col>
      {includeLodScore ?
        <Input type="select" name="SEGsequencingMethod" label="Sequencing Method: *"
          value={formSegData['SEGsequencingMethod']}
          onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
          error={formErrors['SEGsequencingMethod']}
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Candidate gene sequencing">Candidate gene sequencing</option>
          <option value="Exome/genome or all genes sequenced in linkage region">Exome/genome or all genes sequenced in linkage region</option>
        </Input>
      : null}
      <Input type="textarea" name="SEGreasonExplanation" label="Explain reasoning:" rows="5"
        value={formSegData['SEGreasonExplanation']}
        disabled={(isSemidominant === true && formSegData['SEGlodPublished'] === "Yes")}
        onChange={handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" />
      <Input type="textarea" name="SEGaddedsegregationinfo" label="Additional Segregation Information:" rows="5"
        value={formSegData['SEGaddedsegregationinfo']}
        disabled={(isSemidominant === true && formSegData['SEGlodPublished'] === "Yes")}
        onChange={handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" />
      </>
    );
  };

  const renderFamilyOldVariant = () => {
    const infoText = 'The variant(s) and score() shown in this table was added in a format that has now been retired...';
    const infoPopover = <Popover
      triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
      content={infoText}
      placement="top"
    />

    if (family && family.segregation && family.segregation.variants && family.segregation.variants.length > 0) {
      const show = probandIndividual && probandIndividual.variantScores && probandIndividual.variantScores.length ? false : true;

      return (
        <>
        <CardPanel title={<span>Previously added variant(s) - Retired Format - {infoPopover}</span>} accordion={true} open={show}>
          <RetiredVariantTable
            variants={family.segregation.variants}
            score={null}
          />
        </CardPanel>
        </>
      );
    } else { 
      return null;
    }
  };

  const renderFamilyVariant = () => {
    const isProband = lodashGet(probandIndividual, "proband", null) ? true : false;
    const diseaseName = diseaseObj && diseaseObj.term && !diseaseObj.freetext
      ? (diseaseObj.term + (diseaseObj.PK ? ` (${diseaseObj.PK})` : ''))
      : (diseaseObj.term ? diseaseObj.term : '');
    // SD, AR, AD, XL
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    const autoRec = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Autosomal recessive') > -1 : false;
    const noProbandIs = formSegData["SEGprobandIs"] === "none";
    const biallelicHetOrHom = formSegData["SEGprobandIs"].indexOf('Biallelic') > -1 ? true : false;
    const biallelicHomozygous = formSegData["SEGprobandIs"].indexOf('Biallelic homozygous') > -1 ? true : false;
    // SOP8 - cannot have 3 variants anymore
    let maxVariants = 2;
    if (semiDom) {
      if (noProbandIs) {
        maxVariants = 0;
      } else {
        if (biallelicHetOrHom) {
          if (biallelicHomozygous) {
            maxVariants = 1;
          } else {
            maxVariants = isTwoTrans ? 2 : (isHomozygous ? 1 : 0);
          }
        }
      }
    }
    if (autoRec) {
      maxVariants = isTwoTrans ? 2 : (isHomozygous ? 1 : 0);
    }

    return (
      <div>
        {!probandIndividual ?
          <>
          <Col sm={{ span: 7, offset: 5 }} className="mb-3">
            If you would like to score the proband for this family in addition to the LOD score for segregation, you need to create the Individual proband,
            including adding their associated variant(s). Please follow the steps below -- you will be able to add additional information about the proband
            following submission of Family information.<br/><br/>
            Note: Probands are indicated by the following icon: <i className="icon icon-proband"></i><br/>
          </Col>
          <div className="variant-panel">
            <Row className="mb-3">
            <Col sm={{ span: 7, offset: 5 }} className="proband-label-note">
              <div className="alert alert-warning">Once this Family page is saved, an option to score and add additional information about the proband (e.g. demographics, phenotypes) will appear.</div>
            </Col>
            </Row>
            <div>
              <Input type="text" name="individualName" label="Proband Label" value={formData['individualName']} onChange={handleChange}
                error={formErrors['individualName']} maxLength="60"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" required={individualRequired} />
              <Row className="mb-3"><Col sm={{ span: 7, offset: 5 }}>
                Note: Do not enter real names in this field. {renderLabelNote('Individual')}
              </Col></Row>
              <Row className="mb-3">
                <Col sm="5"><label className="control-label float-right">Disease term associated with Family:</label></Col>
                <Col sm="7"><strong>{diseaseName}</strong></Col>
              </Row>
              <FamilyProbandDisease gdm={gdm} group={group} family={family} updateFamilyProbandDiseaseObj={updateFamilyProbandDiseaseObj}
                probandDiseaseObj={probandDiseaseObj} error={probandDiseaseError} clearErrorInParent={clearErrorInParent}
                familyDiseaseObj={diseaseObj} required={individualRequired} />
              {probandDiseaseError ? 
                <Col sm={{ span: 7, offset: 5 }} className="form-error">
                  {probandDiseaseError}</Col>
              : null}
            </div>
            {semiDom ?
              <div>
                <Input type="select" label="The proband is:" name="SEGprobandIs" onChange={handleChange}
                  value={formSegData['SEGprobandIs']} error={formErrors['SEGprobandIs']}
                  labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" required={isProband || individualRequired}>
                  <option value="none">No Selection</option>
                  <option disabled="disabled"></option>
                  <option value="Monoallelic heterozygous">Monoallelic heterozygous (e.g. autosomal)</option>
                  <option value="Hemizygous">Hemizygous (e.g. X-linked)</option>
                  <option value="Biallelic homozygous">Biallelic homozygous (e.g. the same variant is present on both alleles, autosomal or X-linked)</option>
                  <option value="Biallelic compound heterozygous">Biallelic compound heterozygous (e.g. two different variants are present on the alleles, autosomal or X-linked)</option>
                </Input>
              </div>
              : null
            }

            {(variantAlert && variantAlert.message ?
              <Alert value={variantAlert.message} type={variantAlert.type} dismissible className="mt-3"/>
              : "")}

            {autoRec || (semiDom && biallelicHetOrHom) ?
              <>
              <Row className="mb-3">
                <Col sm="5" className="control-label">
                  <label><span>Check here if there are 2 variants AND they are both located in trans with respect to one another</span></label>
                </Col>
                <Col sm="1" className="mt-3">
                  <Input type="checkbox" name="zygosityTwoTrans"
                    error={formErrors['zygosityTwoTrans']}
                    onChange={handleChange} checked={isTwoTrans && isTwoTrans === true ? isTwoTrans : false}
                  />
                </Col>
                <Col sm="4" className="control-label">
                  <label><span>Check here if homozygous:<br /><i className="non-bold-font">(Note: if homozygous, enter only 1 variant below)</i></span></label>
                </Col>
                <Col sm="1" className="mt-3">
                  <Input type="checkbox" name="zygosityHomozygous"
                    error={formErrors['zygosityHomozygous']}
                    onChange={handleChange} checked={isHomozygous && isHomozygous === true ? isHomozygous : false}
                  />
                </Col>
              </Row>
              </>
              :
              <>
              {semiDom && noProbandIs
                ? null
                :
                  <Row className="mb-3">
                    <Col sm="5" className="control-label">
                      <label>Check here if hemizygous:</label>
                    </Col>
                    <Col sm="6" className="mt-2">
                      <Input type="checkbox" name="zygosityHemizygous"
                        error={formErrors['zygosityHemizygous']}
                        onChange={handleChange} checked={isHemizygous && isHemizygous === true ? isHemizygous : false}
                      />
                    </Col>
                  </Row>
              }
              </>
            }
          }
          {_.range(maxVariants).map(i => {
            return (
              <div key={i} className="variant-panel">
                {variantInfo[i] ?
                  <>
                  <VariantDisplay
                    variantObj={variantInfo[i]}
                  />
                  <Row className="mb-3">
                    <Col sm="5" className="control-label"><label>Clear Variant Selection:</label></Col>
                    <Col sm="7">
                      <Button name={"deleteVariant-" + i} className="clear-button outline-dark" onClick={e=>handleDeleteVariant(e)}>Clear</Button>
                    </Col>
                  </Row>
                  </>
                :
                  <Row className = "mb-3">
                    <Col sm="5" className="col-sm-5 control-label"><label>Add Variant:</label></Col>
                    <Col sm="7">
                      {!variantInfo[i] || (variantInfo[i] && variantInfo[i].clinvarVariantId) ?
                        <SelectVariantModal
                          auth={auth}
                          variantList={variantInfo}
                          updateParentObj={selectedVariant=>updateVariantInfo(selectedVariant, i)}
                        /> 
                      : null}
                    </Col>
                  </Row>
                }
              </div>
            );
          })}
          </div>
          </>
          :
            <>
            <Row className="mb-3 ml-3">The proband associated with this Family can be edited here:&nbsp;&nbsp;<Link to={`/curation-central/${gdm.PK}/annotation/${annotation.PK}/individual-curation/${probandIndividual.PK}/edit`}>Edit {probandIndividual.label}</Link></Row>
            {variantInfo && variantInfo.map((variantInfo, i) => {
              return (
                <div key={i} className="variant-panel">
                  {variantInfo ?
                    <>
                    <VariantDisplay
                      variantObj={variantInfo}
                    />
                    </>
                  : null}
                </div>
              );
            })}
            </>
        }
      </div>
    );
  };

  const renderFamilyAdditional = () => {
    return (
      <>
      <Input type="textarea" name="additionalinfofamily" label="Additional Information about Family:" rows="5"
        value={formData['additionalinfofamily']} onChange={handleChange}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" />
      <Input type="textarea" name="otherpmids" label="Enter PMID(s) that report evidence about this same family:"
        value={formData['otherpmids']} placeholder="e.g. 12089445, 21217753" rows="5"
        error={renderPmidsError()} onChange={handleChange}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" />
      </>
    );
  };

  const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
    : (lodashGet(gdm, "PK", null))
      ? `/curation-central/${gdm.PK}`
      : null;
  const viewGroupLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/group-curation/`
    : null;
  const submitErrClass = 'submit-err float-right' + (!isEmpty(formErrors) || badPmids.length > 0 ? '' : ' hidden');

  return (gdmIsLoading || annotationIsLoading || dataIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : (
    <>
    <div className="viewer-titles">
      <h1>{(family ? 'Edit' : 'Curate') + ' Family Information'}</h1>
      <h2>
        { curationLink ? <Link to={curationLink}><FontAwesomeIcon icon={faBriefcase}/></Link> : null }
        {group ?
          <span> &#x2F;&#x2F; Group <span key={group.PK}><Link to={`${viewGroupLink}${group.PK}/view`}>{group.label}</Link></span></span>
        : null}
        <span> &#x2F;&#x2F; {formData['familyname'] ? <span>Family {formData['familyname']}</span> : <span className="no-entry">No entry</span>}</span>
      </h2>
    </div>
    <Row className="group-curation-content">
      <Col sm="12">
        <form onSubmit={submitForm} className="form-horizontal mt-5 curation-panel">
          <CardPanel>
            {renderFamilyName(false)}
          </CardPanel>
          <CardPanel title="Family – Disease(s) & Phenotype(s)">
            {renderFamilyCommonDiseases()}
          </CardPanel>
          <CardPanel title="Family — Demographics">
            {renderFamilyDemographics()}
          </CardPanel>
          <CardPanel title="Family — Methods">
            {renderMethods()}
          </CardPanel>
          <CardPanel title="Family — Segregation">
            {renderFamilySegregation()}
          </CardPanel>
          <CardPanel title="Family — Variant(s) Segregating with Proband">
            {renderFamilyOldVariant()}
            {renderFamilyVariant()}
          </CardPanel>
          <CardPanel title="Family Additional Information">
            {renderFamilyAdditional()}
          </CardPanel>
          <Row>
            <Col>
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
              {family ?
                <DeleteCurationModal
                  gdm={gdm}
                  parent={group ? group : annotation}
                  item={family}
                  disabled={isSubmitting}
                />
              : null}
              <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
              <div className="submit-error float-right">{submitError ? submitError : null}</div>
            </Col>
          </Row>
        </form>
      </Col>
    </Row>
    </>
  );
};
