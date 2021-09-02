import React from 'react';
import PropTypes from 'prop-types';
import { OwnerTextDisplay } from '../../utilities/ownershipUtilities';
import { renderClassificationStatus } from '../recordStatus/gdmClassificationStatus';
import { useSelector } from 'react-redux';


export const ClassificationRecord = ({
  classification,
  isMyClassification
}) => {
  const gdm = useSelector(state => state.gdm.entity);
  const showProvisionalLink = true;

  return (
    <>
      <OwnerTextDisplay object={classification} /> - 
      {classification.autoClassification && <span className="ml-1"><strong>Calculated: </strong> {classification.autoClassification}; </span>}
      {classification.alteredClassification && <span className="ml-1"><strong>Modified: </strong> {classification.alteredClassification}; </span>}
      <span className="ml-1">
        <strong>Status: </strong>
        {renderClassificationStatus(classification, gdm, showProvisionalLink, isMyClassification)}
      </span>
    </>
  )
}
ClassificationRecord.propTypes = {
  classification: PropTypes.object.isRequired,
  isMyClassification: PropTypes.bool
};
