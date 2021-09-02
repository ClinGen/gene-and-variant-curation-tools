import React, { useState, useEffect } from 'react';
import { Row, Col, Button } from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import DiseaseModal from '../../../common/DiseaseModal';
import { renderDiseaseData } from './commonFunc';

/**
 * Component for adding/copying/deleting disease when creating adding a proband individual
 * to a new family evidence that is currently being created.
 */
export const FamilyProbandDisease = ({
  family,
  familyDiseaseObj,
  probandDiseaseObj,
  updateFamilyProbandDiseaseObj,
  clearErrorInParent,
  error,
  required,
}) =>{

  const [disease, setDisease] = useState(probandDiseaseObj);
  const [showDiseaseModal, setShowDiseaseModal] = useState(false);
  const [formError, setFormError] = useState(error);

  useEffect(() => {
    setDisease(probandDiseaseObj);
  }, [probandDiseaseObj]);

  const passDataToParent = (newDisease) => {
    setDisease(newDisease);
    setFormError(null);
    clearErrorInParent('familyProband');
    setShowDiseaseModal(false);
    // Pass data object back to parent
    // updateDiseaseObj(newDisease);
    updateFamilyProbandDiseaseObj('add', newDisease);
  };

  /**
   * Method to render the copy button given the curated evidence
   */
  const renderCopyDiseaseButton = () => {
    /**
     * Copy disease into the 'Family — Variant(s) Segregating with Proband' section
     * from what had been selected for Family, either by copying from Group or adding new one
    */
    return (
      <Button className="family-proband-disease-copy btn-copy" onClick={e=>handleCopyFamilyProbandDisease(e)}>Copy disease term from Family</Button>
    );
  };

  /**
   * Handler for button press event to copy disease from family into proband
   */
  const handleCopyFamilyProbandDisease = (e) => {
    e.preventDefault(); e.stopPropagation();

    setFormError(null);
    clearErrorInParent('familyProband');

    //??? updateDiseaseObj(newDisease);
    updateFamilyProbandDiseaseObj('copy');
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
    // ???updateDiseaseObj({});
    updateFamilyProbandDiseaseObj('delete');
    clearErrorInParent('familyProband');
  };

  return (
    <>
    <Row className="form-group add-disease-group">
      <Col sm="5" className="control-label">
        <label htmlFor="add-disease">
          <span>Disease(s) for Individual:
            {required ? <span className="required-field"> *</span> : null}
            <span className="control-label-note">Search <ExternalLink href={EXTERNAL_API_MAP['Mondo']}>MONDO</ExternalLink> using OLS</span>
          </span>
        </label>
      </Col>
      <Col sm="7" className="add-disease" id="add-disease">
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
            {(family && family.disease && family.disease.term) || (familyDiseaseObj && familyDiseaseObj.term) ?
              <li>
                {renderCopyDiseaseButton()}
              </li>
            : null}
            {(family && family.disease && family.disease.term) || (familyDiseaseObj && familyDiseaseObj.term) ?
              <li>- or -</li>
            : null}
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
