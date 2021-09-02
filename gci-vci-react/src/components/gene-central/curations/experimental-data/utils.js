import React from 'react';
import Col from 'react-bootstrap/Col';
import isEmpty from 'lodash/isEmpty';

import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import {
  getCloIdsFromList,
  getEfoCloIdsFromList,
  getGenesFromList,
  getGoSlimIdsFromList,
  getHpoIdsFromList,
  getHpoMpIdsFromList,
  getUberonIdsFromList,
} from '../common/commonFunc';
import {
  FUNCTION,
  FUNCTIONAL_ALTERATION,
  MODEL_SYSTEMS,
  RESCUE
} from '../../score/constants/evidenceTypes';
import { getDefaultScore } from '../../score/helpers/getDefaultScore';
import { getScoreRange } from '../../score/helpers/getScoreRange';
import { getUserScore } from '../../score/helpers/getUserScore';
import { getAffiliationScore } from '../../score/helpers/getAffiliationScore';

// Generic render method for the yellow warning message box
export const Warning = ({ type }) => (
  <>
    {type === 'GO' &&
      <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
        Please enter the gene&apos;s molecular function or biological process term  <strong>(required)</strong> using the Gene Ontology (GO)
        term wherever possible (e.g. GO:2001284). If you are unable to find an appropriate GO term, use the free text box instead.
        Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
      </Col>
    }
    {type === 'UBERON' &&
      <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
        Please enter the relevant Uberon term for the organ of the tissue relevant to disease whenever possible
        (e.g. UBERON:0015228 or UBERON_0015228). If you are unable to find an appropriate Uberon term, use the free text box instead.
        Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
      </Col>
    }
    {type === 'CL' &&
      <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
        Please enter the relevant Cell Ontology (CL) term for the cell type whenever possible (e.g. CL:0000057 or CL_0000057).
        If you are unable to find an appropriate CL term, use the free text box instead.
        Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
      </Col>
    }
    {type === 'CL_EFO' &&
      <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
        Please enter the relevant EFO or Cell Ontology (CL) term for the cell line/cell type whenever possible
        (e.g. EFO:0001187 or EFO_0001187; CL:0000057 or CL_0000057). If you are unable to find an appropriate EFO or CL term, use the free text box instead.
        Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
      </Col>
    }
  </>
);

export const GenesWithSameFunctionLabel = () => (
  <span>
    {'Other gene(s) with same function as gene in record '}
    <span className="normal">
      (<a
        href={EXTERNAL_API_MAP['HGNCHome']}
        target="_blank"
        rel="noopener noreferrer"
        title="HGNC homepage in a new tab"
      >
        HGNC
      </a> symbol)
    </span>:
  </span>
);

export const HpoIdsLabel = () => (
  <span>
    {'Phenotype(s) consistent with function '}
    <span className="normal">(
      <a
        href={EXTERNAL_API_MAP['HPOBrowser']}
        target="_blank"
        rel="noopener noreferrer"
        title="Open HPO Browser in a new tab"
      >
        HPO
      </a> ID)
    </span>:
  </span>
);

export const InteractingGenesLabel = () => (
  <span>
    {'Interacting gene(s) '}
    <span className="normal">(
      <a
        href={EXTERNAL_API_MAP['HGNCHome']}
        target="_blank"
        rel="noopener noreferrer"
        title="HGNC homepage in a new tab"
      >
        HGNC
      </a> symbol)
    </span>:
  </span>
);

export const PhenotypeObservedLabel = () => (
  <span>
    {'Phenotype(s) observed in model system '}
    <span className="normal">(
      <a
        href={EXTERNAL_API_MAP['HPOBrowser']}
        target="_blank"
        rel="noopener noreferrer"
        title="Open HPO Browser in a new tab"
      >
        HPO
      </a> or MP ID)
    </span>:
  </span>
);

