/**
 * Return interpretation record objects that can be identified by affiliation with flatten needed properties in an array,
 * including evaluations, curated_evidence
 * @param {object} interpretation - The interpretation record data object
 *
 * Note: In V2.0, no longer need to update population, functional, and computational objects since those objects have no affiliation property. And no more provisional_variant linked object.
 *
 */
export function getTransferInterpretationObjects(interpretation) {
  let totalObjects = [];
  // Loop through evaluations 
  let evaluations = interpretation.evaluations && interpretation.evaluations.length ? interpretation.evaluations : [];
  evaluations.forEach(evaluation => {
    // Get evaluation records
    totalObjects.push(filteredObject(evaluation));
  });

  // Loop through curated_evidence_list 
  let curatedEvidences = interpretation.curated_evidence_list && interpretation.curated_evidence_list.length ? interpretation.curated_evidence_list : [];
  curatedEvidences.forEach(curatedEvidence => {
    // Get curated_evidence records
    totalObjects.push(filteredObject(curatedEvidence));
  });

  return totalObjects;
}

/**
 * Method to filter object keys
 * @param {object} target - A targeted data object in interpretation
 */
function filteredObject(target) {
  const allowed = ['date_created', 'last_modified', 'submitted_by', 'item_type', 'affiliation', 'PK'];

  const filtered = Object.keys(target)
    .filter(key => allowed.includes(key))
    .reduce((obj, key) => {
      obj[key] = target[key];
      return obj;
    }, {});

  return filtered;
}
