import { AnnotationActionTypes } from "../actions/annotationActions";
import lodashGet from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';

/**
 * Annotation reducer Redux
 * returns a Suite for Annotation Objects
 *
 * state shape design referring to redux doc recommendation
 * https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape#designing-a-normalized-state
 */
const initialEvidenceState = {
  // store list of objects for UI logic

  allVariantsSet: new Set(
    /** includes variants across all annotations
    variantPK01, variantPK02, ... 
    */
  ),
  allVariantsSetByAnnotation: {
    /** an example of the shape:
    annotationPK01: {variantPK01, variantPK02, ...}, <----- stores a `Set`, not `Array`
    annotationPK02: ...
    ...
      */
  },
  allEvidencesByItemTypeByAnnotation: {
    /**
    annotationPK01: {
      group: [groupPK01, groupPK02, ...], <-- all groups in this annotation
      family: [familyPK01, familyPK02, ...], <-- all families in this annotation, including those in `group.familyIncluded`, etc.
      ...other evidence type...
    },
    annotationPK02: ...
    ...
      */
  },

  // store object data for quick lookup to access any single evidence. 
  // Note that any embedded case level evidences (group.includeIndividual, family.includeIndividual, etc) 
  // are normalized to reduce overhead; the rest of all embed fields are preserved

  variantByPKByAnnotation: {
    /**
    annotationPK01: {
      variantPK01: variantObject01,
      variantPK02: ...,
      ...
    },
    annotationPK02: ...
    ...
      */
  },
  evidenceByPKByAnnotation: {
    /** (evidence can be any of group, family, individual, caseControl or experimental)
    annotationPK01: {
      evidencePK01: evidenceObject01,
      evidencePK02: ...,
      ...
    },
    annotationPK02: ...
    ...
      */
  },
};

const initialState = {
  byPK: {}, // stores a key-value table to lookup a annotation, e.g. { 'PK1': {...annotationObject...}, 'PK2': {...annotationObject...} }
  // below only stores PK
  allPKs: [], // a list to reflect all PKs in byPK
  activePK: null, // PK of active (selected) annotation in UI

  // states for fetching annotations
  isLoading: false,
  fetchErrorMessage: null,

  // state to detect if article note form is changed.
  // used to prompt user when there's unsaved changes in the form while user navigating away
  isDirtyArticleNoteForm: false,

  ...initialEvidenceState
};

const annotationReducer = (state = initialState, action) => {
  switch (action.type) {
    case AnnotationActionTypes.reset: {
      return initialState;
    }
    case AnnotationActionTypes.set: {
      return setAllAnnotationsAllEvidencesReducer(action.annotations, action.activeAnnotationPK);
    }
    case AnnotationActionTypes.fetchSuccess: {
      return {
        ...setAllAnnotationsAllEvidencesReducer(action.annotations, action.activeAnnotationPK),
        fetchErrorMessage: null,
        isLoading: false
      };
    }
    case AnnotationActionTypes.fetchFailure: {
      return {
        ...initialState,
        fetchErrorMessage: action.errorMessage,
        isLoading: false
      };
    }
    case AnnotationActionTypes.add: {
      const annotation = action.annotation;
      const byPK = {
        ...state.byPK,
        [annotation.PK]: annotation,
      };
      const allPKs = [...state.allPKs, annotation.PK];
      return {
        ...state,
        byPK,
        allPKs,
        ...addAnnotationEvidenceReducer(annotation, state)
      };
    }
    case AnnotationActionTypes.update: {
      // only needs to modify the object in byPK
      const annotation = action.annotation;
      const byPK = {
        ...state.byPK,
        [annotation.PK]: annotation,
      };

      return {
        ...state,
        byPK,
        allPKs: state.allPKs,
        ...updateAnnotationEvidencesReducer(annotation, state)
      };
    }
    case AnnotationActionTypes.activateAnnotation: {
      const activePK = action.annotationPK;

      return {
        ...state,
        activePK
      }
    }
    case AnnotationActionTypes.setIsLoading: {
      return {
        ...state,
        isLoading: action.isLoading
      }
    }
    default:
      return state;
  }
};

export default annotationReducer;

