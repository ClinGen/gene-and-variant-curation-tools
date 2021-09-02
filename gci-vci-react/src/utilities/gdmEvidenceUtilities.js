import { convertCamelCaseToDashCase } from "./stringUtilities";
import { useSelector } from "react-redux";


export const useEvidenceByPKFromAnnotation = (annotationPK) => {
  return useSelector(state => 
    annotationPK ? state.annotations.evidenceByPKByAnnotation[annotationPK] || {}
    : {}
  );
}

/**
 * Returns the param `:typeCuration` for GCI evidence page routes.
 * 
 * @param {string} item_type - The item type of evidence object.
 */
export const getRouteTypeCuration = (item_type) => {
  return `${convertCamelCaseToDashCase(item_type)}-curation`
}

/**
 * Retrieve an evidence object from redux.
 * Note that this method only retrieve from currently active annotation, usually this is what you want
 * e.g. showing evidence in the curation palette and evidence pages.
 * This method does not retrieve across multiple annotations.
 * 
 * @param {object} annotationsState - the redux selected state for annotations
 * @param {string} evidencePK - the PK of the evidence to retrieve
 * 
 * @returns {object} - the evidence object retrieved. Notice that any case level evidence (familyIncluded, individualIncluded) 
 * on the returned object is normalized, and you can use this same method to retrieve the related evidences; 
 * any rest of embedded objects (disease, variants, etc) are left as embedded.
 */
export const getEvidenceByPKFromActiveAnnotation = (annotationsState, evidencePK) => {
  return annotationsState.evidenceByPKByAnnotation[annotationsState.activePK][evidencePK];
}

export const getEvidenceByPKFromAnnotation = (annotationsState, annotationPK, evidencePK) => {
  return annotationsState.evidenceByPKByAnnotation[annotationPK][evidencePK];
}

export const getVariantByPKFromActiveAnnotation = (annotationsState, variantPK) => {
  return annotationsState.variantByPKByAnnotation[annotationsState.activePK][variantPK];
}
