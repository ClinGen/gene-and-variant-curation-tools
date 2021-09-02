import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import Modal from '../common/Modal';
import { API } from 'aws-amplify';
import { API_NAME } from '../../utils';

import { modesOfInheritance } from './mapping/ModesOfInheritance';

const InheritanceModal = ({
  id,
  show,
  title,
  onHide,
  interpretation,
  updateInterpretation,
  userPK
}) => {
  const [saveError, setSaveError] = useState(null);
  const [isLoadingSave, setLoadingSave] = useState(false);
  const [inheritance, setInheritance] = useState(interpretation.modeInheritance || 'no-moi');
  const [adjective, setAdjective] = useState(interpretation.modeInheritanceAdjective || '');

  useEffect(() => {
    return () => {
      setSaveError(null);
      setInheritance(interpretation.modeInheritance || 'no-moi');
      setAdjective(interpretation.modeInheritanceAdjective || '');
    }
  }, [show, interpretation.modeInheritance, interpretation.modeInheritanceAdjective]);

  const handleInheritanceChange = (e) => {
    setInheritance(e.target.value);
    setAdjective('');
  }

  const renderAdjectiveOptions = () => {
    if (inheritance === 'no-moi') {
      return;
    }
    const inheritanceObj = modesOfInheritance.find(mode => mode.label === inheritance);
    if (inheritanceObj) {
      return inheritanceObj.adjectives.map(adjective => (
        <option key={adjective} value={adjective}>{adjective}</option>
      ));
    }
  }

  const isAdjectiveDisabled = () => {
    if (!inheritance) {
      return true;
    }
    const inheritanceObj = modesOfInheritance.find(mode => mode.label === inheritance);
    if (inheritanceObj && inheritanceObj.adjectives && inheritanceObj.adjectives.length > 0) {
      return false;
    }
    return true;
  }

  const handleSave = async () => {
    if (inheritance !== interpretation.modeInheritance || adjective !== interpretation.modeInheritanceAdjective) {
      setLoadingSave(true);
      try {
        const url = '/interpretations/' + interpretation.PK;
        const newInterpretationObj = JSON.parse(JSON.stringify(interpretation));
        newInterpretationObj.modeInheritance = inheritance !== 'no-moi' ? inheritance : null ;
        newInterpretationObj.modeInheritanceAdjective = adjective || null;
        if (userPK || userPK === null) {
          newInterpretationObj.modified_by = userPK;
        }
        const params = {body: {newInterpretationObj}};
        const response = await API.put(API_NAME, url, params);
        if (response) {
          updateInterpretation(response);
          setLoadingSave(false);
          setSaveError(null);
          onHide();
        }
      } catch (error) {
        console.log(`Error updating interpretation with MOI and adjective ${error} `);
        setLoadingSave(false);
        setSaveError('Save failed!');
      }
    } else {
      onHide();
    }
  }
  return (
    <Modal
      id={id}
      show={show}
      size="lg"
      title={title}
      className="inheritance-modal"
      onHide={onHide}
      onSave={handleSave}
      isLoadingSave={isLoadingSave}
      saveError={saveError}
    >
      <Row className="justify-content-md-center">
        <Col xs={5}>
          <strong>Mode of Inheritance</strong>
        </Col>
        <Col xs={5}>
          <select
            className="form-control"
            name="modeOfInheritance"
            value={inheritance}
            onChange={handleInheritanceChange}
          >
            <option value="no-moi">No mode of inheritance</option>
            <option value="" disabled></option>
            {modesOfInheritance.map(mode => (
              <option key={mode.value} value={mode.value}>{mode.label}</option>
            ))}
          </select>
        </Col>
      </Row>
      <Row className="justify-content-md-center">
        <Col xs={5}>
          <strong>Select an Adjective</strong>
        </Col>
        <Col xs={5}>
          <select
            className="form-control"
            name="modeInheritanceAdjectives"
            placeholder="Select"
            disabled={isAdjectiveDisabled()}
            value={adjective}
            onChange={(e) => setAdjective(e.target.value)}
          >
            <option value="">Select</option>
            <option disabled></option>
            {renderAdjectiveOptions(inheritance)}
          </select>
        </Col>
      </Row>
    </Modal>
  );
};

export default InheritanceModal;
