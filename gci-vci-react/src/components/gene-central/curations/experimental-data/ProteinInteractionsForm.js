import React from "react";
import Col from 'react-bootstrap/Col';

import Input from '../../../common/Input';
import CardPanel from '../../../common/CardPanel';
import { InteractingGenesLabel } from './utils';

const ProteinInteractionsForm = ({
  formData,
  formErrors,
  handleChange,
  renderGenesError
}) => {
  const piInteractingGenes = formData && (formData.piInteractingGenes || '');
  const piInteractionType = formData && (formData.piInteractionType || 'none');
  const piExperimentalInteractionDetection = formData && (formData.piExperimentalInteractionDetection || 'none');
  const piGeneImplicatedInDisease = formData && (formData.piGeneImplicatedInDisease || false);
  const piRelationshipOfOtherGenesToDisese = formData && (formData.piRelationshipOfOtherGenesToDisese || '');
  const piEvidenceInPaper = formData && (formData.piEvidenceInPaper || '');
  return (
    <CardPanel title="Protein Interactions">
      <Input
        type="text"
        name="piInteractingGenes"
        label={<InteractingGenesLabel />}
        error={renderGenesError('piInteractingGenes')}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        className="uppercase-input"
        value={piInteractingGenes}
        placeholder="e.g. DICER1"
        onChange={handleChange}
        required
      />
      <Input
        type="select"
        name="piInteractionType"
        label="Interaction Type:"
        error={formErrors['piInteractionType'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        value={piInteractionType}
        onChange={handleChange}
        required
      >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="physical association (MI:0915)">physical association (MI:0915)</option>
        <option value="genetic interaction (MI:0208)">genetic interaction (MI:0208)</option>
        <option value="negative genetic interaction (MI:0933)">negative genetic interaction (MI:0933)</option>
        <option value="positive genetic interaction (MI:0935)">positive genetic interaction (MI:0935)</option>
      </Input>
      <Input
        type="select"
        name="piExperimentalInteractionDetection"
        label="Method by which interaction detected:"
        error={formErrors['piExperimentalInteractionDetection'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        value={piExperimentalInteractionDetection}
        onChange={handleChange}
        required
      >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="affinity chromatography technology (MI:0004)">affinity chromatography technology (MI:0004)</option>
        <option value="coimmunoprecipitation (MI:0019)">coimmunoprecipitation (MI:0019)</option>
        <option value="comigration in gel electrophoresis (MI:0807)">comigration in gel electrophoresis (MI:0807)</option>
        <option value="electron microscopy (MI:0040)">electron microscopy (MI:0040)</option>
        <option value="protein cross-linking with a bifunctional reagent (MI:0031)">protein cross-linking with a bifunctional reagent (MI:0031)</option>
        <option value="pull down (MI:0096)">pull down (MI:0096)</option>
        <option value="synthetic genetic analysis (MI:0441)">synthetic genetic analysis (MI:0441)</option>
        <option value="two hybrid (MI:0018)">two hybrid (MI:0018)</option>
        <option value="x-ray crystallography (MI:0114)">x-ray crystallography (MI:0114)</option>
      </Input>
      <Input
        type="checkbox"
        name="piGeneImplicatedInDisease"
        label="Has this gene or genes been implicated in the above disease?:"
        error={formErrors['piGeneImplicatedInDisease'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7 form-row-helper"
        labelClassName="col-sm-5 control-label"
        checked={piGeneImplicatedInDisease}
        onChange={handleChange}
      />
      <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
        <strong>Warning:</strong> not checking the above box indicates this criteria has not been met for this evidence; this should be taken into account during its evaluation.
      </Col>
      <Input
        type="textarea"
        name="piRelationshipOfOtherGenesToDisese"
        label="Explanation of relationship of interacting gene(s):"
        error={formErrors['piRelationshipOfOtherGenesToDisese'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={piRelationshipOfOtherGenesToDisese}
        onChange={handleChange}
        required={piGeneImplicatedInDisease}
      />
      <Input
        type="textarea"
        name="piEvidenceInPaper"
        label="Information about where evidence can be found on paper"
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={piEvidenceInPaper}
        onChange={handleChange}
      />
    </CardPanel>
  );
};

export default ProteinInteractionsForm;
