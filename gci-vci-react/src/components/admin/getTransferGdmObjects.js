/**
 * Return gene-disease record objects that can be identified by affiliation with flatten needed properties in an array,
 * including gdm, evidence, scores, classifications, variantPathogenicity objects and annotation objects if requested
 * @param {object} gdm - The gene-disease record data object
 *
 */
export function getTransferGdmObjects(gdm, includeAnnotations) {
  let totalObjects = [];
  // Loop through gdm annotations
  let annotations = gdm.annotations && gdm.annotations.length ? gdm.annotations : [];
  annotations.forEach(annotation => {
    // Add annotation if requested 
    if (includeAnnotations) {
      totalObjects.push(filteredObject(annotation));
    }
    // Get annotation records
    // Loop through groups
    let groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
    if (groups.length) {
      groups.forEach(group => {
        // Get group evidence
        totalObjects.push(filteredObject(group));
        // Loop through families within each group
        let groupFamiliesIncluded = group.familyIncluded && group.familyIncluded.length ? group.familyIncluded : [];
        if (groupFamiliesIncluded.length) {
          groupFamiliesIncluded.forEach(family => {
            // Get group's family evidence
            totalObjects.push(filteredObject(family));
            // Loop through individuals within each family of the group
            let groupFamilyIndividualsIncluded = family.individualIncluded && family.individualIncluded.length ? family.individualIncluded : [];
            if (groupFamilyIndividualsIncluded.length) {
              groupFamilyIndividualsIncluded.forEach(individual => {
                // Get group's family's individual evidence
                totalObjects.push(filteredObject(individual));
                // Loop through group's family's individual scores
                let groupFamilyIndividualScores = individual.scores && individual.scores.length ? individual.scores : [];
                if (groupFamilyIndividualScores.length) {
                  groupFamilyIndividualScores.forEach(score => {
                    // Get scores
                    totalObjects.push(filteredObject(score));
                  });
                }
              });
            }
          });
        }
        // Loop through individuals of group
        let groupIndividualsIncluded = group.individualIncluded && group.individualIncluded.length ? group.individualIncluded : [];
        if (groupIndividualsIncluded.length) {
          groupIndividualsIncluded.forEach(individual => {
            // Get group's individual evidence
            totalObjects.push(filteredObject(individual));
            // Loop through group's individual scores
            let groupIndividualScores = individual.scores && individual.scores.length ? individual.scores : [];
            if (groupIndividualScores.length) {
              groupIndividualScores.forEach(score => {
                // Get scores
                totalObjects.push(filteredObject(score));
              });
            }
          });
        }
      });
    }

    // Loop through families
    let families = annotation.families && annotation.families.length ? annotation.families : [];
    if (families.length) {
      families.forEach(family => {
        // Get family evidence
        totalObjects.push(filteredObject(family));
        // Loop through individuals with each family
        let familyIndividualsIncluded = family.individualIncluded && family.individualIncluded.length ? family.individualIncluded : [];
        if (familyIndividualsIncluded.length) {
          familyIndividualsIncluded.forEach(individual => {
            // Get family's individual evidence
            totalObjects.push(filteredObject(individual));
            // Loop through family's individual scores
            let familyIndividualScores = individual.scores && individual.scores.length ? individual.scores : [];
            if (familyIndividualScores.length) {
              familyIndividualScores.forEach(score => {
                // Get scores
                totalObjects.push(filteredObject(score));
              });
            }
          });
        }
      });
    }

    // Loop through individuals
    let individuals = annotation.individuals && annotation.individuals.length ? annotation.individuals : [];
    if (individuals.length) {
      individuals.forEach(individual => {
        // Get individual evidence
        totalObjects.push(filteredObject(individual));
        // Loop through individual scores
        let individualScores = individual.scores && individual.scores.length ? individual.scores : [];
        if (individualScores.length) {
          individualScores.forEach(score => {
            // Get scores
            totalObjects.push(filteredObject(score));
          });
        }
      });
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
