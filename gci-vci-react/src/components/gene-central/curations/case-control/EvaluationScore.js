import React from 'react';
import Input from "../../../common/Input";
import { Row, Col } from "react-bootstrap";

// Utility function to display the Case-Control Evaluation & Score panel,
// and convert its values to an object.
// This object assumes it has a React component's 'this', so these need to be called
export const EvaluationScore = (props) => {
  const {formData, formErrors, handleChange} = props

  // Renders Case-Control Evaluation panel
  return (
    <div>
      <div className="section section-study-type-detection-method">
        <Input type="select" name="studyType" label={<span>Study type:<br /><span className="normal">(Required for scoring)</span></span>}
          value={formData['studyType']} onChange={handleChange}
          labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 studyType">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Single variant analysis">Single variant analysis</option>
          <option value="Aggregate variant analysis">Aggregate variant analysis</option>
        </Input>
        <Input type="select" name="detectionMethod" label="Detection method:"
          value={formData['detectionMethod']} onChange={handleChange}
          labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Cases and controls genotyped for variant(s)">Cases and controls genotyped for variant(s)</option>
          <option value="Cases and controls sequenced for entire gene">Cases and controls sequenced for entire gene</option>
          <option value="Cases sequenced and controls genotyped">Cases sequenced and controls genotyped</option>
          <option value="Cases genotyped and controls sequenced">Cases genotyped and controls sequenced</option>
        </Input>
      </div>
      <div className="section section-statistics">
        <h3><i className="icon icon-chevron-right"></i> Statistics</h3>
        <h4 className="col-sm-7 col-sm-offset-5">Statistical Value</h4>
        <div>
          <Input type="select" name="statisticValueType" label="Test statistic:"
            value={formData['statisticValueType']} onChange={handleChange}
            labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group">
            <option value="none">No Selection</option>
            <option disabled="disabled"></option>
            <option value="Odds Ratio">Odds Ratio</option>
            <option value="Relative Risk">Relative Risk</option>
            <option value="Other">Other</option>
          </Input>
          <Input type="text" name="statisticOtherType" label="Other test statistic:" value={formData['statisticOtherType']}
            error={formErrors['statisticOtherType'] || null} labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6"
            groupClassName={'row mb-3 form-group statistic-other-type ' + formData['statisticOtherTypeState']} onChange={handleChange} />
          <Input type="number" name="statisticValue" label="Value:" value={formData['statisticValue']} onChange={handleChange}
            error={formErrors['statisticvalue'] || null} groupClassName="row mb-3 form-group"
            labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" placeholder="Number only" />
        </div>

        <h4 className="col-sm-7 col-sm-offset-5">Confidence/Significance</h4>
        <Input type="number" name="pValue" label="p-value:" value={formData['pValue']}
          error={formErrors['pValue'] || null} wrapperClassName="col-sm-6" onChange={handleChange}
          labelClassName="col-sm-6 control-label" groupClassName="row mb-3 form-group" placeholder="Number only" />
        <Row>
          <Col sm="6" className="control-label">
            <label className="col-sm-6 control-label">Confidence interval (%):</label>
          </Col>
          <Col sm="6">
            <Input type="number" name="confidenceIntervalFrom" className="form-control"
              error={formErrors['confidenceIntervalFrom'] || null} groupClassName="form-group-inline confidence-interval-input"
              value={formData['confidenceIntervalFrom']} onChange={handleChange} placeholder="Number only" />
            <span className="group-age-inter">to</span>
            <Input type="number" name="confidenceIntervalTo" className="form-control"
              error={formErrors['confidenceIntervalTo'] || null} groupClassName="form-group-inline confidence-interval-input"
              value={formData['confidenceIntervalTo']} onChange={handleChange} placeholder="Number only" />
          </Col>
        </Row>
      </div>
      <div className="section section-bias-category">
        <h3><i className="icon icon-chevron-right"></i> Bias Category</h3>
        <Input type="select" name="demographicInfoMatched" label="1. Are case and control cohorts matched by demographic information?"
          value={formData['demographicInfoMatched']} labelClassName="col-sm-6 control-label"
          wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group" onChange={handleChange}>
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Input>
        <Input type="select" name="factorOfDemographicInfoMatched" label="If yes, select one of the following:"
          value={formData['factorOfDemographicInfoMatched']} labelClassName="col-sm-6 control-label"
          wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group" onChange={handleChange}>
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Age">Age</option>
          <option value="Sex">Sex</option>
          <option value="Ethnicity">Ethnicity</option>
          <option value="Location of recruitment">Location of recruitment</option>
        </Input>
        <Input type="textarea" name="explanationForDemographicMatched" label="Explanation:" rows="5"
          value={formData['explanationForDemographicMatched']} labelClassName="col-sm-6 control-label"
          wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group" onChange={handleChange} />
        <Input type="select" name="geneticAncestryMatched" label="2. Are case and control cohorts matched for genetic ancestry?"
          onChange={handleChange} value={formData['geneticAncestryMatched']}
          labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Input>
        <Input type="select" name="factorOfGeneticAncestryNotMatched" label="If no, select one of the following:"
          onChange={handleChange} value={formData['factorOfGeneticAncestryNotMatched']}
          labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="No, but investigators accounted for genetic ancestry in analysis">No, but investigators accounted for genetic ancestry in analysis</option>
          <option value="No, investigators did NOT account for genetic ancestry in analysis">No, investigators did NOT account for genetic ancestry in analysis</option>
        </Input>
        <Input type="textarea" name="explanationForGeneticAncestryNotMatched" label="Explanation:" rows="5" onChange={handleChange}
          value={formData['explanationForGeneticAncestryNotMatched']} wrapperClassName="col-sm-6"
          labelClassName="col-sm-6 control-label" groupClassName="row mb-3 form-group" />
        <Input type="select" name="diseaseHistoryEvaluated" label="3. Are case and control cohorts equivalently evaluated for primary disease outcome and/or family history of disease?"
          onChange={handleChange} value={formData['diseaseHistoryEvaluated']}
          labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes to both presence/absence of phenotype and family history">Yes to both presence/absence of phenotype and family history</option>
          <option value="Yes to presence/absence of phenotype. No to family history evaluation.">Yes to presence/absence of phenotype. No to family history evaluation.</option>
          <option value="No to presence/absence of phenotype. Yes to family history evaluation.">No to presence/absence of phenotype. Yes to family history evaluation.</option>
          <option value="No to both presence/absence of phenotype and family history">No to both presence/absence of phenotype and family history</option>
        </Input>
        <Input type="textarea" name="explanationForDiseaseHistoryEvaluation" label="Explanation:" rows="5" onChange={handleChange}
          value={formData['explanationForDiseaseHistoryEvaluation']}
          labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group" />
        <Input type="select" name="differInVariables" label="4. Do case and control cohorts differ in any other variables?"
          onChange={handleChange} value={formData['differInVariables']}
          labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group">
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Input>
        <Input type="textarea" name="explanationForDifference" rows="5" onChange={handleChange}
          value={formData['explanationForDifference']} label="If yes, explain:"
          labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group" />
      </div>
      <div className="section section-comments">
        <h3><i className="icon icon-chevron-right"></i> Comments</h3>
        <Input type="textarea" name="comments" label="Please provide any comments regarding case-control evaluation:" rows="5"
          value={formData['comments']} onChange={handleChange}
          labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="row mb-3 form-group" />
      </div>
    </div>
  );
};
