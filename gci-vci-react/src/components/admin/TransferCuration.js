import React, { useContext, useState, useEffect } from 'react';
import moment from 'moment';
import { Container, Jumbotron, Row, Col } from "react-bootstrap";
import { cloneDeep, get as lodashGet } from "lodash";
import { useSelector } from 'react-redux'
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../utils';
import Input from "../common/Input";
import { LoadingButton } from "../common/LoadingButton";
import { getTransferGdmObjects } from './getTransferGdmObjects';
import { getTransferInterpretationObjects } from './getTransferInterpretationObjects';
import { useAmplifyAPIRequestRecycler } from "../../utilities/fetchUtilities";
import { getUserName } from "../../helpers/getUserName";
import { AffilsContext, getAffiliationByID } from '../../helpers/affiliationsHelpers.js';
import { getGDMContributors, getGeneEvidenceData, getPerformedByUserData, postTrackData } from '../../helpers/getGdmMsgData';


/**
 *
 * Notes:
 * GDM transfer issues:
 * - Annotation object has no submitted_by property but has affiliation, cannot be found by individual.
 *   So annotations will always be updated to new Affiliation when individual(s) is selected for transfer. 
 * - Add new check
 *   If transfer from and to affiliation/indiviudal both have provisionalClassificaion in gdm, not allow to transfer.
 *   If an evidence will end up with duplicated score belong to same individual or affiliation, not allow to transfer
 *
 * Interpretation transfer issues:
 * - Remove from update - population, functional, and computational objects that are included in interpretation.evaluation
 *   have no affiliation property.
 * - Add new check - if new affiliation already has an interpretation, not allow to transfer.
 * - Handle differently
 *   interpretation.provisionalVariant is no longer a linked object but 
 *   interpretation.provisionalVariant.affiliation exists, so need to update that within interpretation object
 *
 */

const updateObjectUrl = {
  'gdm': '/gdms',
  'annotation': '/annotations',
  'group': '/groups',
  'family': '/families',
  'individual': '/individuals',
  'experimental': '/experimental',
  'caseControl': '/casecontrol',
  'evidenceScore': '/evidencescore',
  'variantScore': '/variantscore',
  'provisionalClassification': '/provisional-classifications',
  'pathogenicity': '/pathogenicity',
  'interpretation': '/interpretations',
  'evaluation': '/evaluations',
  'curated-evidence': '/curated-evidences'
};

