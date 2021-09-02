import React, { useState, useEffect } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Row, Col, Button } from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import DiseaseModal from '../../../common/DiseaseModal';
import { renderDiseaseData } from './commonFunc';

/**
 * Component for adding/copying/deleting disease when creating a new family evidence
 * either with or without an associated group
 */
export const FamilyDisease = ({
  gdm,
  group,
  diseaseObj,
  updateDiseaseObj,
  clearErrorInParent,
  error,
}) =>{

  const [disease, setDisease] = useState(diseaseObj);
  const [showDiseaseModal, setShowDiseaseModal] = useState(false);
  const [formError, setFormError] = useState(error);

  useEffect(() => {
    setDisease(diseaseObj);
  }, [diseaseObj]);

  const passDataToParent = (newDisease) => {
    setDisease(newDisease);
    setFormError(null);
    clearErrorInParent('family');
    setShowDiseaseModal(false);
    // Pass data object back to parent
    updateDiseaseObj(newDisease);
  };

  /**
   * Method to render the copy button given the curated evidence
   */
  const renderCopyDiseaseButton = () => {
    if (group && group.commonDiagnosis && group.commonDiagnosis.length) {
      return (
        <Button className="group-disease-copy btn-copy" onClick={e=>handleCopyGroupDisease(e)}>Copy disease term from Associated Group</Button>
      );
    } else {
      return (
        <Button className="gdm-disease-copy btn-copy" onClick={e=>handleCopyGdmDisease(e)}>Copy disease term from Gene-Disease Record</Button>
      );
    }
  };

  /**
   * Handler for button press event to copy disease from GDM
   */
  const handleCopyGdmDisease = (e) => {
    e.preventDefault(); e.stopPropagation();

    setFormError(null);
    clearErrorInParent('family');

    if (gdm && gdm.disease) {
      const newDisease = cloneDeep(gdm.disease);
      setDisease(newDisease);

      // Pass data object back to parent
      updateDiseaseObj(newDisease);
    }
  };

  /**
   * Handler for button press event to copy disease from Group
   */
  const handleCopyGroupDisease = (e) => {
    e.preventDefault(); e.stopPropagation();

    setFormError(null);
    clearErrorInParent('family');

    if (group && group.commonDiagnosis && group.commonDiagnosis.length) {
      const newDisease = cloneDeep(group.commonDiagnosis[0]);
      setDisease(newDisease);

      // Pass data object back to parent
      updateDiseaseObj(newDisease);
    }
  };

  const handleDiseaseModal = (e) => {
    e.preventDefault(); e.stopPropagation();
    setShowDiseaseModal(true)
  };

  /**
   * Handler for button press event to delete disease from the evidence
   */
  const handleDeleteDisease = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDisease(null);
    setFormError('');
    // Pass data object back to parent
    updateDiseaseObj({});
    clearErrorInParent('family');
  };

  return (
    <>
    <Row className="form-group add-disease-group">
      <Col sm="5" className="control-label">
        <label htmlFor="add-disease">
          <span>Disease(s) in Common for Family:
            <span className="control-label-note">Search <ExternalLink href={EXTERNAL_API_MAP['Mondo']}>MONDO</ExternalLink> using OLS</span>
          </span>
        </label>
      </Col>
      <Col sm="7" className="add-disease " id="add-disease">
        <div className={disease && disease.term ? "disease-name col-sm-9" : (formError ? "disease-name error float-left" : "disease-name")}>
          {formError ?
            <span className="form-error">{formError}</span>
            :
            <span>
              {renderDiseaseData(disease)}
            </span>
          }
        </div>
        {disease && disease.term ?
          <div className="delete-disease-button">
            <Button variant="danger" className="float-right" onClick={e=>handleDeleteDisease(e)}>Disease <FontAwesomeIcon icon={faTrashAlt} /></Button>
          </div>
          :
          <ul className={formError ? "add-disease-button-group float-right" : "add-disease-button-group"}>
            <li>
              {renderCopyDiseaseButton()}
            </li>
            <li>- or -</li>
            <li>
              <Button variant="primary" onClick={e=>handleDiseaseModal(e)}>Disease <FontAwesomeIcon className="mr-3" icon={faPlusCircle} /></Button> 
            </li>
          </ul>
        }
      </Col>
    </Row>
    <DiseaseModal
      show={showDiseaseModal}
      onHide={() => setShowDiseaseModal(false)}
      id="addDiseaseModal"
      title="Select Disease"
      updateDisease={selectedDisease=>passDataToParent(selectedDisease)}
    />
    </>
  );
};