export const PatientPhenotypeLabel = () => (
  <span>
    {'Human phenotype(s) '}
    <span className="normal">(
      <a
        href={EXTERNAL_API_MAP['HPOBrowser']}
        target="_blank"
        rel="noopener noreferrer"
        title="Open HPO Browser in a new tab"
      >
        HPO
      </a>
      {' ID)'}
    </span>:
  </span>
);

export const PhenotypeRescueLabel = () => (
  <span>
    {'Phenotype to rescue '}
    <span className="normal">(
      <a
        href={EXTERNAL_API_MAP['HPOBrowser']}
        target="_blank"
        rel="noopener noreferrer"
        title="Open HPO Browser in a new tab"
      >
        HPO
      </a>
      {' ID)'}
    </span>:
  </span>
);

// validate values and return error messages as needed
const validateFormTerms = (type, terms, limit) => {
  limit = typeof limit !== 'undefined' ? limit : 0;
  let error;
  const errorMsgs = {
    'clIDs': {
      'invalid1': "Use CL Ontology ID (e.g. CL_0000057)",
      'invalid': "Use CL Ontologys (e.g. CL_0000057) separated by commas",
      'limit1': "Enter only one CL Ontology ID",
      'limit': "Enter only " + limit + " CL Ontology IDs"
    },
    'efoIDs': {
      'invalid1': "Use EFO ID (e.g. EFO_0001187)",
      'invalid': "Use EFO IDs (e.g. EFO_0001187) separated by commas",
      'limit1': "Enter only one EFO ID",
      'limit': "Enter only " + limit + " EFO IDs"
    },
    'efoClIDs': {
      'invalid1': "Use EFO ID (e.g. EFO_0001187) or CL Ontology ID (e.g. CL_0000057)",
      'invalid': "Use EFO IDs (e.g. EFO_0001187) or CL Ontology IDs (e.g. CL_0000057) separated by commas",
      'limit1': "Enter only one EFO or CL Ontology ID",
      'limit': "Enter only " + limit + " EFO or CL Ontology IDs"
    },
    'geneSymbols': {
      'invalid1': "Use gene symbol (e.g. SMAD3)",
      'invalid': "Use gene symbols (e.g. SMAD3) separated by commas",
      'limit1': "Enter only one gene symbol",
      'limit': "Enter only " + limit + " gene symbols"
    },
    'goSlimIDs': {
      'invalid1': "Use GO ID (e.g. GO:0006259)",
      'invalid': "Use GO IDs (e.g. GO:0006259) separated by commas",
      'limit1': "Enter only one GO ID",
      'limit': "Enter only " + limit + " GO IDs"
    },
    'hpoIDs': {
      'invalid1': "Use HPO ID (e.g. HP:0000001)",
      'invalid': "Use HPO IDs (e.g. HP:0000001) separated by commas",
      'limit1': "Enter only one HPO ID",
      'limit': "Enter only " + limit + " HPO IDs"
    },
    'hpoMpIDs': {
      'invalid1': "Use HPO ID (e.g. HP:0000001) or MP ID (e.g. MP:0000001)",
      'invalid': "Use HPO IDs (e.g. HP:0000001) or MP IDs (e.g. MP:0000001) separated by commas",
      'limit1': "Enter only one HPO ID or MP ID",
      'limit': "Enter only " + limit + " HPO or MP IDs"
    },
    'uberonIDs': {
      'invalid1': "Use Uberon ID (e.g. UBERON:0015228)",
      'invalid': "Use Uberon IDs (e.g. UBERON:0015228) separated by commas",
      'limit1': "Enter only one Uberon ID",
      'limit': "Enter only " + limit + " Uberon IDs"
    }
  };
  
  // if (terms && terms.length && _(terms).any(function(id) { return id === null; })) {
  if (terms && terms.length && terms.some(id => id === null)) {
    // term is bad
    if (limit === 1) {
      error = errorMsgs[type]['invalid1'];
    } else {
      error = errorMsgs[type]['invalid'];
    }
  }
  if (limit !== 0 && terms.length > limit) {
    // number of terms more than specified limit
    if (limit === 1) {
      error = errorMsgs[type]['limit1'];
    } else {
      error = errorMsgs[type]['limit'];
    }
  }
  return error;
};

export const validate = (formErrors, setFormErrors, formData = {}) => {
  const { experimentalType, experimentalSubtype } = formData;
  const errorsMap = {};
  let error;

  if (!formData.experimentalName) {
    errorsMap['experimentalName'] = 'Required';
  }
  if (experimentalType === 'Biochemical Function') {
    // Validate GO ID(s) if value is not empty. Don't validate if free text is provided.
    if (formData.bfIdentifiedFunction) {
      const goSlimIds = getGoSlimIdsFromList(formData.bfIdentifiedFunction);
      error = validateFormTerms('goSlimIDs', goSlimIds, 1);
      if (error) {
        errorsMap['bfIdentifiedFunction'] = error;
      }
    }
    // check geneSymbols
    const geneSymbols = getGenesFromList(formData.bfGenes);
    error = validateFormTerms('geneSymbols', geneSymbols);
    if (error) {
      errorsMap['bfGenes'] = error;
    }
    // check hpoIDs
    const hpoIds = getHpoIdsFromList(formData.bfPhenotypeHpo);
    error = validateFormTerms('hpoIDs', hpoIds);
    if (error) {
      errorsMap['bfPhenotypeHpo'] = error;
    }

    if (experimentalSubtype === 'A. Gene(s) with same function implicated in same disease') {
      if (!formData.bfGenes) {
        errorsMap['bfGenes'] = 'Required';
      }
      if (!formData.bfEvidenceForOtherGenesWithSameFunction) {
        errorsMap['bfEvidenceForOtherGenesWithSameFunction'] = 'Required';
      }
      if (!formData.bfExplanationOfOtherGenes && formData.bfGeneImplicatedWithDisease) {
        errorsMap['bfExplanationOfOtherGenes'] = 'Required';
      }
    }
    if (experimentalSubtype === 'B. Gene function consistent with phenotype(s)') {
      if (!formData.bfPhenotypeHpo && !formData.bfPhenotypeFreeText) {
        errorsMap['bfPhenotypeHpo'] = 'Enter HPO ID(s) and/or free text';
        errorsMap['bfPhenotypeFreeText'] = 'Enter HPO ID(s) and/or free text';
      }
      if (!formData.bfPhenotypeExplanation && (formData.bfPhenotypeHpo || formData.bfPhenotypeFreeText)) {
        errorsMap['bfPhenotypeExplanation'] = 'Required';
      }
    }
    if (!formData.bfIdentifiedFunction && !formData.bfIdentifiedFunctionFreeText) {
      errorsMap['bfIdentifiedFunction'] = 'Enter GO ID and/or free text';
      errorsMap['bfIdentifiedFunctionFreeText'] = 'Enter GO ID and/or free text';
    }
    if (!formData.bfEvidenceForFunction) {
      errorsMap['bfEvidenceForFunction'] = 'Required';
    }
  }
  else if (experimentalType === 'Protein Interactions') {
    // check geneSymbols
    const geneSymbols = getGenesFromList(formData.piInteractingGenes)
    error = validateFormTerms('geneSymbols', geneSymbols);
    if (error) {
      errorsMap['piInteractingGenes'] = error;
    }
    if (!formData.piInteractingGenes) {
      errorsMap['piInteractingGenes'] = 'Required';
    }
    if (!formData.piInteractionType) {
      errorsMap['piInteractionType'] = 'Required';
    }
    if (!formData.piExperimentalInteractionDetection) {
      errorsMap['piExperimentalInteractionDetection'] = 'Required';
    }
    if (!formData.piRelationshipOfOtherGenesToDisese && formData.piGeneImplicatedInDisease) {
      errorsMap['piRelationshipOfOtherGenesToDisese'] = 'Required';
    }
  }
  else if (experimentalType === 'Expression') {
    // Validate Uberon ID(s) if value is not empty. Don't validate if free text is provided.
    if (formData.expOrganOfTissue) {
      const uberonIds = getUberonIdsFromList(formData.expOrganOfTissue);
      error = validateFormTerms('uberonIDs', uberonIds);
      if (error) {
        errorsMap['expOrganOfTissue'] = error;
      }
    }
    if (experimentalSubtype === 'A. Gene normally expressed in tissue relevant to the disease') {
      if (!formData.expNormalEvidence && formData.expNormalExpressedInTissue) {
        errorsMap['expNormalEvidence'] = 'Required';
      }
    }
    if (experimentalSubtype === 'B. Altered expression in Patients') {
      if (!formData.expAlteredEvidence && formData.expAlteredExpressedInPatients) {
        errorsMap['expAlteredEvidence'] = 'Required';
      }
    }
    if (!formData.expOrganOfTissue && !formData.expOrganOfTissueFreeText) {
      errorsMap['expOrganOfTissue'] = 'Enter Uberon ID and/or free text';
      errorsMap['expOrganOfTissueFreeText'] = 'Enter Uberon ID and/or free text';
    }
  }
  else if (experimentalType === 'Functional Alteration') {
    // Check form for Functional Alterations panel
    // Validate clIDs/efoIDs depending on form selection. Don't validate if free text is provided.
    if (formData.faType === 'Patient cells' && formData.faPatientCells) {
      const clIds = getCloIdsFromList(formData.faPatientCells);
      error = validateFormTerms('clIDs', clIds, 1);
      if (error) {
        errorsMap['faPatientCells'] = error;
      }
    } else if (formData.faType === 'Non-patient cells' && formData.faNonPatientCells) {
      // This input field accepts both EFO and CLO IDs
      const efoClIds = getEfoCloIdsFromList(formData.faNonPatientCells);
      error = validateFormTerms('efoClIDs', efoClIds, 1);
      if (error) {
        errorsMap['faNonPatientCells'] = error;
      }
    }
    // Validate GO ID(s) if value is not empty. Don't validate if free text is provided.
    if (formData.faNormalFunctionOfGene) {
      const goSlimIds = getGoSlimIdsFromList(formData.faNormalFunctionOfGene);
      error = validateFormTerms('goSlimIDs', goSlimIds, 1);
      if (error) {
        errorsMap['faNormalFunctionOfGene'] = error;
      }
    }

    if (!formData.faType) {
      errorsMap['faType'] = 'Required';
    }
    if (formData.faType === 'Patient cells') {
      if (!formData.faPatientCells && !formData.faPatientCellsFreeText) {
        errorsMap['faPatientCells'] = 'Enter CL ID and/or free text';
        errorsMap['faPatientCellsFreeText'] = 'Enter CL ID and/or free text';
      }
    }
    if (formData.faType === 'Non-patient cells') {
      if (!formData.faNonPatientCells && !formData.faNonPatientCellsFreeText) {
        errorsMap['faNonPatientCells'] = 'Enter EFO or CL ID, and/or free text';
        errorsMap['faNonPatientCellsFreeText'] = 'Enter EFO or CL ID, and/or free text';
      }
    }
    if (!formData.faNormalFunctionOfGene && !formData.faNormalFunctionOfGeneFreeText) {
      errorsMap['faNormalFunctionOfGene'] = 'Enter GO ID and/or free text';
      errorsMap['faNormalFunctionOfGeneFreeText'] = 'Enter GO ID and/or free text';
    }
    if (!formData.faDescriptionOfGeneAlteration) {
      errorsMap['faDescriptionOfGeneAlteration'] = 'Required';
    }
    if (!formData.faEvidenceForNormalFunction) {
      errorsMap['faEvidenceForNormalFunction'] = 'Required';
    }
  }
  else if (experimentalType === 'Model Systems') {
    // Check form for Model Systems panel
    // Validate efoIDs depending on form selection. Don't validate if free text is provided.
    if (formData.msType === 'Cell culture model' && formData.msCellCulture) {
      // This input field accepts both EFO and CLO IDs
      const efoClIds = getEfoCloIdsFromList(formData.msCellCulture);
      error = validateFormTerms('efoClIDs', efoClIds, 1);
      if (error) {
        errorsMap['msCellCulture'] = error;
      }
    }
    // check hpoIDs
    if (formData.msPhenotypeHpo) {
      const hpoIds = getHpoIdsFromList(formData.msPhenotypeHpo);
      error = validateFormTerms('hpoIDs', hpoIds);
      if (error) {
        errorsMap['msPhenotypeHpo'] = error;
      }
    }
    // check hpoMpIDs part 2
    if (formData.msPhenotypeHpoObserved) {
      const hpoMpIds = getHpoMpIdsFromList(formData.msPhenotypeHpoObserved);
      error = validateFormTerms('hpoMpIDs', hpoMpIds);
      if (error) {
        errorsMap['msPhenotypeHpoObserved'] = error;
      }
    }

    if (!formData.msType) {
      errorsMap['msType'] = 'Required';
    }
    if (formData.msType === 'Non-human model organism') {
      if (!formData.msNonHumanModel) {
        errorsMap['msNonHumanModel'] = 'Required';
      }
    }
    if (formData.msType === 'Cell culture model') {
      if (!formData.msCellCulture && !formData.msCellCultureFreeText) {
        errorsMap['msCellCulture'] = 'Enter EFO or CL ID, and/or free text';
        errorsMap['msCellCultureFreeText'] = 'Enter EFO or CL ID, and/or free text';
      }
    }
    if (!formData.msDescriptionOfGeneAlteration) {
      errorsMap['msDescriptionOfGeneAlteration'] = 'Required';
    }
    if (!formData.msPhenotypeHpoObserved && !formData.msPhenotypeFreetextObserved) {
      errorsMap['msPhenotypeHpoObserved'] = 'Enter HPO ID(s) and/or free text';
      errorsMap['msPhenotypeFreetextObserved'] = 'Enter HPO ID(s) and/or free text';
    }
    if (!formData.msPhenotypeHpo && !formData.msPhenotypeFreeText) {
      errorsMap['msPhenotypeHpo'] = 'Enter HPO ID(s) and/or free text';
      errorsMap['msPhenotypeFreeText'] = 'Enter HPO ID(s) and/or free text';
    }
    if (!formData.msExplanation) {
      errorsMap['msExplanation'] = 'Required';
    }
  }
  else if (experimentalType === 'Rescue') {
    // Validate clIDs/efoIDs depending on form selection. Don't validate if free text is provided.
    if (formData.resType === 'Patient cells' && formData.resPatientCells) {
      const clIds = getCloIdsFromList(formData.resPatientCells);
      error = validateFormTerms('clIDs', clIds, 1);
      if (error) {
        errorsMap['resPatientCells'] = error;
      }
    } else if (formData.resType === 'Cell culture model' && formData.resCellCulture) {
      // This input field accepts both EFO and CLO IDs
      const efoClIds = getEfoCloIdsFromList(formData.resCellCulture);
      error = validateFormTerms('efoClIDs', efoClIds, 1);
      if (error) {
        errorsMap['resCellCulture'] = error;
      }
    }
    // check hpoIDs
    if (formData.resPhenotypeHpo) {
      const hpoIds = getHpoIdsFromList(formData.resPhenotypeHpo);
      error = validateFormTerms('hpoIDs', hpoIds);
      if (error) {
        errorsMap['resPhenotypeHpo'] = error;
      }
    }

    if (!formData.resType) {
      errorsMap['resType'] = 'Required';
    }
    if (formData.resType === 'Non-human model organism') {
      if (!formData.resNonHumanModel) {
        errorsMap['resNonHumanModel'] = 'Required';
      }
    }
    if (formData.resType === 'Cell culture model') {
      if (!formData.resCellCulture && !formData.resCellCultureFreeText) {
        errorsMap['resCellCulture'] = 'Enter EFO or CL ID, and/or free text';
        errorsMap['resCellCultureFreeText'] = 'Enter EFO or CL ID, and/or free text';
      }
    }
    if (formData.resType === 'Patient cells') {
      if (!formData.resPatientCells && !formData.resPatientCellsFreeText) {
        errorsMap['resPatientCell'] = 'Enter CL ID and/or free text';
        errorsMap['resPatientCellsFreeText'] = 'Enter CL ID and/or free text';
      }
    }
    if (!formData.resDescriptionOfGeneAlteration) {
      errorsMap['resDescriptionOfGeneAlteration'] = 'Required';
    }
    if (!formData.resPhenotypeHpo && !formData.resPhenotypeFreeText) {
      errorsMap['resPhenotypeHpo'] = 'Enter HPO ID(s) and/or free text';
      errorsMap['resPhenotypeFreeText'] = 'Enter HPO ID(s) and/or free text';
    }
    if (!formData.resRescueMethod) {
      errorsMap['resRescueMethod'] = 'Required';
    }
    if (formData.msType !== 'Human') {
      if (!formData.resExplanation && formData.resWildTypeRescuePhenotype) {
        errorsMap['resExplanation'] = 'Required';
      }
    }
  }
  setFormErrors(errorsMap);
  return isEmpty(errorsMap);
};

export const getExperimentalSubtype = (experimentalData, isDataFlat) => {
  let experimentalSubtype;
  if (isDataFlat) {
    if (experimentalData.experimentalType === 'Protein Interactions') {
      experimentalSubtype = null;
    } else if (experimentalData.experimentalType === 'Biochemical Function' || experimentalData.experimentalType === 'Expression') {
      experimentalSubtype = experimentalData.experimentalSubtype;
    } else if (experimentalData.experimentalType === 'Functional Alteration') {
      experimentalSubtype = experimentalData.faType;
    } else if (experimentalData.experimentalType === 'Model Systems') {
      experimentalSubtype = experimentalData.msType;
    } else if (experimentalData.experimentalType === 'Rescue') {
      experimentalSubtype = experimentalData.resType;
    }
  } else {
    if (experimentalData.evidenceType === 'Protein Interactions') {
      experimentalSubtype = null;
    } else if (experimentalData.evidenceType === 'Biochemical Function') {
      if (experimentalData.biochemicalFunction['geneWithSameFunctionSameDisease']) {
        experimentalSubtype = 'A. Gene(s) with same function implicated in same disease';
      } else if (experimentalData.biochemicalFunction['geneFunctionConsistentWithPhenotype']) {
        experimentalSubtype = 'B. Gene function consistent with phenotype(s)';
      }
    } else if (experimentalData.evidenceType === 'Expression') {
      if (experimentalData.expression['normalExpression']) {
        experimentalSubtype = 'A. Gene normally expressed in tissue relevant to the disease';
      } else if (experimentalData.expression['alteredExpression']) {
        experimentalSubtype = 'B. Altered expression in Patients';
      }
    } else if (experimentalData.evidenceType === 'Functional Alteration') {
      experimentalSubtype = experimentalData.functionalAlteration && experimentalData.functionalAlteration.functionalAlterationType;
    } else if (experimentalData.evidenceType === 'Model Systems') {
      experimentalSubtype = experimentalData.modelSystems && experimentalData.modelSystems.modelSystemsType;
    } else if (experimentalData.evidenceType === 'Rescue') {
      experimentalSubtype = experimentalData.rescue && experimentalData.rescue.rescueType;
    }
  }
  return experimentalSubtype;
};

export const getExperimentalEvidenceType = (experimentalType, experimentalEvidenceType) => {
  let type;

  if (experimentalType && experimentalType.length) {
    if (experimentalType.indexOf('Biochemical Function') > -1) {
      type = FUNCTION + '_BIOCHEMICAL_FUNCTION';
    } else if (experimentalType.indexOf('Protein Interactions') > -1) {
      type = FUNCTION + '_PROTEIN_INTERACTIONS';
    } else if (experimentalType.indexOf('Expression') > -1) {
      type = FUNCTION + '_EXPRESSION';
    } else if (experimentalType.indexOf('Functional Alteration') > -1) {
      if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Patient cells') > -1) {
        type = FUNCTIONAL_ALTERATION + '_PATIENT_CELLS';
      } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Non-patient cells') > -1) {
        type = FUNCTIONAL_ALTERATION + '_NON_PATIENT_CELLS';
      }
    } else if (experimentalType.indexOf('Model Systems') > -1) {
      if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Non-human model organism') > -1) {
        type = MODEL_SYSTEMS + '_NON_HUMAN_MODEL_ORGANISM';
      } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Cell culture model') > -1) {
        type = MODEL_SYSTEMS + '_CELL_CULTURE_MODEL';
      }
    } else if (experimentalType.indexOf('Rescue') > -1) {
      if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Patient cells') > -1) {
        type = RESCUE + '_PATIENT_CELLS';
      } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Cell culture model') > -1) {
        type = RESCUE + '_CELL_CULTURE_MODEL';
      } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Non-human model organism') > -1) {
        type = RESCUE + '_NON_HUMAN_MODEL_ORGANISM';
      } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Human') > -1) {
        type = RESCUE + '_HUMAN_MODEL';
      }
    }
  }

  return type;
};

