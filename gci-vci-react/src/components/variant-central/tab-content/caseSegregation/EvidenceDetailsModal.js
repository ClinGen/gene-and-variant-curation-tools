import React, { useState } from "react";
import { Row, Col, Button } from "react-bootstrap";
import axios from "axios";
import _ from "lodash";
import cloneDeep from "lodash/cloneDeep";

// Internal lib
import { EXTERNAL_API_MAP } from "../../../../constants/externalApis";
import { LoadingButton } from "../../../common/LoadingButton";
import Modal from "../../../common/Modal";
import Input from "../../../common/Input";
import { evidenceResources } from "./segregationData";

export const EvidenceDetailsModal = ({
  submitCuratedEvidence,    // Function to call to add or edit an evidence
  detailsData,              // Details data relevant to this particular piece of evidence
  isNew,                    // If we are adding a new piece of evidence or editing an existing piece
  isFromMaster,             // If editing an existing evidence by clicking edit button in master/tally table
  subcategory,              // Subcategory (usually the panel) the evidence is part of
  evidenceType,             // Evidence source type
  errorMsg,                 // Error message from submit
  isSubmitting,             // Submitting data or not
  show,                     // Flag if ready for second modal
  onHide,                   // Cancel
  }) => {

  const [data, setData] = useState(detailsData);
  const [hpoData, setHpoData] = useState(detailsData.hpoData ? detailsData.hpoData : []);
  // Flag for "Disease associated with proband(s) (HPO)" checkbox
  const [hpoUnaffected, setHpoUnaffected] = useState(detailsData.is_disease_associated_with_probands);
  const [formErrors, setFormErrors] = useState({});
  const [isLoadingHpoTerms, setIsLoadingHpoTerms] = useState(false);

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

  const setNewHpoTerm = (hpo) => {
    if (hpoData){
      const oldTerms = cloneDeep(hpoData);
      if (!oldTerms.includes(hpo)){ // Prevent dupes
        setHpoData(oldTerms => [...oldTerms, hpo]);
      }
    }
  };

  const clearHpoTerms = () => {
    setNewHpoTerm(null);
    setHpoData([]);	
  };

  // Pull values from HPO input field (a list of comma-separated values)
  const getHpoIdsFromList = () => {
    const ids = data['proband_hpo_ids'];
    if (ids) {
      let list = null;
      const rawList = ids.split(',');
      if (rawList && rawList.length) {
        list = rawList.map((item) => {
          const m = (/^\s*(HP:\d{7})\s*$/i).exec(item);
          return m ? m[1].toUpperCase() : null;
        });
      }
      return list;
    }
    return null;
  };

  /**
   * Submit button is clicked.  Save all form data and call function to save in db.
   * Close the modal.
   * 
   * @param {object} e    // event
   */
  const submitEvidence = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const errors = {};
    // validate number fields
    evidenceResources.evidenceInputs.forEach(input => {
      input.cols.forEach(col => {
        if (col.kind === 'number' && data[col.name] && !data[col.name].match(/^\s*(\d*)\s*$/)) {
          errors[col.name] = 'Only number is allowed';
        }
      });
    });

    // Check HPO ID format
    const hpoIds = getHpoIdsFromList();
    const filteredIds = filterOutExtraHpo(hpoIds);
    const duplicateExists = checkForDuplicateHpo(hpoIds);
    if (hpoIds && hpoIds.length && hpoIds.includes(null)) {
      // HPOID list is bad
      errors.proband_hpo_ids = 'Use HPO IDs (e.g. HP:0000001) separated by commas';
    } else if (duplicateExists) {
      errors.proband_hpo_ids = 'Please remove duplicate IDs.';
    } else if (filteredIds && filteredIds.length) {
      // Input and hpoData don't match
      errors.proband_hpo_ids = `The terms and IDs above do not match. Please remove or retrieve terms again. (${filteredIds.join(', ')})`;
    }

    // If has form error, display errors
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
    } else {
      // If form data is valid, save evidence
      let newData = null;
      let newHpoData = {hpoData: hpoData};
      if (isNew) {
        newData = Object.assign(detailsData, data, newHpoData);
      } else {
        newData = Object.assign({}, detailsData);
        Object.assign(newData, data, newHpoData);
      }
      submitCuratedEvidence(newData);
    }
  };

  /**
   * Given the subcategory, return a list of allowed fields.
   * This is used to highlight the input.
   */
  const allowedFields = () => {
    const tableObj = evidenceResources.tableCols().filter(o => o.subcategory === subcategory);
    let fields = tableObj && tableObj[0] && tableObj[0].cols ? tableObj[0].cols.map(col => col.key) : [];
    if (fields.indexOf('comments') !== -1) {
      fields.splice(fields.indexOf('comments'), 1);
    }
    return fields;
  };

  /**
   * If the "Disease associated with proband(s) (HPO) (Check here if unaffected)"
   * checkbox is toggled, save current state.
   * Otherwise, save form data
   * 
   * @param {event} e 
   */
  const handleChange = (e) => {
    clearFieldError(e.target.name);
    let newData = cloneDeep(data);
    if (e.target.name === 'is_disease_associated_with_probands') {
      newData[e.target.name] = !hpoUnaffected; 
      setHpoUnaffected(!hpoUnaffected);
    }
    else {
      newData[e.target.name] = e.target.value;
    }
    setData(newData);
  };

  /**
   * Check for duplicates and return a boolean value accordingly
   * @param {array} inputIds 
   */
  const checkForDuplicateHpo = (inputIds) => {
    if (inputIds && inputIds.length) {
      return inputIds.some((id, index) => inputIds.indexOf(id) !== index);
    }
  };

  /**
   * Check that hpoData and proband_hpo_ids are the same
   * If not, returns array of rejected ids for form validation
   * @param {array} inputIds
   */
  const filterOutExtraHpo = (inputIds) => {
    if (hpoData && hpoData.length) {
      const idsFromHpoData = [];
      hpoData.forEach(obj =>{
        idsFromHpoData.push(obj.hpoId);
      });
      if (inputIds && (inputIds.length >= idsFromHpoData.length)) {
        return inputIds.filter(id => !idsFromHpoData.includes(id));
      } else if (inputIds && (idsFromHpoData.length > inputIds.length)) {
        return idsFromHpoData.filter(id => !inputIds.includes(id));
      }
    }
  };

  /**
   * Display the input fields with available values
   */
  const formInputFields = () => {
    let jsx = [];
    let i = 1;

    // Get a list of allowed fields
    let fields = allowedFields();

    evidenceResources.evidenceInputs.forEach(row => {
      let rowTDs = [];
      let done = false;
      row.cols.forEach(col => {
        // Set up the label for the input
        const codes = evidenceResources.fieldToCriteriaCodeMapping
          .filter(obj => obj.key === col.name)
          .map(obj => obj.codes);
        let label = col.label;
        if (codes.length > 0) {
          label += ` (${codes.join(', ')})`;
        }

        const fieldClass = fields.indexOf(col.name) === -1 || isFromMaster ? null : 'relevant-field';

        let node = [
          <Col md={col.width} key={i++}>
            <div>
              <label><b>{label}</b></label>
              <Input
                className={col.kind === 'checkbox' ? 'd-block' : `form-control ${fieldClass}`}
                name={col.name}
                type={col.kind}
                checked={col.name === 'is_disease_associated_with_probands' && hpoUnaffected !== undefined ? hpoUnaffected : false}
                value={data[col.name] || ''}
                placeholder={col.placeholder || ''}
                onChange={handleChange}
                error={formErrors[col.name] || null}
              />
            </div>
          </Col>
        ]

        if ('lookup' in col) {
          // Push nodes separately so elements do not stack vertically
          node.push(
            <LoadingButton
              key={i++} 
              className="align-self-end mb-2"
              variant="primary"
              onClick={() => lookupTerm()}
              text="Get Terms"
              textWhenLoading="Retrieving"
              isLoading={isLoadingHpoTerms}
            />
          );
          node.push(	
            <Button
              key={i++}	
              className="align-self-end mb-2 ml-2"	
              variant="danger"
              onClick={() => clearHpoTerms()}	
            >
              Clear Terms
            </Button>
          );
          node.push(
            <Col md="5" key={i++}>
              <label className={hpoData && !hpoData.length ? 'terms-label' : ''}>
                <b>Terms for phenotypic feature(s) associated with proband(s):</b>
              </label>
              {renderLookupResult()}
            </Col>
          );
        }
        rowTDs.push(node);
        // if field needs to be put in its own row, add it here.
        if (col.width === 12) {
          const rowTR = (
            <Row key={i++} className="mb-3">
              {rowTDs}
            </Row>
          );
          jsx.push(rowTR);
          rowTDs = [];
          done = true;
        }
      });
      // if row has not been added, add it here.
      if (!done) {
        const rowTR = (
          <Row key={i++} className="mb-3">
            {rowTDs}
          </Row>
        );
        jsx.push(rowTR);
      }
    });
    return jsx;
  };

  /**
   * Renders list of saved HPO terms and their respective ids
   */
  const renderLookupResult = () => {
    if (hpoData && !hpoData.length) {
      return null;
    }
    if (hpoData && hpoData.length) {
      const hpo = hpoData.map((obj, i) => {
        return <li key={i}>{obj.hpoTerm} ({obj.hpoId})</li>
      });

      const node = (
        <div className="text-left">
          <ul>
            {hpo}
          </ul>
        </div>
      );
      return node;
    }
  };

  /**
   * 
   * @param {string} hpoIds
   */
  const validateHpo = () => {
    const checkIds = getHpoIdsFromList();
    // Check HPO ID format
    if (checkIds && checkIds.length && checkIds.includes(null)) {
      // HPOID list is bad
      const errors = {};
      errors['proband_hpo_ids'] = 'For term lookup, use HPO IDs (e.g. HP:0000001) separated by commas';
      setFormErrors(errors);
    }
    else if (checkIds && checkIds.length && !checkIds.includes(null)) {
      const hpoIdList = _.without(checkIds, null);
      return _.uniq(hpoIdList);
    }
  };

  /**
   * Fetch terms from proband_hpo_id form value, save to state as array of objects
   */
  const lookupTerm = () => {
    setIsLoadingHpoTerms(true);
    setHpoData([]);
    const validatedHpoList = validateHpo(); 
    if (validatedHpoList) {
      clearFieldError('proband_hpo_ids');
      validatedHpoList.forEach(id => {
        const url = EXTERNAL_API_MAP['HPOApi'] + id;
        axios.get(url).then(result => {
          const term = result['data']['details']['name'];
          const hpo = {hpoId: id, hpoTerm: term};
          setNewHpoTerm(hpo);
        }).catch(err => {
          // Unsuccessful retrieval
          console.warn('Error in fetching HPO data =: %o', err);
          const term = 'Term not found';
          const hpo = {hpoId: id, hpoTerm: term};
          setNewHpoTerm(hpo);
        });
      });
    }
    setIsLoadingHpoTerms(false);
  };

  var submitErrClass = 'submit-err float-right ' + (Object.keys(formErrors).length > 0 ? '' : ' hidden');
  var showMsgClass = isFromMaster ? 'hidden' : '';

  const backgroundGreen = '#00FF0030';
  return (
    <Modal
      show={show}
      title={isNew ? "Add Evidence Details" : "Edit Evidence Details"}
      className="modal-default case-seg-evidence-sheet-modal"
      onHide={onHide}
      hideButtonText="Cancel"
      onSave={submitEvidence}
      saveButtonText="Submit"
      saveButtonInProgressText="Submitting"
      isLoadingSave={isSubmitting}
      saveError={errorMsg}
      dialogClassName="details-modal-width"
    >
      <div className="form-std">
        <h4>
          For {evidenceResources.typeMapping[evidenceType].name} evidence details
        </h4>
        <h4 className={showMsgClass}>
          Fields marked in a <span style={{backgroundColor: backgroundGreen}}>green background</span> are specifically relevant to this Criteria Code.
        </h4>
        <div className="form-horizontal form-std">
          {formInputFields()}
          <div className="row">&nbsp;<br />&nbsp;</div>
          <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
        </div>
      </div>
    </Modal>
  );
};
