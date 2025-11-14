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
import VARIANT_PHASE_STATUSES from '../../score/constants/variantPhaseStatuses';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import LoadingSpinner from '../../../common/LoadingSpinner';
import Alert from '../../../common/Alert';
import {
  renderLabelNote,
  renderDiseaseList,
  renderPhenotype,
  renderLabelPhenoTerms,
  renderParentEvidence,
  LabelVariantTitle,
  LabelClinVarVariant,
  LabelCARVariant,
  getPmidsFromList,
  getInvalidPmidsFromList,
  LabelCACNVariant,
  renderNotOwnerMessage,
  addPhenotypeNote,
  renderPmidsErrorMessage,
  isSemiOrSMo,
  isAutoRec
} from '../common/commonFunc';
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
import { isOwnedByCurrentCuratingEntity } from '../../../../utilities/ownershipUtilities';

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
  const [ preprintPmids, setPreprintPmids ] = useState([]);
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
    let errors = {};
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
    data["agevalue"] = individual && individual.ageValue >= 0 ? individual.ageValue : '';
    data["ageunit"] = individual && individual.ageUnit ? individual.ageUnit : 'none';

    // Methods
    data["prevtesting"] = individual && individual.method && individual.method.previousTesting === true
      ? "Yes"
      : (individual && individual.method && individual.method.previousTesting === false ? "No" : "none");
    data["prevtestingdesc"] = individual && individual.method && individual.method.previousTestingDescription ? individual.method.previousTestingDescription : '';
    data["genomewide"] = individual && individual.method && individual.method.genomeWideStudy === true
      ? "Yes"
      : (individual && individual.method && individual.method.genomeWideStudy === false ? "No" : "none");
    data["genotypingmethod1"] = individual && individual.method && individual.method.genotypingMethods && individual.method.genotypingMethods[0] ? individual.method.genotypingMethods[0] : "none";
    data["genotypingmethod2"] = individual && individual.method && individual.method.genotypingMethods && individual.method.genotypingMethods[1] ? individual.method.genotypingMethods[1] : "none";
    // Based on the loaded method data, see if the second genotyping method drop-down needs to be disabled.
    // Also see if we need to disable the Add Variant button
    setGenotyping2Disabled(!(individual && individual.method && individual.method.genotypingMethods && individual.method.genotypingMethods.length));
    data["specificmutation"] = individual && individual.method && individual.method.specificMutationsGenotypedMethod ? individual.method.specificMutationsGenotypedMethod : '';

    // Recessive Zygosity
    if (individual && individual.recessiveZygosity) {
      data["recessiveZygosity"] = individual.recessiveZygosity;
      if (data["recessiveZygosity"] === "TwoTrans") {
        setRecessiveZygosityStates("TwoTrans");
        data["phaseStatus"] = lodashGet(individual, "phaseStatus", "");
      } else {
        if (data["recessiveZygosity"] === "Homozygous") {
          setRecessiveZygosityStates("Homozygous");
          data["phaseStatus"] = "";
        } else {
          setRecessiveZygosityStates("Hemizygous");
          data["phaseStatus"] = "";
        }
      }
    } else {
      // If adding new individual, initialize data
      data["recessiveZygosity"] = "";
      setRecessiveZygosityStates("");
      data["phaseStatus"] = "";
    }

    // Associated variants and scores
    // SOP8 - change to handle family proband individual in individual UI, no need to add/remove variant from family UI
    // For Semidominant and Typified by somatic mosaicism MOI,
    // if probandIs is "Biallelic homozygous" or "Biallelic compound heterozygous"
    // then treat as AUTOSOMAL_RECESSIVE
    // Set isSDSM and isAR flags to determinate and handle different cases
    const isSDSM = isSemiOrSMo(gdm);
    const isAR = gdm?.modeInheritance
      ? isAutoRec(gdm) ||
        (isSDSM && individual?.probandIs &&
          (individual?.probandIs === "Biallelic homozygous" ||
           individual?.probandIs === "Biallelic compound heterozygous"))
      : false;

    // If proband individual, check if has variantScores or variants
    if (individual?.proband) {
      // If individual has variantScores
      if (individual.variantScores && individual.variantScores.length) {
        // This individual is proband and has variantScores, set variantScores[]
        const variantScoresObj = cloneDeep(individual.variantScores);
        setVariantCount(variantScoresObj.length);
        setVariantScores(variantScoresObj);
        // Phase status is required if recessiveZygosity is TwoTrans (AR).
        // If phaseStatus is not set then evidence is created before it's required. Set default values.
        if (data["recessiveZygosity"] === "TwoTrans" && data["phaseStatus"] === "") {
          // Default to "Proven in trans" so varinatScores will be displayed and user can remove if needed
          // Set error message to warn user
          data["phaseStatus"] = "PROVEN_IN_TRANS"
          errors["phaseStatus"] = "Phase Status is now required.  Please check if selection is correct.";
        }
      } else if (individual.variants && individual.variants.length) {
        // If individual has variants
        // If phaseStatus is Unknown then variants[] is valid, set variants to variantInfo[]
        if (individual.phaseStatus === "UNKNOWN") {
          addVariantsToVariantInfo(individual.variants);
        } else if (data["phaseStatus"] === "") {
          // If phaseStatus is not set then either it's not required (Not AR & TwoTrans).
          // Or if TwoTrans then evidence is created before phaseStatus is required.
          // Phase status is only required if recessiveZygosity is TwoTrans (AR).
          if (data["recessiveZygosity"] === "TwoTrans") {
            // Set phaseStatus to "Proven in trans" So varinatScores will be displayed and user can remove if needed
            // Set error message to warn user
            data["phaseStatus"] = "PROVEN_IN_TRANS";
            errors["phaseStatus"] = "Phase Status is now required.  Please check if selection is correct.";
          } else if (!individual.recessiveZygosity) {
            // If has no recessiveZygosity value then variants were added pre-SOP8
            // For AR, set default recessiveZygosity value according to number of variants
            // and set phase status if TwoTrans
            // Set error message to warn user
            if (isAR) {
              // Have 2 variants, set recessiveZygosity to TwoTrans
              // Set phaseStatus to "Proven in trans" So varinatScores will be displayed and user can remove if needed
              // Set error message to warn user
              if (individual.variants.length === 2) {
                data["recessiveZygosity"] = "TwoTrans";
                data["phaseStatus"] = "PROVEN_IN_TRANS";
                setRecessiveZygosityStates("TwoTrans");
                errors["phaseStatus"] = "Phase Status is now required.  Please check if selection is correct.";
              } else if (individual.variants.length === 1) {
                // Have 1 variant, set recessiveZygosity to Homozygous
                data["recessiveZygosity"] = "Homozygous";
                setRecessiveZygosityStates("Homozygous");
              }
            }
          }
          // Initialize individual's variants to variantScores
          addVariantsToVariantScores(individual.variants);
        }
      }
    } else if (individual && individual.proband === false &&
      individual.variants && individual.variants.length) {
      // Individual is not proband and has variants, set to variantInfo[]
      addVariantsToVariantInfo(individual.variants);

      // Phase status is required if recessiveZygosity is TwoTrans (AR).
      // If phaseStatus is not set then evidence is created before it's available.
      if (data["phaseStatus"] === "") {
        // If TwoTrans then default phaseStatus to unknown.
        if (individual.recessiveZygosity === "TwoTrans") {
          // Default to Unknown and set error message to warn user
          data["phaseStatus"] = "UNKNOWN";
          errors["phaseStatus"] = "Phase Status is set to default.  Please check if selection is correct.";
        } else if (!individual.recessiveZygosity) {
          // If has no recessiveZygosity value then variants were added pre-SOP8
          // For AR, default recessiveZygosity value according to number of variants
          // and set phase status if TwoTrans
          if (isAR) {
            // Have 2 variants, set recessiveZygosity to TwoTrans
            // Set phaseStatus to unknown and display variantInfo
            // Set error message to warn user
            if (individual.variants.length === 2) {
              data["recessiveZygosity"] = "TwoTrans";
              data["phaseStatus"] = "UNKNOWN";
              setRecessiveZygosityStates("TwoTrans");
              errors["phaseStatus"] = "Phase Status is now required.  Please check if selection is correct.";
            } else if (individual.variants.length === 1) {
              // Have 1 variant, set recessiveZygosity to Homozygous
              data["recessiveZygosity"] = "Homozygous";
              setRecessiveZygosityStates("Homozygous");
            }
          }
        }
      }
    } else {
      // If adding new individual, initialize variant data
      setVariantCount(0);
      setVariantInfo([]);
      setVariantScores([]);
    }

    // For SD or SM, if probandIs is "Monoallelic heterozygous" or "Hemizygous" then treat as AUTOSOMAL_DOMINANT
    // if "Biallelic homozygous" or "Biallelic compound heterozygous" then treat as AUTOSOMAL_RECESSIVE
    data["probandIs"] = individual && individual.probandIs ? individual.probandIs : "none";

    // Additional Information
    data["additionalinfoindividual"] = individual && individual.additionalInformation ? individual.additionalInformation : '';
    data["otherpmids"] = individual && individual.otherPMIDs ? individual.otherPMIDs.map((article) => { return article; }).join(', ') : '';

    setFormData(data);
    setFormErrors(errors);
    setDataIsLoading(false);
  };

  /**
   * Set related states according to given recessive zygosity value
   * @param {string} zygosity - recessive zygosity value
   */
  const setRecessiveZygosityStates = (zygosity="") => {
    if (zygosity === "TwoTrans") {
      setIsTwoTrans(true);
      setIsHomozygous(false);
      setIsHemizygous(false);
    } else if (zygosity === "Homozygous") {
      setIsTwoTrans(false);
      setIsHomozygous(true);
      setIsHemizygous(false);
    } else if (zygosity === "Hemizygous") {
      setIsTwoTrans(false);
      setIsHomozygous(false);
      setIsHemizygous(true);
    } else {
      setIsTwoTrans(false);
      setIsHomozygous(false);
      setIsHemizygous(false);
    }
  };

  /**
   * Convert givne variants to variantScores list and save
   * @param {array} variants - variant list
   */
  const addVariantsToVariantScores = (variants) => {
    // Initialize variantScores[] to given variants
    let newVariantScores = [];
    variants.forEach(data => {
      newVariantScores.push(initializeVariantScore(data));
    });
    setVariantCount(newVariantScores.length);
    setVariantScores(newVariantScores);
  }

  /**
   * Convert givne variants to  variantInfo list and save
   * @param {array} variants - variant list
   */
  const addVariantsToVariantInfo = (variants) => {
    // Initialize variantInfo[] to given variants
    let variantList = [];
    for (let i = 0; i < variants?.length; i++) {
      if (variants[i].clinvarVariantId || variants[i].carId || variants[i].cacnId) {
        variantList[i] = initializeVariantInfo(variants[i]);
      }
    }
    setVariantCount(variantList.length);
    setVariantInfo(variantList);
  }

  /**
   * Set variantInfo with given variant and return it
   * @param {object} data - variant object
   */
  const initializeVariantInfo = (data) => {
    const variantData = cloneDeep(data);
    return (
      {
        'showEdit': true,
        'clinvarVariantId': variantData.clinvarVariantId ? variantData.clinvarVariantId : null,
        'clinvarVariantTitle': variantData.clinvarVariantTitle ? variantData.clinvarVariantTitle : null,
        'preferredTitle': variantData.preferredTitle ? variantData.preferredTitle : null,
        'carId': variantData.carId ? variantData.carId : null,
        'cacnId': variantData.cacnId ? variantData.cacnId : null,
        'canonicalTranscriptTitle': variantData.canonicalTranscriptTitle ? variantData.canonicalTranscriptTitle : null,
        'maneTranscriptTitle': variantData.maneTranscriptTitle ? variantData.maneTranscriptTitle : null,
        'overlappingGenes': variantData.overlappingGenes ? variantData.overlappingGenes : null,
        'hgvsNames': variantData.hgvsNames ? variantData.hgvsNames : null,
        'PK': variantData.PK,
        'associatedPathogenicities': variantData.associatedPathogenicities && variantData.associatedPathogenicities.length ? variantData.associatedPathogenicities : []
      }
    );
  };

  /**
   * Clear error for the given fieldName
   * @param {string} fieldName - form field name
   */
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

  /**
   * Handle Proband field value change
   * @param {object} e - event
   */
  const handleProbandChange = (e) => {
    const fieldValue = e.target.value;

    // Clear variant related alert
    setVariantAlert({});

    if (fieldValue !== "Yes" && variantScores?.length > 0) {
      // If any variantScores has been added, cannot change proband to No or No selection
      alert("Please clear the variant(s) before changing individual to not proband.");
      setVariantAlert({
        type: "danger",
        message: "Please clear the variant(s) before changing individual to not proband.",
      });
    } else {
      // Change proband selection
      let newData = cloneDeep(formData);
      newData.proband = fieldValue;

      setProbandSelected(fieldValue === "Yes" ? true : false);
      setDiseaseError(null);
      // SOP8 - when individual becomes proband
      if (fieldValue === "Yes") {
        // If not TwoTrans or is TwoTranswith but phase status is not Unknown,
        // then tranfer variantInfo to variantScores
        // otherwise leave as variantInfo because cannot score if phase status is Unknown
        if (!isTwoTrans || (isTwoTrans && formData?.phaseStatus !== "UNKNOWN")) {
          if (variantInfo?.length > 0) {
            addVariantsToVariantScores(variantInfo);
            setVariantInfo([]);
          }
        }
      }
      // SOP8 - when individual becomes not proband and has retired variants, tranfer variant to variantInfo
      if (fieldValue === "No" && individual?.variants?.length > 0) {
        let newVariantInfo = [];
        individual?.variants?.forEach(data => {
          newVariantInfo.push(initializeVariantInfo(data));
        });
        setVariantInfo(newVariantInfo);
      }

      // Set new form data and clear form errors
      setFormData(newData);
      setFormErrors({});
    }
  };

  /**
   * Handle ProbandIs field value change
   * @param {object} e - event
   */
  const handleProbandIsChange = (e) => {
    const fieldValue = e.target.value;

    // Clear variant related alert
    setVariantAlert({});

    if ((fieldValue === "none") && variantCount > 0) {
      // If variantInfo or variantScores has been added, cannot change probandIs to No Selection
      alert("Please clear variant(s) before changing proband is to No Selection");
      setVariantAlert({
        type: "danger",
        message: "Please clear variant(s) before changing proband is to No Selection.",
      });
    } else if (fieldValue === "Biallelic homozygous" && variantCount > 1) {
      // For SD and SM, if probandIs is "Biallelic homozygous", only one variantInfo or variantScore is allowed
      // If 2 variantInfo or variantScores have been added, cannot change probandIs to Biallelic homozygous
      alert("Please clear one of the variants before changing proband is to Biallelic homozygous");
      setVariantAlert({
        type: "danger",
        message: "Please clear one of the variants before changing proband is to Biallelic homozygous.",
      });
    } else if (probandSelected && isTwoTrans && formData?.phaseStatus === "UNKNOWN" && variantInfo?.length > 0) {
      // If is proband, TwoTrans is checked, phase status is Unknown and variantInfo has been added, cannot change probandIs selection to other options because others allow variantScores
      alert("Please clear variant(s) before changing the proband is selection.");
      setVariantAlert({
        type: "danger",
        message: "Please clear variant(s) before changing the proband is selection.",
      });
    } else {
      // Change probandIs selection
      let newData = cloneDeep(formData);
      newData.probandIs = fieldValue;

      // Change probandIs to "No selection",
      // No TwoTrans or Homozygous option, and phase stauts so clear them
      if (fieldValue === "none") {
        setRecessiveZygosityStates("");
        newData.recessiveZygosity = null;
        newData.phaseStatus = "";
      }

      // Change probandIs to "Monoallelic heterozygous" or "Hemizygous"
      // For SD or SM, if probandIs is "Monoallelic heterozygous" or "Hemizygous" then treat as AUTOSOMAL_DOMINANT
      if (fieldValue === "Monoallelic heterozygous" || fieldValue == "Hemizygous") {
        // If Homozygous option was selected and score was 0.05,
        // clear score because 0.05 is only available if homozygous
        if (isHomozygous && variantScores[0]?.score === 0.05) {
            let newVariantScores = cloneDeep(variantScores);
            newVariantScores[0].score = null;
            newVariantScores[0].scoreExplanation = "";
            setVariantScores(newVariantScores);
        }
        // No TwoTrans or Homozygous option, and phase stauts so clear them
        setRecessiveZygosityStates("");
        newData.recessiveZygosity = null;
        newData.phaseStatus = "";
      }

      // Change probandIs to "Biallelic homozygous" or "Biallelic compound heterozygous"
      // For SD or SM, if probandIs is "Biallelic homozygous" or "Biallelic compound heterozygous" then treat as AUTOSOMAL_RECESSIVE
      if (fieldValue === "Biallelic homozygous" || fieldValue === "Biallelic compound heterozygous")
      {
        // SOP8 - If changing probandIs to "Biallelic homozygous", force Homozygous to be checked
        if (fieldValue === "Biallelic homozygous") {
          setRecessiveZygosityStates("Homozygous");
          newData.phaseStatus = "";
          newData.recessiveZygosity = "Homozygous";
        } else {
          // If changing probands to "Biallelic compound heterozygous"
          // If variantInfo or variantScores has been added, set TwoTrans or Homozygous depends on variant count
          if (variantCount === 1) {
            setRecessiveZygosityStates("Homozygous");
            newData.recessiveZygosity = "Homozygous";
            newData.phaseStatus = "";
          } else if (variantCount === 2) {
            setRecessiveZygosityStates("TwoTrans");
            newData.recessiveZygosity = "TwoTrans";
            newData.phaseStatus = "PROVEN_IN_TRANS";
          }
        }
      }

      // Set new form data and clear form errors
      setFormData(newData);
      setFormErrors({});
    }
  };

  /**
   * Handle checking/unchecking TwoTrans checkbox
   * @param {object} e - event
   */
  const handleZygosityTwoTransChange = (e) => {
    const fieldValue = e.target.value;

    // Clear variant related alert
    setVariantAlert({});

    if (isTwoTrans && variantCount > 0) {
      // If variants or variantScores has been added, cannot un-select TwoTrans
      alert("Please clear the variant(s) before unchecking the 2 variants in trans selection.");
      setVariantAlert({
        type: "danger",
        message: "Please clear the variant(s) before unchecking the 2 variants in trans selection."
      });
    } else if (!isTwoTrans && formData["probandIs"] === "Biallelic homozygous") {
      // If probandIs is "Biallelic homozygous", cannot select TwoTrans
      alert("The proband is set to Biallelic homozygous so cannot changed to 2 variants in trans selection.");
      setVariantAlert({
        type: "danger",
        message: "The proband is set to Biallelic homozygous so cannot changed to 2 variants in trans selection."
      });
    } else {
      let newData = cloneDeep(formData);
      newData.zygosityTwoTrans = fieldValue;

      // Change TwoTrans selection
      if (!isTwoTrans) {
        // Select TwoTrans, set necessary data
        newData.recessiveZygosity = "TwoTrans";
        setIsHomozygous(false);
        // If there is variantInfo or variantScores, set phase status to Proven in trans as default
        if (variantCount > 0) {
          newData.phaseStatus = "PROVEN_IN_TRANS";
        }
        // If there is one variantScores then it's possible added with homozygous,
        // Check if score is set to 0.05 then clear the score because TwoTrans doesn't support 0.05
        if (variantScores?.length === 1 && (variantScores[0]?.score === 0.05)) {
          let newVariantScores = cloneDeep(variantScores);
          newVariantScores[0].score = null;
          newVariantScores[0].scoreExplanation = "";
          setVariantScores(newVariantScores);
        }
      } else {
        // Un-select TwoTrans, clear data
        newData.recessiveZygosity = null;
        newData.phaseStatus = "";
      }
      // Set new isTwoTrans state
      setIsTwoTrans(!isTwoTrans);

      // Set new form data and clear form errors
      setFormData(newData);
      setFormErrors({});
    }
  };

  /**
   * Handle checking/unchecking Homozygous checkbox
   * @param {object} e - event
   */
  const handleZygosityHomozygousChange = (e) => {
    const fieldValue = e.target.value;

    // Clear variant related alert
    setVariantAlert({});

    if (isHomozygous && variantCount > 0) {
      // If any variantInfo or variantScore has been added, cannot un-select homozygous
      alert("Please clear the variant selection before unchecking homozygous.");
      setVariantAlert({
        type: "danger",
        message: "Please clear the variant selection before unchecking homozygous.",
      });
    } else if (isHomozygous && formData["probandIs"] === "Biallelic homozygous") {
      // If probandIs is Biallelic homozygous, cannot un-select Homozygous
      alert("The proband is set to Biallelic homozygous so Homozygous has to be selected.");
      setVariantAlert({
        type: "danger",
        message: "The proband is set to Biallelic homozygous so Homozygous has to be selected.",
      });
    } else if (!isHomozygous && probandSelected && isTwoTrans &&
      formData.phaseStatus === "UNKNOWN" && variantInfo?.length > 0) {
      // If is proband, TwoTrans is checked, phase status is Unknown and variantInfo has been added, cannot select Homozygous
      alert("Please clear variant selection before checking Homozygous.");
      setVariantAlert({
        type: "danger",
        message: "Please clear variant selection before checking Homozygous.",
      });
    } else if (!isHomozygous && variantCount === 2) {
      // If two variantInfo or variantScores have been added, cannot select Homozygous
      alert("Please clear one of the variant selection before checking Homozygous.");
      setVariantAlert({
        type: "danger",
        message: "Please clear one of the variant selection before checking Homozygous.",
      });
    } else {
      // SOP8 - For SD/AR, either TwoTrans or homozygous can be checked
      // Change Homozygous selection
      let newData = cloneDeep(formData);
      newData.zygosityHomozygous = fieldValue;
      if (!isHomozygous) {
        // Select Homozygous, set data
        setRecessiveZygosityStates("Homozygous");
        newData.recessiveZygosity = "Homozygous";
        newData.phaseStatus = "";
        setIsTwoTrans(false);
      } else {
        // Un-select Homozygous, set data
        setRecessiveZygosityStates("");
        newData.recessiveZygosity = null;
      }

      // Set new form data and clear form errors
      setFormData(newData);
      setFormErrors({});
    }
  };

  /**
   * Handle phase status (radio button) value change
   * @param {object} e - event
   */
  const handlePhaseStatusChange = (e) => {
    const fieldValue = e.target.value;

    // Clear variant related alert
    setVariantAlert({});

    if (fieldValue === "UNKNOWN" && variantScores?.length > 0) {
      // If changing phaseStatus to Unknown and there's variantScores, ask user to clear variants
      // because cannot score if Unknown
      alert("Please clear the variant(s) before changing phase status to Unknown.");
      setVariantAlert({
        type: "danger",
        message: "Please clear the variant(s) before changing phase status to Unknown."
      });
    } else if (probandSelected && variantInfo?.length > 0 && fieldValue !== "UNKNOWN") {
      // If is proband, variantInfo has been added and changing phaseStatus to "PROVEN_IN_TRANS" or
      // "Suspected in Trans", ask user to clear variants
      const fieldLabel = fieldValue === "PROVEN_IN_TRANS" ? "Proven in trans" : "Suspected in trans";
      alert(`Please clear the variant(s) before changing phase status to ${fieldLabel}.`);
      setVariantAlert({
        type: "danger",
        message: `Please clear the variant(s) before changing phase status to ${fieldLabel}.`
      });
    } else {
      // Change phaseStatus selection
      let newData = cloneDeep(formData);
      newData.phaseStatus = fieldValue;
      // Set new form data and clear form errors
      setFormData(newData);
      setFormErrors({});
    }
  };

  /**
   * Handle general form field value change
   * @param {object} e - event
   */
  const handleChange = (e) => {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;

    // Clear variant related alert
    setVariantAlert({});

    // Change given field to selected value
    let newData = cloneDeep(formData);
    newData[fieldName] = fieldValue;

    // Disable the Genotyping Method 2 if Genotyping Method 1 has no value
    if (fieldName === "genotypingmethod1") {
      setGenotyping2Disabled(fieldValue === "none" ? true : false);
      if (fieldValue === "none") {
        newData.genotypingmethod2 = "none";
      }
    }

    // Change Hemizygous selection
    if (fieldName === "zygosityHemizygous") {
      if (!isHemizygous) {
        newData.recessiveZygosity = "Hemizygous";
      } else {
        newData.recessiveZygosity = null;
      }
      setIsHemizygous(!isHemizygous);
    }

    // Change pmid list, empty bad pmid list
    if (fieldName === "otherpmids") {
      setBadPmids([]);
      setPreprintPmids([]);
    }

    // Set new form data and clear form errors
    setFormData(newData);
    setFormErrors({});
  };

  /**
   * Handle a click on copy phenotype button
   * @param {object} e - Event
   * @param {object} evidence - evidence object
   */
  const handleCopyPhenotypes = (e, evidence) => {
    e.preventDefault(); e.stopPropagation();

   if (evidence.hpoIdInDiagnosis && evidence.hpoIdInDiagnosis.length) {
     const hpoIds = evidence.hpoIdInDiagnosis.map(hpoid => {
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

  /**
   * Handle a click on copy not phenotype button
   * @param {object} e - Event
   * @param {object} evidence - evidence object
   */
  const handleCopyNotPhenotypes = (e, evidence) => {
    e.preventDefault(); e.stopPropagation();

    if (evidence.hpoIdInElimination && evidence.hpoIdInElimination.length) {
      const hpoIds = evidence.hpoIdInElimination.map(hpoid => {
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

  /**
   * Handle a click on copy demographics button
   * @param {object} e - Event
   * @param {object} evidence - evidence object
   */
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

  /**
   * Method to update a variantScore with given new one
   * @param {integer} index - index in variantScores array
   * @param {object} newVariantScoreObj - new variantScore object
   */
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
    return (
      renderPmidsErrorMessage(formErrors["otherpmids"], badPmids, preprintPmids)
    );
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
        // Keep track of checked PMIDs count, only update when data has been processed
        let i = 0;
        pmids.forEach(pmid => {
          if (pmid.length) {
            requestRecycler.capture(API.get(API_NAME, '/articles/' + pmid)).then(article => {
              // If article is a preprint then cannot be added, add to error list
              if (article?.is_preprint) {
                setPreprintPmids(preprintPmids => [...preprintPmids, pmid]);
                valid = false;
              } else {
                // If article is valid but has no PK, save article to DB
                if (!article.PK) {
                  saveArticle(article);
                }
              }
              i++;
              // If all pmids have been checked, return
              if (i === pmids.length) {
                if (valid) {
                  resolve(valid);
                } else {
                  reject(valid);
                }
              }
            }).catch(() => {
              // No article is found by this pmid, add to error list
              setBadPmids(badPmids => [...badPmids, pmid]);
              valid = false;
              i++;
              // If all pmids have been checked, return
              if (i === pmids.length) {
                reject(valid);
              }
            });
          } else {
            // Empty pmid
            i++;
          }
        })
      } else {
        // No pmid
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
    const isSDSM = isSemiOrSMo(gdm);

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

    // If GDM has Semidominant or Typified by somatic mosaicism MOI and proband individual, "The proband is" field is required
    if (isSDSM && probandSelected && formData["probandIs"] === "none") {
      errors["probandIs"] = "Selection is required for proband";
    }

    // If homozygous is selected, require one variant
    if (isHomozygous && variantCount !== 1) {
      errors["addVariant"] = "Homozygous is selected, please provide one variant";
    }

    // If 2 variants in trans option is selected, phase status is required
    if (isTwoTrans) {
      if (formData["phaseStatus"] === "") {
        errors["phaseStatus"] = "Selection is required for phase status";
      } else if (variantCount < 2) {
        errors["addVariant"] = "2 Variants in trans is selected, please provide two variants";
      }
    }

    // Individual sex is requried
    if (formData["sex"] === 'none') {
      errors["sex"] = "Selection is required";
    }

    // Validate pmids have the proper format (will check for existence later)
    const badPmids = getInvalidPmidsFromList(formData["otherpmids"]);
    if (badPmids?.length) {
      // Display error for invalid PMID list
      errors["otherpmids"] = `Not valid PubMed ID(s): "${badPmids.join(', ')}".  Use PubMed IDs (e.g. 12345678) separated by commas.`;
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
      .then(() => {
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
  // Method to update individual data to variantScore obj
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
    const isSDSM = isSemiOrSMo(gdm);
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

    // Field only available on GDM has Semidominant or Typified by somatic mosaicism MOI
    if (isSDSM) {
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

    // If there are variantScores or variants, save them
    newIndividual.variantScores = individualVariantScores ? individualVariantScores : null;
    newIndividual.variants = individualVariants ? individualVariants : null;

    /*************************************************/
    /* Individual variant form fields.               */
    /* Only applicable when individual is associated */
    /* with a family and 1 or more variants          */
    /*************************************************/
    // legacy site will set recessiveZygosity even not associated with a family or a variant
    // because individualVariants is [] when there's no variant
    // And if (Note: if homozygous, enter only 1 variant below) is not checked
    newIndividual.recessiveZygosity = formData['recessiveZygosity'] !== 'none' ? formData['recessiveZygosity'] : null;

    // Set phaseStatus
    if (newIndividual.recessiveZygosity === "TwoTrans") {
      newIndividual.phaseStatus = formData["phaseStatus"] !== "" ? formData["phaseStatus"] : null;
    } else {
      // Not requried if not TwoTrans
      newIndividual.phaseStatus = null;
    }

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
    const isSDSM = isSemiOrSMo(gdm);
    const isAR = isAutoRec(gdm);
    const noProbandIs = formData["probandIs"] === "none";
    const biallelicHetOrHom = formData["probandIs"].indexOf('Biallelic') > -1 ? true : false;
    const biallelicHomozygous = formData["probandIs"].indexOf('Biallelic homozygous') > -1 ? true : false;
    // SOP8 - cannot have 3 variants anymore
    let maxVariants = 2;
    if (isSDSM) {
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
    if (isAR) {
      maxVariants = isTwoTrans ? 2 : (isHomozygous ? 1 : 0);
    }

    let individualVariants = [];
    let savedIndividual = null;

    setIsSubmitting(true);
    if (!badPmids?.length && !preprintPmids?.length && validateFormFields()) {
      validatePmids().then(() => {
        // Get variants if they were added via the modals
        // If has variantInfo[] save as variants
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
          // If has variantScores, create or delete or update variantScores in DB
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
        updateVariantScoresWithIndividual(savedIndividual).then(() => {
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
        // Find invalid PMID
        setIsSubmitting(false);
      });
    } else {
      setIsSubmitting(false);
    }
  };

  /**
   * Set variantScore with given variant data and return it
   * @param {object} data - variant object
   */
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

  /**
   * Update variantScores list with given data and fieldNum
   * @param {object} data - variantScore object if updating one
   * @param {integer} fieldNum - index of which variantScore to update
   */
  const updateProbandVariantScores = (data, fieldNum) => {
    let count = variantCount;
    let newVariantScores = cloneDeep(variantScores);
    // If there's data, update the variantScore
    if (data) {
      // Update the form and display values with new data
      // Set empty variantScore for these old variant in case user wants to add
      newVariantScores[fieldNum] = initializeVariantScore(data);
      count++;
    } else {
      // If no data is given, remove the variantScore from list
      newVariantScores.splice(fieldNum, 1);
      newVariantScores = newVariantScores.filter(e => e !== undefined && e !== null);
      count--;
    }
    setVariantScores(newVariantScores);
    setVariantCount(count);
  };

  /**
   * Update variantInfo list with given data and fieldNum
   * @param {object} data - variantInfo object if updating one
   * @param {integer} fieldNum - index of which variantInfo to update
   */
  const updateNotProbandVariants = (data, fieldNum) => {
    let count = variantCount;
    let newVariantInfo = cloneDeep(variantInfo);
    if (data) {
      newVariantInfo[fieldNum] = {
        'showEdit': false,
        'clinvarVariantId': data.clinvarVariantId ? data.clinvarVariantId : null,
        'clinvarVariantTitle': data.clinvarVariantTitle ? data.clinvarVariantTitle : null,
        'carId': data.carId ? data.carId : null,
        'cacnId': data.cacnId ? data.cacnId : null,
        'canonicalTranscriptTitle': data.canonicalTranscriptTitle ? data.canonicalTranscriptTitle : null,
        'maneTranscriptTitle': data.maneTranscriptTitle ? data.maneTranscriptTitle : null,
        'overlappingGenes': data.overlappingGenes ? data.overlappingGenes : null,
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

  /**
   * Update the Variant ID fields upon interaction with the Add Variant modal
   * If proband individual and allow scoring then update variantScores else update variantInfo
   * @param {object} data - varianScore or variantInfo object if updating one
   * @param {integer} fieldNum - index of which variantScores or variantInfo to update
   */
  const updateVariantData = (data, fieldNum) => {
    // If TwoTrans is selected and phaseStatus is unknown, only allow to add variantInfo (no score)
    const noScoring = !probandSelected || (isTwoTrans && formData?.phaseStatus === "UNKNOWN");
    if (noScoring) {
      updateNotProbandVariants(data, fieldNum);
    } else {
      updateProbandVariantScores(data, fieldNum);
    }
    // Clear related form field errors
    clearFieldError("zygosityTwoTrans");
    clearFieldError("zygosityHemizygous");
    clearFieldError("zygosityHomozygous");
    clearFieldError("addVariant");
    setProbandSelected(probandSelected);
    // Clear variant alert
    setVariantAlert({});
  };

  const handleDeleteVariant = (e) => {
    e.preventDefault(); e.stopPropagation();
    const index = (e.target.name).substring(14);
    updateVariantData(null, index);
  };

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
          <p className="mt-3">{renderLabelNote('Individual')}</p>
        </Col>
        {!family ?
          <div>
            <Input type="select" label="Is this Individual a proband:" name="proband" onChange={handleProbandChange}
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
          {hpoWithTerms?.length ?
            <ul>
              {hpoWithTerms.map((term, i) => {
                return (
                  <li key={`phen_${i}`}>{term}</li>
                );
              })}
            </ul>
            : null}
          <HpoTermModal
            isNew={hpoWithTerms?.length ? false : true}
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
        {addPhenotypeNote('Individual')}
      </Col>
      {associatedParentObj && ((associatedParentObj.hpoIdInElimination && associatedParentObj.hpoIdInElimination.length) || associatedParentObj.termsInElimination)
        ? renderPhenotype([associatedParentObj], 'Individual', 'nothpo', associatedParentName)
        : null
      }
      <Row className="mb-3">
        <Col sm="5" className="control-label">
          <span>
            <label className=""><span className="serious-text">NOT Phenotype(s)</span>&nbsp;</label>
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
      'cacnId': lodashGet(variantScore, "variantScored.cacnId", null),
      'canonicalTranscriptTitle': lodashGet(variantScore, "variantScored.canonicalTranscriptTitle", null),
      'maneTranscriptTitle': lodashGet(variantScore, "variantScored.maneTranscriptTitle", null),
      'overlappingGenes': lodashGet(variantScore, "variantScored.overlappingGenes", null),
      'hgvsNames': lodashGet(variantScore, "variantScored.hgvsNames", null),
      'PK': lodashGet(variantScore, "variantScored.PK", null)
    }

    /* TODO: remove for now
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
          <Col sm="6" className="control-label">
            <label>{LabelVariantTitle(variantData, true)}</label>
            <span>&nbsp;{lodashGet(variantData, "preferredTitle", null)}</span>
          </Col>
          {variantData && variantData.clinvarVariantId && !variantData.cacnId ?
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
          {variantData && variantData.cacnId ?
            <>
            <Col sm="4" className="control-label"><label><LabelCACNVariant /> </label>
              <ExternalLink href={`${EXTERNAL_API_MAP['CARcopy-number']}${variantData.cacnId}`}>{variantData.cacnId}</ExternalLink>
            </Col>
            </>
          : null}
        </Row>
        {variantData && variantData.overlappingGenes ? 
            <Row className="variant-data-source mb-4">
              <Col sm="4" className="control-label"><label>Number of Overlapping Genes: </label></Col>
              <Col sm="4" className="text-no-input">{variantData.overlappingGenes.length}</Col>
            </Row>
          : null}
      </div>
      <IndividualVariantScore
        gdm={gdm}
        index={index}
        variantScore={variantScore}
        isHomozygous={isHomozygous}
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
      {formErrors.addVariant &&
        <Row className="text-danger non-bold-font ml-0">{formErrors.addVariant}</Row>
      }
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
    // If individual has variants list but no phaseStatus, then may have old format scoring
    if (individual && !individual.phaseStatus && individual.variants && individual.variants.length) {
      let showTable = true;
       // SOP8 - for not proband individual, issue with has variants but recessiveZygosity is not set
      // In case previous variants has entered required recessiveZygosity use as is;
      // If not, show as old format
      if (!individual.proband) {
        title = 'Previously added variant(s) - ';
        infoText = 'The variant(s) shown in this table was added before, please select if 2 variants or homozygous and variant(s) will be added again.';
        const isSDSM = isSemiOrSMo(gdm);
        const isAR = isAutoRec(gdm);
        if (isSDSM || isAR) {
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
            'carId': lodashGet(variantScores[i], "variantScored.carId", null),
            'cacnId': lodashGet(variantScores[i], "variantScored.cacnId", null)
          }
        }
      }
    }

    return (
      <>
      {formErrors.addVariant &&
        <Row className="text-danger non-bold-font ml-0">{formErrors.addVariant}</Row>
      }
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
    const hmzText = "Homozygous variants are scored as 0.1.";
    // SD, SM, AR, AD, XL
    const isSDSM = isSemiOrSMo(gdm);
    const isAR = isAutoRec(gdm);
    const noProbandIs = formData["probandIs"] === "none";
    const biallelicHetOrHom = formData["probandIs"].indexOf('Biallelic') > -1 ? true : false;
    const biallelicHomozygous = formData["probandIs"].indexOf('Biallelic homozygous') > -1 ? true : false;
    // If TwoTrans is selected and phaseStatus is unknown, only allow to add variantInfo (no score)
    const noScoring = !probandSelected || (isTwoTrans && formData["phaseStatus"] === "UNKNOWN");

    // SOP8 - cannot have 3 variants anymore so only can have up to 2 variants
    let maxVariants = 2;
    if (isSDSM) {
      if (noProbandIs) {
        maxVariants = 0;
      } else {
        if (biallelicHetOrHom) {
          if (biallelicHomozygous) {
            maxVariants = 1;
          } else {
            // If Homozygous is selected, only 1 variant
            // If TwoTrans is selected and phaseStatus has selected value, allow 2 variants else 0
            maxVariants = isTwoTrans
              ? (formData?.phaseStatus === "" ? 0 : 2)
              : (isHomozygous ? 1 : 0);
          }
        }
      }
    }
    if (isAR) {
      // If Homozygous is selected, only 1 variant
      // If TwoTrans is selected and phaseStatus has selected value, allow 2 variants else 0
      maxVariants = isTwoTrans
        ? (formData?.phaseStatus === "" ? 0 : 2)
        : (isHomozygous ? 1 : 0);
    }

    return (
      <div>
        {isSDSM ?
          <Input type="select" label="The proband is:" name="probandIs" onChange={handleProbandIsChange}
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

        {isAR || (isSDSM && biallelicHetOrHom) ?
          <>
            <Row className="mb-3">
              <Col sm="5" className="control-label">
                <label>
                  <span>
                    Check here if there are 2 variants that are proven or suspected to be in trans with respect to one another. If you wish to document information on variants that are not in trans, please add details to the <a href={`/curation-central/${gdm?.PK}/annotation/${annotation?.PK}`}>non-scorable evidence section of the PMID summary</a>.
                   </span>
                </label>
                {isTwoTrans &&
                  <div>
                    <Row className="text-right ml-0">Please specify the phase status of the two variants: *</Row>
                    {formErrors.phaseStatus &&
                      <Row className="text-danger non-bold-font ml-0">{formErrors.phaseStatus}</Row>
                    }
                    <Row className="text-right">
                      <Col sm="12">
                        <label className="control-label ml-2 mr-4">{VARIANT_PHASE_STATUSES["PROVEN_IN_TRANS"]}</label>
                        <input type="radio" name="phaseStatus" value="PROVEN_IN_TRANS"
                          checked={formData["phaseStatus"] !== "" && formData["phaseStatus"] === "PROVEN_IN_TRANS"}
                          onChange={handlePhaseStatusChange}
                        />
                      </Col>
                    </Row>
                    <Row>
                      <Col sm="12">
                        <label className="control-label ml-2 mr-4">{VARIANT_PHASE_STATUSES["SUSPECTED_IN_TRANS"]}</label>
                        <input
                          type="radio"
                          name="phaseStatus"
                          value="SUSPECTED_IN_TRANS"
                          checked={formData["phaseStatus"] !== "" && formData["phaseStatus"] === "SUSPECTED_IN_TRANS"}
                          onChange={handlePhaseStatusChange}
                        />
                      </Col>
                    </Row>
                    <Row>
                      <Col sm="12">
                        <label className="control-label ml-2 mr-4">{VARIANT_PHASE_STATUSES["UNKNOWN"]}</label>
                        <input
                          type="radio"
                          name="phaseStatus"
                          value="UNKNOWN"
                          checked={formData["phasePhaseStatusStatus"] !== "" && formData["phaseStatus"] === "UNKNOWN"}
                          onChange={handlePhaseStatusChange}
                        />
                      </Col>
                    </Row>
                  </div >
                }
              </Col>
              <Col sm="1" className="mt-3">
                <Input type="checkbox" name="zygosityTwoTrans" 
                  error={formErrors['zygosityTwoTrans']}
                  onChange={handleZygosityTwoTransChange} checked={isTwoTrans && isTwoTrans === true ? isTwoTrans : false}
                />
              </Col>
              <Col sm="4" className="control-label">
                <label>
                  <span>
                    Check here if homozygous
                    <Popover
                      triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
                      content={hmzText}
                      placement="top"
                    />
                    <br /><i className="non-bold-font">(Note: if homozygous, enter only 1 variant below)</i>
                  </span>
                </label>
              </Col>
              <Col sm="1" className="mt-3">
                <Input type="checkbox" name="zygosityHomozygous" 
                  error={formErrors['zygosityHomozygous']}
                  onChange={handleZygosityHomozygousChange} checked={isHomozygous && isHomozygous === true ? isHomozygous : false}
                />
              </Col>
            </Row>
          </>
          : (
            <>
            {isSDSM && noProbandIs
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
        {noScoring
          ? renderIndividualVariants(maxVariants)
          : renderProbandIndividualVariantScores(maxVariants)
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

  const renderButtons = () => {
    const ownerError = !isOwnedByCurrentCuratingEntity(gdm, auth);
    const submitErrMsg = formErrors?.phaseStatus && formErrors.phaseStatus.includes("if selection is correct")
      ? "Please check default Phase Status selection is correct."
      : "Please fix errors on the form and resubmit."
    const submitErrClass = 'submit-err float-right' +
      (!isEmpty(formErrors) || hasScoreError(scoreErrors) ||
       badPmids?.length > 0 || preprintPmids?.length ? '' : ' hidden');

    return (
      <>
          <Row>
            <Col>
              <LoadingButton
                type="submit"
                className="align-self-end mb-2 ml-2 float-right "
                variant="primary"
                text="Save"
                textWhenLoading="Submitting"
                isLoading={isSubmitting}
                disabled={ownerError}
              />
              {gdm ?
                <Button variant="secondary" className="float-right align-self-end mb-2 ml-2" onClick={() => handleCancel()} disabled={isSubmitting}>Cancel</Button>
                : null}
              {individual ?
                <DeleteCurationModal
                  gdm={gdm}
                  parent={family ? family : (group ? group : annotation)}
                  item={individual}
                  disabled={isSubmitting || ownerError}
                  ownerError={ownerError}
                />
                : null}
              <div className={submitErrClass}>{submitErrMsg}</div>
              <div className="submit-error float-right">{submitError ? submitError : null}</div>
            </Col>
          </Row>
      </>
    );
  };

  const variantTitle = (individual && individual.proband) ? <span>Individual<i className="icon icon-proband"></i> – Variant(s) and Score(s) segregating with Proband</span> : <span>Individual — Associated Variant(s)</span>;
  const ownerError = !isOwnedByCurrentCuratingEntity(gdm, auth);

  return (gdmIsLoading || annotationIsLoading || dataIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : (
    <>
    {renderTitle()}
    <Row className="group-curation-content">
      <Col sm="12">
        <form onSubmit={submitForm} className="form-horizontal mt-5 curation-panel">
          {renderNotOwnerMessage(ownerError)}
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
          {renderNotOwnerMessage(ownerError)}
          {renderButtons()}
        </form>
      </Col>
    </Row>
    </>
  );
};