// Find the score owned by the currently logged-in user
export const calculateUserScore = (evidenceScores, auth) => {
  let loggedInUserScore;

  if (evidenceScores && evidenceScores.length) {
    loggedInUserScore = getUserScore(evidenceScores, auth && auth.PK);
  }

  return loggedInUserScore;
};

// Find the score associated with the currently logged-in user's affiliation
export const calculateUserAffiliatedScore = (evidenceScores, auth) => {
  let affiliatedScore;
  let affiliationId = auth.currentAffiliation && auth.currentAffiliation.affiliation_id;

  if (evidenceScores && evidenceScores.length) {
    affiliatedScore = getAffiliationScore(evidenceScores, affiliationId);
  }

  return affiliatedScore;
};

// Find the default calculated score given the types of
// experimentalType and experimentalEvidenceType
export const calculateDefaultScore = (experimentalEvidenceType, loggedInUserScore, updateDefaultScore) => {
  let calcDefaultScore;

  if (loggedInUserScore && loggedInUserScore.calculatedScore) {
    if (updateDefaultScore) {
      // A different scenario is selected after a pre-existing score is loaded from db
      calcDefaultScore = getDefaultScore(null, null, experimentalEvidenceType);
    } else {
      // A pre-existing score is loaded from db
      calcDefaultScore = getDefaultScore(null, null, experimentalEvidenceType, loggedInUserScore.calculatedScore);
    }
  } else {
    // New. No pre-exisitng score for the currently logged-in user
    calcDefaultScore = getDefaultScore(null, null, experimentalEvidenceType);
  }
  
  return calcDefaultScore;
};

// Find the calculated score range given the types of
// experimentalType and experimentalEvidenceType
export const calculateScoreRange = (experimentalEvidenceType, defaultScore) => {
  let calcScoreRange = [];

  if (getScoreRange(null, null, experimentalEvidenceType, defaultScore).length) {
    calcScoreRange = getScoreRange(null, null, experimentalEvidenceType, defaultScore);
  }

  return calcScoreRange;
};
