/**
 * Return gene-disease record objects that can be identified by affiliation with flatten needed properties in an array,
 * including gdm, annotation, evidence, scores, variantScores, classifications, variantPathogenicity objects.
 * @param {object} gdm - The gene-disease record data object
 *
 */
export function getTransferGdmObjects(gdm) {
  let totalObjects = [];
  // Loop through gdm annotations
  let annotations = gdm.annotations && gdm.annotations.length ? gdm.annotations : [];
  annotations.forEach(annotation => {
    // Add annotation
    totalObjects.push(filteredObject(annotation));
    // Loop through groups
    let groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
    if (groups.length) {
      groups.forEach(group => {
        // Add group evidence
        totalObjects.push(filteredObject(group));
        // Loop through group's families
        if (group.familyIncluded && group.familyIncluded.length) {
          totalObjects = addFamilyObjects(totalObjects, group.familyIncluded);
        }
        // Loop through group's individuals
        if (group.individualIncluded && group.individualIncluded.length) {
          totalObjects = addIndividualObjects(totalObjects, group.individualIncluded);
        }
      });
    }

    // Loop through families
    let families = annotation.families && annotation.families.length ? annotation.families : [];
    if (families.length) {
      totalObjects = addFamilyObjects(totalObjects, families);
    }

    // Loop through individuals
    let individuals = annotation.individuals && annotation.individuals.length ? annotation.individuals : [];
    if (individuals.length) {
      // Loop through individuals
      totalObjects = addIndividualObjects(totalObjects, individuals);
    }

    // Loop through experimentals
    let experimentals = annotation.experimentalData && annotation.experimentalData.length ? annotation.experimentalData : [];
    if (experimentals.length) {
      experimentals.forEach(experimental => {
        // Get experimental evidence
        totalObjects.push(filteredObject(experimental));
        // Loop through experimental scores
        let experimentalScores = experimental.scores && experimental.scores.length ? experimental.scores : [];
        if (experimentalScores.length) {
          experimentalScores.forEach(score => {
            // Get scores
            totalObjects.push(filteredObject(score));
          });
        }
      });
    }

    // Loop through case-controls
    let caseControls = annotation.caseControlStudies && annotation.caseControlStudies.length ? annotation.caseControlStudies : [];
    if (caseControls.length) {
      caseControls.forEach(caseControl => {
        // Get case-control evidence
        totalObjects.push(filteredObject(caseControl));
        // Get case-control Case Cohort group
        if (caseControl.caseCohort) {
          totalObjects.push(filteredObject(caseControl.caseCohort));
        }
        // Get case-control Control Cohort group
        if (caseControl.controlCohort) {
          totalObjects.push(filteredObject(caseControl.controlCohort));
        }
        // Loop through case-control scores
        let caseControlScores = caseControl.scores && caseControl.scores.length ? caseControl.scores : [];
        if (caseControlScores.length) {
          caseControlScores.forEach(score => {
            // Get scores
            totalObjects.push(filteredObject(score));
          });
        }
      });
    }
  });

  // Get provisionalClassifications objects
  let classifications = gdm.provisionalClassifications && gdm.provisionalClassifications.length ? gdm.provisionalClassifications : [];
  classifications.forEach(classification => {
    totalObjects.push(filteredObject(classification));
  });

  // Get variantPathogenicity objects
  let variantPathogenicity = gdm.variantPathogenicity && gdm.variantPathogenicity.length ? gdm.variantPathogenicity : [];
  variantPathogenicity.forEach(variant => {
    totalObjects.push(filteredObject(variant));
  });

  // Add gdm object
  totalObjects.push(filteredObject(gdm));

  return totalObjects;
}

// Add family and its individual objects
function addFamilyObjects(totalObjects, families) {
  families.forEach(family => {
    totalObjects.push(filteredObject(family));
    // Loop through family's individuals
    if (family.individualIncluded && family.individualIncluded.length) {
      // Add family's individual objects
      totalObjects = addIndividualObjects(totalObjects, family.individualIncluded);
    }
  });

  return totalObjects;
}

// Add individual and its scores and variantScores objects
function addIndividualObjects(totalObjects, individuals) {
  individuals.forEach(individual => {
    // Get individual evidence
    totalObjects.push(filteredObject(individual));
    // Loop through individual's scores
    let scores = individual.scores && individual.scores.length ? individual.scores : [];
    if (scores.length) {
      scores.forEach(score => {
        // Get scores
        totalObjects.push(filteredObject(score));
      });
    }
    // Loop through individual's variantScores
    let variantScores = individual.variantScores && individual.variantScores.length ? individual.variantScores : [];
    if (variantScores.length) {
      variantScores.forEach(variantScore => {
        // Get variantScores
        totalObjects.push(filteredObject(variantScore));
      });
    }
  });

  return totalObjects;
}

/**
* Method to filter object keys
* @param {object} target - A targeted data object in GDM
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
