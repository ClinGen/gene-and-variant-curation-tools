import React, { useState, useEffect } from 'react';
import { Row, Col } from "react-bootstrap";

import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import { LabelClinVarVariant, LabelCARVariant, renderVariantLabelAndTitle } from './commonFunc';
import { Link } from 'react-router-dom';

export const VariantDisplay = ({
  variantObj
}) => {
  const [variant, setVariant] = useState(variantObj);

  useEffect(() => {
    setVariant(variantObj);
  }, [variantObj]);

  return (
    <>
      <div className="variant-resources">
        {variant && variant.clinvarVariantId ?
          <Row className="variant-data-source">
            <Col sm="5" className="control-label"><label>{<LabelClinVarVariant />}</label></Col>
            <Col sm="7" className="text-no-input">
              <ExternalLink href={EXTERNAL_API_MAP['ClinVarSearch'] + variant.clinvarVariantId}>{variant.clinvarVariantId}</ExternalLink>
            </Col>
          </Row>
        : null}
        {variant && variant.carId ?
          <Row className="mb-3">
            <Col sm="5" className="control-label"><label><LabelCARVariant /></label></Col>
            <Col sm="7" className="text-no-input">
              <ExternalLink href={`${EXTERNAL_API_MAP['CARallele']}${variant.carId}.html`}>{variant.carId}</ExternalLink>
            </Col>
          </Row>
        : null}
        {renderVariantLabelAndTitle(variant, true)}
        <Col sm={{ span: 7, offset: 5 }} className="text-no-input">
          <Link to={`/variant-central/${variant.PK}`} target="_blank" rel="noopener noreferrer">View variant evidence in Variant Curation Interface</Link>
        </Col>
      </div>
    </>
  );
};


