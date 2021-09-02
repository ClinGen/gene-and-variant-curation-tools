import React from "react";
import Col from 'react-bootstrap/Col';

import Input from '../../../common/Input';
import CardPanel from '../../../common/CardPanel';
import { Warning, PhenotypeRescueLabel } from './utils';
import { EXTERNAL_API_MAP } from "../../../../constants/externalApis";
import { renderPhenotype } from '../common/commonFunc';


const RescueForm = ({
  formData,
  formErrors,
  handleChange
}) => {
  const resType = formData && (formData.resType || 'none');
  // Human
  const resHumanModel = formData && (formData.resHumanModel || '');
  // Non-human 
  const resNonHumanModel = formData && (formData.resNonHumanModel || 'none');
  // Cell Culture
  const resCellCulture = formData && (formData.resCellCulture || '');
  const resCellCultureFreeText = formData && (formData.resCellCultureFreeText || '');
  // Patient Cells
  const resPatientCells = formData && (formData.resPatientCells || '');
  const resPatientCellsFreeText = formData && (formData.resPatientCellsFreeText || '');

  const resDescriptionOfGeneAlteration = formData && (formData.resDescriptionOfGeneAlteration || '');
  const resPhenotypeHpo = formData && (formData.resPhenotypeHpo || '');
  const resPhenotypeFreeText = formData && (formData.resPhenotypeFreeText || '');
  const resRescueMethod = formData && (formData.resRescueMethod || '');
  const resWildTypeRescuePhenotype = formData && (formData.resWildTypeRescuePhenotype || false);
  // Patient Variant Rescue
  const resPatientVariantRescue = formData && (formData.resPatientVariantRescue || false);
  
  const resExplanation = formData && (formData.resExplanation || '');
  const resEvidenceInPaper = formData && (formData.resEvidenceInPaper || '');
  return (
    <CardPanel title="Rescue">
      <Input
        type="select"
        name="resType"
        label="Rescue observed in human, non-human model organism, cell culture model, or patient cells?:"
        error={formErrors['resType'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        value={resType}
        onChange={handleChange}
        required
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'rescueType')}
      >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="Human">Human</option>
        <option value="Non-human model organism">Non-human model organism</option>
        <option value="Cell culture model">Cell culture model</option>
        <option value="Patient cells">Patient cells</option>
      </Input>
      {resType === 'Human' &&
        <Input
          type="text"
          name="resHumanModel"
          label="Proband label:"
          groupClassName="row mb-4"
          wrapperClassName="col-sm-7"
          labelClassName="col-sm-5 control-label"
          value={resHumanModel}
          onChange={handleChange}
        />
      }
      {resType === 'Non-human model organism' &&
        <Input
          type="select"
          name="resNonHumanModel"
          label="Non-human model organism:"
          error={formErrors['resNonHumanModel']}
          groupClassName="row mb-4"
          wrapperClassName="col-sm-7"
          labelClassName="col-sm-5 control-label"
          value={resNonHumanModel}
          onChange={handleChange}
          required
          // inputDisabled={this.cv.othersAssessed}
          // clearError={this.clrFormErrors.bind(null, 'rescue.nonHumanModel')}
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Budding yeast (Saccharomyces cerevisiae) 4932">Budding yeast (Saccharomyces cerevisiae) 4932</option>
          <option value="Cat (Felis catus) 9685">Cat (Felis catus) 9685</option>
          <option value="Chicken (Gallus gallus) 9031">Chicken (Gallus gallus) 9031</option>
          <option value="Chimpanzee (Pan troglodytes) 9598">Chimpanzee (Pan troglodytes) 9598</option>
          <option value="Chlamydomonas (Chlamydomonas reinhardtii) 3055">Chlamydomonas (Chlamydomonas reinhardtii) 3055</option>
          <option value="Cow (Bos taurus) 9913">Cow (Bos taurus) 9913</option>
          <option value="Dog (Canis lupus familiaris) 9615">Dog (Canis lupus familiaris) 9615</option>
          <option value="Fission yeast (Schizosaccharomyces pombe) 4896">Fission yeast (Schizosaccharomyces pombe) 4896</option>
          <option value="Frog (Xenopus) 262014">Frog (Xenopus) 262014</option>
          <option value="Fruit fly (Drosophila) 7215">Fruit fly (Drosophila) 7215</option>
          <option value="Gerbil (Gerbillinae) 10045">Gerbil (Gerbillinae) 10045</option>
          <option value="Guinea pig (Cavia porcellus) 10141">Guinea pig (Cavia porcellus) 10141</option>
          <option value="Hamster (Cricetinae) 10026">Hamster (Cricetinae) 10026</option>
          <option value="Macaque (Macaca) 9539">Macaque (Macaca) 9539</option>
          <option value="Medaka (Oryzias latipes) 8090">Medaka (Oryzias latipes) 8090</option>
          <option value="Mouse (Mus musculus) 10090">Mouse (Mus musculus) 10090</option>
          <option value="Pig (Sus scrofa) 9823">Pig (Sus scrofa) 9823</option>
          <option value="Rabbit (Oryctolagus cuniculus) 9986">Rabbit (Oryctolagus cuniculus) 9986</option>
          <option value="Rat (Rattus norvegicus) 10116">Rat (Rattus norvegicus) 10116</option>
          <option value="Round worm (Caenorhabditis elegans) 6239">Round worm (Caenorhabditis elegans) 6239</option>
          <option value="Sheep (Ovis aries) 9940">Sheep (Ovis aries) 9940</option>
          <option value="Zebra finch (Taeniopygia guttata) 59729">Zebra finch (Taeniopygia guttata) 59729</option>
          <option value="Zebrafish (Danio rerio) 7955">Zebrafish (Danio rerio) 7955</option>
        </Input>
      }
      {resType === 'Cell culture model' &&
        <>
          <Warning type="CL_EFO" />
          <Col sm={{ span: 7, offset: 5 }}>
            {'Search the '}
            <a href={EXTERNAL_API_MAP['EFO']} target="_blank" rel="noopener noreferrer">EFO</a>
            {' or '}
            <a href={EXTERNAL_API_MAP['CL']} target="_blank" rel="noopener noreferrer">
              Cell Ontology (CL)
            </a>
            {' using the OLS.'}
          </Col>
          <Input
            type="textarea"
            name="resCellCulture"
            label={<span>Cell culture model type/line <span className="normal">(EFO or CL ID)</span>:</span>}
            error={formErrors['resCellCulture'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            className="uppercase-input no-resize"
            rows="1"
            value={resCellCulture}
            placeholder="e.g. EFO:0001187 or EFO_0001187; CL:0000057 or CL_0000057"
            onChange={handleChange}
            required={!resCellCultureFreeText}
            // inputDisabled={this.cv.othersAssessed}
            // clearError={this.clrFormErrors.bind(null, 'rescue.cellCulture')}
          />
          <Input
            type="textarea"
            name="resCellCultureFreeText"
            label={<span>Cell culture model type/line <span className="normal">(free text)</span>:</span>}
            error={formErrors['resCellCultureFreeText'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            value={resCellCultureFreeText}
            row="2"
            placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
            onChange={handleChange}
            required={!resCellCulture}
            // inputDisabled={this.cv.othersAssessed}
            // clearError={this.clrFormErrors.bind(null, 'rescue.cellCultureFreeText')}
          />
        </>
      }
      {resType === 'Patient cells' &&
        <>
          <Warning type="CL" />
          <Col sm={{ span: 7, offset: 5 }}>
            {'Search the '}
            <a href={EXTERNAL_API_MAP['CL']} target="_blank" rel="noopener noreferrer">Cell Ontology (CL)</a>
            {' using the OLS.'}
          </Col>
          <Input
            type="textarea"
            name="resPatientCells"
            label={<span>Patient cell type/line <span className="normal">(CL ID)</span>:</span>}
            error={formErrors['resPatientCells'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            className="uppercase-input"
            rows="1"
            value={resPatientCells}
            placeholder="e.g. CL:0000057 or CL_0000057"
            onChange={handleChange}
            required={!resPatientCellsFreeText}
            // inputDisabled={this.cv.othersAssessed}
            // clearError={this.clrFormErrors.bind(null, 'rescue.patientCells')}
          />
          <Input
            type="textarea"
            name="resPatientCellsFreeText"
            label={<span>Patient cell type/line <span className="normal">(free text)</span>:</span>}
            error={formErrors['resPatientCellsFreeText'] || null}
            groupClassName="row mb-4"
            wrapperClassName="col-sm-7"
            labelClassName="col-sm-5 control-label"
            value={resPatientCellsFreeText}
            row="2"
            placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
            onChange={handleChange}
            required={!resPatientCells}
            // inputDisabled={this.cv.othersAssessed}
            // clearError={this.clrFormErrors.bind(null, 'rescue.patientCellsFreeText')}
          />
        </>
      }
      <Input
        type="textarea"
        name="resDescriptionOfGeneAlteration"
        label="Description of gene alteration:"
        error={formErrors['resDescriptionOfGeneAlteration'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        onChange={handleChange}
        value={resDescriptionOfGeneAlteration}
        required
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
      />
      {renderPhenotype(null, 'Experimental')}
      <Input
        type="textarea"
        name="resPhenotypeHpo"
        label={<PhenotypeRescueLabel />}
        rows="1"
        error={formErrors['resPhenotypeHpo'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        className="uppercase-input"
        value={resPhenotypeHpo}
        placeholder="e.g. HP:0010704"
        onChange={handleChange}
        required={!resPhenotypeFreeText}
        // clearError={this.clrFormErrors.bind(null, 'rescue.phenotypeHPO')}
        // inputDisabled={this.cv.othersAssessed}
      />
      <Input
        type="textarea"
        name="resPhenotypeFreeText"
        label={<span>Phenotype to rescue <span className="normal">(free text)</span>:</span>}
        error={formErrors['resPhenotypeFreeText'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="2"
        value={resPhenotypeFreeText}
        onChange={handleChange}
        placeholder="Use free text descriptions only after verifying no appropriate ontology term exists"
        required={!resPhenotypeHpo}
        // clearError={this.clrFormErrors.bind(null, 'rescue.phenotypeFreeText')}
        // inputDisabled={this.cv.othersAssessed}
      />
      <Input
        type="textarea"
        name="resRescueMethod"
        label="Description of method used to rescue:"
        error={formErrors['resRescueMethod'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={resRescueMethod}
        onChange={handleChange}
        required
        // clearError={this.clrFormErrors.bind(null, 'rescueMethod')}
        // inputDisabled={this.cv.othersAssessed}
      />
      <Input
        type="checkbox"
        name="resWildTypeRescuePhenotype"
        label="Does the wild-type rescue the above phenotype?:"
        error={formErrors['resWildTypeRescuePhenotype'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7 form-row-helper"
        labelClassName="col-sm-5 control-label"
        checked={resWildTypeRescuePhenotype}
        onChange={handleChange}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'wildTypeRescuePhenotype')}
      />
      <Col sm={{ span: 7, offset: 5}} className="alert alert-warning">
        <strong>Warning:</strong> not checking the above box indicates this criteria has not been met for this evidence; this should be taken into account during its evaluation.
      </Col>
      {resType !== 'Human' &&
        <Input
          type="checkbox"
          name="resPatientVariantRescue"
          label="Does patient variant rescue?:"
          error={formErrors['resPatientVariantRescue'] || null}
          onChange={handleChange}
          groupClassName="row mb-4"
          wrapperClassName="col-sm-7 form-row-helper"
          labelClassName="col-sm-5 control-label"
          checked={resPatientVariantRescue}
          // clearError={this.clrFormErrors.bind(null, 'patientVariantRescue')}
          // inputDisabled={this.cv.othersAssessed}
        />
      }
      <Input
        type="textarea"
        name="resExplanation"
        label="Explanation of rescue of phenotype:"
        error={formErrors['resExplanation'] || null}
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={resExplanation}
        onChange={handleChange}
        required={resWildTypeRescuePhenotype}
        // inputDisabled={this.cv.othersAssessed}
        // clearError={this.clrFormErrors.bind(null, 'explanation')}
      />
      <Input
        type="textarea"
        name="resEvidenceInPaper"
        label="Information about where evidence can be found on paper"
        groupClassName="row mb-4"
        wrapperClassName="col-sm-7"
        labelClassName="col-sm-5 control-label"
        rows="5"
        value={resEvidenceInPaper}
        onChange={handleChange}
        // inputDisabled={this.cv.othersAssessed}
      />
    </CardPanel>
  );
};

export default RescueForm;
