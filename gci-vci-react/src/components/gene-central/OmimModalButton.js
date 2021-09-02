import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { API_NAME } from "../../utils";
import { get as lodashGet } from "lodash";
import Modal from "../common/Modal";
import { Form, Button } from "react-bootstrap";
import { faPencilAlt, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { gdmParticipantReducer } from '../../utilities/gdmUtilities';
import { useAmplifyAPIRequestRecycler } from "../../utilities/fetchUtilities";
import { setGdmAction } from "../../actions/gdmActions";


export const OmimModalButton = ({
  initialOmidId = '',
  className
}) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const writeMode = initialOmidId ? 'Edit' : 'Add';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [omimId, setOmimId] = useState(initialOmidId);
  const [omimIdErrorMessage, setOmimIdErrorMessage] = useState();
  const [saveErrorMessage, setSaveErrorMessage] = useState();
  const [isSubmittingOmimId, setIsSubmittingOmimId] = useState(false);

  const dispatch = useDispatch();
  const gdm = useSelector(state => state.gdm.entity);
  const auth = useSelector((state) => state.auth);

  const resetForm = () => {
    requestRecycler.cancelAll();
    setIsSubmittingOmimId(false);
    setOmimIdErrorMessage();
    setSaveErrorMessage();
  }

  const handleModalCancel = () => {
    setIsModalOpen(false);
    resetForm();
  }
  const handleModalSave = () => {
    if (!gdm) {
      setOmimIdErrorMessage('GDM not loaded yet.');
      return;
    }

    const validation = validate(omimId);
    if (validation) {
      setOmimIdErrorMessage(validation);
      return;
    }

    // update omimId on gdm
    const updateGdm = {
      ...gdm,
      omimId,
      ...gdmParticipantReducer(gdm, auth),
    };
    setIsSubmittingOmimId(true);
    requestRecycler.capture(API.put(API_NAME, `/gdms/${gdm.PK}`, { body: { updateGdm } }))
      .then((putResultGdm) => {
        setIsModalOpen(false);
        resetForm();
        dispatch(setGdmAction(putResultGdm));
      })
      .catch((error) => {
        if (API.isCancel(error)) {
          return;
        }
        
        setIsSubmittingOmimId(false);

        const serverDetailMessage = lodashGet(error, 'response.data.error', 'Failed to save OMIM ID for this GDM.');
        setSaveErrorMessage(serverDetailMessage);
      });
  }

  const handleModalOpen = () => {
    setIsModalOpen(true);
  }

  const handleOmidIdChange = (e) => {
    const value = e.target.value;
    setOmimId(value);
    setOmimIdErrorMessage(validate(value));
  }

  const handleKeyUp = (e) => {
    if (e.key === 'Enter') {
      handleModalSave();
    }
  }

  return (
    <>
      <Button variant="link" onClick={handleModalOpen} className={className}>
        {writeMode === 'Add' ? 
          <>Add <FontAwesomeIcon icon={faPlus} /></> : 
          <>Edit <FontAwesomeIcon icon={faPencilAlt} /></>}
      </Button>
      <Modal
        title={`${writeMode} OMIM ID`}
        show={isModalOpen}
        onHide={handleModalCancel}
        onSave={handleModalSave}
        saveButtonText={writeMode === 'Add' ? 'Add' : 'Save'}
        isLoadingSave={isSubmittingOmimId}
        saveError={saveErrorMessage}
        animation={false}
      >
        <Form.Group>
          <Form.Label><strong>Enter an OMIM ID</strong></Form.Label>
          <Form.Control autoFocus disabled={isSubmittingOmimId} value={omimId} isInvalid={omimIdErrorMessage} onChange={handleOmidIdChange} onKeyUp={handleKeyUp} />
          <Form.Control.Feedback type="invalid">{omimIdErrorMessage}</Form.Control.Feedback>
        </Form.Group>
      </Modal>
    </>
  );
};
OmimModalButton.propTypes = {
  initialOmidId: PropTypes.string
};

const validate = (value) => {
  if (!value) {
    return 'Please provide an OMIM ID.';
  }
}
