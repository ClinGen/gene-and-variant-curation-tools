import React from "react";
import Col from 'react-bootstrap/Col';

import Input from '../../../common/Input';
import CardPanel from '../../../common/CardPanel';
import { Warning } from './utils';
import { dbxref_prefix_map } from '../../../common/globals';
import { EXTERNAL_API_MAP } from "../../../../constants/externalApis";

const FunctionalAlterationForm = ({
  uniprotId,
  formData,
  formErrors,
  handleChange,
}) => {
  const faType = formData && (formData.faType || 'none');
  // Type: Patient Cells
  const faPatientCells = formData && (formData.faPatientCells || '');
  const faPatientCellsFreeText = formData && (formData.faPatientCellsFreeText || '');
  // Type: Non-patient Cells
  const faNonPatientCells = formData && (formData.faNonPatientCells || '');
  const faNonPatientCellsFreeText = formData && (formData.faNonPatientCellsFreeText || '')
  // Both
  const faNormalFunctionOfGene = formData && (formData.faNormalFunctionOfGene || '');
  const faNormalFunctionOfGeneFreeText = formData && (formData.faNormalFunctionOfGeneFreeText || '');
  const faDescriptionOfGeneAlteration = formData && (formData.faDescriptionOfGeneAlteration || '');
  const faEvidenceForNormalFunction = formData && (formData.faEvidenceForNormalFunction || '');
  const faEvidenceInPaper = formData && (formData.faEvidenceInPaper || '');

  return (
    <CardPanel title="Functional Alteration">
      <Input
        type="select"
        name="faType"
        label="Cultured patient or non-patient cells carrying candidate variant(s)?:"
        error={formErrors['faType'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        value={faType}
        onChange={handleChange}
        required
        // clearError={this.clrFormErrors.bind(null, 'functionalAlterationType')}
        // inputDisabled={this.cv.othersAssessed}
      >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="Patient cells">Patient cells</option>
        <option value="Non-patient cells">Non-patient cells</option>
      </Input>
      {faType === 'Patient cells' &&
        <>
          <Warning type="CL" />
          <Col sm={{ span: 7, offset: 5 }}>
            <p>
              Search the <a href={EXTERNAL_API_MAP['CL']} target="_blank" rel="noopener noreferrer">Cell Ontology (CL)</a> using the OLS.
            </p>
          </Col>
          <Input
            type="textarea"
            name="faPatientCells"
            label={<span>Patient cell type <span className="normal">(CL ID)</span>:</span>}
            error={formErrors['faPatientCells'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            className="uppercase-input no-resize"
            rows="1"
            value={faPatientCells}
            placeholder="e.g. CL:0000057 or CL_0000057"
            onChange={handleChange}
            required={!faPatientCellsFreeText}
            // inputDisabled={this.cv.othersAssessed}
            // clearError={this.clrFormErrors.bind(null, 'funcalt.patientCells')}
          />
          <Input
            type="textarea"
            name="faPatientCellsFreeText"
            label={<span>Patient cell type <span className="normal">(free text)</span>:</span>}
            error={formErrors['faPatientCellsFreeText'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            value={faPatientCellsFreeText}
            row="2"
            placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
            onChange={handleChange}
            required={!faPatientCells}
            // inputDisabled={this.cv.othersAssessed}
            // clearError={this.clrFormErrors.bind(null, 'funcalt.patientCellsFreeText')}
          />
        </>
      }
      {faType === 'Non-patient cells' &&
        <>
          <Warning type="CL_EFO" />
          <Col sm={{ span: 7, offset: 5 }}>
            <p>
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
            </p>
          </Col>
          <Input
            type="textarea"
            name="faNonPatientCells"
            label={<span>Non-patient cell type <span className="normal">(EFO or CL ID)</span>:</span>}
            error={formErrors['faNonPatientCells'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            className="uppercase-input no-resize"
            rows="1"
            value={faNonPatientCells}
            placeholder="e.g. EFO:0001187 or EFO_0001187; CL:0000057 or CL_0000057"
            onChange={handleChange}
            required={!faNonPatientCellsFreeText}
            // inputDisabled={this.cv.othersAssessed}
            // clearError={this.clrFormErrors.bind(null, 'funcalt.nonPatientCells')}
          />
          <Input
            type="textarea"
            name="faNonPatientCellsFreeText"
            label={<span>Non-patient cell type <span className="normal">(free text)</span>:</span>}
            error={formErrors['faNonPatientCellsFreeText'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            value={faNonPatientCellsFreeText}
            row="2"
            placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
            onChange={handleChange}
            required={!faNonPatientCells}
            // inputDisabled={this.cv.othersAssessed}
            // clearError={this.clrFormErrors.bind(null, 'funcalt.nonPatientCellsFreeText')}
          />
        </>
      }
      <Warning type="GO" />
      <Col sm={{ span: 7, offset: 5 }}>
        <ul className="gene-ontology help-text style-list">
          <li>View <a href={dbxref_prefix_map['UniProtKB'] + uniprotId} target="_blank" rel="noopener noreferrer">existing GO annotations for this gene</a> in UniProt.</li>
          <li>Search <a href={EXTERNAL_API_MAP['GO']} target="_blank" rel="noopener noreferrer">GO</a> using the OLS.</li>
          <li>Search for existing or new terms using <a href="https://www.ebi.ac.uk/QuickGO/" target="_blank" rel="noopener noreferrer">QuickGO</a></li>
        </ul>
      </Col>
      <Input
        type="text"
        name="faNormalFunctionOfGene"
        label={<span>Normal function of gene/gene product <span className="normal">(GO ID)</span>:</span>}
        error={formErrors['faNormalFunctionOfGene'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        className="uppercase-input"
        value={faNormalFunctionOfGene}
        placeholder="e.g. GO:2001284"
        onChange={handleChange}
        required={!faNormalFunctionOfGeneFreeText}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'normalFunctionOfGene')}
      />
      <Input
        type="textarea"
        name="faNormalFunctionOfGeneFreeText"
        label={<span>Normal function of gene/gene product <span className="normal">(free text)</span>:</span>}
        error={formErrors['faNormalFunctionOfGeneFreeText'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        row="2"
        value={faNormalFunctionOfGeneFreeText}
        placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
        onChange={handleChange}
        required={!faNormalFunctionOfGene}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'normalFunctionOfGeneFreeText')}
      />
      <Input
        type="textarea"
        name="faDescriptionOfGeneAlteration"
        label="Description of gene alteration:"
        error={formErrors['faDescriptionOfGeneAlteration'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        onChange={handleChange}
        value={faDescriptionOfGeneAlteration}
        required
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
      />
      <Input
        type="textarea"
        name="faEvidenceForNormalFunction"
        label="Evidence for altered function:"
        error={formErrors['faEvidenceForNormalFunction'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        onChange={handleChange}
        value={faEvidenceForNormalFunction}
        required
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'evidenceForNormalFunction')}
      />
      <Input
        type="textarea"
        name="faEvidenceInPaper"
        label="Notes on where evidence found in paper:"
        error={formErrors['faEvidenceInPaper'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={faEvidenceInPaper}
        onChange={handleChange}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
      />
    </CardPanel>
  );
};

export default FunctionalAlterationForm;
