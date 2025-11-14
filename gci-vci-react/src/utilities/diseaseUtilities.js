import React from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

export const convertDiseasePKToMondoId = (diseasePK) => {
  return typeof diseasePK === 'string' ? diseasePK.replace('_', ':') : '';
}

export const isFreeTextDisease = (disease) => {
  return disease && typeof disease === 'string' && disease.includes('FREETEXT');
}

export const isDiseaseObsolete = (diseaseTerm) => {
  if (diseaseTerm && diseaseTerm.includes('obsolete'))
    return true;
  else
    return false;
}

export const renderObsoleteDiseaseIcon = (type) => {
  let toolTipText = '';
  if (type === 'gdm')
    toolTipText = 'This GDM is associated with an obsoleted disease, please select a new disease for curation.';
  else
    toolTipText = 'This interpretation is associated with an obsoleted disease.';

  return (
    <OverlayTrigger
      overlay={
        <Tooltip>
          {toolTipText}
        </Tooltip>
      }
    >
      <FontAwesomeIcon icon={faExclamationTriangle} color="red" className="ml-1 mr-1" />
    </OverlayTrigger>
  );
}

export const displayObsoleteDiseaseIcon = (diseaseTerm, type) => {
  if (isDiseaseObsolete(diseaseTerm))
    return renderObsoleteDiseaseIcon(type);
  else
    return null;
}