const setAllAnnotationsAllEvidencesReducer = (annotations, activeAnnotationPK) => {
  const byPK = {};
  const allPKs = [];
  for (const annotation of annotations) {
    // build actual object table
    byPK[annotation.PK] = annotation;
    // build all-PKs list
    allPKs.push(annotation.PK);
  }

  const newAnnotationsState = cloneDeep(initialEvidenceState);
  collectAllAnnotationsEvidences(annotations, newAnnotationsState);

  return {
    ...newAnnotationsState,
    byPK,
    allPKs,
    // when activeAnnotationPK is null or undefined, let the UI in GCI curation page shown as unselected
    activePK: activeAnnotationPK
  };
}

const updateAnnotationEvidencesReducer = (annotation, annotationsState) => {
  const newEvidenceState = resetAnnotationEvidencesReducer(annotation.PK, annotationsState);
  collectEvidencesFromAnnotation(annotation, newEvidenceState);
  return {
    ...newEvidenceState,
    allVariantsSet: allVariantsSetReducer(newEvidenceState)
  }
}

const addAnnotationEvidenceReducer = (annotation, annotationsState) => {
  return {
    ...resetAnnotationEvidencesReducer(annotation.PK, annotationsState),
    allVariantsSet: annotationsState.allVariantsSet
  }
}

const resetAnnotationEvidencesReducer = (annotationPK, annotationsState) => {
  return {
    allEvidencesByItemTypeByAnnotation: {
      ...annotationsState.allEvidencesByItemTypeByAnnotation,
      [annotationPK]: {
        group: [],
        family: [],
        individual: [],
        caseControl: [],
        experimental: [],
      }
    },
    allVariantsSetByAnnotation: {
      ...annotationsState.allVariantsSetByAnnotation,
      [annotationPK]: new Set(),
    },
    variantByPKByAnnotation: {
      ...annotationsState.variantByPKByAnnotation,
      [annotationPK]: {}
    },
    evidenceByPKByAnnotation: {
      ...annotationsState.evidenceByPKByAnnotation,
      [annotationPK]: {}
    }
  }
}

const allVariantsSetReducer = (annotationsState) => {
  const { variantByPKByAnnotation } = annotationsState;
  
  const allVariantsSet = new Set(); 
  Object.keys(variantByPKByAnnotation).forEach((annotationPK) => {
    const variantByPK = variantByPKByAnnotation[annotationPK];
    Object.keys(variantByPK).forEach((variantPK) => {
      allVariantsSet.add(variantPK)
    });
  });

  return allVariantsSet;
}

const collectAllAnnotationsEvidences = (annotations = [], newAnnotationsState) => {
  for (let annotation of annotations) {
    collectEvidencesFromAnnotation(annotation, newAnnotationsState);
  }

  newAnnotationsState.allVariantsSet = allVariantsSetReducer(newAnnotationsState);
}

/**
 * This method collects all types of evidences & variants from an annotation,
 * and assigns a list of PKs of the evidences for iterating all evidences quickly,
 * as well as byPK maps for fast access to evidence or variant object by its PK.
 * Note that case level evidences (individualIncluded, familyIncluded) are normalized.
 * 
 * This method writes the result to `resultPackage` in-place.
 * 
 * @param {object} annotation - the annotation object embedded with evidence objects.
 * @param {object} resultPackage - the resulting PK lists and byPK maps will be stored on 
 * `resultPackage` in-place. As such, do not use the existing annotation state 
 * from redux reducer directly. Please pass a new evidencesState based on the shape of
 * `initialEvidencesState`. You can also cloneDeep `initialEvidencesState`.
 */
const collectEvidencesFromAnnotation = (annotation = {}, resultPackage) => {
  // collect all case level evidences
  
  // traverse from annotation.groups
  for (let group of (annotation.groups || [])) {
    collectCaseLevelEvidencesFromGroup(group, annotation.PK, resultPackage);
  }

  // traverse from annotation.families
  for (let family of (annotation.families || [])) {
    collectCaseLevelEvidencesFromFamily(family, annotation.PK, resultPackage);
  }

  // traverse from annotation.individuals
  for (let individual of (annotation.individuals || [])) {
    collectCaseLevelEvidencesFromIndividual(individual, annotation.PK, resultPackage);
  }

  // collect the rest of evidence types
  
  for (let evidence of [
    ...(annotation.experimentalData || []), ...(annotation.caseControlStudies || [])
  ]) {
    collectEvidence(evidence, annotation.PK, resultPackage);
  }
}