// Admin tool to transfer a gdm or interpretation from individual(s) or an affiliation to an individual or affiliation
export const TransferCuration = () => {

  const auth = useSelector((state) => state.auth);
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const [ formData, setFormData ] = useState({});
  const [ submitErrorMsg, setSubmitErrorMsg ] = useState('');
  const [ formErrors, setFormErrors ] = useState({});
  const [ isSubmitting, setIsSubmitting ] = useState(false); // REST operation in progress
  const { affiliationsData } = useContext(AffilsContext);

  useEffect(() => {
    setFormData({
      selectedType: 'interpretation',
      selectedPK: '',
      contributorType: 'individual',
      contributors: '',
      affiliationId: '',
      notes: ''
    });
    setFormErrors({});
  }, []);

  
  /**
   * Clear the error message associated with the field.
   * @param {string} fieldName - form field name 
   * 
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
   * Handle selection changes and showing of message
   * @param {object} e - Event object
   */
  const handleChange = (e) => {
    let newData = cloneDeep(formData);
    newData[e.target.name] = e.target.value;
    setFormData(newData);
    clearFieldError(e.target.name);
    setSubmitErrorMsg('');
  }

  /**
   * Check that all necessary data has been entered to form
   * If not, set error message to that field
   */
  const allFormFieldsHaveValue = () => {
    const errors = {};

    // If transfer GDM, can only be from one affiliation
    if (formData["selectedType"] === 'gdm' && formData["contributorType"] === "affiliation" && formData["contributors"].includes(",")) {
      errors["contributors"] = "Only one Affiliation ID for GDM transfer";
    }
    if (formData["selectedPK"] === '') {
      errors["selectedPK"] = "An UUID is required";
    }
    if (formData["contributors"] === '') {
      if (formData["contributorType"] === "individual") {
        errors["contributors"] = "Contributor email(s) is required";
      } else {
        if (formData["selectedType"] === 'gdm') {
          errors["contributors"] = "Affiliation ID is required";
        } else {
          errors["contributors"] = "Affiliation ID(s) is required";
        }
      }
    }
    if (formData["affiliationId"] === '') {
      errors["affiliationId"] = "New Affiliation ID is required";
    }
    if (formData["selectedType"] === 'gdm' && formData["notes"] === '') {
      errors["notes"] = "Notes is required";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitErrorMsg('Please fix errors on the form and resubmit.');
      return false;
    } else {
      return true;
    }
  }

  /**
   * Method to validate form content with the GDM/interpretation that needs to be transferred.
   * @param {object} curation - GDM/interpretation object
   * @param {array} contributorPKs - contributor user PKs or affiliation id
   */
  const validateForm = (curation, contributorPKs) => {
    const type = formData['selectedType'];
    const affiliationId = formData['affiliationId'];
    const affiliation = getAffiliationByID(affiliationId, affiliationsData);
    const hasGCEP = lodashGet(affiliation, "subgroups.gcep");
    const contributorType = formData['contributorType']
    const contributors = contributorPKs.join(',');
    let errorMsg = '';

    if (contributorType === 'affiliation') {
      if (!curation.affiliation) {
        errorMsg = 'Cannot transfer curation because it does not belong to an affiliation.';
      } else if (contributors === affiliationId) {
        errorMsg = 'Selected Affiliation Id for transfer should not be the same as new Affiliation Id.';
      } else if (type === 'gdm' && !hasGCEP) {
        errorMsg = 'Cannot transfer GDM to an affiliation that does not belong to GCEP.';
      }
    }

    if (contributorType === 'individual') {
      if (curation.affiliation) {
        errorMsg = 'Cannot transfer curation from an affiliation by individual user(s).';
      } else if (!curation.affiliation && contributors.indexOf(curation.submitted_by.PK) === -1) {
        errorMsg = 'Cannot transfer curation because it does not belong to any selected individual user(s).';
      }
    }

    if (errorMsg === '') {
      return Promise.resolve(contributorPKs);
    } else {
      return Promise.reject({statusText: `${errorMsg}`});
    }
  }

  /**
   * Update objects in an array to given new affiliation id
   * @param {array} objs - array of objects to be updated 
   * @param {string} affiliationId - new affiliation id
   */
  const updateObjects = async (objs, affiliationId) => {
    const objPromises = objs.map(async obj => {
      let newObj = cloneDeep(obj);
      // If affiliationId is '0', then set to no associated affiliation 
      if (affiliationId === '0' && newObj.affiliation) {
        newObj.affiliation = null;
      } else {
        newObj.affiliation = affiliationId;
      }
      newObj.modified_by = auth && auth.PK ? auth.PK : null;
      const url = `${updateObjectUrl[obj.item_type]}/${obj.PK}`;
      return await requestRecycler.capture(API.put(API_NAME, url, { body: { newObj } }));
    });

    return Promise.all(objPromises);
  }

  /**
   * Method to filter object keys
   * @param {object} target - object
   * @param {array} allowed - allowed fields to be filtered
   */
  function filteredObject(target, allowed) {
    const filtered = Object.keys(target)
      .filter(key => allowed.includes(key))
      .reduce((obj, key) => {
        obj[key] = target[key];
        return obj;
      }, {});
  
    return filtered;
  }
  
  /**
   * Return an array of 'PK' from the gdm, annotations, evidence, scores, variantScores, classifications if GDM object
   * Return an array of 'PK' from the evaluations, provisionalVariant, curated_evidences if Interpretation object
   * @param {string} type - object type - gdm or interpretation
   * @param {object} curation - the gene-disease record data object or interpretation data object
   * @param {string} contributorType - contributor type - individual user or affiliation
   * @param {array} contributorPKs - contributor PKs or affiliation ids
   * @param {string} affiliationId - transfer to affiliation id
   */
  const findAllObjects = (type, curation, contributorType, contributorPKs, affiliationId) => {
    let allObjects = null;
    if (type === 'gdm') {
      allObjects = getTransferGdmObjects(curation);
    } else {
      allObjects = getTransferInterpretationObjects(curation);
    }

    let foundObjects = [];
    // If transfer by individual user
    if (contributorType === 'individual') {
      // Remove objects not created by the same user(s) who started the GDM/Interpretation
      foundObjects = allObjects.filter(obj => {
        if (type === 'gdm') {
          // Annotation object has no submitted_by property, only has affiliation,
          // so auto transfer all annotation(s) to new affiliation
          // Some objects' submitted_by is just user PK and some is full user object
          return (obj.item_type === 'annotation' || contributorPKs.indexOf(obj.submitted_by) > -1 || contributorPKs.indexOf(obj.submitted_by.PK) > -1);
        } else {
          // Some objects' submitted_by is just user PK and some is full user object
          return (contributorPKs.indexOf(obj.submitted_by) > -1 || contributorPKs.indexOf(obj.submitted_by.PK) > -1);
        }
      });
    } else {
      // Remove objects not belonged to the given affiliation(s)
      foundObjects = allObjects.filter(obj => {
        return contributorPKs.indexOf(obj.affiliation) > -1;
      });
    }

    if (type === "interpretation") {
      // interpretation.provisionalVariant is no longer a linked object
      // but interpretation.provisionalVariant.affiliation may exist and need to be updated
      if (curation && curation.provisionalVariant) {
        // If affiliationId is '0', then set to no associated affiliation 
        if (affiliationId === '0' && curation.provisionalVariant.affiliation) {
          // Need to delete but not set to null
          delete curation.provisionalVariant.affiliation;
        } else {
          curation.provisionalVariant.affiliation = affiliationId;
        }
      }
      const allowed = ['date_created', 'last_modified', 'submitted_by', 'item_type', 'affiliation', 'PK', 'provisionalVariant'];
      foundObjects.push(filteredObject(curation, allowed));
    }

    return Promise.resolve(foundObjects);
  }

  /**
   * Return an array of pathogenicity object if found
   * Load the gdm variantPathogenicity objects by PK
   * @param {object} gdm - the gene-disease record data object
   */
  const loadPathogenicities = (gdm) => {
    if (gdm.variantPathogenicity && gdm.variantPathogenicity.length > 0) {
      const promises = gdm.variantPathogenicity.map(pathogenicityId => {
        const url = `/pathogenicity/${pathogenicityId}`;
          return API.get(API_NAME, url);
      });
      return Promise.all(promises);
    } else {
      return Promise.resolve([]);
    }
  }

  /**
   * Return the GDM object if found
   * Load the gdm object by PK
   * @param {string} PK - the gene-disease record PK
   */
  const loadGdm = (PK) => {
    return new Promise((resolve, reject) => {
      // Load gdm by PK
      API.get(API_NAME, `/gdms/${PK}`).then(gdm => {
        if (gdm && gdm.item_type === "gdm") {
          API.get(API_NAME, `/annotations?associatedGdm=${PK}`).then(annotations => {
            if (annotations && annotations.length > 0) {
              gdm.annotations = annotations;
            }
            loadPathogenicities(gdm).then(pathogenicityList => {
              if (pathogenicityList && pathogenicityList.length > 0) {
                gdm.variantPathogenicity = pathogenicityList;
              }
              resolve(gdm);
            }).catch(err => {
              setSubmitErrorMsg(`Cannot load GDM variantPathogenicity. Error: ${err.message}`);
              reject({statusText: `Cannot load GDM variantPathogenicity. Error: ${err.message}`});
            });
          }).catch(err => {
            setSubmitErrorMsg(`Cannot load GDM annotations. Error: ${err.message}`);
            reject({statusText: `Cannot load GDM annotations. Error: ${err.message}`});
          });
        } else {
          setSubmitErrorMsg(`Cannot load GDM.`);
          reject({statusText: `Cannot load GDM.`});
        }
      }).catch(err => {
        setSubmitErrorMsg(`GDM is not found. Error: ${err.message}`);
        reject({statusText: `GDM is not found. Error: ${err.message}`});
      });
    });
  }

  /**
   * Return the array of evaluation object if found
   * Load the evaluation objects from interpretation by PK
   * @param {object} interpretation - the interpretation object
   */
  const loadEvaluations = (interpretation) => {
    if (interpretation && interpretation.evaluations && interpretation.evaluations.length > 0) {
      const promises = interpretation.evaluations.map(evaluationId => {
        const url = `/evaluations/${evaluationId}`;
          return API.get(API_NAME, url);
      });
      return Promise.all(promises);
    } else {
      return Promise.resolve([]);
    }
  }

  /**
   * Return the array of evidence object if found
   * Load the evidence objects from interpretation by PK
   * @param {object} interpretation - the interpretation object
   */
  const loadCuratedEvidences = (interpretation) => {
    if (interpretation && interpretation.curated_evidence_list && interpretation.curated_evidence_list.length > 0) {
      const promises = interpretation.curated_evidence_list.map(curatedEvidenceId => {
        const url = `/curated-evidences/${curatedEvidenceId}`;
          return API.get(API_NAME, url);
      });
      return Promise.all(promises);
    } else {
      return Promise.resolve([]);
    }
  }
  
  /**
   * Return the interpretation object if found
   * Load the interpretation by PK
   * @param {string} PK - the interpretation PK
   */
  const loadInterpretation = (PK) => {
    return new Promise((resolve, reject) => {
      // Load interpretation by PK
      API.get(API_NAME, `/interpretations?PK=${PK}`).then(interpretation => {
        //console.log('interp 1: ' + JSON.stringify(interpretation));
        if (interpretation && interpretation.item_type === "interpretation") {
          loadEvaluations(interpretation).then(evaluations => {
            // No longer need to load population, functional, and computational objects from evaluations  
            if (evaluations && evaluations.length > 0) {
              interpretation.evaluations = evaluations;
            }
            //console.log('interp 2: ' + JSON.stringify(interpretation));
            // Load curated_evidence_list
            loadCuratedEvidences(interpretation).then(curatedEvidences => {
              if (curatedEvidences && curatedEvidences.length > 0) {
                interpretation.curated_evidence_list = curatedEvidences;
              }
              //console.log('interp 3: ' + JSON.stringify(interpretation));
              resolve(interpretation);
            }).catch(err => {
              setSubmitErrorMsg(`Cannot load interpretation curated evidences. Error: ${err.message}`);
              reject({statusText: `Cannot load interpretation curated evidences. Error: ${err.message}`});
            });
          }).catch(err => {
            setSubmitErrorMsg(`Cannot load interpretation evaluations. Error: ${err.message}`);
            reject({statusText: `Cannot load interpretation evaluations. Error: ${err.message}`});
          });
        } else {
          setSubmitErrorMsg(`Cannot load interpretation.`);
          reject({statusText: `Cannot load interpretation.`});
        }
      }).catch(err => {
        setSubmitErrorMsg(`Interpretation ${PK} is not found. Error: ${err.message}`);
        reject({statusText: `Interpretation is not found. Error: ${err.message}`});
      });
    });
  }

  /**
   * Return the either the gdm or interpretation object if found
   * Load the gdm or interpretation by PK
   * @param {string} type - object type - gdm or interpretation
   * @param {string} PK - gdm or interpretation PK
   */
  const loadTypeObject = (type, PK) => {
    if (type === 'gdm') {
      return loadGdm(PK);
    } else {
      return loadInterpretation(PK);
    }
  }

  /**
   * For gdm, check if duplicated score or duplicated provisionalClassification can be resulted after the transfer
   * For interpretation, check if duplicated interpretation can be resulted after the transfer
   * Return true if no duplicate, false if duplicate can be created
   * @param {string} type - object type - gdm or interpretation
   * @param {object} curation - the gene-disease record data object or interpretation data object
   * @param {string} contributorType - contributor type - individual user or affiliation
   * @param {array} contributorPKs - contributor PKs or affiliation ids
   * @param {string} newAffiliationId - transfer to affiliation id
   */
  const checkDuplicate = (type, curation, contributorType, contributorPKs, newAffiliationId) => {
    return new Promise((resolve, reject) => {
      // Check for transfer gdm
      if (type === "gdm") {
          // Check if transfer from contributor(s) and to affiliation both already have provisionalClassification in this GDM
          if (curation.provisionalClassifications && curation.provisionalClassifications.length > 0) {
            // Get provisionalClassification that belongs to contributor(s)
            let fromProvisional = [];
            if (contributorType === 'individual') {
              fromProvisional = curation.provisionalClassifications.filter(o => { 
                return (contributorPKs.indexOf(o.submitted_by.PK) > -1 &&
                  (!o.affiliation || (o.affiliation && o.affiliation !== newAffiliationId)));
              });
            } else {
              fromProvisional = curation.provisionalClassifications.filter(o => { 
                return (contributorPKs.indexOf(o.affiliation) > -1);
              });
            }
            // Get provisionalClassification that belongs to new Affiliation
            let toProvisional = [];
            if (newAffiliationId === "0") {
              // If transfer to individual and from contributor has a provisionalClassification to be transferred
              // Then if transfer by individual, check if creator of to be transferred provisionalClassification has other provisionalClassification that either associated with an affiliation or not
              // Then if transfer by affiliation, check if creator of to be transferred provisionalClassification has provisionalClassification that do not associated with an affiliation
              if (fromProvisional && fromProvisional.length > 0) {
                if (contributorType === 'individual') {
                  // ??? fromProvisional more than 1
                  fromProvisional.forEach(obj => {
                    toProvisional = curation.provisionalClassifications.filter(o => {
                      return (o.submitted_by.PK === obj.submitted_by.PK);
                    });
                  });
                } else {
                  toProvisional = curation.provisionalClassifications.filter(o => {
                    return (o.submitted_by.PK === fromProvisional[0].submitted_by.PK && !o.affiliation);
                  });
                }
              }
            } else {
              // If transfer to new affiliation, check if new affiliation already has a provisionalClassification
              toProvisional = curation.provisionalClassifications.filter(o => {
                return (o.affiliation === newAffiliationId);
              });
            }
            if (fromProvisional && ((fromProvisional.length > 1) || (fromProvisional.length > 0 && toProvisional && toProvisional.length > 0))) {
              reject({statusText: `Duplicated classification associated with new Affiliation ID are found.`});
            } else {
              resolve(contributorPKs);
            }
          } else {
            resolve(contributorPKs);
          }
      } else {
        // Check for transfer interpretation
        if (newAffiliationId === "0") {
          // If transfer interpretation to an individual
          // Check if transfer interpretation creator has an existing interpretation 
          // Load interpretation by variant and current interpretation creator
          API.get(API_NAME, `/interpretations?submitted_by=${curation.submitted_by.PK}&variant=${curation.variant}`).then(found => {
            if (found && found.length > 0) {
              setSubmitErrorMsg(`An interpretation associated with transfer from individual already exists for this variant.`);
              reject({statusText: `An interpretation associated with transfer from individual already exists for this variant.`});
            } else {
              resolve(contributorPKs);
            }
          }).catch(err => {
            setSubmitErrorMsg(`Error in checking for duplicated interpretation. Error: ${err.message}`);
            resolve(contributorPKs);
          });
        } else {
          // If transfer interpretation to new affiliation
          // Check if transfer to affiliation already has an interpretation associated with this variant
          // Load interpretation by variant and new affiliation Id
          API.get(API_NAME, `/interpretations?affiliation=${newAffiliationId}&variant=${curation.variant}`).then(found => {
            if (found && found.length > 0) {
              setSubmitErrorMsg(`An interpretation associated with New Affiliation ID already exists for this variant.`);
              reject({statusText: `An interpretation associated with New Affiliation ID already exists for this variant.`});
            } else {
              // It's ok since to affiliation has no existing interpretation
              resolve(contributorPKs);

            }
          }).catch(err => {
            setSubmitErrorMsg(`Error in checking for duplicated interpretation. Error: ${err.message}`);
            resolve(contributorPKs);
          });
        }
      }
    });
  }

  /**
   * Method to get the user PK from given email in list if type is individual;
   * if type is affiliation, list is affiliation ids
   * @param {array} list - contributor emails
   * @param {object} obj - gdm/interpretation object
   */
  const getContributorPKs = (list) => {
    let newList = [];

    return new Promise((resolve, reject) => {
      if (list && list.length > 0) {
        let i = 0;
        list.forEach(email => {
          requestRecycler.capture(API.get(API_NAME, `/users?email=${email}`))
          .then(user => {
            i++;
            if (user && user.length && user[0].PK) {
              newList.push(user[0].PK);
            }
            if (i === list.length) {
              resolve(newList);
            }
          }).catch(error => {
            console.log(JSON.parse(JSON.stringify(error)));
            setSubmitErrorMsg(`Problem finding user UUID from user email - ${email}`);
            reject({statusText: `Problem finding user UUID from user email - ${email}`});
          });
        })
      } else {
        setSubmitErrorMsg("No User email is entered.");
        reject({statusText: "No User email is entered."});
      }
    });
  }

  /**
   * Method to create necessary data object to be sent to Data Exchange for UNC tracking
   * @param {object} gdm - GDM object
   * @param {string} transferFrom - GDM transferred from affiliation Id
   * @param {string} transferTo - GDM transferred to affiliation Id
   * @param {string} notes - notes on this transfer
   */
  const setUNCData = (gdm, transferFrom, transferTo, notes) => {
    const fromAffiliation = getAffiliationByID(transferFrom, affiliationsData);
    const toAffiliation = getAffiliationByID(transferTo, affiliationsData);
    const submissionTimestamp = new Date();

    // GDM should only have one classification
    const provisional = lodashGet(gdm, "provisionalClassifications[0]", null);
    // Get all contributors
    const snapshots = lodashGet(provisional, "associatedClassificationSnapshots", null) && provisional.associatedClassificationSnapshots.length ? provisional.associatedClassificationSnapshots : [];
    const contributors = getGDMContributors(gdm, snapshots, null, affiliationsData);

    // Add current user to contributors list
    if (auth) {
      contributors.push({
        name: getUserName(auth),
        id: lodashGet(auth, 'PK', ''),
        email: lodashGet(auth, 'email', ''),
        roles: ['transfer executor']
      });
    }

    return {
      iri: provisional ? provisional.PK : '',
      report_id: lodashGet(gdm, "PK", ''),
      gene_validity_evidence_level: getGeneEvidenceData(gdm, provisional),
      date: moment(submissionTimestamp).toISOString(),
      performed_by: getPerformedByUserData(auth),
      contributors: contributors,
      content: {
        event_type: 'transfer',
        date: moment(submissionTimestamp).toISOString(),
        transfer_from: {
          id: lodashGet(fromAffiliation, "affiliation_id", ''),
          name: lodashGet(fromAffiliation, "affiliation_fullname", ''),
          gcep_id: lodashGet(fromAffiliation, "subgroups.gcep.id", ''),
          gcep_name: lodashGet(fromAffiliation, "subgroups.gcep.fullname", '')
        },
        transfer_to: {
          id: lodashGet(toAffiliation, "affiliation_id", ''),
          name: lodashGet(toAffiliation, "affiliation_fullname", ''),
          gcep_id: lodashGet(toAffiliation, "subgroups.gcep.id", ''),
          gcep_name: lodashGet(toAffiliation, "subgroups.gcep.fullname", '')
        },
        notes: notes
      }
    };
  }

  /**
   * Method to add/remove affiliation to the GDM or Interpretation and its nested objects when form is submitted
   * @param {object} e - Event object
   */
  const submitForm = async (e) => {
    e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
    setSubmitErrorMsg('');
    setIsSubmitting(true);
    // Start with default validation
    if (allFormFieldsHaveValue()) {

      const type = formData.selectedType;
      const PK = formData.selectedPK;
      const contributorType = formData.contributorType;
      const contributorList = formData.contributors;
      const affiliationId = formData.affiliationId;
      const affiliation = affiliationId === '0' ? 'no affiliation' : affiliationId;
      const errMsg = type === 'gdm' ? 'The Gene-Disease record has been affiliated with '
                              : 'The Interpretation record has been affiliated with ';
      let curation = null;

      // Convert contributor(s) PKs string into array
      const re = /\s*(?:,|$)\s*/;
      const origContributorList = contributorList.split(re);

      // Load GDM or interpretation object
      loadTypeObject(type, PK).then(obj => {
        curation = obj;
        // If transfer by individual, get user PK from user email
        if (contributorType === "individual") {
          return getContributorPKs(origContributorList);
        } else {
          // Just return affiliation IDs
          return Promise.resolve(origContributorList);
        }
      }).then(contributorPKs  => {
        // Check the entered individual contributor email all can be converted to user PK
        if (contributorPKs && contributorPKs.length === origContributorList.length ) {
          return Promise.resolve(contributorPKs);
        } else {
          return Promise.reject({statusText: "Some or all user(s) cannot be found by entered email(s).  Please check the entered email(s)."});
        }
      }).then(contributorPKs => {
        // Validate form data with to be transferred GDM/interpretation object
        return validateForm(curation, contributorPKs);
      }).then(contributorPKs => {
        return checkDuplicate(type, curation, contributorType, contributorPKs, affiliationId);
      }).then(contributorPKs => {
        // If form data is validated.  Gather all objects, including the GDM or Interpretation
        return findAllObjects(type, curation, contributorType, contributorPKs, affiliationId);
      }).then(objectList => {
        // console.log('ObjectList(new): ' + JSON.stringify(objectList));
        // Update the objects with new owner
        if (objectList && objectList.length > 0) {
          let tempArray = [];
          // Batch update the objects
          return updateObjects(objectList, affiliationId).then(response => {
            for (let item of response) {
              tempArray.push(item['PK']);
            }
            return Promise.resolve(tempArray);
          });
        } else {
          return Promise.resolve(null);
        }
      }).then(data => {
        if (data && data.length) {
          // Gather GDM transfer data to be sent to Data Exchange
          // Only send message if tranfer from affiliation to another affiliation
          if (type === 'gdm' && contributorType === 'affiliation') {
            const transferFrom = origContributorList[0];
            const transferTo = affiliationId;
            const uncData = setUNCData(curation, transferFrom, transferTo, formData.notes);

            // Post GDM transfer data to Data Exchange
            postTrackData(uncData).then(() => {
              console.log('Successfully sent GDM transfer data to Data Exchange for GDM %s at %s', curation.PK, moment(curation.last_modified).toISOString());
            }).catch(error => {
              console.log('Error sending change GDM transfer %s data to Data Exchange for GDM %s at %s - Error: %o', curation.PK, moment(curation.last_modified).toISOString(), error);
            });
          }

          setIsSubmitting(false);
          // console.log('saved curation: ' + JSON.stringify(curation));
          // console.log('Result: ' + JSON.stringify(data));
          setSubmitErrorMsg(errMsg + affiliation + '.');
        } else {
          setSubmitErrorMsg('No data was found and transferred.');
          setIsSubmitting(false);
        }
      }).catch(err => {
        if (!submitErrorMsg) {
          if (err) {
            console.log('Updating AFFILIATION ERROR: %o', err);
            if (err.statusText) {
              setSubmitErrorMsg(err.statusText);
            } else {
              setSubmitErrorMsg("Problem transferring some objects to new Affiliation.");
            }
          } else {
            setSubmitErrorMsg("Unknown Error - Problem transferring some objects to new Affiliation.");
          }
        }
        setIsSubmitting(false);
      });
    } else {
      setIsSubmitting(false);
    }
  }

  const submitErrClass = 'submit-err float-right' + (submitErrorMsg ? '' : ' hidden');
  const pkLabel = formData["selectedType"] === 'gdm' ? 'GDM UUID' : 'Interpretation UUID';
  const ownerLabel = formData["contributorType"] === 'individual'
    ? 'Current Contributor email(s) for Transfer'
    : formData['selectedType'] === 'gdm'
      ? 'Current Affiliation ID for Transfer'
      : 'Current Affiliation ID(s) for Transfer';
  const listHelp = formData["contributorType"] === 'individual'
    ? 'Separate emails with commas'
    : formData['selectedType'] === 'interpretation'
      ? 'Separate IDs with commas'
      : '';
  const showNotes = formData['selectedType'] === 'gdm';
  const isAdmin = auth && Array.isArray(auth.groups) && (auth.groups.includes('admin') || auth.groups.includes('powerUser'));

  return (
    <Jumbotron> 
      <Container>
      {isAdmin ?
        <div className="ml-5 mr-5 add-affiliation">
          <h1>Transfer Curation</h1>
          <Row className="form-group">
            <Col sm="12">
              <form onSubmit={submitForm} className="form-horizontal mt-5">
                  <Input type="select" name="selectedType" label="GDM or Interpretation"
                    value={formData["selectedType"]} onChange={handleChange}
                    error={formErrors["selectedType"]} groupClassName="row mb-3"
                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" required>
                    <option value="interpretation">Interpretation</option>
                    <option value="gdm">GDM</option>
                  </Input>
                  <Input type="text" name="selectedPK" label={pkLabel}
                    value={formData["selectedPK"]} onChange={handleChange}
                    error={formErrors["selectedPK"]} groupClassName="row mb-3"
                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" required />
                  <Input type="select" name="contributorType" label="Select Individual Contributor or Affiliation for Transfer"
                    value={formData["contributorType"]} onChange={handleChange}
                    error={formErrors["contributorType"]} groupClassName="row mb-3"
                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" required>
                    <option value="individual">Individual</option>
                    <option value="affiliation">Affiliation</option>
                  </Input>
                  <Input type="text" name="contributors" label={ownerLabel}
                    value={formData["contributors"]} onChange={handleChange}
                    error={formErrors["contributors"]} groupClassName="row mb-3"
                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" 
                    placeholder={listHelp} required />
                  <Input type="text" name="affiliationId" label="New Affiliation ID" 
                    value={formData["affiliationId"]} onChange={handleChange}
                    error={formErrors["affiliationId"]} groupClassName="row mb-3"
                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" required />
                  {showNotes ?
                    <Input type="textarea" name="notes" label="Notes"
                      value={formData["notes"]} rows="4" onChange={handleChange}
                      error={formErrors["notes"]} groupClassName="row mb-3"
                      labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" required />
                    : null}
                  <Row><Col>
                    <LoadingButton
                      type="submit"
                      className="align-self-end float-right mb-2 ml-2"
                      variant="primary"
                      text="Submit"
                      textWhenLoading="Submitting"
                      isLoading={isSubmitting}
                    />
                    <div className={submitErrClass}>{submitErrorMsg}</div>
                  </Col></Row>
              </form>
            </Col>
          </Row>
        </div>
      :
        <div><h3><i className="icon icon-exclamation-triangle"></i> Sorry. You do not have access to this page.</h3></div>
      }
    </Container>
    </Jumbotron> 

  );
};

export default TransferCuration;
