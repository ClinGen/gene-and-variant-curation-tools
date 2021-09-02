/**
 * Method to determine if the curated evidence object is new version that has sourceInfo data object
 * @param {object} curatedEvidence - Curated evidence object 
 */
export function curatedEvidenceHasSourceInfo(curatedEvidence) {
  if (curatedEvidence && curatedEvidence.sourceInfo && curatedEvidence.sourceInfo.data && curatedEvidence.sourceInfo.metadata) {
    return true;
  } else {
    return false;
  }
}