const collectCaseLevelEvidencesFromGroup = (group, ...args) => {
  for (let family of (group.familyIncluded || [])) {
    collectCaseLevelEvidencesFromFamily(family, ...args);
  }

  for (let individual of (group.individualIncluded || [])) {
    collectCaseLevelEvidencesFromIndividual(individual, ...args);
  }

  collectEvidence({
    ...group,
    familyIncluded: (group.familyIncluded || []).map(family => family.PK),
    individualIncluded: (group.individualIncluded || []).map(individual => individual.PK)
  }, ...args);
}

const collectCaseLevelEvidencesFromFamily = (family, ...args) => {
  for (let individual of (family.individualIncluded || [])) {
    collectCaseLevelEvidencesFromIndividual(individual, ...args);
  }

  collectEvidence({
    ...family,
    individualIncluded: (family.individualIncluded || []).map(individual => individual.PK)
  }, ...args, 'segregation.variants');
}

const collectCaseLevelEvidencesFromIndividual = (individual, ...args) => {
  // Collect variant data from both SOP7 and SOP8
  collectEvidence(individual, ...args, 'variantScores')
}

/**
 * This methods implements the bottom logic of `collectEvidencesFromAnnotation`.
 * 
 * @param {object} evidence - the evidence object, could be one of group, family, individual, caseControl or experimental
 * @param {string} annotationPK - the PK of the annotation the evidence belongs to
 * @param {object} resultPackage - a new evidencesState based on `initialEvidencesState`
 * @param {string?} keyForVariants - default will use key `variants` to find variants. Note that caseControl & group evidences do not have variants, which will let this method fall back to an empty arary of variants and do nothing.
 */
const collectEvidence = (evidence, annotationPK, resultPackage, keyForVariants) => {
  const {
    allVariantsSetByAnnotation,
    allEvidencesByItemTypeByAnnotation,
    variantByPKByAnnotation,
    evidenceByPKByAnnotation,
  } = resultPackage;

  let variants = [];
  // From SOPv8, variant data is stored in individual evidence's variantScores
  if (keyForVariants === 'variantScores') {
    variants = evidence.variantScores ? evidence.variantScores.map(score => score.variantScored) : [];
    // For now, include previous added variants to list
    if (evidence.variants) {
      variants = [...variants, ...evidence.variants];
    }
  } else {
    // Before SOPv8, variant data is stored in individual evidence's variants
    variants = (!keyForVariants ? evidence.variants || [] : lodashGet(evidence, keyForVariants, []));
  }

  // initialize store if necessary
  if (variants.length) {
    if (!allVariantsSetByAnnotation[annotationPK]) {
      allVariantsSetByAnnotation[annotationPK] = new Set();
    }
    if (!variantByPKByAnnotation[annotationPK]) {
      variantByPKByAnnotation[annotationPK] = {};
    }
  }
  for (let variant of variants) {
    if (!variant || typeof variant !== 'object') {
      console.error(`variant on ${evidence.item_type}(${evidence.PK}) is not an object (skipped):`, variant)
      continue;
    }
    allVariantsSetByAnnotation[annotationPK].add(variant.PK);
    
    // build the variant pk map group by annotation;
    // also collect `associatedEvidences` at the same time 
    // for UI curation palette "Associated Variants" section
    if (variantByPKByAnnotation[annotationPK][variant.PK]) {
      variantByPKByAnnotation[annotationPK][variant.PK].associatedEvidences.push(evidence.PK);
    } else {
      variantByPKByAnnotation[annotationPK][variant.PK] = {
        ...variant,
        associatedEvidences: [evidence.PK]
      };
    }
  }

  // initialize store if necessary
  if (!allEvidencesByItemTypeByAnnotation[annotationPK] || !allEvidencesByItemTypeByAnnotation[annotationPK][evidence.item_type]) {
    allEvidencesByItemTypeByAnnotation[annotationPK] = {
      ...(allEvidencesByItemTypeByAnnotation[annotationPK] || {}),
      [evidence.item_type]: []
    }
  }
  allEvidencesByItemTypeByAnnotation[annotationPK][evidence.item_type].push(evidence.PK);
  
  // initialize store if necessary
  if (!evidenceByPKByAnnotation[annotationPK]) {
    evidenceByPKByAnnotation[annotationPK] = {};
  }
  evidenceByPKByAnnotation[annotationPK][evidence.PK] = evidence;
}
