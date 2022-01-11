import React, { useState, useEffect, useRef } from 'react';
import PropTypes from "prop-types";
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import Select from 'react-select';
import { get as lodashGet, cloneDeep } from 'lodash';
import { API } from 'aws-amplify';
import { API_NAME } from '../../utils';
import { 
  resolveCallbackReturnValue,
  useAmplifyAPIRequestRecycler
} from '../../utilities/fetchUtilities';

const CspecModal = ({
  id,
  show,
  title,
  onHide,
  handleCspecUpdate,
  saveButtonText,
  deleteButtonText,
  parentEndpoint,
  parentToInsertCspec,
  updateCspec,
  updateCspecErrorMessage,
  updateParentObj,
  affiliation,
  userPK
}) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const _isMounted = useRef(true); // used to track mounting of component, skip async tasks if unmounted
  const [cspecDocuments, setCspecDocuments] = useState([]);
  const [cspecSelectOptions, setCspecSelectOptions] = useState([]);
  const [selectedCspec, setSelectedCspec] = useState({});
  const [previouslySavedCspec, setPreviouslySavedCspec] = useState(null);
  const [isLoadingSave, setLoadingSave] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
  const [deleteButtonDisabled, setDeleteButtonDisabled] = useState(true);
  const [isLoadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    getCspecDocuments();

    return () => {
      _isMounted.current = false;
    }
  }, []);

  useEffect(() => {
    const selectOptions = cspecDocuments.map((doc) => {
      return {
        value: lodashGet(doc, 'ruleSetDoc.ruleSetId', null),
        label: lodashGet(doc, 'ruleSetDoc.cspecInfo.documentName', null)
      }
    });
    setCspecSelectOptions(selectOptions);

    if (parentToInsertCspec && parentToInsertCspec.cspec && parentToInsertCspec.cspec.cspecId) {
      let cspecInInterpretation = cspecDocuments.filter(doc => doc.ruleSetDoc.ruleSetId === parentToInsertCspec.cspec.cspecId);
      let formattedCspecForInput = {
        value: lodashGet(cspecInInterpretation[0], 'ruleSetDoc.ruleSetId', null),
        label: lodashGet(cspecInInterpretation[0], 'ruleSetDoc.cspecInfo.documentName', null)
      }
      setPreviouslySavedCspec(formattedCspecForInput);
      setDeleteButtonDisabled(false);
    }
  }, [cspecDocuments])

  const getCspecDocuments = async () => {
    const vcepId = lodashGet(affiliation, 'subgroups.vcep.id', 'none');
    try {
      const url  = `/cspec?affiliation=${vcepId}`;
      const response = await requestRecycler.capture(API.get(API_NAME, url));
      if (response && _isMounted.current) {
        setCspecDocuments(response);
      }
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      console.log(JSON.parse(JSON.stringify(error)));
    }
  };

  const addCspecToParent = async (selectedCspec) => {
    const parentObj = cloneDeep(parentToInsertCspec);
    const cspecId = lodashGet(selectedCspec, 'ruleSetDoc.ruleSetId', '');
    const documentName = lodashGet(selectedCspec, 'ruleSetDoc.cspecInfo.documentName', '');
    const ruleSetIri = lodashGet(selectedCspec, 'ruleSetDoc.ruleSetIri', '');
    const version = lodashGet(selectedCspec, 'ruleSetDoc.documentVersion', '');
    parentObj.cspec = { 
      cspecId,
      ruleSetIri,
      documentName,
      version
    }
    if (userPK || userPK === null) {
      parentObj.modified_by = userPK;
    }
    const params = {body: {parentObj}};
    try {
      setLoadingSave(true);
      const url = '/' + parentEndpoint + '/' + parentObj.PK;
      const response = await API.put(API_NAME, url, params);
      if (response) {
        updateParentObj(response);
        handleCspecUpdate(selectedCspec);
        handleCallbacks({
          updateCspec,
          updateCspecArg: selectedCspec,
          setLoadingSave,
          setLoadingDelete,
          setSaveError,
          onHide
        });
      }
    } catch (error) {
      console.log(`Error updating ${parentObj.item_type} with cspec doc ${error}`);
      setLoadingSave(false);
      setSaveError('Save failed!');
    }
  };

  const removeCspecFromParent = async () => {
    const parentObj = cloneDeep(parentToInsertCspec);
    parentObj.cspec = null;
    if (userPK || userPK === null) {
      parentObj.modified_by = userPK;
    }
    const params = {body: {parentObj}};
    try {
      setLoadingDelete(true);
      const url = '/' + parentEndpoint + '/' + parentObj.PK;
      const response = await API.put(API_NAME, url, params);
      if (response) {
        updateParentObj(response);
        handleCspecUpdate({});
        handleCallbacks({
          updateCspec,
          updateCspecArg: {},
          setLoadingDelete,
          setLoadingSave,
          setSaveError,
          onHide
        });
      }
    } catch (error) {
      console.log(`Error updating ${parentObj.item_type} while removing cspec doc ${error}`);
      setLoadingDelete(false);
      setSaveError('Delete failed!');
    }
  }

  const handleChange = (e) => {
    let selectedDoc = cspecDocuments.filter(doc => doc.ruleSetDoc.ruleSetId === e.value);
    setSelectedCspec(selectedDoc[0]);
    if (selectedCspec) {
      setSaveButtonDisabled(false);
    } else {
      setSaveButtonDisabled(true);
    }
  };

  const handleSave = async () => {
    if (parentEndpoint) {
      addCspecToParent(selectedCspec);
    }
  };

  const handleDelete = async () => {
    if (parentEndpoint) {
      removeCspecFromParent();
    }
  };

  const handleCallbacks = async ({
    updateCspec,
    updateCspecArg,
    setLoadingSave,
    setLoadingDelete,
    setSaveError,
    onHide
  }) => {
    // and also prevent modal from closing as well as displaying error message in the modal
    const saveErrors = [];
    if (updateCspec) {
      // check if callback uses async func
      const updateCspecErrorMessage = await resolveCallbackReturnValue(updateCspec(updateCspecArg));
      if (updateCspecErrorMessage && typeof updateCspecErrorMessage === 'string') {
        saveErrors.push(`${updateCspecErrorMessage}`);
      }
    }
    setLoadingSave(false);
    setLoadingDelete(false);
    if (saveErrors.length) {
      setSaveError(saveErrors.join('; '));
    } else {
      setSaveError(null);
      onHide();
    }
  }

  return (
    <Modal
      id={id}
      show={show}
      size="lg"
      title={title}
      className="cspec-modal"
      onHide={onHide}
      saveButtonText={saveButtonText}
      saveButtonDisabled={saveButtonDisabled}
      showDeleteButton={true}
      deleteButtonText={deleteButtonText}
      deleteButtonDisabled={deleteButtonDisabled}
      onDelete={handleDelete}
      isLoadingDelete={isLoadingDelete}
      onSave={handleSave}
      isLoadingSave={isLoadingSave}
      saveError={saveError}
    >
      <div>
        <h4>To add a new specification document to the curation: </h4>
        <ol>
          <li>Enter HGNC gene symbol or VCEP name</li>
          <li>Select your specification document from drop-down menu</li>
        </ol>
        <p><strong>Note:</strong> When curating as part of an affiliation, only affiliation specification documents are shown</p>
      </div>

      <Select onChange={handleChange} options={cspecSelectOptions} />
      <br />
      {previouslySavedCspec && previouslySavedCspec.label 
        ? <p><strong>Currently saved to Interpretation: </strong>{previouslySavedCspec.label}</p> 
        : previouslySavedCspec ? <LoadingSpinner size="2x" /> : null}
    </Modal>
  );
};

CspecModal.propTypes = {
  // callback function which provides the saved cspec
  updateCspec: PropTypes.func,
  // callback function which provides the updated parent object where new cspec is saved
  updateParentObj: PropTypes.func
}

export default CspecModal;