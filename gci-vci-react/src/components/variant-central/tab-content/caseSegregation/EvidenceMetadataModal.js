import React, { useState, useEffect } from "react";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { API_NAME } from "../../../../utils";
import Popover from "../../../common/Popover";
import { Row, Col } from "react-bootstrap";
import { cloneDeep, get as lodashGet } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

import { ExternalLink } from "../../../common/ExternalLink";
import PmidSummary from "../../../common/article/PmidSummary";
import { LoadingButton } from "../../../common/LoadingButton";
import Modal from "../../../common/Modal";
import Input from "../../../common/Input";
import { evidenceResources } from "./segregationData";

export const EvidenceMetadataModal = ({
  evidenceType,        // Evidence source type
  submitMetadata,      // Function to call when input metadata modal is done; either Next or Cancel.
  metadata,            // Metadata - If null, adding.  Otherwise, editing.
  isNew,               // If we are adding a new piece of evidence or editing an existing piece
  errorMsg,
  isLoadingNext,
  show,
  onHide,
  }) => {

  const [data, setData] = useState(metadata);
  const [pmidResult, setPmidResult] = useState(null);
  const [isLoadingPmid, setIsLoadingPmid] = useState(false);
  const [formErrors, setFormErrors] = useState({}); 

  const ongoingRequests = new Set();

  useEffect(() => {
    setData(metadata);
  }, [metadata]);

  /**
   * Return the modal title for the current evidence type
   *
   */
  const title = () => {
    if (evidenceType && lodashGet(evidenceResources, `typeMapping[${evidenceType}]['name']`, null)) {
      if (isNew) {
        return `Add ${evidenceResources.typeMapping[evidenceType]['name']} Evidence`;
      } else {
        return `Edit ${evidenceResources.typeMapping[evidenceType]['name']} Evidence`;
      }
    }
    return null;
  };

  const getFormFieldValue = (fieldName) => {
    if (data && fieldName in data) {
      return data[fieldName].trim();
    } else {
      return '';
    }
  };

  /**
   * Enable/Disable buttons depending on user changes
   *
   * @param {string} name  // data field name
   * @param {object} e    // event
   */
  const handleChange = (e) => {
    e.preventDefault();
    // name is the field name, since that's how we defined it
    const newData = cloneDeep(data);
    newData[e.target.name] = e.target.value;

    // Check if requried field has value then clear error.
    if (evidenceType && lodashGet(evidenceResources, `typeMapping[${evidenceType}].fields`, null)) {
      evidenceResources.typeMapping[evidenceType].fields.forEach(pair => {
        if (pair.required) {
          if (getFormFieldValue(pair.name) !== '') {
            // Since each source only has one required field, just empty the errors
            setFormErrors({});
          }
        }
      });
    }

    setData(newData);
  };

  const phiNote = () => {
    return (
      <p key='non-pub-source-note'>All unpublished patient-specific data entered into the VCI, which is not explicitly consented for public sharing, should be the minimum necessary to inform the clinical significance of genetic variants; and data entered into the VCI should not include <ExternalLink href="//www.hipaajournal.com/considered-phi-hipaa/">protected health information (PHI)</ExternalLink> or equivalent identifiable information as defined by regulations in your country or region.</p>
    );
  };

  const identifierInfo = (key) => {
    return (
      <Popover
        key={`span_info_${key}`}
        triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
        content="This field will be used as an identifier for this piece of evidence."
        placement="top"
      />
    );
  };

  /**
   * Display input fields for the selected evidence type
   */
  const renderEvidenceInputFields = () => {
    let key = evidenceType;
    if (key && lodashGet(evidenceResources, `typeMapping[${key}]`, null)) {
      let nodes = [];
      if (key !== 'PMID') {
        nodes.push(phiNote());
      }
      if (evidenceResources.typeMapping[key]['extra']) {
        const extra = <p key='extra-note'>{evidenceResources.typeMapping[key]['extra']}</p>;
        nodes.push(extra);
      }

      evidenceResources.typeMapping[key]['fields'].forEach(obj => {
        let lbl = [<span className="mr-1" key={`span_${obj['name']}`}><b>{obj['description']}</b></span>];
        if (obj.identifier) {
          lbl.push(identifierInfo(obj.name));
        }

        const required = obj['required'] ? <span key="required" className="required-field"> *</span> : null;
        const disableInput = !isNew && obj['required'] ? true : false;
        let node = [
          <Row className="justify-content-md-center mb-3" key={obj['name']}>
            <Col xs={12}>{lbl}{required}</Col>
            <Col xs={12}>
              <Input
                key={`field_${obj['name']}`}
                className="form-control mt-1"
                name={obj['name']}
                type="text"
                id={obj['name']}
                onChange={handleChange}
                value={data[obj['name']] || ''}
                error={formErrors[obj['name']] || null}
                disabled={disableInput}
              />
            </Col>
          </Row>
        ];

        if (key === 'PMID') {
          // Disable pmid preview button if editing evidence or no pmid is entered
          let previewDisabled = false;
          if (!isNew || getFormFieldValue('pmid') === '') {
            previewDisabled = true;
          }
          node.push(<LoadingButton
            key="preview_btn"
            className="float-right"
            variant="primary"
            onClick={searchPMID}
            text="Preview PubMed Article"
            textWhenLoading="Retrieving"
            isLoading={isLoadingPmid}
            disabled={previewDisabled}
            />
          );
        }
        nodes.push(node);
      });
      return nodes;
    } else {
      return null;
    }
  };

  /**
   * Check if the given PMID is valid.  Return true if valid, otherwise, set form error.
   *
   * @param {string} id    PMID to be validated
   */
  const validatePMID = (id) => {
    let pmid = id;
    let valid = true;
    const errors = {}
    if (getFormFieldValue('pmid') === '') {
      valid = false;
      errors['pmid'] = 'Please enter a PMID';
    }
    // Valid if input has a prefix like "PMID:" (which is removed before validation continues)
    if (valid && pmid.match(/:/)) {
      if (pmid.match(/^PMID\s*:/i)) {
        pmid = pmid.replace(/^PMID\s*:\s*(\S*)$/i, '$1');
        if (!pmid) {
          valid = false;
          errors['pmid'] = 'Please include a PMID';
        }
      } else {
        valid = false;
        errors['pmid'] = 'Invalid PMID';
      }
    }
    // valid if input isn't zero-filled
    if (valid && pmid.match(/^0+$/)) {
      valid = false;
      errors['pmid'] = 'This PMID does not exist';
    }
    // valid if input isn't zero-leading
    if (valid && pmid.match(/^0+/)) {
      valid = false;
      errors['pmid'] = 'Please re-enter PMID without any leading 0\'s';
    }
    // valid if the input only has numbers
    if (valid && !pmid.match(/^[0-9]*$/)) {
      valid = false;
      errors['pmid'] = 'PMID should contain only numbers';
    }
    // If has form error, display errors
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
    }
    return valid;
  };

  const handleRetrieveArticle = async (pmid) => {
    setIsLoadingPmid(true);
    if (pmidResult) {
      setPmidResult(null);
    }

    if (validatePMID(pmid)) {
      // Remove possible prefix like "PMID:" before sending queries
      var id = pmid.replace(/^PMID\s*:\s*(\S*)$/i, "$1");
      const retrieveArticleRequest = API.get(API_NAME, "/articles/" + id);
      ongoingRequests.add(retrieveArticleRequest);
      try {
        const article = await retrieveArticleRequest;
        setPmidResult(article);
      } catch (error) {
        if (!API.isCancel(error)) {
          setIsLoadingPmid(false);
          console.error(error);
          const errors = {};
          errors['pmid'] = `Failed to retrieve article ${pmid}: ${error}`;
          setFormErrors(errors);
        } else {
          // ignore error if it's a cancel error
          // return immediately, since when request is canceled, it's likely the modal is closed & unmounted, so does formik unmounted.
          // Therefore, don't fire setSubmitting() because it will try to update formik's isSubmitting state and we'll get
          // React warning: `Can't perform a React state update on an unmounted component.`
          return;
        }
      }
      ongoingRequests.delete(retrieveArticleRequest);
    }

    setIsLoadingPmid(false);
  };

  /**
   * Retrieve Pubmed article if provided PMID is valid.
   * Otherwise, display error.
   *
   * @param {object}  event   // event
   */
  const searchPMID = (event) => {
    // Don't run through HTML submit handler
    event.preventDefault(); 
    event.stopPropagation();
    const pmid = data['pmid'];
    if (pmid) {
      setFormErrors({});
      handleRetrieveArticle(pmid);
    }
    else {
      const errors = {};
      errors['pmid'] = 'Please enter a PMID';
      setFormErrors(errors);
    }
  };

  const isFormFieldsValid = (setErrors=false) => {
    const errors = {};
    let valid = false;

    if (data && evidenceType && lodashGet(evidenceResources, `typeMapping[${evidenceType}]`, null)) {
      valid = true;
      // Check if requried fields have value
      evidenceResources.typeMapping[evidenceType].fields.forEach(pair => {
        if (pair.required) {
          if (getFormFieldValue(pair.name) === '') {
            valid = false;
            errors[pair.name] = "This is a required field"
          }
        }
      });

      // If adding PMID source, check pmid is valid
      if (isNew && evidenceType === 'PMID') {
        if (!pmidResult) {
          valid = false;
          errors['pmid'] = "Please preview PubMed article to validate PMID"
        }
        if (pmidResult && pmidResult.pmid !== data['pmid']) {
          valid = false;
          errors['pmid'] = "The PMID does not match the displayed article"
        } 
      }

      // If has form error and request to set errors
      if (setErrors && Object.keys(errors).length > 0) {
        setFormErrors(errors);
      }
    }

    return valid;
  };

  /**
   * Next button is clicked, call function to save provided metadata.
   * 
   * @param {object} e    // event
   */
  const submitEvidenceMetadata = (e) => {
    // Don't run through HTML submit handler
    e.preventDefault();
    e.stopPropagation();

    // If form has valid data, submit to next modal
    if (isFormFieldsValid(true) && evidenceType) {
      const newData = cloneDeep(data);
      const title = lodashGet(evidenceResources, `typeMapping[${evidenceType}]['name']`, null);
      newData['_kind_title'] = title ? title : '';
      newData['_kind_key'] = evidenceType;
      submitMetadata(true, newData);
    }
  };

  /**
   * Display the Pubmed article
   */
  const renderPMIDResult = () => {
    if (!pmidResult) {
      return null;
    } 
    return (
      <div className="mt-5">
        <span className="col-sm-10 col-sm-offset-1">
          <PmidSummary
            article={pmidResult}
            displayJournal
            pmidLinkout
          />
        </span>
      </div>
    )
  };

  /**
   * Cancel button is clicked.  Close modal and reset form data.
   */
  const handleCancel = ()  => {
    // make sure api requests are aborted, in order to solve React error 'update state after unmount'
    for (const request of ongoingRequests) {
      API.cancel(request, "Request was canceled");
    }
    ongoingRequests.clear();

    // Do this to reset form values
    setData(metadata);
    setPmidResult(null);
    setIsLoadingPmid(false);
    setFormErrors({});
    onHide();
  };

  return (
    <Modal 
      size="lg"
      show={show}
      title={title()}
      className="case-seg-evidence-metadata-modal"
      onHide={handleCancel}
      hideButtonText="Cancel"
      onSave={submitEvidenceMetadata}
      saveButtonText="Next"
      saveButtonInProgressText="Submitting"
      saveButtonDisabled={!isFormFieldsValid(false)}
      isLoadingSave={isLoadingNext}
      saveError={errorMsg}
    >
      <div className="form-std">
        <div className="form-horizontal form-std" key="evidenceType">
          {renderEvidenceInputFields()}
          {renderPMIDResult()}
        </div>
      </div>
    </Modal>
  );
};
