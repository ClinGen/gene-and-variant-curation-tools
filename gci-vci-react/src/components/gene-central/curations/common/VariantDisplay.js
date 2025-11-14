import React, { useState, useEffect } from 'react';
import { Row, Col } from "react-bootstrap";

import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import { LabelClinVarVariant, LabelCARVariant, LabelCACNVariant, renderVariantLabelAndTitle } from './commonFunc';
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
        {variant && variant.cacnId ?
          <Row className="mb-3">
            <Col sm="5" className="control-label"><label><LabelCACNVariant /></label></Col>
            <Col sm="7" className="text-no-input">
              <ExternalLink href={`${EXTERNAL_API_MAP['CARcopy-number']}${variant.cacnId}`}>{variant.cacnId}</ExternalLink>
            </Col>
          </Row>
        : null}
        {renderVariantLabelAndTitle(variant, true)}
        {variant && variant.overlappingGenes ? 
          <Row>
            <Col sm="5" className="control-label"><label>Number of Overlapping Genes:</label></Col>
            <Col sm="7" className="text-no-input">{variant.overlappingGenes.length}</Col>
          </Row>
        : null}
        {/* Until CACN IDs are supported in the VCI, block access to view and curate variant in VCI for CNVs */}
        {variant && variant.cacnId ? 
          <Col className="text-no-input">
            <span>
              <strong>Note:</strong> in general you should be scoring copy number variants involving only one gene, 
              and should not be scoring multi-gene copy number variants due to the fact that the contributions of the other 
              genes cannot be ruled out. If you have any questions please discuss with your expert panel.
            </span>
          </Col>
        : 
          <Col sm={{ span: 7, offset: 5 }} className="text-no-input">
            <Link to={`/variant-central/${variant.PK}`} target="_blank" rel="noopener noreferrer">View variant evidence in Variant Curation Interface</Link>
          </Col>
        }
      </div>
    </>
  );
};


