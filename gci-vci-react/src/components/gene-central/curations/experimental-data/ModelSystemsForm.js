import React from "react";
import Col from 'react-bootstrap/Col';

import Input from '../../../common/Input';
import CardPanel from '../../../common/CardPanel';
import { Warning, PhenotypeObservedLabel, PatientPhenotypeLabel } from './utils';
import { EXTERNAL_API_MAP } from "../../../../constants/externalApis";
import { renderPhenotype } from '../common/commonFunc';
import NonHumanModelInput from '../common/NonHumanModelInput';

const ModelSystemsForm = ({
  formData,
  formErrors,
  handleChange,
  handleSelectChange
}) => {
  const msType = formData && (formData.msType || 'none');
  // Non-human type
  const msNonHumanModel = formData && (formData.msNonHumanModel || 'none');
  // Cell Culture type
  const msCellCulture = formData && (formData.msCellCulture || '');
  const msCellCultureFreeText = formData && (formData.msCellCultureFreeText || '');
  const msDescriptionOfGeneAlteration = formData && (formData.msDescriptionOfGeneAlteration || '');
  const msPhenotypeHpoObserved = formData && (formData.msPhenotypeHpoObserved || '');
  const msPhenotypeFreetextObserved = formData && (formData.msPhenotypeFreetextObserved || '');
  const msPhenotypeHpo = formData && (formData.msPhenotypeHpo || '');
  const msPhenotypeFreeText = formData && (formData.msPhenotypeFreeText || '');
  const msExplanation = formData && (formData.msExplanation || '');
  const msEvidenceInPaper = formData && (formData.msEvidenceInPaper || '');

  return (
    <CardPanel title="Model Systems">
      <Input
        type="select"
        name="msType"
        label="Non-human model organism or cell culture model?:"
        error={formErrors['msType'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        value={msType}
        onChange={handleChange}
        required
        // clearError={this.clrFormErrors.bind(null, 'modelSystemsType')}
        // inputDisabled={this.cv.othersAssessed}
        >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="Non-human model organism">Non-human model organism</option>
        <option value="Cell culture model">Cell culture model</option>
      </Input>
      {msType === 'Non-human model organism' &&
        <NonHumanModelInput error={formErrors['msNonHumanModel'] || null} value={msNonHumanModel} handleChange={handleSelectChange} type="ms" />
      }
      {msType === 'Cell culture model' &&
        <>
          <Warning type="CL_EFO" />
          <Col sm={{ span: 7, offset: 5 }}>
            {'Search the '}
            <a
              href={EXTERNAL_API_MAP['EFO']}
              target="_blank"
              rel="noopener noreferrer"
            >
              EFO
            </a>
            {' or '}
            <a
              href={EXTERNAL_API_MAP['CL']}
              target="_blank"
              rel="noopener noreferrer"
            >
              Cell Ontology (CL)
            </a>
            {' using the OLS.'}
          </Col>
          <Input
            type="textarea"
            name="msCellCulture"
            label={<span>Cell culture model type/line <span className="normal">(EFO or CL ID)</span>:</span>}
            error={formErrors['msCellCulture'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            className="uppercase-input no-resize"
            rows="1"
            value={msCellCulture}
            placeholder="e.g. EFO:0001187 or EFO_0001187; CL:0000057 or CL_0000057"
            onChange={handleChange}
            required={!msCellCultureFreeText}
            // clearError={this.clrFormErrors.bind(null, 'cellCulture')}
            // inputDisabled={this.cv.othersAssessed}
          />
          <Input
            type="textarea"
            name="msCellCultureFreeText"
            label={<span>Cell culture model type/line <span className="normal">(free text)</span>:</span>}
            error={formErrors['msCellCultureFreeText'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            value={msCellCultureFreeText}
            row="2"
            placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
            onChange={handleChange}
            required={!msCellCulture}
            // inputDisabled={this.cv.othersAssessed}
            // clearError={this.clrFormErrors.bind(null, 'cellCultureFreeText')}
          />
        </>
      }
      <Input
        type="textarea"
        name="msDescriptionOfGeneAlteration"
        label="Description of gene alteration:"
        error={formErrors['msDescriptionOfGeneAlteration'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        onChange={handleChange}
        value={msDescriptionOfGeneAlteration}
        required
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
      />
      {renderPhenotype(null, 'Experimental')}
      <Input
        type="textarea"
        name="msPhenotypeHpoObserved"
        label={<PhenotypeObservedLabel />}
        rows="1"
        error={formErrors['msPhenotypeHpoObserved'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        className="uppercase-input"
        value={msPhenotypeHpoObserved}
        placeholder="e.g. HP:0010704, MP:0010805"
        onChange={handleChange}
        required={!msPhenotypeFreetextObserved}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'model.phenotypeHPOObserved')}
      />
      <Input
        type="textarea"
        name="msPhenotypeFreetextObserved"
        label={<span>Phenotype(s) observed in model system <span className="normal">(free text)</span>:</span>}
        error={formErrors['msPhenotypeFreetextObserved'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="2"
        value={msPhenotypeFreetextObserved}
        onChange={handleChange}
        placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
        required={!msPhenotypeHpoObserved}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'phenotypeFreetextObserved')}
      />
      <Input
        type="textarea"
        name="msPhenotypeHpo"
        label={<PatientPhenotypeLabel />}
        rows="1"
        error={formErrors['msPhenotypeHpo'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        className="uppercase-input"
        value={msPhenotypeHpo}
        placeholder="e.g. HP:0010704"
        onChange={handleChange}
        required={!msPhenotypeFreeText}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'model.phenotypeHPO')}
      />
      <Input
        type="textarea"
        name="msPhenotypeFreeText"
        label={<span>Human phenotype(s) <span className="normal">(free text)</span>:</span>}
        error={formErrors['msPhenotypeFreeText'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="2"
        value={msPhenotypeFreeText}
        onChange={handleChange}
        placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
        required={!msPhenotypeHpo}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'model.phenotypeFreeText')}
      />
      <Input
        type="textarea"
        name="msExplanation"
        label="Explanation of how model system phenotype is similar to phenotype observed in humans:"
        error={formErrors['msExplanation'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={msExplanation}
        onChange={handleChange}
        required
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'explanation')}
      />
      <Input
        type="textarea"
        name="msEvidenceInPaper"
        label="Information about where evidence can be found on paper"
        error={formErrors['msEvidenceInPaper'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={msEvidenceInPaper}
        onChange={handleChange}
        // clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
        // inputDisabled={this.cv.othersAssessed}
      />
    </CardPanel>
  );
};

export default ModelSystemsForm;
