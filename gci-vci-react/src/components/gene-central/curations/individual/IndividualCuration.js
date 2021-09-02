import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import  _ from "lodash";
import { cloneDeep, isEmpty, get as lodashGet, has as lodashHas } from "lodash";
import { useHistory, Link } from "react-router-dom";
import { Row, Col, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../../../utils';
import { setGdmAction } from "../../../../actions/gdmActions";
import { updateAnnotationAction } from "../../../../actions/annotationActions";
import CardPanel from "../../../common/CardPanel";
import Input from "../../../common/Input";
import { LoadingButton } from "../../../common/LoadingButton";
import Popover from "../../../common/Popover";
import { COUNTRY_CODES } from '../../../../constants/countryCodes';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import LoadingSpinner from '../../../common/LoadingSpinner';
import Alert from '../../../common/Alert';
import { renderLabelNote, renderDiseaseList, renderPhenotype, renderLabelPhenoTerms, renderParentEvidence, LabelVariantTitle, LabelClinVarVariant, LabelCARVariant, getPmidsFromList } from '../common/commonFunc';
import { HpoTermModal } from '../common/HpoTermModal';
import { MethodsPanel, createMethod } from '../common/Methods';
import { DeleteCurationModal } from '../common/DeleteCurationModal';
import { VariantDisplay } from '../common/VariantDisplay';
import { SelectVariantModal } from '../common/SelectVariantModal';
import { RetiredVariantTable } from '../common/RetiredVariantTable';
import { IndividualDisease } from '../disease/IndividualDisease';
import { getUserScore } from '../../score/helpers/getUserScore';
import { getUserAffiliatedScore } from '../../score/helpers/getUserAffiliatedScore';
import { IndividualVariantScore } from './IndividualVariantScore';
import { IndividualScoresTable } from './IndividualScoresTable';
// ??? import { VariantEvidencesModal } from '../common/VariantEvidencesModal';

import { gdmParticipantReducer } from '../../../../utilities/gdmUtilities';
import { getEvidenceByPKFromActiveAnnotation } from "../../../../utilities/gdmEvidenceUtilities";
import { useAmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';

export const IndividualCuration = ({
  associatedGroup = null,
  associatedFamily = null,
  editIndividual = null,
}) => {

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
  });
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);

  const auth = useSelector((state) => state.auth);

  // If adding a new individual to a group, group is set to associatedGroup that is adding to
  // If editing an individual, group is set to individual.associatedGroups[0] if exists
  const [ group, setGroup ] = useState(associatedGroup);
  // If adding a new individual to a family, family is set to associatedFamily that is adding to
  // If editing an individual, family is set to individual.associatedFamilies[0] if exists
  const [ family, setFamily ] = useState(associatedFamily);
  // If individual's associated family has associated group, set this
  const [ familyAssociatedGroup, setFamilyAssociatedGroup ] = useState(null);
  const [ individual, setIndividual ] = useState(editIndividual);

  const [ dataIsLoading, setDataIsLoading] = useState({});

  const [ formData, setFormData ] = useState({});
  const [ formErrors, setFormErrors ] = useState({});
  const [ variantAlert, setVariantAlert ] = useState({});

  const [ variantCount, setVariantCount ] = useState(0);
  const [ variantInfo, setVariantInfo ] = useState([]); // Set to editIndividual.variants
  const [ variantScores, setVariantScores ] = useState([]); // Set to editIndividual.variantScores
  const [ genotyping2Disabled, setGenotyping2Disabled ] = useState(true);
  const [ isTwoTrans, setIsTwoTrans ] = useState(false);
  const [ isHomozygous, setIsHomozygous ] = useState(false);
  const [ isHemizygous, setIsHemizygous ] = useState(false);
  const [ probandSelected, setProbandSelected ] = useState(false);

  const [ hpoWithTerms, setHpoWithTerms ] = useState([]);
  const [ hpoElimWithTerms, setHpoElimWithTerms ] = useState([]);

  const [ diseaseObj, setDiseaseObj ] = useState({});
  const [ diseaseError, setDiseaseError ] = useState(null);

  const [ badPmids, setBadPmids ] = useState([]);
  const [ scoreErrors, setScoreErrors ] = useState([]);

  const [ isSubmitting, setIsSubmitting ] = useState(false);
  const [ submitError, setSubmitError ] = useState(null);

  useEffect(() => {
    setIndividual(editIndividual);
    setFamily(associatedFamily);
    setGroup(associatedGroup);
    loadData();
  }, []);

  const loadData = () => {
    let data = {};
    setDataIsLoading(true);

    // SOP8 - new data has associatedParentType and associatedParent but not being used yet
    // If editing an individual and has associatedGroups or associatedFamilies, retrieve the object
    if (individual && individual.associatedGroups && individual.associatedGroups.length > 0) {
      setGroup(
        getEvidenceByPKFromActiveAnnotation(annotations, individual.associatedGroups[0])
      );
    }
    let indivAssociatedFamily = associatedFamily;
    if (individual && individual.associatedFamilies && individual.associatedFamilies.length > 0) {
      indivAssociatedFamily = getEvidenceByPKFromActiveAnnotation(annotations, individual.associatedFamilies[0]);
      setFamily(indivAssociatedFamily);
    }
    // If this associated family has associated group, retrieve it too
    if (lodashGet(indivAssociatedFamily, "associatedGroups", null) && indivAssociatedFamily.associatedGroups.length > 0) {
      setFamilyAssociatedGroup(getEvidenceByPKFromActiveAnnotation(annotations, indivAssociatedFamily.associatedGroups[0]));
    }

    // Individual label, Proband individual
    data["individualname"] = individual && individual.label ? individual.label : "";
    // So if editing individual and no proband, assume selection is "No"
    data["proband"] = individual && individual.proband === true ? "Yes"
      : (individual && individual.proband === false ? "No" : "none");
    setProbandSelected(data["proband"] === 'Yes' ? true : false);

    // Diseases & Phenotypes
    if (individual && individual.diagnosis && individual.diagnosis.length > 0) {
      setDiseaseObj(individual['diagnosis'][0]);
    }
    if (individual && individual['hpoIdInDiagnosis'] && individual['hpoIdInDiagnosis'].length > 0) {
      setHpoWithTerms(individual['hpoIdInDiagnosis']);
    }
    data["phenoterms"] = individual && individual.termsInDiagnosis ? individual.termsInDiagnosis : '';
    if (individual && individual['hpoIdInElimination'] && individual['hpoIdInElimination'].length > 0) {
      setHpoElimWithTerms(individual['hpoIdInElimination']);
    }
    data["notphenoterms"] = individual && individual.termsInElimination ? individual.termsInElimination : '';

    // Demographics
    data["sex"] = individual && individual.sex ? individual.sex : 'none';
    data["country"] = individual && individual.countryOfOrigin ? individual.countryOfOrigin : 'none';
    data["ethnicity"] = individual && individual.ethnicity ? individual.ethnicity : 'none';
    data["race"] = individual && individual.race ? individual.race : 'none';
    data["agetype"] = individual && individual.ageType ? individual.ageType : 'none';
    data["agevalue"] = individual && individual.ageValue ? individual.ageValue : '';
    data["ageunit"] = individual && individual.ageUnit ? individual.ageUnit : 'none';

    // Methods
    /* no longer used
                "entireGeneSequenced": { "type": "boolean" },
                "copyNumberAssessed": { "type": "boolean" },
                "specificMutationsGenotyped": { "type": "boolean" },
                "specificMutationsGenotypedMethod": { "type": "string" },
    */
    data["prevtesting"] = individual && individual.method && individual.method.previousTesting === true
      ? "Yes"
      : (individual && individual.method && individual.method.previousTesting === false ? "No" : "none");
    data["prevtestingdesc"] = individual && individual.method && individual.method.previousTestingDescription ? individual.method.previousTestingDescription : '';
    data["genomewide"] = individual && individual.method && individual.method.genomeWideStudy === true
      ? "Yes"
      : (individual && individual.method && individual.method.genomeWideStudy === false ? "No" : "none");
    data["genotypingmethod1"] = individual && individual.method && individual.method.genotypingMethods && individual.method.genotypingMethods[0] ? individual.method.genotypingMethods[0] : "none";
    // data["genotypingmethod1"] = lodashGet(individual, "method.genotypingMethods", null)
    //  ? lodashGet(individual, "method.genotypingMethods[0]", "none") : "none";
    data["genotypingmethod2"] = individual && individual.method && individual.method.genotypingMethods && individual.method.genotypingMethods[1] ? individual.method.genotypingMethods[1] : "none";
    // Based on the loaded method data, see if the second genotyping method drop-down needs to be disabled.
    // Also see if we need to disable the Add Variant button
    setGenotyping2Disabled(!(individual && individual.method && individual.method.genotypingMethods && individual.method.genotypingMethods.length));
    data["specificmutation"] = individual && individual.method && individual.method.specificMutationsGenotypedMethod ? individual.method.specificMutationsGenotypedMethod : '';

    // Associated variants
    if (individual && individual.recessiveZygosity) {
      data["recessiveZygosity"] = individual.recessiveZygosity;
      if (data["recessiveZygosity"] === "TwoTrans") {
        setIsTwoTrans(true);
        setIsHomozygous(false);
        setIsHemizygous(false);
      } else {
        if (data["recessiveZygosity"] === "Homozygous") {
          setIsHomozygous(true);
          setIsTwoTrans(false);
          setIsHemizygous(false);
        } else {
          setIsHemizygous(true);
          setIsHomozygous(false);
          setIsTwoTrans(false);
        }
      }
    }
    // SOP8 - change to handle family proband individual in individual UI, no need to add/remove variant from family UI
    // If proband individual then use variantScores else use variants
    if (individual && individual.proband) {
      if (individual.variantScores && individual.variantScores.length) {
        // This individual is proband and has variantScores, add variantScores[]
        const variantScoresObj = cloneDeep(individual.variantScores);
        setVariantCount(variantScoresObj.length);
        setVariantScores(variantScoresObj);
      } else if (individual.variants && individual.variants.length) {
        // This individual is proband and has old variants, initialize variantScores to these variants
        // Force to select a recessiveZygosity value if none is selected
        if (individual && !individual.recessiveZygosity) {
          const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
          const autoRec = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Autosomal recessive') > -1 : false;
          if (semiDom || autoRec) {
            if (individual.variants.length === 2) {
              data["recessiveZygosity"] = "TwoTrans"
              setIsTwoTrans(true);
              setIsHomozygous(false);
              setIsHemizygous(false);
            } else if (individual.variants.length === 1) {
              data["recessiveZygosity"] = "Homozygous";
              setIsHomozygous(true);
              setIsTwoTrans(false);
              setIsHemizygous(false);
            }
          }
        }
        let newVariantScores = [];
        individual.variants.forEach(data => {
          newVariantScores.push(initializeVariantScore(data));
        });
        setVariantScores(newVariantScores);
      }
    } else if (individual && individual.proband === false && individual.variants && individual.variants.length > 0) {
      // This individual is not proband and has variants, add variantInfo[]
      // Go through each variant to determine and set its form fields
      const variants = individual.variants;
      let variantList = [];
      for (let i = 0; i < variants.length; i++) {
        if (variants[i].clinvarVariantId || variants[i].carId) {
          variantList[i] = initializeVariantInfo(variants[i]);
        }
      }
      setVariantCount(variantList.length);
      setVariantInfo(variantList);
    } else {
      // If adding new individual, initialize variant data
      setVariantCount(0);
      setVariantInfo([]);
      setVariantScores([]);
    }

    // For SemiDom, if probandIs is "Monoallelic heterozygous" or "Hemizygous" then treat as AUTOSOMAL_DOMINANT
    // if "Biallelic homozygous" or "Biallelic compound heterozygous" then treat as AUTOSOMAL_RECESSIVE
    data["probandIs"] = individual && individual.probandIs ? individual.probandIs : "none";

    // Additional Information
    data["additionalinfoindividual"] = individual && individual.additionalInformation ? individual.additionalInformation : '';
    data["otherpmids"] = individual && individual.otherPMIDs ? individual.otherPMIDs.map((article) => { return article; }).join(', ') : '';

    setFormData(data);
    setDataIsLoading(false);
  };

  const initializeVariantInfo = (variantData) => {
    const data = cloneDeep(variantData);
    return (
      {
        'showEdit': true,
        'clinvarVariantId': data.clinvarVariantId ? data.clinvarVariantId : null,
        'clinvarVariantTitle': data.clinvarVariantTitle ? data.clinvarVariantTitle : null,
        'preferredTitle': data.preferredTitle ? data.preferredTitle : null,
        'carId': data.carId ? data.carId : null,
        'canonicalTranscriptTitle': data.canonicalTranscriptTitle ? data.canonicalTranscriptTitle : null,
        'maneTranscriptTitle': data.maneTranscriptTitle ? data.maneTranscriptTitle : null,
        'hgvsNames': data.hgvsNames ? data.hgvsNames : null,
        'PK': data.PK,
        'associatedPathogenicities': data.associatedPathogenicities && data.associatedPathogenicities.length ? data.associatedPathogenicities : []
      }
    );
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
    const fieldName = e.target.name;
    const fieldValue = e.target.value;

    // Clear variant related alert
    setVariantAlert({});

    if (fieldName === 'proband' && fieldValue !== "Yes" && variantScores && variantCount > 0) {
      // user import { Alert as BootstrapAlert } from "react-bootstrap";
      alert("Please clear the variant(s) before changing individual to not proband.");
      setVariantAlert({
        type: "danger",
        message: 'Please clear the variant selection before changing individual to not proband.',
      });
    } else if (fieldName === 'probandIs' && fieldValue === "Biallelic homozygous" && variantScores && variantCount > 1) {
      // SOP8 - For semiDom, only one variantScore is allowed if probandIs set to "Biallelic homozygous"
      alert("Please clear one of the variant(s) before changing proband is to Biallelic homozygous");
      setVariantAlert({
        type: "danger",
        message: 'Please clear one of the variant selection before changing proband is to Biallelic homozygous.',
      });
    } else {
      let newData = cloneDeep(formData);
      newData[fieldName] = fieldValue;

      if (fieldName === 'proband') {
        setProbandSelected(fieldValue === 'Yes' ? true : false);
        setDiseaseError(null);
        // SOP8 - when individual becomes proband, tranfer variantInfo to variantScores
        if (fieldValue === 'Yes' && variantInfo && variantCount > 0) {
          let newVariantScores = [];
          variantInfo.forEach(data => {
            newVariantScores.push(initializeVariantScore(data));
          });
          setVariantScores(newVariantScores);
          setVariantInfo([]);
        }
        // SOP8 - when individual becomes not proband and has retired variants, tranfer variant to variantInfo
        if (fieldValue === 'No' && individual && individual.variants && individual.variants.length > 0) {
          let newVariantInfo = [];
          individual.variants.forEach(data => {
            newVariantInfo.push(initializeVariantInfo(data));
          });
          setVariantInfo(newVariantInfo);
        }
      }

      // SOP8 - For semiDom, if probandIs set to "Biallelic homozygous", force Homozygous to be checked
      if (fieldName === 'probandIs' && fieldValue === "Biallelic homozygous") {
        if (!isHomozygous) {
          newData['recessiveZygosity'] = 'Homozygous';
          setIsTwoTrans(false);
          setIsHomozygous(!isHomozygous);
        } else {
          newData['recessiveZygosity'] = null;
        }
      }

      if (fieldName === "otherpmids") {
        setBadPmids([]);
      }

      // Disable the Genotyping Method 2 if Genotyping Method 1 has no value
      if (fieldName === 'genotypingmethod1') {
        setGenotyping2Disabled(fieldValue === "none" ? true : false);
        if (e.target.value === "none") {
          newData['genotypingmethod2'] = "none";
        }
      }

      // SOP8 - For SD/AR,either 2 variants both trans or homozygous should be checked
      if (fieldName === 'zygosityHomozygous') {
        // If selecting Homozygous and has more than 1 variant or variantScore, cannot change
        if (isHomozygous && ((variantInfo && variantCount > 0) || (variantScores && variantCount > 0))) {
          alert("Please clear the variant selection before unchecking homozygous selection.");
          setVariantAlert({
            type: "danger",
            message: 'Please clear the variant selection before unchecking homozygous selection.',
          });
        } else if (isHomozygous && newData["probandIs"] === "Biallelic homozygous") {
          alert("The proband is set to Biallelic homozygous so Homozygous has to be selected.");
          setVariantAlert({
            type: "danger",
            message: 'The proband is set to Biallelic homozygous so Homozygous has to be selected..',
          });
        } else if (!isHomozygous && ((variantInfo && variantCount > 1) || (variantScores && variantCount > 1))) {
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
        if (isTwoTrans && ((variantInfo && variantCount > 1) || (variantScores && variantCount > 1))) {
          alert("Please clear the variant(s) before unchecking this 2 variants in trans selection...");
          setVariantAlert({
            type: "danger",
            message: 'Please clear the variant(s) before unchecking this 2 variants in trans selection...',
          });
        } else {
          // If select TwoTrans and probandIs is "Biallelic homozygous", cannot change
          if (!isTwoTrans && formData['probandIs'] === "Biallelic homozygous") {
            alert("The proband is set to Biallelic homozygous so cannot changed to 2 variants...");
            setVariantAlert({
              type: "danger",
              message: 'The proband is set to Biallelic homozygous so cannot changed to 2 variants....',
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
  
      setFormData(newData);
      setFormErrors({});
    }
  };

  /**
   * Handle a click on a copy phenotype button
   * @param {*} e - Event
   * @param {*} evidence - evidence object
   */
  const handleCopyPhenotypes = (e, evidence) => {
    e.preventDefault(); e.stopPropagation();

   if (evidence.hpoIdInDiagnosis && evidence.hpoIdInDiagnosis.length) {
     const hpoIds = evidence.hpoIdInDiagnosis.map((hpoid, i) => {
       return hpoid;
     });
     setHpoWithTerms(hpoIds);
   } else {
     setHpoWithTerms([]);
   }
   if (evidence.termsInDiagnosis) {
     let newData = cloneDeep(formData);
     newData["phenoterms"] = evidence.termsInDiagnosis;
     setFormData(newData);
    }
  };

  const handleCopyNotPhenotypes = (e, evidence) => {
    e.preventDefault(); e.stopPropagation();

    if (evidence.hpoIdInElimination && evidence.hpoIdInElimination.length) {
      const hpoIds = evidence.hpoIdInElimination.map((hpoid, i) => {
        return hpoid;
      });
      setHpoElimWithTerms(hpoIds);
    } else {
      setHpoElimWithTerms([]);
    }
    if (evidence.termsInElimination) {
      let newData = cloneDeep(formData);
      newData["notphenoterms"] = evidence.termsInElimination;
      setFormData(newData);
    }
  };

  // Handle a click on a copy demographics button
  const handleCopyDemographics = (e, evidence) => {
    e.preventDefault(); e.stopPropagation();
    let newData = cloneDeep(formData);

    // Copy demographics data from evidence object to form fields
    if (evidence.countryOfOrigin) {
      newData['country'] = evidence.countryOfOrigin;
    }
    if (evidence.ethnicity) {
      newData['ethnicity'] = evidence.ethnicity;
    }
    if (evidence.race) {
      newData['race'] = evidence.race;
    }

    setFormData(newData);
  };

  // For SOP8
  // Called to update user variantScore obj
  const updateVariantScoreObj = (index, newVariantScoreObj) => {
    const newVariantScore = cloneDeep(newVariantScoreObj);
    let newVariantScores = cloneDeep(variantScores); 
    newVariantScores[index] = newVariantScore;
    setVariantScores(newVariantScores);
    const newScore = lodashGet(newVariantScoreObj, "score", null);
    if (newScore === null || (newScore && !isEmpty(newVariantScoreObj.scoreExplanation))) {
      let newScoreErrors = cloneDeep(scoreErrors);
      newScoreErrors[index] = {};
      setScoreErrors(newScoreErrors);
      // Clear variant alert
      setVariantAlert({});
    }
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

  const updateMethodsFormData = (newFormData) => {
    if (lodashGet(newFormData, "genotypingmethod1", null)) {
      setGenotyping2Disabled(newFormData.genotypingmethod1 === "none" ? true : false);
    }
    setFormData(newFormData);
  };

  /**
   * Clear error msg on missing disease
   */
  const clearErrorInParent = () => {
     setDiseaseError(null);
  };

  const handleCancel = () => {
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
      if (pmids && pmids.length > 0) {
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

  // Check if any error is set for variant scores form fields
  const hasScoreError = (errors) => {
    if (errors && errors.length) {
      for (var i = 0; i < errors.length; i++) {
        if (errors[i] && !isEmpty(errors[i])) {
          return true;
        }
      }
    }
    return false;
  };

  const validateVariantScoreFields = () => {
    /**
     * SOP8 - Go through each added variant and score
     * 1) Make sure there is an explanation for the score selected differently from the default score
     * 2) Make sure there is a selection of the 'Confirm Case Information type' if the 'Select Status'
     *    value equals 'Score'
     */
    // Save error(s) for each variantScore 
    // If proband individual, check variantScores data
    let newScoreErrors  = [];
    if (formData['proband'] === 'Yes' && variantScores) {
      for (var i = 0; i < variantScores.length; i++) {
        let errors = {};
        // Validate each score field
        if (!lodashHas(variantScores[i], "variantType") || lodashGet(variantScores[i], "variantType", null) === null) {
          errors["variantType"] = "Variant Type is required.";
        }
        if (!lodashHas(variantScores[i], "deNovo") || lodashGet(variantScores[i], "deNovo", null) === null) {
          errors["deNovo"] = "This selection is required.";
        }
        if (lodashGet(variantScores[i], "deNovo", null) === 'Yes' &&
          (!lodashHas(variantScores[i], "maternityPaternityConfirmed") ||
          lodashGet(variantScores[i], "maternityPaternityConfirmed", null) === null)) {
          errors["maternityPaternityConfirmed"] = "If variant is de novo, selection is required.";
        }
        if (!lodashHas(variantScores[i], "functionalDataSupport") ||
          lodashGet(variantScores[i], "functionalDataSupport", null) === null) {
          errors["functionalDataSupport"] = "This selection is required.";
        }
        if (lodashGet(variantScores[i], "functionalDataSupport", null) === 'Yes' &&
          (!lodashHas(variantScores[i], "functionalDataExplanation") ||
            isEmpty(lodashGet(variantScores[i], "functionalDataExplanation", null)))) { 
            errors["functionalDataExplanation"] = "Functional data description is required if there is functional data to support this variant.";
        }
        if (lodashGet(variantScores[i], 'score', null) !== null && variantScores[i].score >= 0 &&
          !variantScores[i].scoreExplanation) {
          errors["scoreExplanation"] = "A reason is required for the changed score.";
        }

        newScoreErrors.push(errors);
      }
    }
    setScoreErrors(newScoreErrors);
    return (newScoreErrors);
  }

  const validateFormFields = () => {
    const errors = {};
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;

    // Check all required fields have value
    // Check individual name has value
    if (!formData["individualname"]) {
      errors["individualname"] = "A Individual name is required";
    }
    // If not adding to a family, Is this Individual a proband needs selection
    if (!family && formData["proband"] === 'none') {
      errors["proband"] = "Selection is required";
    }

    // Disease is required for proband individual
    if (probandSelected && (diseaseObj && isEmpty(diseaseObj))) {
      errors["disease"] = "Required for proband";
      setDiseaseError("Disease is required for proband");
    }

    // If gdm is with Semidominant MOI and proband individual, "The proband is" field is required
    if (semiDom && probandSelected && formData["probandIs"] === "none") {
      errors["probandIs"] = "Selection is required for proband";
    }

    // Individual sex is requried
    if (formData["sex"] === 'none') {
      errors["sex"] = "Selection is required";
    }

    // Validate pmids have the proper format (will check for existence later)
    const pmids = getPmidsFromList(formData["otherpmids"]);
    if (pmids && pmids.length > 0 && pmids.includes(null)) {
      // PMID list is bad
      errors["otherpmids"] = "Use PubMed IDs (e.g. 12345678) separated by commas";
    }

    const foundErrors = validateVariantScoreFields();

    if (!isEmpty(errors) || hasScoreError(foundErrors)) {
      setFormErrors(errors);
      return false;
    } else {
      return true;
    }
  };

  // Check new variantScores against existing variantScore.
  // If a previous variantscore is no longer in new list, removed from database.
  const deleteRemovedVariantScores = async () => {
    const existingScores = lodashGet(individual, "variantScores", null) ? individual.variantScores : [];
    const variantScoresList = variantScores.map(o => { return o.PK });
    const variantScorePKs = variantScoresList.join(',');

    if (existingScores && !isEmpty(existingScores)) {
      const objPromises = existingScores.map(async obj => {
        if (variantScorePKs.indexOf(obj.PK) === -1) {
          // delete variantScore obj since it's been removed from new variantScores list
          let newVariantScore = cloneDeep(obj);
          newVariantScore['status'] = 'deleted';
          const url = `/variantscore/${newVariantScore.PK}`;
          return await requestRecycler.capture(API.put(API_NAME, url, { body: { newVariantScore } }));
        }
      });
      return Promise.all(objPromises);
    } else {
      return Promise.resolve([]);
    }
  }

  // SOP8 - proband individual set up variantScore object
  const saveVariantScores = async () => {
    return deleteRemovedVariantScores()
      .then(result => {
      if (variantScores && !isEmpty(variantScores)) {
      const objPromises = variantScores.map(async obj => {
        // Update or create variantScore object
        let newVariantScore = cloneDeep(obj);
        const isNew = newVariantScore.PK ? false : true;
        if (isNew) {
          newVariantScore.submitted_by = lodashGet(auth, "PK", null);
          if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
            newVariantScore.affiliation = auth.currentAffiliation.affiliation_id;
          }
        }
        newVariantScore.modified_by = lodashGet(auth, "PK", null);
        newVariantScore.item_type = "variantScore";
        newVariantScore.variantScored = obj.variantScored.PK;

        const url = isNew ? "/variantscore" : `/variantscore/${newVariantScore.PK}`;

        return await (isNew
          ? requestRecycler.capture(API.post(API_NAME, url, { body: { newVariantScore } }))
          : requestRecycler.capture(API.put(API_NAME, url, { body: { newVariantScore } })));
      });
      return Promise.all(objPromises);
      } else {
        return Promise.resolve(null);
      }
    });
  };
  
  // For SOP8
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

  const createIndividual = (individualVariants, individualVariantScores) => {
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    // If editing individual, copy over old individual data
    let newIndividual = individual ? cloneDeep(individual) : {};

    // Set individual name
    newIndividual.label = formData["individualname"];

    // Set individual is proband
    newIndividual.proband = formData["proband"] === "Yes";

    // Get the disease (only one)
    newIndividual.diagnosis = (diseaseObj && !isEmpty(diseaseObj)) ? [diseaseObj] : null;

    // Fill in the individual fields from the Phenotypes panel
    newIndividual.hpoIdInDiagnosis = (hpoWithTerms && hpoWithTerms.length) ? hpoWithTerms : null;
    newIndividual.termsInDiagnosis = formData["phenoterms"] ? formData["phenoterms"] : null;
    newIndividual.hpoIdInElimination = (hpoElimWithTerms && hpoElimWithTerms.length) ?  hpoElimWithTerms : null;
    newIndividual.termsInElimination = formData["notphenoterms"] ? formData["notphenoterms"] : null;

    // Fill in the individual fields from the Demographics panel
    newIndividual.sex = formData["sex"] !== 'none' ? formData["sex"] : null;
    newIndividual.countryOfOrigin = formData["country"] !== 'none' ? formData["country"] : null;
    newIndividual.ethnicity = formData["ethnicity"] !== 'none' ? formData["ethnicity"] : null;
    newIndividual.race = formData["race"] !== 'none' ? formData["race"] : null;
    newIndividual.ageType = formData["agetype"] !== 'none' ? formData["agetype"] : null;
    newIndividual.ageValue = formData["agevalue"] ? parseInt(formData["agevalue"], 10) : null;
    newIndividual.ageUnit = formData["ageunit"] !== 'none' ? formData["ageunit"] : null;

    // If a method object was created (at least one method field set), assign it to the individual.
    // needs unique objects here.
    const newMethod = createMethod(formData);
    newIndividual.method = (newMethod && !isEmpty(newMethod)) ? newMethod : {};

    // SOP8 - Field only available on GDMs with Semidominant MOI
    if (semiDom) {
      newIndividual.probandIs = formData["probandIs"] !== 'none' ? formData["probandIs"] : null;
    }

    // Fill in the individual fields from the Additional panel
    newIndividual.additionalInformation = formData["additionalinfoindividual"] ? formData["additionalinfoindividual"] : null;

    // Add array of other PMIDs
    if (formData["otherpmids"]) {
      const pmids = getPmidsFromList(formData["otherpmids"]);
      if (pmids && pmids.length > 0) {
        newIndividual.otherPMIDs = pmids.map(pmid => { return pmid; });
      }
    } else {
      newIndividual['otherPMIDs'] = null;
    }

    // SOP8 - If proband individual, save variantScores; otherwise, variants
    if (newIndividual.proband) {
      newIndividual.variantScores = individualVariantScores ? individualVariantScores : null;
    } else {
      newIndividual.variants = individualVariants ? individualVariants : null;
    }

    /*************************************************/
    /* Individual variant form fields.               */
    /* Only applicable when individual is associated */
    /* with a family and 1 or more variants          */
    /*************************************************/
    // legacy site will set recessiveZygosity even not associated with a family or a variant
    // because individualVariants is [] when there's no variant
    // And if (Note: if homozygous, enter only 1 variant below) is not checked
    newIndividual.recessiveZygosity = formData['recessiveZygosity'] !== 'none' ? formData['recessiveZygosity'] : null;

    // Add affiliation if the user is associated with an affiliation
    // and if the data object has no affiliation
    if (!newIndividual.PK) {
      if (!newIndividual.affiliation) {
        if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
          newIndividual.affiliation = auth.currentAffiliation.affiliation_id;
        }
      }
      newIndividual.submitted_by = lodashGet(auth, "PK", null);
    }
    newIndividual.modified_by = lodashGet(auth, "PK", null);
    newIndividual.item_type = "individual";

    // SOP8 - Add associated data to individual
    if (group) {
      newIndividual.associatedParentType = "group";
      newIndividual.associatedParent = group.PK;
    } else if (family) {
      newIndividual.associatedParentType = "family";
      newIndividual.associatedParent = family.PK;
    } else {
      newIndividual.associatedParentType = "annotation";
      newIndividual.associatedParent = annotation.PK;
    }

    return newIndividual;
  };

  const updateAnnotationObject = async () => {
    // successfully added individual to group --
    // GET annotation so that backend can auto-collect the added individual (on group)
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

  // Save an individual object to DB and update related objects.
  const saveIndividual = async (newIndividual) => {
    const isNew = newIndividual.PK ? false : true;
    let individualResult;

    // Either update or create the individual object in the DB
    const postOrPutRequestArgs = [
      API_NAME,
      isNew
      ? "/individuals"
      : `/individuals/${newIndividual.PK}`,
      { body: { newIndividual } }
    ];
    try {
      individualResult = await (isNew
      ? requestRecycler.capture(API.post(...postOrPutRequestArgs))
      : requestRecycler.capture(API.put(...postOrPutRequestArgs)));
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      throw new Error(
        "Failed to update or create new individual"
      );
    }
    if (!individualResult || !individualResult.PK) {
      console.log("no individualResult");
      throw new Error("Empty response from server when saving individual");
    } else {
      console.log(individualResult.PK);
    }

    // If adding this individual to a group, update the group.
    // If adding this individual to a family, update the family.
    // Otherwise update the annotation with the individual.
    // SOP8 - Add associated annotation/group/family data to individual
    //      - For add and edit individual, add associated parent data to group and family if needed but not added already
    // Part of a group so add individual to group
    if (group) {
      let groupResult = null;
      let updateGroup = null;
      if (isNew) {
        updateGroup = {
          ...group,
          individualIncluded: [...(group.individualIncluded || []), individualResult.PK],
          associatedParent: group.associatedParent || annotation.PK,
        };
      } else {
        // SOP8 - add associated annotation to group in case it's missing
        if (!lodashGet(group, "associatedParent", null)) {
          updateGroup = {
            ...group,
            associatedParent: group.associatedParent || annotation.PK,
          };
        }
      }
      if (updateGroup) {
        // PUT group
        try {
          groupResult = await requestRecycler.capture(
            API.put(API_NAME, `/groups/${group.PK}`, { body: { updateGroup } })
          );
        } catch (error) {
          throw new Error(
            `Failed to append individual to group but individual ${individualResult.PK} already created in db`
          );
        }
        if (!groupResult ||
          !Array.isArray(groupResult.individualIncluded) ||
          groupResult.individualIncluded.length !== updateGroup.individualIncluded.length) {
          throw new Error("Empty response from server when updating group");
        } else {
          // successfully added individual to group --
          // GET annotation so that backend can auto-collect the added individual (on group)
          // for us when embedding related objects
          // ??? await updateAnnotationObject();
        }
      }
    } else if (family) {
      // Part of a family so add individual to family
      const parentType = familyAssociatedGroup ? "group" : "annotation";
      const parentPK = familyAssociatedGroup ? familyAssociatedGroup.PK : annotation.PK;
      let familyResult = null;
      let updateFamily = null;

      if (isNew) {
        updateFamily = {
          ...family,
          individualIncluded: [...(family.individualIncluded || []), individualResult.PK],
          associatedParentType: family.associatedParentType || parentType,
          associatedParent: family.associatedParent || parentPK,
        };
      } else {
        // SOP8 - add associated parent to family data in case it's missing
        if (!lodashGet(family, "associatedParentType", null)) {
          updateFamily = {
            ...family,
            associatedParentType: parentType,
            associatedParent: parentPK
          };
        }
      }
      if (updateFamily) {
        // PUT family
        try {
          familyResult = await requestRecycler.capture(
            API.put(API_NAME, `/families/${family.PK}`, { body: { updateFamily } })
          );
        } catch (error) {
          throw new Error(
            `Failed to append individual to family but individual ${individualResult.PK} already created in db`
          );
        }
        if (!familyResult ||
          !Array.isArray(familyResult.individualIncluded) ||
          familyResult.individualIncluded.length !== updateFamily.individualIncluded.length) {
          throw new Error("Empty response from server when updating family");
        } else {
          // successfully added individual to family --
          // GET annotation so that backend can auto-collect the added individual (on group)
          // for us when embedding related objects
          // ??? await updateAnnotationObject();
        }
      }

      // SOP8 - Check if associatedParent data needs to be added to the familyAssociatedGroup
      if (familyAssociatedGroup && !lodashGet(familyAssociatedGroup, "associatedParent", null)) {
        let groupResult = null;
        const updateGroup = {
          ...familyAssociatedGroup,
          associatedParent: annotation.PK
        };
        // PUT group
        try {
          groupResult = await requestRecycler.capture(
            API.put(API_NAME, `/groups/${familyAssociatedGroup.PK}`, { body: { updateGroup } })
          );
        } catch (error) {
          throw new Error(
            `Failed to update group associated with indvidual family  data but individual ${individualResult.PK} already created in db`
          );
        }
        if (!groupResult) {
          throw new Error("Empty response from server when updating group");
        } else {
          // successfully updated group --
          // GET annotation so that backend can auto-collect the added individual (on group)
          // for us when embedding related objects
          // ??? await updateAnnotationObject();
        }
      }
    } else {
      // Not part of a group or family, so add the individual to the annotation instead.
      if (isNew) {
        let annotationResult = null;
        const updateAnnotation = {
          ...annotation,
          individuals: [...(annotation.individuals || []), individualResult.PK],
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
          annotationResult.individuals.length !== updateAnnotation.individuals.length) {
          throw new Error("Empty response from server when updating annotation");
        } else {
          // update redux for annotations
          dispatch(updateAnnotationAction(annotationResult));
        }
      } else {
        // ??? await updateAnnotationObject();
      }
    }

    // Update annotation all at the same time
    await updateAnnotationObject();

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

    return (individualResult);
  };

  const submitForm = async (e) => {
    e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    const autoRec = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Autosomal recessive') > -1 : false;
    const noProbandIs = formData["probandIs"] === "none";
    const biallelicHetOrHom = formData["probandIs"].indexOf('Biallelic') > -1 ? true : false;
    const biallelicHomozygous = formData["probandIs"].indexOf('Biallelic homozygous') > -1 ? true : false;
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
    let individualVariants = [];
    let savedIndividual = null;

    setIsSubmitting(true);
    if (!badPmids.length && validateFormFields()) {
      validatePmids().then(res => {
        // Get variants if they were added via the modals
        // SOP8 - if not proband individual, save variants
        if (variantInfo && variantInfo.length) {
          for (var i = 0; i < maxVariants; i++) {
            // Grab the values from the variant form panel
            var variantId = variantInfo[i] && variantInfo[i].PK ? variantInfo[i].PK : null;
            // Build the search string depending on what the user entered
            if (variantId) {
              // Make a search string for these terms
              individualVariants = [...individualVariants, variantId];
            }
          }
          return Promise.resolve([]);
        } else {
          // SOP8 - if proband then create or delete or update variantScores in DB
          return saveVariantScores();
        }
      }).then(individualVariantScores => {
        // Make a new individual object based on form fields.
        const newIndividual = createIndividual(individualVariants, individualVariantScores);
        // Save individual object in DB
        return saveIndividual(newIndividual);
      }).then(individualObj => {
        savedIndividual = individualObj;
        // Add associated individual evidence to variantScore 
        updateVariantScoresWithIndividual(savedIndividual).then(results => {
          setIsSubmitting(false);
          let redirectUrl = `/curation-central/${gdm.PK}/annotation/${annotation.PK}`;
          if (!editIndividual && (savedIndividual && savedIndividual.PK)) {
            redirectUrl += `/individual-curation/${savedIndividual.PK}/submit`;
            if (group) {
              redirectUrl += `?parentTypeCuration=group-curation&parentEvidencePK=${group.PK}`;
            }
            if (family) {
              redirectUrl += `?parentTypeCuration=family-curation&parentEvidencePK=${family.PK}`;
            }
          }
          history.push(redirectUrl);
        }).catch(error => {
          if (API.isCancel(error)) {
            console.log("Cancel");
            setIsSubmitting(false);
            return
          }
          // throw new Error
          handleSubmitError("Error in updating variantScore object in DB", error);
        });
      }).catch(error => {
        console.log('validatePmids : %o', error);
        setIsSubmitting(false);
        // throw new Error
        handleSubmitError("Error in saving individual object in DB", error);
      });
    } else {
      setIsSubmitting(false);
    }
  };

  const initializeVariantScore = (data) => {
    const variantData = cloneDeep(data);
    return (
      {
        'variantScored': variantData,
        'evidenceType': 'individual',
        'evidenceScored': individual && individual.PK ? individual.PK : null,
	'variantType': null,
        'deNovo': null,
        'functionalDataSupport': null,
        'functionalDataExplanation': null,
        'scoreStatus': null,
        'calculatedScore': null,
        'score': null,
        'scoreExplanation': null,
      }
    );
  };

  const updateProbandVariantScores = (data, fieldNum) => {
    let count = variantCount;
    let newVariantScores = cloneDeep(variantScores);
    if (data) {
      // Update the form and display values with new data
      // Set empty variantScore for these old variant in case user wants to add
      newVariantScores[fieldNum] = initializeVariantScore(data);
      count++;
    } else {
      newVariantScores.splice(fieldNum, 1);
      newVariantScores = newVariantScores.filter(e => e !== undefined && e !== null);
      count--;
    }
    setVariantScores(newVariantScores);
    setVariantCount(count);
  };

  const updateNotProbandVariants = (data, fieldNum) => {
    let count = variantCount;
    let newVariantInfo = cloneDeep(variantInfo);
    if (data) {
      newVariantInfo[fieldNum] = {
        'showEdit': false,
        'clinvarVariantId': data.clinvarVariantId ? data.clinvarVariantId : null,
        'clinvarVariantTitle': data.clinvarVariantTitle ? data.clinvarVariantTitle : null,
        'carId': data.carId ? data.carId : null,
        'canonicalTranscriptTitle': data.canonicalTranscriptTitle ? data.canonicalTranscriptTitle : null,
        'maneTranscriptTitle': data.maneTranscriptTitle ? data.maneTranscriptTitle : null,
        'hgvsNames': data.hgvsNames ? data.hgvsNames : null,
        'preferredTitle' : data.preferredTitle ? data.preferredTitle : null,
        'associatedPathogenicities': data.associatedPathogenicities && data.associatedPathogenicities.length ? data.associatedPathogenicities : [],
        'PK': data.PK
      };
      count++;
    } else {
      newVariantInfo.splice(fieldNum, 1);
      newVariantInfo = newVariantInfo.filter(e => e !== undefined && e !== null);
      count--;
    }
    setVariantInfo(newVariantInfo);
    setVariantCount(count);
  }

  // SOP8
  // Update the Variant ID fields upon interaction with the Add Variant modal
  // If proband individual then update variantScores else update variantInfo
  const updateVariantData = (data, fieldNum) => {
    if (probandSelected) {
      updateProbandVariantScores(data, fieldNum);
    } else {
      updateNotProbandVariants(data, fieldNum);
    }
    clearFieldError('zygosityTwoTrans');
    clearFieldError('zygosityHemizygous');
    clearFieldError('zygosityHomozygous');
    setProbandSelected(probandSelected);
    // Clear variant alert
    setVariantAlert({});
  };

  const handleDeleteVariant = (e) => {
    e.preventDefault(); e.stopPropagation();
    const index = (e.target.name).substring(14);
    updateVariantData(null, index);
  };

  /* ??? TODO
  // SOP8 - display all the scored evidences for the selected variant
  const handleViewVariant = (e) => {
    e.preventDefault(); e.stopPropagation();
    // ??? const index = (e.target.name).substring(14);
    // ??? TODO: SOP8 get variant PK and display score page
  };
  */

  const renderTitle = () => {
    const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
      : (lodashGet(gdm, "PK", null)
        ? `/curation-central/${gdm.PK}`
        : null);
    const viewGroupLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/group-curation/`
      : null;
    const viewFamilyLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/family-curation/`
      : null;
    const probandLabel = individual && individual.proband ? <i className="icon icon-proband"></i> : null;

    let familyTitle = null;
    let groupTitle = null;
    groupTitle = group ? {'label': group.label, 'PK': group.PK} : null;
    familyTitle = family ? {'label': family.label, 'PK': family.PK} : null;
    // If the given family has associated group, add to group title
    groupTitle = family && family.associatedGroups && familyAssociatedGroup
      ? {'label': familyAssociatedGroup.label, 'PK': familyAssociatedGroup.PK}
      : groupTitle;

    return (
      <div className="viewer-titles">
        <h1>{individual ? 'Edit' : 'Curate'} Individual Information</h1>
        <h2>
          {curationLink ? <Link to={curationLink}><FontAwesomeIcon icon={faBriefcase}/></Link> : null}
          {groupTitle ?
            <span> &#x2F;&#x2F; Group <span key={groupTitle.PK}><Link to={`${viewGroupLink}${groupTitle.PK}/view`}>{groupTitle.label}</Link></span></span>
            : null}
          {familyTitle ?
            <span> &#x2F;&#x2F; Family <span key={familyTitle.PK}><Link to={`${viewFamilyLink}${familyTitle.PK}/view`}>{familyTitle.label}</Link></span></span>
            : null}
          <span> &#x2F;&#x2F; {formData['individualname'] ? <span>Individual {formData['individualname']}{probandLabel}</span> : <span className="no-entry">No entry</span>}</span>
        </h2>
      </div>
    );
  };

  const renderIndividualName = () => {
    const probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);
    let familyProbandExists = individual && individual.proband ? individual.proband : false;
    if (family && family.individualIncluded && family.individualIncluded.length && family.individualIncluded.length > 0) {
      for (var i = 0; i < family.individualIncluded.length; i++) {
        const indivObj = getEvidenceByPKFromActiveAnnotation(annotations, family.individualIncluded[i]);
        if (lodashGet(indivObj, "proband", null) === true) familyProbandExists = true;
      }
    }

    const editFamilyLink = lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(family, "PK", null)
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/family-curation/${family.PK}/edit`
      : null;

    return (
      <>
        {family && editFamilyLink && !familyProbandExists ?
          <Col sm={{ span: 7, offset: 5 }}>
            <p className="alert alert-warning">
              This page is only for adding non-probands to the Family. To create a proband for this Family, please edit its Family page: <Link to={editFamilyLink}>Edit {family.label}</Link>
            </p>
          </Col>
          : null}
        {!individual && !family && !group ?
          <Col sm={{ span: 7, offset: 5 }}>
            <p className="alert alert-warning">If this Individual is part of a Family or a Group, please curate that Group or Family first and then add the Individual as a member.</p>
          </Col>
          : null}
        <Input type="text" name="individualname" label={<span>{probandLabel}Individual Label:</span>}
          maxLength="60" required groupClassName="row mb-3" value={formData["individualname"]}
          onChange={handleChange} error={formErrors["individualname"]} 
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" 
        />
        <Col sm={{ span: 7, offset: 5 }}>
          <p className="mt-3">Note: Do not enter real names in this field. {renderLabelNote('Individual')}</p>
        </Col>
        {!family ?
          <div>
            <Input type="select" label="Is this Individual a proband:" name="proband" onChange={handleChange}
              value={formData['proband']} error={formErrors['proband']}
              labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </Input>
            <Col sm={{ span: 7, offset: 5 }}>
              <p className="mt-3">
              Note: Probands are indicated by the following icon: <i className="icon icon-proband"></i>
              </p>
            </Col>
          </div>
          : null
        }
      </>
    );
  };

  const renderIndividualCommonDiseases = () => {
    // If we're editing an individual, make editable values of the complex properties
    // Make a list of diseases from associated family or group.
    const probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);
    // Retrieve associated "parent" as an array (check for family first, then group)
    let associatedParentObj = null;
    let associatedParentName = '';
    if (family) {
      associatedParentObj = family;
      associatedParentName = 'Family';
    }
    if (group) {
      associatedParentObj = group;
      associatedParentName = 'Group';
    }

    return (
      <>
      {associatedParentObj && associatedParentObj.commonDiagnosis && associatedParentObj.commonDiagnosis.length ? renderDiseaseList([associatedParentObj], associatedParentName) : null}
      <IndividualDisease
        gdm={gdm}
        group={group}
        family={family}
        probandLabel={probandLabel}
        diseaseObj={diseaseObj}
        updateDiseaseObj={updateDiseaseObj}
        clearErrorInParent={clearErrorInParent}
        error={diseaseError}
        required={probandSelected}
      />
      {diseaseError ? 
        <Col sm={{ span: 7, offset: 5 }} className="form-error">
          {diseaseError}</Col>
        : null}
      {associatedParentObj && ((associatedParentObj.hpoIdInDiagnosis && associatedParentObj.hpoIdInDiagnosis.length) || associatedParentObj.termsInDiagnosis)
        ? renderPhenotype([associatedParentObj], 'Individual', 'hpo', associatedParentName)
        : renderPhenotype(null, 'Individual', 'hpo')
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
                  <li key={`phen_${i}`}>{term}</li>
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
      {associatedParentObj && ((associatedParentObj.hpoIdInDiagnosis && associatedParentObj.hpoIdInDiagnosis.length) || associatedParentObj.termsInDiagnosis)
        ? renderPhenotype([associatedParentObj], 'Individual', 'ft', associatedParentName)
        : renderPhenotype(null, 'Individual', 'ft')
      }
      <Input type="textarea" name="phenoterms" groupClassName="row mb-3" rows="2"
        value={formData["phenoterms"]} onChange={handleChange} error={formErrors["phenoterms"] || null}
        label={renderLabelPhenoTerms(false)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      />
      {associatedParentObj && ((associatedParentObj.hpoIdInDiagnosis && associatedParentObj.hpoIdInDiagnosis.length) || associatedParentObj.termsInDiagnosis) ?
        <Col sm={{ span: 7, offset: 5 }}> 
          <Button className="gdm-orphanet-copy btn-copy btn-last" onClick={e=>handleCopyPhenotypes(e, associatedParentObj)} >Copy all Phenotype(s) from Associated {associatedParentName}</Button>
        </Col>
        : null
      }
      <Col sm={{ span: 7, offset: 5 }}> 
        <p>Enter <em>phenotypes that are NOT present in Individual</em> if they are specifically noted in the paper.</p>
      </Col>
      {associatedParentObj && ((associatedParentObj.hpoIdInElimination && associatedParentObj.hpoIdInElimination.length) || associatedParentObj.termsInElimination)
        ? renderPhenotype([associatedParentObj], 'Individual', 'nothpo', associatedParentName)
        : null
      }
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
                  <li key={`not_phen_${i}`}>{term}</li>
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
      {associatedParentObj && ((associatedParentObj.hpoIdInElimination && associatedParentObj.hpoIdInElimination.length) || associatedParentObj.termsInElimination)
        ? renderPhenotype([associatedParentObj], 'Individual', 'notft', associatedParentName)
        : null
      }
      <Input type="textarea" name="notphenoterms" groupClassName="row mb-3" rows="2"
        value={formData["notphenoterms"]} onChange={handleChange} error={formErrors["notphenoterms"] || null}
        label={renderLabelPhenoTerms(true)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      />
      {associatedParentObj && ((associatedParentObj.hpoIdInElimination && associatedParentObj.hpoIdInElimination.length) || associatedParentObj.termsInElimination) ?
        <Col sm={{ span: 7, offset: 5 }}> 
          <Button className="gdm-orphanet-copy btn-copy btn-last" onClick={e=>handleCopyNotPhenotypes(e, associatedParentObj)} >Copy all NOT Phenotype(s) from Associated {associatedParentName}</Button>
        </Col>
        : null}
      </>
    );
  };

  const renderIndividualDemographics = () => {
    let associatedParentObj = null;
    let associatedParentName = '';
    let hasParentDemographics = false;

    // Retrieve associated "parent" as an array (check for family first, then group)
    if (family) {
      associatedParentObj = family;
      associatedParentName = 'Family';
    }
    if (group) {
      associatedParentObj = group;
      associatedParentName = 'Group';
    }
    // Check if associated "parent" has any demographics data
    if (associatedParentObj && (associatedParentObj.countryOfOrigin || associatedParentObj.ethnicity || associatedParentObj.race)) {
      hasParentDemographics = true;
    }

    return (
      <>
        <Input type="select" name="sex" label="Sex:" value={formData["sex"]} error={formErrors["sex"]} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" required
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Unknown">Unknown</option>
          <option value="Intersex">Intersex</option>
          <option value="MTF/Transwoman/Transgender Female">MTF/Transwoman/Transgender Female</option>
          <option value="FTM/Transman/Transgender Male">FTM/Transman/Transgender Male</option>
          <option value="Ambiguous">Ambiguous</option>
          <option value="Other">Other</option>
        </Input>
        <Col sm={{ span: 7, offset: 5 }}> 
          <p className="alert alert-info">Select "Unknown" for "Sex" if information not provided in publication.</p>
        </Col>
        {hasParentDemographics ?
          <Col sm={{ span: 7, offset: 5 }}> 
            <Button className="gdm-demographics-copy btn-copy btn-last" onClick={e=>handleCopyDemographics(e, associatedParentObj)} >Copy Demographics from Associated {associatedParentName}</Button>
          </Col>
          : null}
        {hasParentDemographics ? renderParentEvidence('Country of Origin Associated with ' + associatedParentName + ':', associatedParentObj.countryOfOrigin) : null}
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
        {hasParentDemographics ? renderParentEvidence('Ethnicity Associated with ' + associatedParentName + ':', associatedParentObj.ethnicity) : null}
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
        {hasParentDemographics ? renderParentEvidence('Race Associated with ' + associatedParentName + ':', associatedParentObj.race) : null}
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
        <div className="form-group">
          <Row className="mb-3">
            <Col sm={{ span: 7, offset: 5 }}>
              <h4>Age</h4>
            </Col>
          </Row>
          <Input type="select" name="agetype" label="Type:" groupClassName="row mb-3"
            value={formData['agetype']} onChange={handleChange}
            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
          >
            <option value="none">No Selection</option>
            <option disabled="disabled"></option>
            <option value="Onset">Onset</option>
            <option value="Report">Report</option>
            <option value="Diagnosis">Diagnosis</option>
            <option value="Death">Death</option>
          </Input>
          <Input type="number" name="agevalue" label="Value:"
            value={formData["agevalue"]} min={0}
            onChange={handleChange} error={formErrors["agevalue"] || null}
            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
          />
          <Input type="select" name="ageunit" label="Unit:" groupClassName="row mb-3"
            value={formData['ageunit']} onChange={handleChange}
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
      </>
    );
  };

  const renderMethods = () => {
    let parentEvidenceMethod = null;
    let parentEvidenceName = '';

    if (family) {
      parentEvidenceMethod = (family.method && Object.keys(family.method).length) ? family.method : null;
      parentEvidenceName = 'Family';
    } else if (group) {
      parentEvidenceMethod = (group.method && Object.keys(group.method).length) ? group.method : null;
      parentEvidenceName = 'Group';
    }

    return (
      <MethodsPanel
        formData={formData}
        genotyping2Disabled={genotyping2Disabled}
        handleChange={handleChange}
        updateMethodsFormData={updateMethodsFormData}
        method={individual && individual.method ? individual.method : null}
        evidenceType="individual"
        prefix=""
        parentMethod={parentEvidenceMethod}
        parentName={parentEvidenceName}
      />
    ); 
  };

  const renderVariantScoreVariant = (variantScore, index) => {
    const variantData={
      'clinvarVariantId': lodashGet(variantScore, "variantScored.clinvarVariantId", null),
      'clinvarVariantTitle': lodashGet(variantScore, "variantScored.clinvarVariantTitle", null),
      'preferredTitle': lodashGet(variantScore, "variantScored.preferredTitle", null),
      'carId': lodashGet(variantScore, "variantScored.carId", null),
      'canonicalTranscriptTitle': lodashGet(variantScore, "variantScored.canonicalTranscriptTitle", null),
      'maneTranscriptTitle': lodashGet(variantScore, "variantScored.maneTranscriptTitle", null),
      'hgvsNames': lodashGet(variantScore, "variantScored.hgvsNames", null),
      'PK': lodashGet(variantScore, "variantScored.PK", null)
    }

    /* ??? remove for now
          <Col>
            <VariantEvidencesModal
              gdm={gdm}
              variant={variantData}
              buttonTitle="View Scored Evidence for this variant"
              variantScorePK={lodashGet(variantScore, "PK", null)}
            />
          </Col>
    */

    return (
      <>
      <div className="variant-resources">
        <Row>
          <Col sm="6" className="control-label"><label>{LabelVariantTitle(variantData, true)}</label>{lodashGet(variantData, "preferredTitle", null)}
          </Col>
          {variantData && variantData.clinvarVariantId ?
            <>
            <Col className="text-no-input mb-3">
              <Link to={`/variant-central/${variantData.PK}`} target="_blank" rel="noopener noreferrer">View variant evidence in Variant Curation Interface</Link>
            </Col>
            </>
          : null}
          <Col>
            <Button id={"deleteVariant-" + index} name={"deleteVariant-" + index} className="clear-button outline-dark" onClick={e=>handleDeleteVariant(e)}>Clear variant selection</Button>
          </Col>
        </Row>
        <Row className="variant-data-source mb-4">
          {variantData && variantData.clinvarVariantId ?
            <Col sm="4" className="control-label"><label>{<LabelClinVarVariant />}</label>
              <ExternalLink href={EXTERNAL_API_MAP['ClinVarSearch'] + variantData.clinvarVariantId}>{variantData.clinvarVariantId}</ExternalLink>
            </Col>
          : null}
          {variantData && variantData.carId ?
            <>
            <Col sm="4" className="control-label"><label><LabelCARVariant /> </label>
              <ExternalLink href={`${EXTERNAL_API_MAP['CARallele']}${variantData.carId}.html`}>{variantData.carId}</ExternalLink>
            </Col>
            </>
          : null}
        </Row>
      </div>
      <IndividualVariantScore
        gdm={gdm}
        index={index}
        variantScore={variantScore}
        probandSelected={true}
        probandIs={formData['probandIs']}
        updateVariantScore={updateVariantScoreObj}
        scoreErrors={scoreErrors}
      />
      </>
    );
  }

  // SOP8 - if not proband individual then display variants
  const renderIndividualVariants = (maxVariants) => {
    return (
      <>
      {_.range(maxVariants).map(i => {
        return (
          <div key={`vInfo-${i}`} className="variant-panel">
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
                      updateParentObj={selectedVariant=>updateVariantData(selectedVariant, i)}
                    /> 
                  : null}
                </Col>
              </Row>
            }
          </div>
        );
      })}
      </>
    );
  };

  const renderIndividualOldVariantAndScore = () => {
    let title = 'Previously added variant(s) and score - Retired Format - ';
    let infoText = 'The variant(s) and score(s) shown in this table was added in a format that has now been retired...';
    // Get evidenceScore object for the logged-in user if exists
    if (individual && individual.variants && individual.variants.length) {
      let showTable = true;
      // SOP8 - for not proband individual, issue with has variants but recessiveZygosity is not set
      // In case previous varaints has entered required recessiveZygosity use as is;
      // If not, show as old format
      if (!individual.proband) {
        title = 'Previously added variant(s) - ';
        infoText = 'The variant(s) shown in this table was added before, please select if 2 variants or homozygous and variant(s) will be added again.';
        const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
        const autoRec = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Autosomal recessive') > -1 : false;
        if (semiDom || autoRec) {
          if ((individual.recessiveZygosity &&
               individual.recessiveZygosity === "Homozygous" && individual.variants.length === 1) ||
              (individual.recessiveZygosity && 
               individual.recessiveZygosity === "TwoTrans" && individual.variants.length === 2)) {
            showTable = false;
          }
        } else {
          showTable = false;
        }
      }

      if (showTable) {
        const infoPopover = <Popover
          triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
          content={infoText}
          placement="top"
        />
        const variants = lodashGet(individual, "variants", null);
        let userOldScore = null;
        const userAffiliatedScore = getUserAffiliatedScore(individual.scores, auth);
        const loggedInUserScore = getUserScore(individual.scores, lodashGet(auth, "PK", null));
        const affiliation = lodashGet(auth, "currentAffiliation", null);

        if (userAffiliatedScore) {
          userOldScore = userAffiliatedScore;
        } else {
          userOldScore = loggedInUserScore && !loggedInUserScore.affiliation && !affiliation ? loggedInUserScore : null;
        }

        const show = individual.variantScores && individual.variantScores.length ? false : true;

        return (
          <>
            <CardPanel title={<span>{title}{infoPopover}</span>} accordion={true} open={show}>
              <RetiredVariantTable
                variants={variants}
                score={userOldScore}
              />
            </CardPanel>
          </>
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  const renderProbandIndividualVariantScores = (maxVariants) => {
    let variantScoreInfo = [];
    if (variantScores && variantScores.length > 0) {
      for (let i = 0; i < variantScores.length; i++) {
        if (variantScores[i]) {
          variantScoreInfo[i] = {
            'clinvarVariantId': lodashGet(variantScores[i], "variantScored.clinvarVariantId", null),
            'carId': lodashGet(variantScores[i], "variantScored.carId", null)
          }
        }
      }
    }

    return (
      <>
      {_.range(maxVariants).map(i => {
        return (
          <div key={`vScore-${i}`} className="variant-panel">
            {variantScores && variantScores[i] ?
              <>
              {renderVariantScoreVariant(variantScores[i], i)}
              </>
            :
              <Row className = "mb-3">
                <Col sm="5" className="col-sm-5 control-label"><label>Add Variant:</label></Col>
                <Col sm="7">
                  {!variantScoreInfo[i] || (variantScoreInfo[i] && variantScoreInfo[i].clinvarVariantId) ?
                    <SelectVariantModal
                      auth={auth}
                      variantList={variantScoreInfo}
                      updateParentObj={selectedVariant=>updateVariantData(selectedVariant, i)}
                    />
                  : null}
                </Col>
              </Row>
            }
          </div>
        );
      })}
      </>
    );
  };

  // SOP8 - Display add/edit/delete variant evidences UI
  // if proband individual then display variantScores UI
  // if not proband individual then display variants UI
  const renderIndividualAssociatedVariantData = () => {
    // SD, AR, AD, XL
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    const autoRec = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Autosomal recessive') > -1 : false;
    const noProbandIs = formData["probandIs"] === "none";
    const biallelicHetOrHom = formData["probandIs"].indexOf('Biallelic') > -1 ? true : false;
    const biallelicHomozygous = formData["probandIs"].indexOf('Biallelic homozygous') > -1 ? true : false;
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
        {semiDom ?
          <Input type="select" label="The proband is:" name="probandIs" onChange={handleChange}
            value={formData["probandIs"]} error={formErrors["probandIs"]}
            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" required={probandSelected}>
            <option value="none">No Selection</option>
            <option disabled="disabled"></option>
            <option value="Monoallelic heterozygous">Monoallelic heterozygous (e.g. autosomal)</option>
            <option value="Hemizygous">Hemizygous (e.g. X-linked)</option>
            <option value="Biallelic homozygous">Biallelic homozygous (e.g. the same variant is present on both alleles, autosomal or X-linked)</option>
            <option value="Biallelic compound heterozygous">Biallelic compound heterozygous (e.g. two different variants are present on the alleles, autosomal or X-linked)</option>
          </Input>
          :
            null
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
          : (
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
          )
        }
        {probandSelected
          ? renderProbandIndividualVariantScores(maxVariants)
          : renderIndividualVariants(maxVariants)
        }
      </div>
    );
  };

  // Display the entered variant(s) and its score in a table
  const renderVariantScoresTable = () => {
    if (variantScores && variantScores.length) {
      return (
        <IndividualScoresTable
          gdm={gdm}
          variantScores={variantScores}
          probandIs={formData['probandIs']}
          recessiveZygosity={formData["recessiveZygosity"]}
        />
      );
    }
  };

  const renderIndividualAdditional = () => {
    const probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);

    return (
      <>
      <Input type="textarea" name="additionalinfoindividual" label={<span>Additional Information about Individual{probandLabel}:</span>}
        rows="5" value={formData['additionalinfoindividual']} onChange={handleChange}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" />
      <Input type="textarea" name="otherpmids" label={<span>Enter PMID(s) that report evidence about this Individual{probandLabel}:</span>}
        value={formData['otherpmids']} placeholder="e.g. 12089445, 21217753" rows="5"
        error={renderPmidsError()} onChange={handleChange}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3" />
      </>
    );
  };

  /**
   * HTML labels for inputs follow.
   * @param {object} individual - Individual's data object
   * @param {string} labelText - Value of label
   */
  const getLabelPanelTitle = (labelText) => {
    return (
      <>
      Individual<span>{individual && individual.proband ? <i className="icon icon-proband"></i> : null}</span>&nbsp;—&nbsp;{labelText}
      </>
    );
  };

  const variantTitle = (individual && individual.proband) ? <span>Individual<i className="icon icon-proband"></i> – Variant(s) and Score(s) segregating with Proband</span> : <span>Individual — Associated Variant(s)</span>;
  const submitErrClass = 'submit-err float-right' + (!isEmpty(formErrors) || hasScoreError(scoreErrors) || badPmids.length > 0 ? '' : ' hidden');

  return (gdmIsLoading || annotationIsLoading || dataIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : (
    <>
    {renderTitle()}
    <Row className="group-curation-content">
      <Col sm="12">
        <form onSubmit={submitForm} className="form-horizontal mt-5 curation-panel">
          <CardPanel className="individual-panel">
            {renderIndividualName()}
          </CardPanel>
          <CardPanel className="individual-panel" title={getLabelPanelTitle('Disease & Phenotype(s)')}>
            {renderIndividualCommonDiseases()}
          </CardPanel>
          <CardPanel className="individual-panel" title={getLabelPanelTitle('Demographics')}>
            {renderIndividualDemographics()}
          </CardPanel>
          <CardPanel className="individual-panel" title={getLabelPanelTitle('Methods')}>
            {renderMethods()}
          </CardPanel>
          <CardPanel className="individual-panel proband-evidence-score" title={variantTitle}>
            {renderIndividualOldVariantAndScore()}
            {renderIndividualAssociatedVariantData()}
            {renderVariantScoresTable()}
          </CardPanel>
          <CardPanel className="individual-panel" title={getLabelPanelTitle('Additional Information')}>
            {renderIndividualAdditional()}
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
              {individual ?
                <DeleteCurationModal
                  gdm={gdm}
                  parent={family ? family : (group ? group : annotation)}
                  item={individual}
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
