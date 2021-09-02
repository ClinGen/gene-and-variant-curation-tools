import React, { useState } from "react";
import { Row, Col, Button } from "react-bootstrap";
import { isEmpty, cloneDeep, get as lodashGet } from "lodash";

import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from "../../../../utils";
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import Modal from "../../../common/Modal";
import Input from "../../../common/Input";
import { LoadingButton } from "../../../common/LoadingButton";
import { useAmplifyAPIRequestRecycler } from "../../../../utilities/fetchUtilities";

export const SelectVariantModal = ({
  auth,
  variantList,
  updateParentObj
}) =>{
  const [variantResults, setVariantResults] = useState(null);
  const [variantIdType, setVariantIdType] = useState('ClinGen/ClinVar');
  const [outstandingRequests, setOutstandingRequests] = useState(0);
  const [variantId, setVariantId] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [retrieveDisabled, setRetrieveDisabled] = useState(true);

  const requestRecycler = useAmplifyAPIRequestRecycler();

  const onAddClick = () => {
    setIsModalOpen(true);
  };

  const cleanUp = () => {
    requestRecycler.cancelAll();
    setOutstandingRequests(0);
    setIsRetrieving(false);
    setIsSaving(false);
    setErrorMessage(null);
    setVariantResults(null);
    setVariantIdType('ClinGen/ClinVar');
    setVariantId('');
    setRetrieveDisabled(true);
    setIsModalOpen(false);
  };

  const handleSave = () => {
    if (variantResults && !isEmpty(variantResults)) {
      setIsSaving(true);
      saveVariant().then(result => {
        // cleanUp() first because if variant count is at max length,
        // this component will unmount before cleanUp() has a chance to finish
        cleanUp();
        updateParentObj(result);
      }).catch(err => {
        setErrorMessage("Problem saving variant please try again");
        setIsSaving(false);
      });
    } else {
      setErrorMessage("Please enter a variant");
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    cleanUp();
  };

  const getClinGenResults = () => {
    const url = '/variants?carId=' + variantId;
    getResults(url, (d) => setVariantResults(d));
  };
  
  const getClinVarResults = () => {
    const url = '/variants?clinvarVariantId=' + variantId;
    getResults(url, (d) => setVariantResults(d));
  };

  const saveVariant = () => {
    return new Promise((resolve, reject) => {
      //POST to /variants, passing variant JSON object
      const url = '/variants';
      let newVariant = cloneDeep(variantResults);
      // ??? should not set user if already exists
      newVariant.submitted_by = auth.PK;
      const params = {body: {newVariant}}

      requestRecycler.capture(API.post(API_NAME, url, params))
      .then(data => {
        console.log('variant data', data);
        //const updatedVariant = variant;
        //updatedVariant.PK = data.PK;
        setVariantResults(data);
        resolve(data);
      }).catch(err => {
        // ??? setVariantResults(null);
        reject(null);
      });
    });
  };

  const getResults = (url, setData) => {
    setOutstandingRequests(outstandingRequests + 1);
    setIsRetrieving(true);
    let humanizeMessage = "Can't retrieve the variant. "
    requestRecycler.capture(API.get(API_NAME, url)).then(data => {
      if (data) {
        setData(data);
      } else {
        setErrorMessage(humanizeMessage);
      }
      setOutstandingRequests(outstandingRequests - 1);
      setIsRetrieving(false);
    })
    .catch(error => {
      if (API.isCancel(error)) {
        return;
      }
      const detailErrorMessageFromServer = lodashGet(error, "response.data.error");
      if (detailErrorMessageFromServer) {
        humanizeMessage += `Here's more detail: ${detailErrorMessageFromServer}`;
      }

      setIsRetrieving(false);
      setErrorMessage(humanizeMessage);
    });
  };

  const validVariant = (type, id) => {
    // Check if variant has already added
    let error = null;
    if (variantList && variantList.length > 0) {
      // loop through received variantlist and make sure that the variant is not already associated
      variantList.forEach(variant => {
        if (type === 'ClinVar' && variant && variant.clinvarVariantId === id) {
          error = 'This variant has already been associated with this piece of evidence.';
        }
        if (type === 'ClinGen Allele Registry' && variant && variant.carId === id) {
          error = 'This variant has already been associated with this piece of evidence.';
        }
      });
    }
    if (error) {
      setErrorMessage(error);
      return false;
    } else {
      return true;
    }
  };

  const getVariantInfo = (e) => {
    e.preventDefault();
    const clinVarIdRegex = new RegExp('^[0-9]+$');
    const clinGenIdRegex = new RegExp('CA*');

    setErrorMessage(null);
    setVariantResults(null);

    if (clinVarIdRegex.test(variantId)) {
      if (validVariant('ClinVar', variantId)) {
        setVariantIdType('ClinVar');
        getClinVarResults();
      }
    } else if (clinGenIdRegex.test(variantId)) {
      if (validVariant('ClinGen Allele Registry', variantId)) {
        setVariantIdType('ClinGen Allele Registry');
        getClinGenResults();
      }
    } else {
      setErrorMessage("Invalid Id");
    }
  };

  const handleChange = (e) => {
    setErrorMessage(null);
    setVariantIdType('ClinVar');
    setVariantId(e.target.value);
    setRetrieveDisabled(false);
  };

  const renderVariantHgvs = (hgvsNames, molecularConsequenceList) => {
    return (
      <div>
        {hgvsNames.GRCh38 ?
          <span><span className="title-ellipsis title-ellipsis-shorter dotted" title={hgvsNames.GRCh38}>{hgvsNames.GRCh38}</span> (GRCh38)<br /></span>
        : null}
        {hgvsNames.GRCh37 ?
          <span><span className="title-ellipsis title-ellipsis-shorter dotted" title={hgvsNames.GRCh37}>{hgvsNames.GRCh37}</span> (GRCh37)<br /></span>
        : null}
        {hgvsNames.others && hgvsNames.others.length > 0 ?
          <span>
            {hgvsNames.others.map((hgvs, i) => {
              return <span key={hgvs}><span className="title-ellipsis title-ellipsis-shorter dotted" title={hgvs}>{hgvs}</span><br /></span>;
            })}
          </span>
        : null}
        {molecularConsequenceList && molecularConsequenceList.map((obj, i) => (
          <span key={i}>
            <span>
              <span className="title-ellipsis title-ellipsis-shorter dotted" title="{obj.hgvsName}">
                {obj.hgvsName}
              </span>
              <br />
            </span>
          </span>
        ))}
      </div>
    );
  };


  const renderVariantResourceResult = () => {
    const caText = 'Below are the data from the ClinGen Allele Registry for the CA ID you submitted. Select "Save" below if it is the correct variant, otherwise revise your search above:';
    const clinVarText = 'Below are the data from ClinVar for the Variation ID you submitted. Select "Save" below if it is the correct variant, otherwise revise your search above:';

    return (
      <div className="resource-metadata">
        {variantResults ?
          <>
          {variantIdType === 'ClinVar'
            ? <p>{clinVarText}</p>
            : <p>{caText}</p>
          }
          <span className="p-break">{variantResults.clinvarVariantTitle}</span>
          {variantResults.carId ?
            <Row>
              <Col sm="4" className="control-label"><label>CA ID</label></Col>
              <Col sm="8" className="text-no-input"><ExternalLink href={`${EXTERNAL_API_MAP['CARallele']}${variantResults.carId}.html`}><strong>{variantResults.carId}</strong></ExternalLink></Col>
            </Row>
          : null}
          {variantResults.clinvarVariantId ?
            <Row>
              <Col sm="4" className="control-label"><label>ClinVar Variation ID</label></Col>
              <Col sm="8" className="text-no-input"><ExternalLink href={EXTERNAL_API_MAP['ClinVarSearch'] + variantResults.clinvarVariantId}><strong>{variantResults.clinvarVariantId}</strong></ExternalLink></Col>
            </Row>
          : null}
          {variantResults.hgvsNames ?
            <Row>
              <Col sm="4" className="control-label"><label> HGVS terms</label></Col>
              <Col sm="8" className="text-no-input">
                {renderVariantHgvs(variantResults.hgvsNames, variantResults.molecularConsequenceList)}
              </Col>
            </Row>
          : null}
          </>
        : null}
      </div>
    );
  };

  const renderGeneralMessage = () => {
    return (
      <>
        <div className="text-muted mb-3 mt-3">
          <p>
            Enter a ClinVar Variation ID or ClinGen Allele Registry ID (CA ID).
            The Variation ID can be found in the light blue box on a variant page (example: <ExternalLink href={EXTERNAL_API_MAP['ClinVarSearch'] + '139214'}>139214</ExternalLink> for variant.
            The CA ID is returned when you register an allele with the ClinGen Allele Registry (example: <ExternalLink href={`${EXTERNAL_API_MAP['CARallele']}CA003323.html`}>CA003323</ExternalLink>).
          </p>
        </div>
      </>
    );
  };

  const renderSelectForm = () => {
    return (
      <div className="form-group form-horizontal">
        <h3>Search and Select Variant</h3>
        <label className="control-label">ClinVar Variation ID or ClinGen Allele Registry ID</label>
        <Input 
          type="text"
          value={variantId} 
          onChange={handleChange} 
          placeholder="e.g. 139214 or CA003323"
          error={errorMessage}
        />
        <Row className="mt-3 md-3"><Col>
          <LoadingButton
            key="retrieve_btn"
            className="float-right btn-last"
            variant="primary"
            onClick={getVariantInfo}
            text="Retrieve"
            textWhenLoading="Retrieving"
            isLoading={isRetrieving}
            disabled={retrieveDisabled}
          />
        </Col></Row>
        {variantResults
          ? renderVariantResourceResult()
          : renderGeneralMessage()
        }
      </div>
    );
  };

  return (
    <>
      <Modal
        show={isModalOpen}
        size="lg"
        title="Select Variant"
        className="select-variant-modal"
        onHide={handleCancel}
        onSave={handleSave}
        hideButtonText="Cancel"
        isLoadingSave={isSaving}
      >
        {renderSelectForm()}
      </Modal>
      <Button variant="outline-dark" onClick={onAddClick}>
        Add Variant
      </Button>
    </>
  );
};
