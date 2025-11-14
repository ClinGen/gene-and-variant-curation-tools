import React, { useState, useEffect } from "react";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { Row, Col, Button } from "react-bootstrap";
import { isEmpty } from "lodash";
import { API_NAME } from "../../../utils";
import { ExternalLink } from "../ExternalLink";
import { EXTERNAL_API_MAP } from "../../../constants/externalApis";
import PmidSummary from "./PmidSummary";
import ClinVarSummary from "./ClinVarSummary";
import Modal from "../Modal";
import { LoadingButton } from "../LoadingButton";
import InfoIcon from "../InfoIcon";
import { useAmplifyAPIRequestRecycler } from '../../../utilities/fetchUtilities';

// For add evidence source button, only renders the button to add and clear the fields,
// and contains the modal wrapper.
// The modal itself is defined as well.
const AddGCISourceModalButton = ({
  buttonText, // text for the button that will open the modal
  className, // styling class name for the button that will open the modal
  modalButtonText, // text for submit button in modal
  renderButton, // function that renders component that will replace the button for opening modal
  onButtonClick, // function to call AFTER add/edit button is clicked
  onSaveClick, // function to call AFTER save button in modal is clicked
  onSaved, // function to call AFTER an evidence source is submitted successfully
  onCancel, // function to call AFTER modal is dismissed, including cancel button clicked
  btnDisabled, // flag to disable the add button as well as form's submit button
  modalTitle, // text displayed in modal header
  isModalOpen, // flag to show the modal
  submitResourceBusy, // flag to indicate that the modal's submit button is in a 'busy' state
  alreadyExistInGdm // function to check if source already exists in GDM
}) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const [isLoading, setIsLoading] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [scvId, setScvId] = useState('');
  const [showSCV, setShowSCV] = useState(false);
  const [errors, setErrors] = useState(null);
  const [tempResource, setTempResource] = useState({}); // Temporary object to hold the resource response

  useEffect(() => {
    // Show or hide SCV input box
  }, [showSCV])

  /**
   * when this component unmounted e.g. modal cancel button pressed
   * make sure api requests are aborted, in order to solve React error 'update state after unmount'
   */
  const cancelRequests = () => {
    requestRecycler.cancelAll();
  }

  const handleChange= (e) => {
    let fieldErrors = {};
    const fieldValue = e.target.value;
    setErrors(null);
    setTempResource(null);
    if (e.target.name === "sourceId") {
      if (fieldValue) {
        setSourceId(fieldValue);
        if (fieldValue.startsWith("V")) {
          fieldErrors = validateVCVId(fieldValue);
        } else {
          setShowSCV(false);
          setScvId("");
          fieldErrors = validatePMID(fieldValue);
        }
      } else {
        setSourceId("");
      }
    }
    if (e.target.name === "scvId") {
      if (fieldValue) {
        setScvId(fieldValue);
        fieldErrors = validateSCVId(fieldValue);
      } else {
        setScvId("");
      }
    }

    setErrors(fieldErrors);
  }

  // called when the button to ping the outside resource is pressed
  const retrieveResource = async (e) => {
    e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

    setIsLoading(true);
    setTempResource(null);
    if (isEmpty(validateForm())) {
      if (sourceId.startsWith("VCV")) {
        if (scvId.startsWith("SCV") && scvId.length > 1) {  
            await getClinVarSCV(sourceId, scvId);
        }
      } else {
        setShowSCV(false);
        await getArticle(sourceId);
      }
    } else {
      setIsLoading(false);
    }
  }

  const getClinVarSCV = async (vcvId, scvId) => {
    const retrieveSCVRequest = API.get(API_NAME, `/clinvar-vcv/${vcvId}/${scvId}`);
    try {
      const scvData = await requestRecycler.capture(retrieveSCVRequest);
      setTempResource(scvData);
      setIsLoading(false);
    } catch (error) {
      if (!API.isCancel(error)) {
        alert(`Failed to retrieve ${scvId}. Error: ${error?.response?.data?.error}`);
        setIsLoading(false);
        console.error(error);
      } else {
        // return immediately, since when request is canceled, it's likely the modal is closed & unmounted, so does formik unmounted.
        // Therefore, don't fire setSubmitting() because it will try to update formik's isSubmitting state and we'll get
        // React warning: `Can't perform a React state update on an unmounted component.`
        setIsLoading(false);
        return;
      }
    }
  }

  const getArticle = async (pmid) => {
    // Remove possible prefix like "PMID:" before sending queries
    var id = pmid.replace(/^PMID\s*:\s*(\S*)$/i, "$1");
    const retrieveArticleRequest = API.get(API_NAME, "/articles/" + id);
    try {
      const article = await requestRecycler.capture(retrieveArticleRequest);

      if(article?.is_preprint) {
        // We don't want to allow curators to add articles from pre-print
        // servers. See https://github.com/ClinGen/gci-vci-aws/issues/1416 for
        // more info.
        window.alert("This article can't be added as a PMID because it is originally from a preprint server.");
        setIsLoading(false);
        return;
      }

      setTempResource(article);
      setIsLoading(false);
    } catch (error) {
      if (!API.isCancel(error)) {
        setIsLoading(false);
        alert("Failed to retrieve article " + pmid);
        console.error(error);
      } else {
        // return immediately, since when request is canceled, it's likely the modal is closed & unmounted, so does formik unmounted.
        // Therefore, don't fire setSubmitting() because it will try to update formik's isSubmitting state and we'll get
        // React warning: `Can't perform a React state update on an unmounted component.`
        setIsLoading(true);
        return;
      }
    }
  };

  const localStateCleanUp = () => {
    setSourceId("");
    setScvId("");
    setShowSCV(false);
    setTempResource({});
    setErrors(null);
    setIsLoading(false);
  };

  // called when the button to submit the resource to the main form (local db) is pressed
  const submitResource = async () => {
    onSaveClick();

    if (isEmpty(tempResource)) {
      console.warn(
        "Nothing submitted because evidence source object is empty",
        tempResource
      );
      await localStateCleanUp();
      return;
    }

    // If evidence source is article, save article object
    if (tempResource?.pmid) {
      let queriedArticle = tempResource;

      if (queriedArticle.PK) {
        await localStateCleanUp();

        // make sure we call external callback func only after all local state update
        // to avoid React warning "Can't Perform a React state update on an unmounted component"
        // for parent component
        onSaved(queriedArticle);
        return;
      }

      // if no article in db yet, server won't attach a `pk` field
      // and we have to POST the article to get the pk
      let postResultArticle;
      const createArticleRequest = API.post(API_NAME, `/articles/`, {
        body: { article: queriedArticle },
      });
      try {
        postResultArticle = await requestRecycler.capture(createArticleRequest);
      } catch (error) {
        if (!API.isCancel(error)) {
          alert("Failed to save article to database.");
          console.error("Failed to save article to database", error);
        } else {
          // request canceled (probably due to unmounted), do nothing
          return;
        }
      }

      if (postResultArticle) {
        await localStateCleanUp();

        // make sure we call external callback func only after all local state update
        // to avoid React warning "Can't Perform a React state update on an unmounted component"
        // for parent component
        onSaved(postResultArticle);
      } else {
        // submit fails
        await localStateCleanUp();
      }
    } else {
      // check VCV and SCV Ids are available
      if (tempResource?.vcvId && tempResource?.scvId) {
        await localStateCleanUp();

        // make sure we call external callback func only after all local state update
        // to avoid React warning "Can't Perform a React state update on an unmounted component"
        // for parent component
        onSaved(tempResource);
      }
    }
  };

  // Called when the modal form's cancel button is clicked.
  const cancelModal = () => {
    cancelRequests();
    localStateCleanUp();
    onCancel();
  };

  // Validate VCV Id has the correct format VCV######.#
  const validateVCVId = (vcvId) => {
    let fieldErrors = {};
    fieldErrors.sourceId = "ClinVar evidence source should be a versioned VCV ID (VCV######.#)";

    if (vcvId.startsWith("VCV")) {
      if (vcvId.length > 3) {
        // Validate VCV id is VCV######.#
        const id = vcvId.substring(3, vcvId.length);
        const numbers = id.split(".");
        // Validate VCV id and version are just numbers
        if ((numbers.length === 2) &&
          (numbers[0].length && numbers[0].match(/^[0-9]*$/)) &&
          (numbers[1].length && numbers[1].match(/^[0-9]*$/))) {
          fieldErrors = {};
        }
      }
    }

    if (isEmpty(fieldErrors)) {
      setShowSCV(true);
    } else {
      setShowSCV(false);
    }

    return fieldErrors;
  };

  // Validate SCV Id has the correct format SCV######.#
  const validateSCVId = (scvId) => {
    let fieldErrors = {};
    fieldErrors.scvId = "ClinVar submitter ID should be a versioned SCV ID (SCV######.#)";

    if (scvId.startsWith("SCV")) {
      if (scvId.length > 3) {
        // validate SCV id is SCV######.#
        const id = scvId.substring(3, scvId.length);
        const numbers = id.split(".");
        // Validate SCV id and version are just numbers
        if ((numbers.length == 2) &&
          (numbers[0].length && numbers[0].match(/^[0-9]*$/)) &&
          (numbers[1].length && numbers[1].match(/^[0-9]*$/))) {
          fieldErrors = {};
        }
      }
    }

    return fieldErrors;
  };

  // Validate PMID has the correct format SCV######.#
  const validatePMID = (pmid) => {
    const fieldErrors = {};

    // valid if input isn't zero-filled
    if (pmid.match(/^0+$/)) {
      fieldErrors.sourceId = "This PMID does not exist";
    }
    // valid if input isn't zero-leading
    else if (pmid.match(/^0+/)) {
      fieldErrors.sourceId = "Please re-enter PMID without any leading 0's";
    }
    // valid if the input only has numbers
    else if (!pmid.match(/^[0-9]*$/)) {
      fieldErrors.sourceId = "PMIDs should only contain numbers. Versioned VCV IDs (VCV######.#) must be provided for ClinVar evidence source.";
    }

    return fieldErrors;
  };

  const validateForm = () => {
    let fieldErrors = {};

    // validating evidence source Id field
    // Nothing has been entered
    if (!sourceId) {
      setShowSCV(false);
      fieldErrors.sourceId = "Please provide an Evidence Source ID";
    } else if (sourceId.startsWith("V")) {
      // entering clinVar ID
      fieldErrors = validateVCVId(sourceId);
      if (isEmpty(fieldErrors) && scvId.length > 0) {
        fieldErrors = validateSCVId(scvId);
      }
    } else {
      // entering PMID
      setShowSCV(false);
      fieldErrors = validatePMID(sourceId);
    }

    // If fields are validated and alreadyExistInGdm function exists means need to do additional checking
    if (isEmpty(fieldErrors)) {
      if (alreadyExistInGdm(sourceId, scvId)) {
        const errorText = "This evidence source has already been associated with this Gene-Disease Record";
        if (sourceId.startsWith("VCV")) {
          fieldErrors.scvId = errorText;
        } else {
          fieldErrors.sourceId = errorText;
        }
      }
    }

    setErrors(fieldErrors);

    return fieldErrors;
  };

  const renderSourceHelpText = () => {
    const pmidTextId = "pmidTooltip";
    const pmidText = "Pubmed ID (PMID) is an identifier for peer-reviewed publications catalogued in the NCBI Pubmed database. To add a PMID to the GCI, enter the numerical portion only. For example, PMID:33242396 can be added by entering just 33242396.";
    const vcvTextId = "vcvTooltip";
    const vcvText = <>'VCV' refers to the accession calculated by ClinVar to aggregate information from all submitted records for classifications of the same variant, e.g. VCV001679524 . The number after the period in a VCV is the version of that particular accession. For example, VCV001679524.3 refers to version 3 of VCV001679524. The VCV (including version number) can be found in the Variant Details section, subsection Identifiers, next to the ClinVar Variation ID.<br/>If you submit a query to ClinVar based on a VCV accession, e.g. VCV001679524.3, you are directed to the page specific to that record. This page will also list all submissions related to that variant from different laboratories and research groups, each with their own identifier (SCV). To add a ClinVar variant entry to the GCI, first enter the full VCV including the version number (for example, VCV001679524.3, not just VCV001679524).</>;

    return (
      <span>
        (PMID
          <InfoIcon tooltip={pmidText} tooltipId={pmidTextId} placement="auto"/> or VCV ID
          <InfoIcon tooltip={vcvText} tooltipId={vcvTextId} placement="auto"/>
        ):
      </span>
    );
  }

  const renderSCVHelpText = () => {
    const scvTextId = "svcTooltip";
    const scvText = <>'SCV' refers to the accession number assigned to a submitted record in ClinVar, e.g. SCV003931173.<br/>If you submit a query to ClinVar based on that accession number, e.g. SCV003931173, you are directed automatically to the VCV page that includes that submitted record. The SCV accession number and version are displayed in one of the Submissions sections, either Submissions - Germline or Submissions - Somatic, as appropriate. To add a particular submitter's ClinVar variant record to the GCI, enter their full SCV, including the version number (for example, SCV003931173.1, not just SCV003931173).</>;
    const vcvUrl = `${EXTERNAL_API_MAP['ClinVarSearch']}${sourceId}`;

    return (
      <Row>
        <Col className="my-3">
          <ExternalLink
            href={vcvUrl}>{sourceId}
          </ExternalLink> is a ClinVar VCV Record.<br/>
          Please specify a ClinVar submitter (SCV ID
          <InfoIcon tooltip={scvText} tooltipId={scvTextId} placement="auto"/>
          ) from that record to retrieve a evidence source:
        </Col>
      </Row>
    );
  }

  const renderClinVarResource = () => {
    return (
      <>
        <Row>
          <Col className="my-3">
            Select "Add Evidence Source" (below) if the following SCV is
            correct; otherwise, edit the SCV (above) to retrieve a
            different entry.
          </Col>
        </Row>
        <Row>
          <Col sm={{ offset: 1 }}>
            <ClinVarSummary
              scv={tempResource}
            />
          </Col>
        </Row>
      </>
    );
  }

  const renderPmidResource = () => {
    return (
      <>
        <Row>
          <Col>
            Select "Add Article" (below) if the following citation is
            correct; otherwise, edit the PMID (above) to retrieve a
            different article.
          </Col>
        </Row>
        <Row>
          <Col sm={{ offset: 1 }}>
            <PmidSummary
              article={tempResource}
              displayJournal
              displayAllAuthors
              pmidLinkout
            />
          </Col>
        </Row>
      </>
    );
  }

  const renderResource = () => {
    if (tempResource?.pmid) {
      return renderPmidResource();
    } else {
      return renderClinVarResource();
    }
  }

  return (
    <>
      {renderButton ? (
        renderButton({ onButtonClick: onButtonClick })
        ) : <Button disabled={btnDisabled} onClick={onButtonClick} className={className}>
          {buttonText || "Add"}
        </Button>
      }
      <Modal
        title={modalTitle}
        className="add-resource-id-modal"
        show={isModalOpen}
        onHide={cancelModal}
        hideButtonText="Cancel"
        onSave={submitResource}
        saveButtonText={modalButtonText}
        saveButtonDisabled={
          btnDisabled || isEmpty(tempResource)
        }
        isLoadingSave={submitResourceBusy}
        // Bug in react-bootstrap: input field's autoFucus won't work when modal animation enabled. See issue https://github.com/react-bootstrap/react-bootstrap/issues/5102
        animation={false}
      >
        <form onSubmit={retrieveResource}>
          <Row>
            <Col>
              <label>
                <strong>Enter an Evidence Source </strong>
                {renderSourceHelpText()}
              </label>
            </Col>
          </Row>
          <Row>
            <Col>
              <input
                type="text"
                name="sourceId"
                placeholder="e.g. 54321 or VCV001679524.3"
                value={sourceId} onChange={handleChange}
                className={`form-control
                  ${errors?.sourceId && ( 'form-valid' )}
                  ${errors?.sourceId && ( 'form-invalid' ) }`}
                required
                autoFocus
              />
              {errors?.sourceId && (<div className="invalid-feedback show">{errors.sourceId}</div>)}
            </Col>
            {!showSCV ?
              <Col sm="4">
                <LoadingButton
                  block
                  type="submit"
                  isLoading={isLoading}
                  disabled={!isEmpty(errors)}
                  text="Retrieve Evidence Source"
                  textWhenLoading="Retrieving Evidence Source"
                />
              </Col>
              : null
            }
          </Row>
          {showSCV ? 
            <>
              {renderSCVHelpText()}
              <Row>
                <Col>
                  <input
                    type="text"
                    name="scvId"
                    placeholder="SCV003931173.1"
                    value={scvId} onChange={handleChange}
                    className={`form-control
                      ${errors?.scvId && ( 'form-valid' )}
                      ${errors?.scvId && ( 'form-invalid' ) }`}
                    required
                  />
                  {errors?.scvId && (<div className="invalid-feedback show">{errors.scvId}</div>)}
                </Col>
                <Col sm="4">
                  <LoadingButton
                    block
                    type="submit"
                    isLoading={isLoading}
                    disabled={!isEmpty(errors)}
                    text="Retrieve Evidence Source"
                    textWhenLoading="Retrieving Evidence Source"
                  />
                </Col>
              </Row>
            </>
            : null
          }
        </form>

        {!isEmpty(tempResource) ?
          renderResource()
          : null
        }
      </Modal>
    </>
  );
};

export default AddGCISourceModalButton;
