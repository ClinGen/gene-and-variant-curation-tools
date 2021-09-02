import React from "react";
import Col from 'react-bootstrap/Col';

import CardPanel from '../../../common/CardPanel';
import Input from '../../../common/Input';
import { EXTERNAL_API_MAP } from "../../../../constants/externalApis";
import { Warning } from './utils';


const ExpressionForm = ({
  formData,
  formErrors,
  handleChange
}) => {
  const experimentalSubtype = formData && (formData.experimentalSubtype || '');
  const expOrganOfTissue = formData && (formData.expOrganOfTissue || '');
  const expOrganOfTissueFreeText = formData && (formData.expOrganOfTissueFreeText || '')
  // Normal Expression
  const expNormalExpressedInTissue = formData && (formData.expNormalExpressedInTissue || false);
  const expNormalEvidence = formData && (formData.expNormalEvidence || '');
  const expNormalEvidenceInPaper = formData && (formData.expNormalEvidenceInPaper || '');
  // Altered Expression
  const expAlteredExpressedInPatients = formData && (formData.expAlteredExpressedInPatients || false);
  const expAlteredEvidence = formData && (formData.expAlteredEvidence || '');
  const expAlteredEvidenceInPaper = formData && (formData.expAlteredEvidenceInPaper || '');

  const renderTypeA = () => (
    <>
      <Input
        type="checkbox"
        name="expNormalExpressedInTissue"
        label="Is the gene normally expressed in the above tissue?:"
        error={formErrors['expNormalExpressedInTissue']}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7 form-row-helper"
        labelClassName="col-sm-5 control-label"
        checked={expNormalExpressedInTissue}
        onChange={handleChange}
        // clearError={this.clrFormErrors.bind(null, 'normalExpression.expressedInTissue')}
        // inputDisabled={this.cv.othersAssessed}
      />
      <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
        <strong>Warning:</strong> not checking the above box indicates this criteria has not been met for this evidence; this should be taken into account during its evaluation.
      </Col>
      <Input
        type="textarea"
        name="expNormalEvidence"
        label="Evidence for normal expression in disease tissue:"
        error={formErrors['expNormalEvidence'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={expNormalEvidence}
        onChange={handleChange}
        required={expNormalExpressedInTissue}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'normalExpression.evidence')}
      />
      <Input
        type="textarea"
        name="expNormalEvidenceInPaper"
        label="Notes on where evidence found:"
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={expNormalEvidenceInPaper}
        onChange={handleChange}
        // inputDisabled={this.cv.othersAssessed}
      />
    </>
  );

  const renderTypeB = () => (
    <>
      <Input
        type="checkbox"
        name="expAlteredExpressedInPatients"
        label="Is expression altered in patients who have the disease?:"
        error={formErrors['expAlteredExpressedInPatients'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7 form-row-helper"
        labelClassName="col-sm-5 control-label"
        checked={expAlteredExpressedInPatients}
        onChange={handleChange}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'alteredExpression.expressedInPatients')}
      />
      <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
        <strong>Warning:</strong> not checking the above box indicates this criteria has not been met for this evidence; this should be taken into account during its evaluation.
      </Col>
      <Input
        type="textarea"
        name="expAlteredEvidence"
        label="Evidence for altered expression in patients:"
        error={formErrors['expAlteredEvidence'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={expAlteredEvidence}
        onChange={handleChange}
        required={expAlteredExpressedInPatients}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'alteredExpression.evidence')}
      />
      <Input
        type="textarea"
        name="expAlteredEvidenceInPaper"
        label="Notes on where evidence found in paper:"
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={expAlteredEvidenceInPaper}
        onChange={handleChange}
        // inputDisabled={this.cv.othersAssessed}
      />
    </>
  );

  return (
    <CardPanel title={`${experimentalSubtype.charAt(0)}. Expression`}>
      <Warning type="UBERON" />
      <Col sm={{ span: 7, offset: 5 }}>
        Search the <a href={EXTERNAL_API_MAP['Uberon']} target="_blank" rel="noopener noreferrer">Uberon</a> using the OLS.
      </Col>
      <Input
        type="text"
        name="expOrganOfTissue"
        label={<span>Organ or tissue relevant to disease <span className="normal">(Uberon ID)</span>:</span>}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        value={expOrganOfTissue}
        onChange={handleChange}
        placeholder="e.g. UBERON:0015228 or UBERON_0015228 or UBERON:0015228, UBERON:0012345"
        error={formErrors['expOrganOfTissue'] || null}
        required={!expOrganOfTissueFreeText}
        className="uppercase-input"
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'organOfTissue')}
      />
      <Input
        type="textarea"
        name="expOrganOfTissueFreeText"
        label={<span>Organ or tissue relevant to disease <span className="normal">(free text)</span>:</span>}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        value={expOrganOfTissueFreeText}
        row="2"
        placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
        onChange={handleChange}
        error={formErrors['expOrganOfTissueFreeText'] || null}
        required={!expOrganOfTissue}
        // clearError={this.clrFormErrors.bind(null, 'organOfTissueFreeText')}
        // inputDisabled={this.cv.othersAssessed}
      />
      {experimentalSubtype === 'A. Gene normally expressed in tissue relevant to the disease' &&
        renderTypeA()
      }
      {experimentalSubtype === 'B. Altered expression in Patients' &&
        renderTypeB()
      }
    </CardPanel>
  );
}

export default ExpressionForm;
