import React, { useState, useEffect } from 'react';
import PropTypes from "prop-types";
import { API } from 'aws-amplify';
import { API_NAME } from '../../utils';
import cloneDeep from 'lodash/cloneDeep';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faAngleLeft } from '@fortawesome/free-solid-svg-icons';

import Modal from './Modal';
import Input from './Input';
import { convertDiseasePKToMondoId } from '../../utilities/diseaseUtilities';
import { resolveCallbackReturnValue } from '../../utilities/fetchUtilities';

const DiseaseModal = ({
  id,
  show,
  title,
  onHide,
  initialDisease,
  parentEndpoint, // endpoint to save disease to parent. if not specified, save to parent will be skipped
  updateParentObj,
  updateDisease,
  parentToInsertDisease,// if parentEndpoint is not specified, this prop is not required
  userPK
}) => {
  const [diseaseInputType, setDiseaseInputType] = useState('search'); // options: 'search' or 'freetext'
  const [isLoadingSave, setLoadingSave] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // Search
  const [diseaseIdInput, setDiseaseIdInput] = useState(initialDisease ? convertDiseasePKToMondoId(initialDisease.PK) : '');
  const [diseaseIdInputError, setDiseaseIdInputError] = useState(null);
  const [isLoadingRetrieval, setLoadingRetrieval] = useState(false);
  const [retrievedDisease, setRetrievedDisease] = useState(null);
  // Free text
  const [diseaseName, setDiseaseName] = useState('');
  const [hpoIds, setHpoIds] = useState('');
  const [definitions, setDefinitions] = useState('');
  const [freeTextErrors, setFreeTextErrors] = useState({});

  useEffect(() => {
    return () => {
      setDiseaseInputType('search');
      setDiseaseIdInput(initialDisease ? convertDiseasePKToMondoId(initialDisease.PK) : '');
      setDiseaseIdInputError(null);
      setRetrievedDisease(initialDisease ? initialDisease : null);
      setDiseaseName('');
      setHpoIds('');
      setDefinitions('');
      setFreeTextErrors({});
      setSaveError(null);
    }
  }, [show, initialDisease]);

  const isValidDiseaseId = (mondoId) => {
    if (mondoId && mondoId.length) {
      // Expect a semicolon (':') in the id and it is not at the start of the id string
      // Such as 'MONDO:0016587'
      if (mondoId.indexOf(':') < 0 || mondoId.match(/:/g).length > 1) {
        return false;
      }
      /**
       * Allow MONDO IDs only
       */
      const valid_pattern = /^mondo/i;
      const multi_instance_pattern = /mondo/ig;
      if (!mondoId.match(valid_pattern) || mondoId.match(multi_instance_pattern).length > 1) {
        return false;
      }
      return true;
    }
  };

  const handleRetrieveDisease = async (mondoId) => {
    // Reset the disease
    if (retrievedDisease) {
      setRetrievedDisease(null);
    }
    // Validate disease id format
    if (!isValidDiseaseId(mondoId)) {
      setDiseaseIdInputError('Enter a valid MONDO ID');
      return;
    }
    setLoadingRetrieval(true);
    const formattedMondoId = mondoId.replace(':', '_');
    try {
      const url = '/diseases/' + formattedMondoId;
      const response = await API.get(API_NAME, url);
      if (response) {
        setRetrievedDisease(response);
      } else {
        throw response;
      }
      setLoadingRetrieval(false);
    } catch (error) {
      setDiseaseIdInputError(`Disease for ${mondoId} not found.`);
      setLoadingRetrieval(false);
      console.log(`Error searching for ${mondoId}: ${error}`);
    }
  };

  const handleMondoInputKeyPress = (e) => {
    if (e.which === 13) {
      handleRetrieveDisease(diseaseIdInput);
    }
  };

  const handleMondoInputChange = (event) => {
    if (diseaseIdInputError) {
      setDiseaseIdInputError(null);
    }
    setDiseaseIdInput(event.target.value);
  };

  const handleFreeTextInputChange = (e, id, setFieldInput) => {
    if (freeTextErrors[id]) {
      setFreeTextErrors((prevState) => {
        const errors = JSON.parse(JSON.stringify(prevState));
        errors[id] = undefined;
        return errors;
      });
    }
    setFieldInput(e.target.value);
  };

  const isValidHpoList = (list, re) => {
    if (list) {
      const rawList = list.split(','); // Break input into array of raw strings
      if (rawList && rawList.length) {
        return rawList.some((item) => {
          const m = re.exec(item);
          return !m;
        });
      }
    }
    return false;
  };

  const isValidFreeTextFields = () => {
    const errors = {};
    if (diseaseName === '') {
      errors.diseaseName = 'Required for free text disease';
    }
    if (isValidHpoList(hpoIds, /^\s*(HP:\d{7})\s*$/i)) {
      errors.hpoIds = 'Use HPO IDs (e.g. HP:0000001) separated by commas';
    }
    if (definitions === '' && hpoIds === '') {
      errors.definitions = 'Either a description or HPO term(s) (e.g. HP:0000001) is required';
      errors.hpoIds = 'Either a description or HPO term(s) (e.g. HP:0000001) is required';
    }

    if (Object.keys(errors).length > 0) {
      setFreeTextErrors(errors);
      return false;
    }
    return true;
  };

  const addDiseaseToParent = async (disease) => {
    const parentObj = cloneDeep(parentToInsertDisease);
    // const parentObj = parentToInsertDisease
    parentObj.disease = disease.PK;
    parentObj.diseaseTerm = disease.term;
    if (userPK || userPK === null) {
      parentObj.modified_by = userPK;
    }
    const params = {body: {parentObj}}
    try {
        const url = '/' + parentEndpoint + '/' + parentObj.PK;
        const response = await API.put(API_NAME, url, params);
        if (response) {
          updateParentObj(response);
          handleCallbacks({
            updateDisease,
            updateDiseaseArg: disease,
            setLoadingSave,
            setSaveError,
            onHide
          });
        }
    } catch (error) {
      console.log(`Error updating ${parentObj.item_type} with disease ${error}`);
      setLoadingSave(false);
      setSaveError('Save failed!');
    }
  }

  const handleSave = async () => {
    setLoadingSave(true);
    if (diseaseInputType === 'search') {
      if (retrievedDisease) {
        if (parentEndpoint) {
          addDiseaseToParent(retrievedDisease);
        } else {
          handleCallbacks({
            updateDisease,
            updateDiseaseArg: retrievedDisease,
            setLoadingSave,
            setSaveError,
            onHide
          });
        }
      } else {
        setDiseaseIdInputError('Please enter a MONDO ID');
        setLoadingSave(false);
      }
    } else {
      if (isValidFreeTextFields()) {
        setFreeTextErrors({});
        const hpoIdsList = hpoIds.replace(' ', '').split(',');
        const freeTextDisease = {
          freetext: true,
          phenotypes: hpoIds ? hpoIdsList : undefined,
          definition: definitions ? definitions : undefined,
          term: diseaseName,
        };
        try {
          const url = '/diseases/';
          const params = { body: { freeTextDisease } }
          const response = await API.post(API_NAME, url, params);
          if (response) {
            if (parentEndpoint) {
              addDiseaseToParent(response);
            } else {
              handleCallbacks({
                updateDisease,
                updateDiseaseArg: response,
                setLoadingSave,
                setSaveError,
                onHide
              });
            }
          }
        } catch (error) {
          console.log('Error saving free text disease:', error);
          setLoadingSave(false);
          setSaveError('Save failed!');
        }
      } else {
        setLoadingSave(false);
      }
    }
  };

  const renderSearchDiseaseForm = () => (
    <>
      <b>Enter a MONDO ID below. To find the desired MONDO ID:</b>
      <ol className="instruction-references">
        <li>
          <span>
            Search for the desired MONDO term using the <a href={'https://www.ebi.ac.uk/ols/ontologies/mondo'} target="_blank" rel="noopener noreferrer">OLS MONDO</a> Search [
                <a href="https://github.com/ClinGen/clincoded/wiki/MONDO-Search-Help" target="_blank" rel="noopener noreferrer">Help</a>].
            </span>
        </li>
        <li>
          <span>
            Once you have selected the term, enter its MONDO ID (the &quot;id&quot; at the bottom of the &quot;Term info&quot; box on the right hand side of the OLS term page
                (e.g. <a href="https://www.ebi.ac.uk/ols/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/MONDO_0016587" target="_blank" rel="noopener noreferrer">MONDO:0016587</a>).
            </span>
        </li>
        <Input
          type="text"
          className="form-control mondo-input-field"
          value={diseaseIdInput}
          onKeyPress={handleMondoInputKeyPress}
          onChange={handleMondoInputChange}
          placeholder="e.g. MONDO:0016587"
          error={diseaseIdInputError}
        />
        <Button
          className="retrieve-button"
          disabled={diseaseIdInput === '' || isLoadingRetrieval}
          onClick={() => handleRetrieveDisease(diseaseIdInput)}
        >
          {isLoadingRetrieval
            ? <span><FontAwesomeIcon icon={faSpinner} spin /> Retrieving</span>
            : 'Retrieve from OLS'}
        </Button>
        {retrievedDisease
          && (
            <div className="retrieved-disease-section">
              <p>Below is the data from OLS for the ID you submitted. Select &quot;Save&quot; below if it is the correct disease, otherwise revise your search above:</p>
              <a href={`https://www.ebi.ac.uk/ols/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/${retrievedDisease.PK}`} target="_blank" rel="noopener noreferrer"><b>{retrievedDisease.term}</b></a>
            </div>
          )
        }
      </ol>
      <div className="free-text-notice retrieved-disease-text">
        <span className="free-text-prompt">Unable to find a suitable ontology?
            <Button className="ml-1 link-button" variant="link" onClick={() => setDiseaseInputType('freetext')}>Add free text term</Button>
        </span>
        <p className="alert alert-warning">
          Note: We strongly encourage use of an allowed MONDO ontology term and therefore specific database
          identifier for a disease. If you have searched and there is no appropriate database identifier you may
          contact us at <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> and/or
          create a term using free text.
        </p>
      </div>
    </>
  );

  const renderFreeTextDiseaseForm = () => (
    <>
      <Button className="back-link-button" variant="link" onClick={() => setDiseaseInputType('search')}>
        <span><FontAwesomeIcon icon={faAngleLeft} /> Back</span>
      </Button>
      <p className="alert alert-warning">Use of free text could result in different terms being used for the same disease. Please make certain there is no
      appropriate ontology term before applying a free text disease name.
      </p>
      <Row noGutters className="form-row">
        <Col xs={6}>
          <label>Disease Name*:</label>
        </Col>
        <Col xs={6}>
          <Input
            type="text"
            maxLength={100}
            value={diseaseName}
            onChange={(e) => handleFreeTextInputChange(e, 'diseaseName', setDiseaseName)}
            className="form-control"
            placeholder="Short phrase (max 100 characters)"
            error={freeTextErrors.diseaseName}
          />
        </Col>
      </Row>
      <p>Either HPO term(s) or a definition is required to describe this disease (both fields may be used).</p>
      <Row noGutters className="form-row">
        <Col xs={6}>
          <label>{`Phenotype(s) (HPO ID(s))${definitions ? '' : '*'}:`}</label>
          <p>Search <a href="https://hpo.jax.org/app/browse/term/HP:0000118" target="_blank" rel="noopener noreferrer">HPO-Browser</a></p>
        </Col>
        <Col xs={6}>
          <Input
            type="text"
            value={hpoIds}
            onChange={(e) => handleFreeTextInputChange(e, 'hpoIds', setHpoIds)}
            className="form-control"
            placeholder="e.g. HP:0010704, HP:0030300"
            error={freeTextErrors.hpoIds}
          />
        </Col>
      </Row>
      <Row noGutters className="form-row">
        <Col xs={6}>
          <label>{`Disease definition${hpoIds ? '' : '*'}:`}</label>
        </Col>
        <Col xs={6}>
          <Input
            id="definitions"
            type="textarea"
            value={definitions}
            onChange={(e) => handleFreeTextInputChange(e, 'definitions', setDefinitions)}
            className="form-control"
            placeholder="Describe this disease"
            error={freeTextErrors.definitions}
          />
        </Col>
      </Row>
    </>
  );

  return (
    <Modal
      id={id}
      show={show}
      size="lg"
      title={title}
      className="add-disease-modal"
      onHide={onHide}
      onSave={handleSave}
      isLoadingSave={isLoadingSave}
      saveError={saveError}
    >
      {diseaseInputType === 'search'
        ? renderSearchDiseaseForm()
        : renderFreeTextDiseaseForm()
      }
    </Modal>
  );
};
DiseaseModal.propTypes = {
  // callback function which provides the saved disease
  updateDisease: PropTypes.func,
  // callback function which provides the updated parent object where new disease is saved
  updateParentObj: PropTypes.func
}

export default DiseaseModal;


const handleCallbacks = async ({
  updateDisease,
  updateDiseaseArg,
  setLoadingSave,
  setSaveError,
  onHide
}) => {
  // and also prevent modal from closing as well as displaying error message in the modal
  const saveErrors = [];
  if (updateDisease) {
    // check if callback uses async func
    const updateDiseaseErrorMessage = await resolveCallbackReturnValue(updateDisease(updateDiseaseArg));
    if (updateDiseaseErrorMessage && typeof updateDiseaseErrorMessage === 'string') {
      saveErrors.push(`${updateDiseaseErrorMessage}`);
    }
  }
  setLoadingSave(false);
  if (saveErrors.length) {
    setSaveError(saveErrors.join('; '));
  } else {
    setSaveError(null);
    onHide();
  }
}
