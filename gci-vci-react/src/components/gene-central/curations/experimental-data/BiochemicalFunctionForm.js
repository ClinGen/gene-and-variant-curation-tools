import React from "react";
import Col from 'react-bootstrap/Col';

import Input from '../../../common/Input';
import CardPanel from '../../../common/CardPanel';
import { dbxref_prefix_map } from '../../../common/globals';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { renderPhenotype } from '../../curations/common/commonFunc';
import {
  Warning,
  HpoIdsLabel,
  GenesWithSameFunctionLabel
} from './utils';


const BiochemicalFunctionForm = ({
  auth,
  disease,
  uniprotId,
  formData = {},
  formErrors,
  handleChange,
  renderGenesError,
}) => {
  const experimentalSubtype = formData && (formData.experimentalSubtype || '');
  const bfIdentifiedFunction = formData && (formData.bfIdentifiedFunction || '');
  const bfIdentifiedFunctionFreeText = formData && (formData.bfIdentifiedFunctionFreeText || '');
  const bfEvidenceForFunction = formData && (formData.bfEvidenceForFunction || '');
  const bfEvidenceForFunctionInPaper = formData && (formData.bfEvidenceForFunctionInPaper || '');
  // Same Function and Same Disease
  const bfGenes = formData && (formData.bfGenes || '');
  const bfEvidenceForOtherGenesWithSameFunction = formData && (formData.bfEvidenceForOtherGenesWithSameFunction || '');
  const bfGeneImplicatedWithDisease = formData && (formData.bfGeneImplicatedWithDisease || false);
  const bfExplanationOfOtherGenes = formData && (formData.bfExplanationOfOtherGenes || '');
  const bfEvidenceInPaperWithSameFunction = formData && (formData.bfEvidenceInPaperWithSameFunction || '');
  // Phenotype
  const bfPhenotypeHpo = formData && (formData.bfPhenotypeHpo || '');
  const bfPhenotypeFreeText = formData && (formData.bfPhenotypeFreeText || '');
  const bfPhenotypeExplanation = formData && (formData.bfPhenotypeExplanation || '');
  const bfPhenotypeEvidenceInPaper = formData && (formData.bfPhenotypeEvidenceInPaper || '');

  const renderTypeA = () => (
    <>
      <Input
        type="text"
        name="bfGenes"
        label={<GenesWithSameFunctionLabel />}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        placeholder="e.g. DICER1"
        value={bfGenes}
        onChange={handleChange}
        error={renderGenesError('bfGenes')}
        required
      />
      <Input
        type="textarea"
        name="bfEvidenceForOtherGenesWithSameFunction"
        label="Evidence that above gene(s) share same function with gene in record:"
        groupClassName="row mb-4"
        labelClassName="col-sm-5 control-label"
        wrapperClassName="col-sm-7"
        rows="5"
        value={bfEvidenceForOtherGenesWithSameFunction}
        onChange={handleChange}
        error={formErrors['bfEvidenceForOtherGenesWithSameFunction'] || null}
        required
      />
      <Input
        type="textarea"
        name="geneWithSameFunctionSameDisease.sharedDisease"
        label="Shared disease:"
        groupClassName="row mb-4"
        labelClassName="col-sm-5 control-label"
        wrapperClassName="col-sm-7"
        disabled
        rows="2"
        value={disease
          ? !disease.freetext
            ? disease.term + ' (' + disease.PK.replace('_', ':') + ')'
            : disease.term + ' (' + auth && auth.name && auth.family_name
              ? `${auth.name} ${auth.family_name}`
              : auth && auth.email ? auth.email : ''
          : ''
        }
      />
      <Input
        type="checkbox"
        name="bfGeneImplicatedWithDisease"
        label="Has this gene(s) been implicated in the above disease?:"
        error={formErrors['bfGeneImplicatedWithDisease'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7 form-row-helper"
        labelClassName="col-sm-5 control-label"
        checked={bfGeneImplicatedWithDisease}
        onChange={handleChange}
      />
      <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
        <strong>Warning:</strong> not checking the above box indicates this criteria has not been met for this evidence; this should be taken into account during its evaluation.
      </Col>
      <Input
        type="textarea"
        name="bfExplanationOfOtherGenes"
        label="How has this other gene(s) been implicated in the above disease?:"
        error={formErrors['bfExplanationOfOtherGenes'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={bfExplanationOfOtherGenes}
        onChange={handleChange}
        required={bfGeneImplicatedWithDisease}
      />
      <Input
        type="textarea"
        name="bfEvidenceInPaperWithSameFunction"
        label="Additional comments:"
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={bfEvidenceInPaperWithSameFunction}
        onChange={handleChange}
      />
    </>
  );

  const renderTypeB = () => (
    <>
      {renderPhenotype(null, 'Experimental')}
      <Input
        type="textarea"
        name="bfPhenotypeHpo"
        label={<HpoIdsLabel />}
        rows="1"
        error={formErrors['bfPhenotypeHpo'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        placeholder="e.g. HP:0010704"
        value={bfPhenotypeHpo}
        onChange={handleChange}
        className="uppercase-input"
        required={!bfPhenotypeFreeText}
      />
      <Input
        type="textarea"
        name="bfPhenotypeFreeText"
        label={<span>Phenotype(s) consistent with function <span className="normal">(free text)</span>:</span>}
        error={formErrors['bfPhenotypeFreeText'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="2"
        value={bfPhenotypeFreeText}
        onChange={handleChange}
        required={!bfPhenotypeHpo}
      />
      <Input
        type="textarea"
        name="bfPhenotypeExplanation"
        label="Explanation of how phenotype is consistent with disease:"
        error={formErrors['bfPhenotypeExplanation'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={bfPhenotypeExplanation}
        onChange={handleChange}
        disabled={!(bfPhenotypeHpo || bfPhenotypeFreeText)}
        required={bfPhenotypeHpo || bfPhenotypeFreeText}
      />
      <Input
        type="textarea"
        name="bfPhenotypeEvidenceInPaper"
        label="Notes on where evidence found in paper:"
        error={formErrors['bfPhenotypeEvidenceInPaper'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={bfPhenotypeEvidenceInPaper}
        onChange={handleChange}
        disabled={!(bfPhenotypeHpo || bfPhenotypeFreeText)}
      />
    </>
  );

  return (
      <CardPanel title={`${experimentalSubtype.charAt(0)}. Biochemical Function`}>
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
          name="bfIdentifiedFunction"
          label={<span>Identified function of gene in this record <span className="normal">(GO ID)</span>:</span>}
          groupClassName="row mb-4"
          wrapperClassName="col-sm-7"
          labelClassName="col-sm-5 control-label"
          className="uppercase-input"
          value={bfIdentifiedFunction}
          placeholder="e.g. GO:2001284"
          onChange={handleChange}
          required={!bfIdentifiedFunctionFreeText}
          error={formErrors['bfIdentifiedFunction'] || null}
        />
        <Input
          type="textarea"
          name="bfIdentifiedFunctionFreeText"
          label={<span>Identified function of gene in this record <span className="normal">(free text)</span>:</span>}
          groupClassName="row mb-4"
          wrapperClassName="col-sm-7"
          labelClassName="col-sm-5 control-label"
          value={bfIdentifiedFunctionFreeText}
          row="2"
          placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
          onChange={handleChange}
          required={!bfIdentifiedFunction}
          error={formErrors['bfIdentifiedFunctionFreeText'] || null}
        />
        <Input
          type="textarea"
          name="bfEvidenceForFunction"
          label="Evidence for above function:"
          groupClassName="row mb-4"
          wrapperClassName="col-sm-7"
          labelClassName="col-sm-5 control-label"
          rows="5"
          value={bfEvidenceForFunction}
          onChange={handleChange}
          error={formErrors['bfEvidenceForFunction'] || null}
          required
        />
        <Input
          type="textarea"
          name="bfEvidenceForFunctionInPaper"
          label="Notes on where evidence found in paper:"
          groupClassName="row mb-4"
          wrapperClassName="col-sm-7"
          labelClassName="col-sm-5 control-label"
          rows="5"
          value={bfEvidenceForFunctionInPaper}
          onChange={handleChange}
          error={formErrors['bfEvidenceForFunctionInPaper'] || null}
        />
        {experimentalSubtype === 'A. Gene(s) with same function implicated in same disease' &&
          renderTypeA()
        }
        {experimentalSubtype === 'B. Gene function consistent with phenotype(s)' &&
          renderTypeB()
        }
      </CardPanel>
  );
}

export default BiochemicalFunctionForm;
