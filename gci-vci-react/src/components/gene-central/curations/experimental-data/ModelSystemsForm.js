import React from "react";
import Col from 'react-bootstrap/Col';

import Input from '../../../common/Input';
import CardPanel from '../../../common/CardPanel';
import { Warning, PhenotypeObservedLabel, PatientPhenotypeLabel } from './utils';
import { EXTERNAL_API_MAP } from "../../../../constants/externalApis";
import { renderPhenotype } from '../common/commonFunc';

const ModelSystemsForm = ({
  formData,
  formErrors,
  handleChange
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
        <Input
          type="select"
          name="msNonHumanModel"
          label="Non-human model organism:"
          error={formErrors['msNonHumanModel'] || null}
          groupClassName="row mb-4"
          wrapperClassName="col-sm-7"
          labelClassName="col-sm-5 control-label"
          value={msNonHumanModel}
          onChange={handleChange}
          // clearError={this.clrFormErrors.bind(null, 'nonHumanModel')}
          // inputDisabled={this.cv.othersAssessed}
          required
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
