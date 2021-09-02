import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'
import { connect } from 'react-redux';
import { useSelector, useDispatch } from 'react-redux'
import { useHistory } from "react-router-dom";
import { default as lodashGet } from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import cloneDeep from 'lodash/cloneDeep';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBriefcase } from '@fortawesome/free-solid-svg-icons';
import { API } from 'aws-amplify';

import BiochemicalFunctionForm from '../components/gene-central/curations/experimental-data/BiochemicalFunctionForm';
import ProteinInteractionsForm from '../components/gene-central/curations/experimental-data/ProteinInteractionsForm';
import ExpressionForm from '../components/gene-central/curations/experimental-data/ExpressionForm';
import FunctionalAlterationForm from '../components/gene-central/curations/experimental-data/FunctionalAlterationForm';
import ModelSystemsForm from '../components/gene-central/curations/experimental-data/ModelSystemsForm';
import RescueForm from '../components/gene-central/curations/experimental-data/RescueForm';
import AssociatedVariantPanel from '../components/gene-central/curations/experimental-data/AssociatedVariantPanel';
import ExperimentalScorePanel from '../components/gene-central/curations/experimental-data/ExperimentalScorePanel';

import { API_NAME } from '../utils';
import Input from '../components/common/Input';
import CardPanel from '../components/common/CardPanel';
import { LoadingButton } from '../components/common/LoadingButton';
import { DeleteCurationModal } from '../components/gene-central/curations/common/DeleteCurationModal';
import { EXTERNAL_API_MAP } from '../constants/externalApis';
import { useAxiosRequestRecycler } from '../utilities/fetchUtilities';
import { useAmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';
import { updateAnnotationAction } from '../actions/annotationActions';
import { setGdmAction } from "../actions/gdmActions";
import {
  getGenesFromList,
  getHpoIdsFromList,
  getUberonIdsFromList,
} from '../components/gene-central/curations/common/commonFunc';
import {
  validate,
  getExperimentalSubtype,
  getExperimentalEvidenceType
} from '../components/gene-central/curations/experimental-data/utils';
import { gdmParticipantReducer } from "../utilities/gdmUtilities";


const ExperimentalCuration = ({
  auth,
  editExperimentalData = null
}) => {
  const history = useHistory();
  const dispatch = useDispatch();
  const axiosRequestRecycler = useAxiosRequestRecycler();
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const [uniprotId, setUniprotId] = useState('');
  const [experimentalTypeDescription, setExperimentalTypeDescription] = useState([]);
  const [experimentalNameVisible, setExperimentalNameVisible] = useState(false);
  const [variantInfo, setVariantInfo] = useState([]);
  const [variantCount, setVariantCount] = useState(0);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [userScoreObj, setUserScoreObj] = useState({});
  const [scoreExplanationError, setScoreExplanationError] = useState(false);
  const [badGenes, setBadGenes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isNewExperimental = isEmpty(editExperimentalData);
  const gdm = useSelector(state => state.gdm.entity)
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  });
  const disease = gdm ? gdm.disease : {};

  // Method to fetch uniprot data from mygene.info
  const getUniprotId = useCallback(() => {
    if (gdm && gdm.gene && gdm.gene.entrezId) {
      const geneId = gdm.gene.entrezId;
      const fields = 'fields=uniprot.Swiss-Prot';
      axios.get(`${EXTERNAL_API_MAP['MyGeneInfo']}${geneId}&species=human&${fields}`, { cancelToken: axiosRequestRecycler.token })
        .then((result) => {
          if (result && result.data) {
            const myGeneObj = result.data.hits[0];
            if (myGeneObj.uniprot && myGeneObj.uniprot['Swiss-Prot']) {
              setUniprotId(myGeneObj.uniprot['Swiss-Prot']);
            }
          }
        }).catch(err => {
          if (axios.isCancel(err)) {
            return;
          }
          console.log('Fetch Error for Uniprot ID from MyGeneInfo =: %o', err);
        });
    }
  }, [gdm, axiosRequestRecycler.token]);

  useEffect(() => {
    if (!uniprotId) {
      getUniprotId();
    }
    loadExperimentalData();
  }, [editExperimentalData, getUniprotId]);

  const loadExperimentalData = () => {
    const data = {};
    if (!isEmpty(editExperimentalData)) {
      data.PK = editExperimentalData.PK;
      data.experimentalName = editExperimentalData.label;
      data.experimentalType = editExperimentalData.evidenceType;
      data.assessments = editExperimentalData.assessments;
      setExperimentalNameVisible(true);
      setExperimentalTypeDescription(getExperimentalTypeDescription(editExperimentalData.evidenceType));
      if (editExperimentalData.evidenceType === 'Biochemical Function' && !isEmpty(editExperimentalData.biochemicalFunction)) {
        data.bfIdentifiedFunction = editExperimentalData.biochemicalFunction.identifiedFunction;
        data.bfIdentifiedFunctionFreeText = editExperimentalData.biochemicalFunction.identifiedFunctionFreeText;
        data.bfEvidenceForFunction = editExperimentalData.biochemicalFunction.evidenceForFunction;
        data.bfEvidenceForFunctionInPaper = editExperimentalData.biochemicalFunction.evidenceForFunctionInPaper;
        if (!isEmpty(editExperimentalData.biochemicalFunction['geneWithSameFunctionSameDisease'])) {
          setExperimentalTypeDescription(getExperimentalTypeDescription(editExperimentalData.evidenceType, 'A'));
          data.experimentalSubtype = 'A. Gene(s) with same function implicated in same disease';
          data.bfGenes = editExperimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes
            ? editExperimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes.map(gene => gene.symbol).join(', ')
            : '';
          data.bfEvidenceForOtherGenesWithSameFunction = editExperimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction;
          data.bfGeneImplicatedWithDisease = editExperimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease;
          data.bfExplanationOfOtherGenes = editExperimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes;
          data.bfEvidenceInPaperWithSameFunction = editExperimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper;
        } else if (!isEmpty(editExperimentalData.biochemicalFunction['geneFunctionConsistentWithPhenotype'])) {
          setExperimentalTypeDescription(getExperimentalTypeDescription(editExperimentalData.evidenceType, 'B'));
          data.experimentalSubtype = 'B. Gene function consistent with phenotype(s)';
          data.bfPhenotypeHpo = editExperimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO
            ? editExperimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.join(', ')
            : '';
          data.bfPhenotypeFreeText = editExperimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText;
          data.bfPhenotypeExplanation = editExperimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation;
          data.bfPhenotypeEvidenceInPaper = editExperimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper;
        }
      } else if (editExperimentalData.evidenceType === 'Protein Interactions' && !isEmpty(editExperimentalData.proteinInteractions)) {
        data.piInteractingGenes = editExperimentalData.proteinInteractions.interactingGenes
          ? editExperimentalData.proteinInteractions.interactingGenes.map(gene => gene.symbol).join(', ')
          : '';
        data.piInteractionType = editExperimentalData.proteinInteractions.interactionType;
        data.piExperimentalInteractionDetection = editExperimentalData.proteinInteractions.experimentalInteractionDetection;
        data.piGeneImplicatedInDisease = editExperimentalData.proteinInteractions.geneImplicatedInDisease;
        data.piRelationshipOfOtherGenesToDisese = editExperimentalData.proteinInteractions.relationshipOfOtherGenesToDisese;
        data.piEvidenceInPaper = editExperimentalData.proteinInteractions.evidenceInPaper;
      } else if (editExperimentalData.evidenceType === 'Expression' && !isEmpty(editExperimentalData.expression)) {
        data.expOrganOfTissue = editExperimentalData.expression.organOfTissue
          ? editExperimentalData.expression.organOfTissue.join(', ')
          : '';
        data.expOrganOfTissueFreeText = editExperimentalData.expression.organOfTissueFreeText;
        if (!isEmpty(editExperimentalData.expression['normalExpression'])) {
          setExperimentalTypeDescription(getExperimentalTypeDescription(editExperimentalData.evidenceType, 'A'));
          data.experimentalSubtype = 'A. Gene normally expressed in tissue relevant to the disease';
          data.expNormalExpressedInTissue = editExperimentalData.expression.normalExpression.expressedInTissue;
          data.expNormalEvidence = editExperimentalData.expression.normalExpression.evidence
          data.expNormalEvidenceInPaper = editExperimentalData.expression.normalExpression.evidenceInPaper;
        } else if (!isEmpty(editExperimentalData.expression['alteredExpression'])) {
          setExperimentalTypeDescription(getExperimentalTypeDescription(editExperimentalData.evidenceType, 'B'));
          data.experimentalSubtype = 'B. Altered expression in Patients';
          data.expAlteredExpressedInPatients = editExperimentalData.expression.alteredExpression.expressedInPatients;
          data.expAlteredEvidence = editExperimentalData.expression.alteredExpression.evidence;
          data.expAlteredEvidenceInPaper = editExperimentalData.expression.alteredExpression.evidenceInPaper;
        }
      } else if (editExperimentalData.evidenceType === 'Functional Alteration' && !isEmpty(editExperimentalData.functionalAlteration)) {
        data.faType = editExperimentalData.functionalAlteration.functionalAlterationType;
        data.faPatientCells = editExperimentalData.functionalAlteration.patientCells;
        data.faPatientCellsFreeText = editExperimentalData.functionalAlteration.patientCellsFreeText;
        data.faNonPatientCells = editExperimentalData.functionalAlteration.nonPatientCells;
        data.faNonPatientCellsFreeText = editExperimentalData.functionalAlteration.nonPatientCellsFreeText;
        data.faNormalFunctionOfGene = editExperimentalData.functionalAlteration.normalFunctionOfGene;
        data.faNormalFunctionOfGeneFreeText = editExperimentalData.functionalAlteration.normalFunctionOfGeneFreeText;
        data.faDescriptionOfGeneAlteration = editExperimentalData.functionalAlteration.descriptionOfGeneAlteration;
        data.faEvidenceForNormalFunction = editExperimentalData.functionalAlteration.evidenceForNormalFunction;
        data.faEvidenceInPaper = editExperimentalData.functionalAlteration.evidenceInPaper;
      } else if (editExperimentalData.evidenceType === 'Model Systems' && !isEmpty(editExperimentalData.modelSystems)) {
        data.msType = editExperimentalData.modelSystems.modelSystemsType;
        if (data.msType === 'Non-human model organism') {
          data.msNonHumanModel = editExperimentalData.modelSystems.nonHumanModel;
        } else if (data.msType === 'Cell culture model') {
          data.msCellCulture = editExperimentalData.modelSystems.cellCulture;
          data.msCellCultureFreeText = editExperimentalData.modelSystems.cellCultureFreeText;
        }
        data.msDescriptionOfGeneAlteration = editExperimentalData.modelSystems.descriptionOfGeneAlteration;
        data.msPhenotypeHpoObserved = editExperimentalData.modelSystems.phenotypeHPOObserved;
        data.msPhenotypeFreetextObserved = editExperimentalData.modelSystems.phenotypeFreetextObserved;
        data.msPhenotypeHpo = editExperimentalData.modelSystems.phenotypeHPO;
        data.msPhenotypeFreeText = editExperimentalData.modelSystems.phenotypeFreeText;
        data.msExplanation = editExperimentalData.modelSystems.explanation;
        data.msEvidenceInPaper = editExperimentalData.modelSystems.evidenceInPaper;
      } else if (editExperimentalData.evidenceType === 'Rescue' && !isEmpty(editExperimentalData.rescue)) {
        data.resType = editExperimentalData.rescue.rescueType;
        data.resHumanModel = editExperimentalData.rescue.humanModel;
        data.resNonHumanModel = editExperimentalData.rescue.nonHumanModel;
        data.resCellCulture = editExperimentalData.rescue.cellCulture;
        data.resCellCultureFreeText = editExperimentalData.rescue.cellCultureFreeText;
        data.resPatientCells = editExperimentalData.rescue.patientCells;
        data.resPatientCellsFreeText = editExperimentalData.rescue.patientCellsFreeText;
        data.resDescriptionOfGeneAlteration = editExperimentalData.rescue.descriptionOfGeneAlteration;
        data.resPhenotypeHpo = editExperimentalData.rescue.phenotypeHPO;
        data.resPhenotypeFreeText = editExperimentalData.rescue.phenotypeFreeText;
        data.resRescueMethod = editExperimentalData.rescue.rescueMethod;
        data.resWildTypeRescuePhenotype = editExperimentalData.rescue.wildTypeRescuePhenotype;
        data.resPatientVariantRescue = editExperimentalData.rescue.patientVariantRescue;
        data.resExplanation = editExperimentalData.rescue.explanation;
        data.resEvidenceInPaper = editExperimentalData.rescue.evidenceInPaper;
      }
      if (editExperimentalData.variants && editExperimentalData.variants.length) {
        let count = 0;
        const variantList = editExperimentalData.variants.map((variant) => {
          count += 1;
          return ({
            'clinvarVariantId': variant.clinvarVariantId ? variant.clinvarVariantId : null,
            'clinvarVariantTitle': data.clinvarVariantTitle ? variant.clinvarVariantTitle : null,
            'carId': variant.carId ? variant.carId : null,
            'canonicalTranscriptTitle': variant.canonicalTranscriptTitle ? variant.canonicalTranscriptTitle : null,
            'maneTranscriptTitle': variant.maneTranscriptTitle ? variant.maneTranscriptTitle : null,
            'hgvsNames': variant.hgvsNames ? variant.hgvsNames : null,
            'preferredTitle' : variant.preferredTitle ? variant.preferredTitle : null,
            'PK': variant.PK
          });
        });
        setVariantCount(count);
        setVariantInfo(variantList);
      }
      data.affiliation = editExperimentalData.affiliation;
      data.scores = editExperimentalData.scores;
      data.submittedBy = editExperimentalData.submitted_by;
      setFormData(data);
    }
  }
  
  /**
   * sets the description text below the experimental data type dropdown
   */
  const getExperimentalTypeDescription = (item, subitem) => {
    subitem = typeof subitem !== 'undefined' ? subitem : '';
    const experimentalTypeDescriptionList = {
      'Biochemical Function': [
        'A. The gene product performs a biochemical function shared with other known genes in the disease of interest',
        'B. The gene product is consistent with the observed phenotype(s)'
      ],
      'Protein Interactions': ['The gene product interacts with proteins previously implicated (genetically or biochemically) in the disease of interest'],
      'Expression': [
        'A. The gene is expressed in tissues relevant to the disease of interest',
        'B. The gene is altered in expression in patients who have the disease'
      ],
      'Functional Alteration': ['The gene and/or gene product function is demonstrably altered in cultured patient or non-patient cells carrying candidate variant(s)'],
      'Model Systems': ['Non-human model organism OR cell culture model with a similarly disrupted copy of the affected gene shows a phenotype consistent with human disease state'],
      'Rescue': ['The phenotype in humans, non-human model organisms, cell culture models, or patient cells can be rescued by exogenous wild-type gene or gene product']
    };
    if (subitem === 'A') {
      return [experimentalTypeDescriptionList[item][0]];
    } else if (subitem === 'B') {
      return [experimentalTypeDescriptionList[item][1]];
    } else {
      return experimentalTypeDescriptionList[item];
    }
  }

  const clearFieldError = (fieldName) => {
    if (formErrors[fieldName]) {
      const errors = Object.keys(formErrors).reduce((obj, key) => {
        if (key !== fieldName) {
          obj[key] = formErrors[key];
        }
        return obj;
      }, {});
      setFormErrors(errors);
    }
  };

  const handleChange = (e) => {
    const newData = cloneDeep(formData);
    newData[e.target.name] = e.target.type === 'checkbox'
      ? !newData[e.target.name]
      : e.target.value;
      
    if (e.target.name === "bfGenes" || e.target.name === 'piInteractingGenes') {
      setBadGenes([]);
    }

    // Experimental Type drop down
    if (e.target.name === 'experimentalType') {
      newData.experimentalName = '';
      if (e.target.value === 'none') {
        newData.experimentalSubtype = 'none';
        setExperimentalNameVisible(false);
        setExperimentalTypeDescription([]);
      } else if (e.target.value === 'Biochemical Function' || e.target.value === 'Expression') {
        newData.experimentalSubtype = 'none';
        setExperimentalNameVisible(false);
        setExperimentalTypeDescription(getExperimentalTypeDescription(e.target.value));
      } else {
        setExperimentalNameVisible(true);
        setExperimentalTypeDescription(getExperimentalTypeDescription(e.target.value));
      }
    }

    // Experimental Sub Type drop down
    if (e.target.name === 'experimentalSubtype' && newData && newData.experimentalType) {
      newData.experimentalName = '';
      setExperimentalTypeDescription(getExperimentalTypeDescription(newData.experimentalType, e.target.value.charAt(0)));
      if (!newData.experimentalSubtype || newData.experimentalSubtype === 'none') {
        setExperimentalNameVisible(false);
      } else {
        setExperimentalNameVisible(true);
      }
    }

    clearFieldError(e.target.name);
    setFormData(newData);
  };

  const handleUserScoreObj = (newUserScoreObj) => {
    setUserScoreObj(newUserScoreObj);
    if (!newUserScoreObj.modifiedScore || newUserScoreObj.modifiedScore === 'none' || 
      (newUserScoreObj.modifiedScore !== 'none' && newUserScoreObj.scoreExplanation)) {
      setScoreExplanationError(false);
    }
  };

  // Update the Variant ID fields upon interaction with the Add Variant modal
  // const addVariant = (data, fieldNum) => {
  const updateVariantInfo = (data) => {
    const newVariantInfo = cloneDeep(variantInfo);
    if (data) {
      // Update the form and display values with new data
      newVariantInfo.push({
        'clinvarVariantId': data.clinvarVariantId ? data.clinvarVariantId : null,
        'clinvarVariantTitle': data.clinvarVariantTitle ? data.clinvarVariantTitle : null,
        'carId': data.carId ? data.carId : null,
        'canonicalTranscriptTitle': data.canonicalTranscriptTitle ? data.canonicalTranscriptTitle : null,
        'maneTranscriptTitle': data.maneTranscriptTitle ? data.maneTranscriptTitle : null,
        'hgvsNames': data.hgvsNames ? data.hgvsNames : null,
        'preferredTitle' : data.preferredTitle ? data.preferredTitle : null,
        'PK': data.PK
      });
      setVariantCount(variantCount + 1);  // We have one more variant to show
      setVariantInfo(newVariantInfo);
    }
  };

  const validateGenes = (geneSymbols) => {
    let valid = true;
    return new Promise((resolve, reject) => {
      if (geneSymbols && geneSymbols.length) {
        let i = 0;
        geneSymbols.forEach(symbol => {
          requestRecycler.capture(API.get(API_NAME, '/genes/' + symbol))
          .then(() => {
            i++;
            if (i === geneSymbols.length) {
              if (valid) {
                resolve(valid);
              } else {
                reject(valid);
              }
            }
          }).catch(() => {
            setBadGenes(badGenes => [...badGenes, symbol]);
            valid = false;
            i++;
            if (i === geneSymbols.length) {
              reject(valid);
            }
          });
        });
      } else {
        resolve(valid);
      }
    });
  }

  const handleDeleteVariant = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const newVariantInfo = cloneDeep(variantInfo);
    const variantPk = (e.target.name).substring(14);
    const indexToDelete = variantInfo.findIndex(variant => variant.PK === variantPk);
    if (indexToDelete > -1) {
      newVariantInfo.splice(indexToDelete, 1);
    }
    setVariantInfo(newVariantInfo);
  };

  const handleCancel = () => {
    let cancelUrl = "/dashboard";
    if (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null)) {
      cancelUrl = `/curation-central/${gdm.PK}/annotation/${annotation.PK}`;
    }
    requestRecycler.cancelAll();
    history.push(cancelUrl);
  };

  // Copied from GroupCuration.js
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

  const saveEvidenceScores = (newExperimental) => {
    // Find any pre-existing score(s) and put their PK values into an array
    const evidenceScores = (editExperimentalData && editExperimentalData.scores && editExperimentalData.scores.length)
      ? editExperimentalData.scores.map(score => score.PK)
      : [];
    /*************************************************************/
    /* Either update or create the score status object in the DB */
    /*************************************************************/
    if (!isEmpty(userScoreObj) && userScoreObj.scoreStatus !== 'none') {
      const isNewScore = !userScoreObj.PK;
      const url = isNewScore
        ? '/evidencescore'
        : `/evidencescore/${userScoreObj.PK}`;
      const params = {
        body: {
          userScoreObj: {
            scoreStatus: userScoreObj.scoreStatus,
            score: userScoreObj.modifiedScore !== 'none' ? parseFloat(userScoreObj.modifiedScore) : null,
            calculatedScore: userScoreObj.defaultScore,
            scoreExplanation: userScoreObj.scoreExplanation || null,
            evidenceType: 'Experimental',
            evidenceScored: isNewExperimental ? null : formData.PK,
            PK: userScoreObj.PK,
            affiliation: lodashGet(auth, "currentAffiliation.affiliation_id", null),
            submitted_by: (userScoreObj.submitted_by && userScoreObj.submitted_by.PK)
              ? userScoreObj.submitted_by.PK
              : lodashGet(auth, "PK", null),
            modified_by: lodashGet(auth, "PK", null),
            status: null   // Hack to fix a bug where an existing score has status 'deleted'
          }
        }
      };
      // Update and create score object when the score object has the scoreStatus key/value pair
      if (isNewScore) {
        return requestRecycler.capture(API.post(API_NAME, url, params)).then(response => {
          if (response) {
            evidenceScores.push(response.PK);
            return evidenceScores;
          }
        }).catch(error => {
          if (API.isCancel(error)) {
            throw error;
          }
          throw new Error('Failed to create new evidence score');
        });
      } else {
        return requestRecycler.capture(API.put(API_NAME, url, params)).then(response => {
          if (response) {
            return evidenceScores;
          }
        }).catch(error => {
          if (API.isCancel(error)) {
            throw error;
          }
          throw new Error('Failed to update new evidence score');
        });
      }
    } else if (!isEmpty(userScoreObj) && (!userScoreObj.scoreStatus || userScoreObj.scoreStatus === 'none')) {
      // If an existing score object has no scoreStatus key/value pair, the user likely removed score
      // Then delete the score entry from the score list associated with the evidence
      if (userScoreObj.PK) {
        const url = `/evidencescore/${userScoreObj.PK}`;
        userScoreObj['status'] = 'deleted';
        userScoreObj['modified_by'] = lodashGet(auth, "PK", null);
        const params = {
          body: { userScoreObj }
        };
        return requestRecycler.capture(API.put(API_NAME, url, params)).then(response => {
          if (response) {
            const indexToDelete = evidenceScores.findIndex(score => score === response.PK);
            evidenceScores.splice(indexToDelete, 1);
            // Return the evidence score array without the deleted object
            return evidenceScores;
          }
        }).catch(error => {
          if (API.isCancel(error)) {
            throw error;
          }
          throw new Error('Failed to delete new evidence score');
        });
      }
    } else {
      // No score is added/updated/deleted, return original list
      return Promise.resolve(evidenceScores);
    }
  };

  // Called to update experiemental PK to evidenceScore obj
  const updateScoreWithExperimental = (experimentalObj) => {
    if (experimentalObj.scores && !isEmpty(experimentalObj.scores)) {
      const objPromises = experimentalObj.scores.map(async obj => {
        // Update score object if it has no evidenceScored PK
        if (!obj.evidenceScored) {
          let newScore = cloneDeep(obj);
          newScore.evidenceScored = experimentalObj.PK;
          const url = `/evidencescore/${newScore.PK}`;
          return await requestRecycler.capture(API.put(API_NAME, url, { body: { newScore } }));
        }
      });
      return Promise.all(objPromises);
    } else {
      return Promise.resolve(null);
    }
  };

  const saveExperimentalEvidence = (newExperimental, scoreArray) => {
    // Add variants if they've been found
    // Get variant uuid's if they were added via the modals
    if (variantInfo && variantInfo.length) {
      newExperimental.variants = variantInfo.map(variant => variant.PK);
    }

    newExperimental.scores = scoreArray;

    newExperimental.submitted_by = isNewExperimental
      ? lodashGet(auth, "PK", null)
      : formData.submittedBy && formData.submittedBy.PK;
    newExperimental.modified_by = lodashGet(auth, "PK", null);
    newExperimental.item_type = 'experimental';

    const url = isNewExperimental
      ? '/experimental'
      : `/experimental/${newExperimental.PK}`;
    const params = {
      body: { newExperimental }
    };
    if (isNewExperimental) {
      return requestRecycler.capture(API.post(API_NAME, url, params)).then(response => {
        return response;
      }).catch(error => {
        if (API.isCancel(error)) {
          throw error;
        }
        throw new Error('Failed to create new experimental evidence');
      });
    } else {
      return requestRecycler.capture(API.put(API_NAME, url, params)).then(response => {
        return response;
      }).catch(error => {
        if (API.isCancel(error)) {
          throw error;
        }
        throw new Error('Failed to update new experimental evidence');
      });
    }
  };

  const saveToAnnotation = async (savedExperimental) => {
    let annotationResult = null;
    if (isNewExperimental) {
      const updateAnnotation = {
        ...annotation,
        experimentalData: [...(annotation.experimentalData || []), savedExperimental.PK], 
        modified_by: lodashGet(auth, "PK", null),
      };

      // PUT annotation
      try {
        annotationResult = await requestRecycler.capture(
          API.put(API_NAME, `/annotations/${annotation.PK}`, { body: { updateAnnotation } })
        );
      } catch (error) {
        throw new Error('Failed to append experimental data to annotation');
      }
      if (!annotationResult ||
        !Array.isArray(annotationResult.experimentalData) ||
        annotationResult.experimentalData.length !== updateAnnotation.experimentalData.length) {
        throw new Error('Empty response from server when updating annotation');
      } else {
        // update redux for annotations
        dispatch(updateAnnotationAction(annotationResult));
      }
    } else {
      dispatch(updateAnnotationAction({
        ...annotation,
        // replace the updated experimenta data in the experimentalData list
        experimentalData: annotation.experimentalData.map((experimental) => {
          if (experimental.PK === savedExperimental.PK) {
            return savedExperimental;
          }
          return experimental;
        })
      }));
    }
    return annotationResult;
  };

  const saveToGdm = async () => {
    let gdmResult = null;
    
    // update gdm fields related to participants
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
      throw new Error('Failed to append contributor to GDM');
    }
    if (!gdmResult) {
        throw new Error('Empty response from server when updating contributors in gdm');
    } else {
      // update redux for gdm
      dispatch(setGdmAction(gdmResult));
    }
    return gdmResult;
  };

  const submitForm = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isEmpty(userScoreObj)) {
      if (userScoreObj.modifiedScore && userScoreObj.modifiedScore !== 'none' && !userScoreObj.scoreExplanation) {
        setScoreExplanationError(true);
        return;
      }
    }

    const isValid = validate(formErrors, setFormErrors, formData);
    if (isValid && !isEmpty(formData)) {
      const newExperimental = {
        biochemicalFunction: null,
        proteinInteractions: null,
        expression: null,
        functionalAlteration: null,
        modelSystems: null,
        rescue: null
      };
      newExperimental.PK = formData.PK;
      newExperimental.label = formData.experimentalName;
      newExperimental.evidenceType = formData.experimentalType;
      let geneSymbols;
      // preserve legacy assessment data
      if (!isNewExperimental) {
        if (formData.assessments && formData.assessments.length) {
          newExperimental.assessments = formData.assessments.map(assessment => assessment.PK);
        }
      }
      // Biochemical Function Data
      if (newExperimental.evidenceType === 'Biochemical Function') {
        // newExperimental object for type Biochemical Function
        newExperimental.biochemicalFunction = {};
        if (formData.bfIdentifiedFunction) {
          newExperimental.biochemicalFunction.identifiedFunction = formData.bfIdentifiedFunction;
        }
        if (formData.bfIdentifiedFunctionFreeText) {
          newExperimental.biochemicalFunction.identifiedFunctionFreeText = formData.bfIdentifiedFunctionFreeText;
        }
        if (formData.bfEvidenceForFunction) {
          newExperimental.biochemicalFunction.evidenceForFunction = formData.bfEvidenceForFunction;
        }
        if (formData.bfEvidenceForFunctionInPaper) {
          newExperimental.biochemicalFunction.evidenceForFunctionInPaper = formData.bfEvidenceForFunctionInPaper;
        }
        if (formData.experimentalSubtype && formData.experimentalSubtype.charAt(0) === 'A') {
          newExperimental.biochemicalFunction['geneWithSameFunctionSameDisease'] = {};
          geneSymbols = getGenesFromList(formData.bfGenes);
          if (geneSymbols) {
            newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes = geneSymbols;
          }
          if (formData.bfEvidenceForOtherGenesWithSameFunction) {
            newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction = formData.bfEvidenceForOtherGenesWithSameFunction;
          }
          newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease = formData.bfGeneImplicatedWithDisease;
          if (formData.bfExplanationOfOtherGenes) {
            newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes = formData.bfExplanationOfOtherGenes;
          }
          if (formData.bfEvidenceInPaperWithSameFunction) {
            newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper = formData.bfEvidenceInPaperWithSameFunction;
          }
        } else if (formData.experimentalSubtype && formData.experimentalSubtype.charAt(0) === 'B') {
          newExperimental.biochemicalFunction['geneFunctionConsistentWithPhenotype'] = {};
          const hpoIds = getHpoIdsFromList(formData.bfPhenotypeHpo);
          if (hpoIds) {
            newExperimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO = hpoIds;
          }
          if (formData.bfPhenotypeFreeText) {
            newExperimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText = formData.bfPhenotypeFreeText;
          }
          if (formData.bfPhenotypeExplanation) {
            newExperimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation = formData.bfPhenotypeExplanation;
          }
          if (formData.bfPhenotypeEvidenceInPaper) {
            newExperimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper = formData.bfPhenotypeEvidenceInPaper;
          }
        }
      } else if (newExperimental.evidenceType === 'Protein Interactions') {
        // newExperimental object for type Protein Interactions
        newExperimental.proteinInteractions = {};
        geneSymbols = getGenesFromList(formData.piInteractingGenes);
        if (geneSymbols) {
          newExperimental.proteinInteractions.interactingGenes = geneSymbols;
        }
        if (formData.piInteractionType) {
          newExperimental.proteinInteractions.interactionType = formData.piInteractionType;
        }
        if (formData.piExperimentalInteractionDetection) {
          newExperimental.proteinInteractions.experimentalInteractionDetection = formData.piExperimentalInteractionDetection;
        }
        newExperimental.proteinInteractions.geneImplicatedInDisease = formData.piGeneImplicatedInDisease;
        if (formData.piRelationshipOfOtherGenesToDisese) {
          newExperimental.proteinInteractions.relationshipOfOtherGenesToDisese = formData.piRelationshipOfOtherGenesToDisese;
        }
        if (formData.piEvidenceInPaper) {
          newExperimental.proteinInteractions.evidenceInPaper = formData.piEvidenceInPaper;
        }
      } else if (newExperimental.evidenceType === 'Expression') {
        // newExperimental object for type Expression
        newExperimental.expression = {};
        const uberonIds = getUberonIdsFromList(formData.expOrganOfTissue);
        if (uberonIds) {
          newExperimental.expression.organOfTissue = uberonIds;
        }
        if (formData.expOrganOfTissueFreeText) {
            newExperimental.expression.organOfTissueFreeText = formData.expOrganOfTissueFreeText;
        }
        if (formData.experimentalSubtype && experimentalSubtype.charAt(0) === 'A') {
          newExperimental.expression['normalExpression'] = {};
          newExperimental.expression.normalExpression.expressedInTissue = formData.expNormalExpressedInTissue || false;
          if (formData.expNormalEvidence) {
            newExperimental.expression.normalExpression.evidence = formData.expNormalEvidence;
          }
          if (formData.expNormalEvidenceInPaper) {
            newExperimental.expression.normalExpression.evidenceInPaper = formData.expNormalEvidenceInPaper;
          }
        } else if (formData.experimentalSubtype && experimentalSubtype.charAt(0) === 'B') {
          newExperimental.expression['alteredExpression'] = {};
          newExperimental.expression.alteredExpression.expressedInPatients = formData.expAlteredExpressedInPatients || false;
          if (formData.expAlteredEvidence) {
            newExperimental.expression.alteredExpression.evidence = formData.expAlteredEvidence;
          }
          if (formData.expAlteredEvidenceInPaper) {
            newExperimental.expression.alteredExpression.evidenceInPaper = formData.expAlteredEvidenceInPaper
          }
        }
      } else if (newExperimental.evidenceType === 'Functional Alteration') {
        // newExperimental object for type Functional Alteration
        newExperimental.functionalAlteration = {};
        if (formData.faType) {
          newExperimental.functionalAlteration.functionalAlterationType = formData.faType;
        }
        if (formData.faPatientCells) {
          newExperimental.functionalAlteration.patientCells = formData.faPatientCells.indexOf('_') > -1
            ? formData.faPatientCells.replace('_', ':')
            : formData.faPatientCells;
        }
        if (formData.faPatientCellsFreeText) {
          newExperimental.functionalAlteration.patientCellsFreeText = formData.faPatientCellsFreeText;
        }
        if (formData.faNonPatientCells) {
          newExperimental.functionalAlteration.nonPatientCells = formData.faNonPatientCells.indexOf('_') > -1
            ? formData.faNonPatientCells.replace('_', ':')
            : formData.faNonPatientCells;
        }
        if (formData.faNonPatientCellsFreeText) {
          newExperimental.functionalAlteration.nonPatientCellsFreeText = formData.faNonPatientCellsFreeText;
        }
        if (formData.faNormalFunctionOfGene) {
          newExperimental.functionalAlteration.normalFunctionOfGene = formData.faNormalFunctionOfGene;
        }
        if (formData.faNormalFunctionOfGeneFreeText) {
          newExperimental.functionalAlteration.normalFunctionOfGeneFreeText = formData.faNormalFunctionOfGeneFreeText;
        }
        if (formData.faDescriptionOfGeneAlteration) {
          newExperimental.functionalAlteration.descriptionOfGeneAlteration = formData.faDescriptionOfGeneAlteration;
        }
        if (formData.faEvidenceForNormalFunction) {
          newExperimental.functionalAlteration.evidenceForNormalFunction = formData.faEvidenceForNormalFunction;
        }
        if (formData.faEvidenceInPaper) {
          newExperimental.functionalAlteration.evidenceInPaper = formData.faEvidenceInPaper;
        }
      } else if (newExperimental.evidenceType === 'Model Systems') {
        // newExperimental object for type Model Systems
        newExperimental.modelSystems = {};
        if (formData.msType) {
          newExperimental.modelSystems.modelSystemsType = formData.msType;
        }
        if (formData.msType === 'Non-human model organism') {
          if (formData.msNonHumanModel) {
            newExperimental.modelSystems.nonHumanModel = formData.msNonHumanModel;
          }
        } else if (formData.msType === 'Cell culture model') {
          if (formData.msCellCulture) {
            newExperimental.modelSystems.cellCulture = formData.msCellCulture.indexOf('_') > -1
              ? formData.msCellCulture.replace('_', ':')
              : formData.msCellCulture;
          }
          if (formData.msCellCultureFreeText) {
            newExperimental.modelSystems.cellCultureFreeText = formData.msCellCultureFreeText;
          }
        }
        if (formData.msDescriptionOfGeneAlteration) {
          newExperimental.modelSystems.descriptionOfGeneAlteration = formData.msDescriptionOfGeneAlteration;
        }
        if (formData.msPhenotypeHpoObserved) {
          newExperimental.modelSystems.phenotypeHPOObserved = formData.msPhenotypeHpoObserved;
        }
        if (formData.msPhenotypeFreetextObserved) {
          newExperimental.modelSystems.phenotypeFreetextObserved = formData.msPhenotypeFreetextObserved;
        }
        if (formData.msPhenotypeHpo) {
          newExperimental.modelSystems.phenotypeHPO = formData.msPhenotypeHpo;
        }
        if (formData.msPhenotypeFreeText) {
          newExperimental.modelSystems.phenotypeFreeText = formData.msPhenotypeFreeText;
        }
        if (formData.msExplanation) {
          newExperimental.modelSystems.explanation = formData.msExplanation;
        }
        if (formData.msEvidenceInPaper) {
          newExperimental.modelSystems.evidenceInPaper = formData.msEvidenceInPaper;
        }
      } else if (newExperimental.evidenceType === 'Rescue') {
        // newExperimental object for type Rescue
        newExperimental.rescue = {};
        if (formData.resType) {
          newExperimental.rescue.rescueType = formData.resType;
        }
        if (formData.resHumanModel) {
          newExperimental.rescue.humanModel = formData.resHumanModel;
        }
        if (formData.resNonHumanModel) {
            newExperimental.rescue.nonHumanModel = formData.resNonHumanModel;
        }
        if (formData.resCellCulture) {
          newExperimental.rescue.cellCulture = formData.resCellCulture.indexOf('_') > -1
            ? formData.resCellCulture.replace('_', ':')
            : formData.resCellCulture;
        }
        if (formData.resCellCultureFreeText) {
          newExperimental.rescue.cellCultureFreeText = formData.resCellCultureFreeText;
        }
        if (formData.resPatientCells) {
          newExperimental.rescue.patientCells = formData.resPatientCells.indexOf('_') > -1
            ? formData.resPatientCells.replace('_', ':')
            : formData.resPatientCells;
        }
        if (formData.resPatientCellsFreeText) {
          newExperimental.rescue.patientCellsFreeText = formData.resPatientCellsFreeText;
        }
        if (formData.resDescriptionOfGeneAlteration) {
          newExperimental.rescue.descriptionOfGeneAlteration = formData.resDescriptionOfGeneAlteration;
        }
        if (formData.resPhenotypeHpo) {
          newExperimental.rescue.phenotypeHPO = formData.resPhenotypeHpo;
        }
        if (formData.resPhenotypeFreeText) {
          newExperimental.rescue.phenotypeFreeText = formData.resPhenotypeFreeText;
        }
        if (formData.resRescueMethod) {
          newExperimental.rescue.rescueMethod = formData.resRescueMethod;
        }
        newExperimental.rescue.wildTypeRescuePhenotype = formData.resWildTypeRescuePhenotype;
        newExperimental.rescue.patientVariantRescue = formData.resPatientVariantRescue;
        if (formData.resExplanation) {
          newExperimental.rescue.explanation = formData.resExplanation;
        }
        if (formData.resEvidenceInPaper) {
          newExperimental.rescue.evidenceInPaper = formData.resEvidenceInPaper;
        }
      }
      // Add user's affiliation
      if (auth && auth.currentAffiliation && !formData.affiliation) {
        newExperimental.affiliation = auth.currentAffiliation.affiliation_id;
      }
      // SOP8 - Add associated annotation to experimental
      newExperimental.associatedParent = lodashGet(annotation, "PK", null);

      let savedExperimental = null;
      setIsSubmitting(true);
      validateGenes(geneSymbols).then(() => {
        saveEvidenceScores(newExperimental).then((scoreArray) => {
          saveExperimentalEvidence(newExperimental, scoreArray).then((experimentalObj) => {
            savedExperimental = experimentalObj;
            saveToAnnotation(savedExperimental).then(() => {
              saveToGdm().then(() => {
                updateScoreWithExperimental(savedExperimental).then((results) => {
                  const redirectUrl = (editExperimentalData && editExperimentalData.PK)
                    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
                    : (savedExperimental && savedExperimental.PK
                      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/experimental-curation/${savedExperimental.PK}/submit`
                      : `/curation-central/${gdm.PK}/annotation/${annotation.PK}`);
                  setIsSubmitting(false);
                  history.push(redirectUrl);
                }).catch(err =>{
                  if (API.isCancel(err)) {
                    //throw error;
                    console.log("Cancel");
                    setIsSubmitting(false);
                  }
                  //throw new Error
                  handleSubmitError('Save updated experimental evidenceScores failed:', err);
                });
              }).catch(err =>{
                if (API.isCancel(err)) {
                  //throw error;
                  console.log("Cancel");
                  setIsSubmitting(false);
                }
                //throw new Error
                handleSubmitError('Save gdm failed:', err);
              });
            }).catch(err => {
              if (API.isCancel(err)) {
                //throw error;
                console.log("Cancel");
                setIsSubmitting(false);
              }
              //throw new Error
              handleSubmitError('Save annotation failed:', err);
            });
          }).catch(err => {
            if (API.isCancel(err)) {
              //throw error;
              console.log("Cancel");
              setIsSubmitting(false);
            }
            //throw new Error
            handleSubmitError('Save experimental evidence failed:', err);
          });
        }).catch(err => {
          if (API.isCancel(err)) {
            //throw error;
            console.log("Cancel");
            setIsSubmitting(false);
          }
          //throw new Error
          handleSubmitError('Save evidence score failed:', err);
        });
      }).catch(err => {
        console.log('Invalid Gene(s):', err);
        setIsSubmitting(false);
      });
    }
  };

  const renderGenesError = (type) => {
    if (formErrors[type]) {
      return formErrors[type]
    } else if (badGenes.length > 0) {
      return (
        <span>{badGenes.join(', ')} not found</span>
      );
    } else {
      return null;
    }
  };

  const errorDisplay = (!isEmpty(formErrors) || scoreExplanationError || badGenes.length > 0 ? '': ' hidden');
  const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
    : null;

  const assessments = editExperimentalData && editExperimentalData.assessments && editExperimentalData.assessments.length
    ? editExperimentalData.assessments
    : [];
  const validAssessments = assessments && assessments.length
    ? assessments.filter(assessment => assessment.value !== 'Not Assessed')
    : [];

  const experimentalSubtype = getExperimentalSubtype(formData, true);
  const experimentalEvidenceType = getExperimentalEvidenceType(formData && formData.experimentalType, experimentalSubtype);

  return (
    <>
      <div className="viewer-titles">
        <h1>{(editExperimentalData ? 'Edit' : 'Curate') + ' Experimental Data Information'}</h1>
        <h2>
          {curationLink && <a href={curationLink}><FontAwesomeIcon icon={faBriefcase}/></a>}
          <span> &#x2F;&#x2F; </span>
          {formData && formData.experimentalName
            ? <span>Experiment {formData.experimentalName}</span>
            : <span className="no-entry">No entry</span>
          }
          {formData && formData.experimentalType && formData.experimentalType !== 'none' && <span> ({formData.experimentalType})</span>}
        </h2>
      </div>
      <Row className="experimental-curation-content">
        <Col sm="12">
          <form onSubmit={submitForm} className="form-horizontal mt-5">
            <CardPanel>
              <Input
                type="select"
                name="experimentalType"
                label="Experiment type:"
                value={formData.experimentalType}
                onChange={handleChange}
                groupClassName="row mb-4"
                labelClassName="col-sm-5 control-label"
                wrapperClassName="col-sm-7"
              >
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Biochemical Function">Biochemical Function</option>
                <option value="Protein Interactions">Protein Interactions</option>
                <option value="Expression">Expression</option>
                <option value="Functional Alteration">Functional Alteration</option>
                <option value="Model Systems">Model Systems</option>
                <option value="Rescue">Rescue</option>
              </Input>
              {formData && (!formData.experimentalType || formData.experimentalType === 'none') &&
                <Col sm={{ span: 7, offset: 5 }}>
                  <p className="alert alert-info">
                    <strong>Biochemical Function</strong>: The gene product performs a biochemical function shared with other known genes in the disease of interest, OR the gene product is consistent with the observed phenotype(s)<br /><br />
                    <strong>Protein Interactions</strong>: The gene product interacts with proteins previously implicated (genetically or biochemically) in the disease of interest<br /><br />
                    <strong>Expression</strong>: The gene is expressed in tissues relevant to the disease of interest, OR the gene is altered in expression in patients who have the disease<br /><br />
                    <strong>Functional Alteration of gene/gene product</strong>: The gene and/or gene product function is demonstrably altered in cultured patient or non-patient cells carrying candidate variant(s)<br /><br />
                    <strong>Model Systems</strong>: Non-human model organism OR cell culture model with a similarly disrupted copy of the affected gene shows a phenotype consistent with human disease state<br /><br />
                    <strong>Rescue</strong>: The phenotype in humans, non-human model organisms, cell culture models, or patient cells can be rescued by exogenous wild-type gene or gene product
                  </p>
                </Col>
              }
              <div className="mb-4">
                {experimentalTypeDescription.map((description, i) => (
                  <Col key={i} sm={{ span: 7, offset: 5}}>
                    <p className="alert alert-info">{description}</p>
                  </Col>
                ))}
              </div>
              {formData && (formData.experimentalType === 'Biochemical Function' || formData.experimentalType === 'Expression') &&
                <Input
                  type="select"
                  name="experimentalSubtype"
                  label="Please select which one (A or B) you would like to curate"
                  value={formData.experimentalSubtype}
                  onChange={handleChange}
                  groupClassName="row mb-4"
                  labelClassName="col-sm-5 control-label"
                  wrapperClassName="col-sm-7"
                >
                  <option value="none">No Selection</option>
                  <option disabled="disabled"></option>
                  {formData.experimentalType === 'Biochemical Function'
                    ? (
                      <>
                        <option value="A. Gene(s) with same function implicated in same disease">A. Gene(s) with same function implicated in same disease</option>
                        <option value="B. Gene function consistent with phenotype(s)">B. Gene function consistent with phenotype(s)</option>
                      </>
                    ) : (
                      <>
                        <option value="A. Gene normally expressed in tissue relevant to the disease">A. Gene normally expressed in tissue relevant to the disease</option>
                        <option value="B. Altered expression in Patients">B. Altered expression in Patients</option>
                      </>
                    )

                  }
                </Input>
              }
              {experimentalNameVisible &&
                <Input
                  type="text"
                  name="experimentalName"
                  label="Experiment name:"
                  value={formData.experimentalName}
                  onChange={handleChange}
                  maxLength="60"
                  groupClassName="row mb-3"
                  labelClassName="col-sm-5 control-label"
                  wrapperClassName="col-sm-7"
                  error={formErrors.experimentalName || null}
                  required
                />
              }
            </CardPanel>
            {formData && formData.experimentalType === 'Biochemical Function' && experimentalNameVisible &&
              <BiochemicalFunctionForm
                disease={disease}
                uniprotId={uniprotId}
                formData={formData}
                formErrors={formErrors}
                handleChange={handleChange}
                renderGenesError={renderGenesError}
              />
            }
            {formData && formData.experimentalType === 'Protein Interactions' && experimentalNameVisible &&
              <ProteinInteractionsForm
                formData={formData}
                formErrors={formErrors}
                handleChange={handleChange}
                renderGenesError={renderGenesError}
              />
            }
            {formData && formData.experimentalType === 'Expression' && experimentalNameVisible &&
              <ExpressionForm
                formData={formData}
                formErrors={formErrors}
                handleChange={handleChange}
              />
            }
            {formData && formData.experimentalType === 'Functional Alteration' && experimentalNameVisible &&
              <FunctionalAlterationForm
                formData={formData}
                uniprotId={uniprotId}
                formErrors={formErrors}
                handleChange={handleChange}
              />
            }
            {formData && formData.experimentalType === 'Model Systems' && experimentalNameVisible &&
              <ModelSystemsForm
                formData={formData}
                formErrors={formErrors}
                handleChange={handleChange}
              />
            }
            {formData && formData.experimentalType === 'Rescue' && experimentalNameVisible &&
              <RescueForm
                formData={formData}
                formErrors={formErrors}
                handleChange={handleChange}
              />
            }
            {formData && ((formData.experimentalType === 'Expression' && formData.experimentalSubtype && formData.experimentalSubtype.charAt(0) !== 'A')
              || formData.experimentalType === 'Functional Alteration' || formData.experimentalType === 'Model Systems'
              || formData.experimentalType === 'Rescue') && experimentalNameVisible &&
                <AssociatedVariantPanel
                  auth={auth}
                  variantInfo={variantInfo}
                  handleDeleteVariant={handleDeleteVariant}
                  updateVariantInfo={updateVariantInfo}
                />
            }
            {experimentalNameVisible &&
              <>
                {validAssessments && Boolean(validAssessments.length) &&
                  <div className="card card-panel mb-4">
                    <div className="card-body">
                      <dl className="dl-horizontal">
                        <div>
                          <dt>Assessments</dt>
                          <dd>
                            {validAssessments.map((assessment, i) => (
                              <span key={assessment.uuid}>
                                {i > 0 ? <br /> : null}
                                {assessment.value + ' (' + assessment.submitted_by.title + ')'}
                              </span>
                            ))}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                }
                <ExperimentalScorePanel
                  auth={auth}
                  experimentalData={formData}
                  scoreExplanationError={scoreExplanationError}
                  handleUserScoreObj={handleUserScoreObj}
                  experimentalEvidenceType={experimentalEvidenceType}
                />
              </>
            }
            <Row>
              <Col>
                {formData && formData.experimentalType && formData.experimentalType !== 'none' && experimentalNameVisible &&
                  <LoadingButton
                    type="submit"
                    className="align-self-end mb-2 ml-2 float-right "
                    variant="primary"
                    text="Save"
                    textWhenLoading="Submitting"
                    isLoading={isSubmitting}
                  />
                }
                {gdm &&
                  <Button
                    variant="secondary"
                    className="float-right align-self-end mb-2 ml-2"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                }
                {editExperimentalData &&
                  <DeleteCurationModal
                    gdm={gdm}
                    parent={annotation}
                    item={editExperimentalData}
                    disabled={isSubmitting}
                  />
                }
                <div className={`submit-err float-right ${errorDisplay}`}>Please fix errors on the form and resubmit.</div>
                <div className="submit-error float-right">{submitError ? submitError : null}</div>
              </Col>
            </Row>
          </form>
        </Col>
      </Row>
    </>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth
});

export default connect(mapStateToProps)(ExperimentalCuration);
