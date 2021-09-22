import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

import CardPanel from '../../../common/CardPanel';
import { VariantDisplay } from '../common/VariantDisplay';
import { SelectVariantModal } from '../common/SelectVariantModal';

const MAX_VARIANTS = 5;

const AssociatedVariantPanel = ({
  auth,
  variantInfo,
  handleDeleteVariant,
  updateVariantInfo
}) => (
  <CardPanel title="Experimental Data - Associated Variant(s)">
    <Row className="mb-3">
      <div className="w-100">
        <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
          ClinVar VariationID should be provided when available. This allows the aggregation of variant data across genetic and experimental evidence in the “Gene-Disease Record Variants” section on the gene-disease record landing page.
        </Col>
        {variantInfo.map((variant, i) => (
          <div key={i}>
            <VariantDisplay variantObj={variant} />
            <Row className="my-3">
              <Col sm="5" className="control-label"><label>Clear Variant Selection:</label></Col>
              <Col sm="7">
                <Button
                  name={'deleteVariant-' + variant.PK}
                  className="clear-button outline-dark"
                  onClick={e => handleDeleteVariant(e)}
                >
                  Clear
                </Button>
              </Col>
            </Row>
            {i < 4 && <hr />}
          </div>
        ))}
        {variantInfo.length < MAX_VARIANTS &&
          <Row className="mt-5 mb-3">
            <Col sm="5" className="col-sm-5 control-label"><label>Add Variant:</label></Col>
            <Col sm="7">
              <SelectVariantModal
                auth={auth}
                variantList={variantInfo}
                updateParentObj={selectedVariant => updateVariantInfo(selectedVariant)}
              /> 
            </Col>
          </Row>
        }
      </div>
    </Row>
  </CardPanel>
);

export default AssociatedVariantPanel;
