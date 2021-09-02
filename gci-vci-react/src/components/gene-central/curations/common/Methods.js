import React from 'react';
import { cloneDeep, get as lodashGet } from 'lodash';
import moment from 'moment';
import { Row, Col, Button } from "react-bootstrap";
import Input from '../../../common/Input';
import { renderParentEvidence } from './commonFunc';

// Utilities so any pages that have a Methods panel can use this shared code
// To display the panel, and convert its values to an object.

/**
 * Render a Methods panel.
 * @param {object} method - Methods data of evidence being curated.
 * @param {string} evidenceType - Type of evidence being curated (group, family, individual or case-control).
 * @param {string} prefix - Prefix to default form field names (only necessary for case-control).
 * @param {object} parentMethod - Methods data of "parent" evidence (e.g. a family's associated group).
 * @param {string} parentName - Name of "parent" evidence (Group or Family).
 */
export const MethodsPanel = ({ 
  formData,
  genotyping2Disabled,
  handleChange,
  updateMethodsFormData,
  method,
  evidenceType,
  prefix,
  parentMethod,
  parentName
}) => {
  let isFamily = false;
  let hasParentMethods = false;
  let specificMutationPlaceholder = 'Note any aspects of the genotyping method that may impact the strength of this evidence. For example: Was the entire gene sequenced, or were a few specific variants genotyped? Was copy number assessed?';

  if (evidenceType === 'individual' || evidenceType === 'family') {
    if (parentMethod && ((parentMethod.previousTesting === true || parentMethod.previousTesting === false) || parentMethod.previousTestingDescription ||
      (parentMethod.genomeWideStudy === true || parentMethod.genomeWideStudy === false) || (parentMethod.genotypingMethods && parentMethod.genotypingMethods.length) ||
      parentMethod.specificMutationsGenotypedMethod) && parentName) {
      hasParentMethods = true;
    }
    if (evidenceType === 'family') {
      isFamily = true;
    }
  }

  // Copy methods data from source object into form fields (expected to be initiated by a button click)
  const handleCopyMethods = (e) => {
    e.preventDefault(); e.stopPropagation();
    let newFormData = cloneDeep(formData);

    if (lodashGet(parentMethod, "previousTesting", null) === true) {
      newFormData[prefix ? prefix + 'prevtesting' : 'prevtesting'] = 'Yes';
    } else if (lodashGet(parentMethod, "previousTesting", null) === false) {
      newFormData[prefix ? prefix + 'prevtesting' : 'prevtesting'] = 'No';
    }

    if (lodashGet(parentMethod, "previousTestingDescription", null)) {
      newFormData[prefix ? prefix + 'prevtestingdesc' : 'prevtestingdesc'] = parentMethod.previousTestingDescription;
    }

    if (lodashGet(parentMethod, "genomeWideStudy", null) === true) {
      newFormData[prefix ? prefix + 'genomewide' : 'genomewide'] = 'Yes';
    } else if (lodashGet(parentMethod, "genomeWideStudy", null) === false) {
      newFormData[prefix ? prefix + 'genomewide' : 'genomewide'] = 'No';
    }

    if (lodashGet(parentMethod, "genotypingMethods[0]", null)) {
      newFormData[prefix ? prefix + 'genotypingmethod1' : 'genotypingmethod1'] = parentMethod.genotypingMethods[0];

      // Check if the "Method 2" drop-down needs to be enabled
      if (lodashGet(parentMethod, "genotypingMethods[1]", null)) {
        newFormData[prefix ? prefix + 'genotypingmethod2' : 'genotypingmethod2'] = parentMethod.genotypingMethods[1];
      }
    }

    if (lodashGet(parentMethod, "specificMutationsGenotypedMethod", null)) {
      newFormData[prefix ? prefix + 'specificmutation' : 'specificmutation'] = parentMethod.specificMutationsGenotypedMethod;
    }

    updateMethodsFormData(newFormData);
  };

  return (
    <>
    {hasParentMethods ? 
      <Col sm={{ span: 7, offset: 5 }}>
        <Button className="methods-copy btn-copy" onClick={e=>handleCopyMethods(e)}>Copy Methods term from Associated {parentName}</Button>
      </Col>
      : null}
    {hasParentMethods ? renderParentEvidence('Previous Testing Associated with ' + parentName + ':',
      (lodashGet(parentMethod, "previousTesting", null) === true ? 'Yes' : (lodashGet(parentMethod,"previousTesting", null) === false ? 'No' : ''))) : null}
    <Input type="select" label="Previous Testing:"
      name={prefix ? prefix + 'prevtesting' : 'prevtesting'} onChange={handleChange}
      value={formData[`${prefix ? prefix + 'prevtesting' : 'prevtesting'}`]}
      labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
    >
      <option value="none">No Selection</option>
      <option disabled="disabled"></option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </Input>
    {hasParentMethods ? renderParentEvidence('Description of Previous Testing Associated with ' + parentName + ':', lodashGet(parentMethod, "previousTestingDescription", null)) : null}
    <Input type="textarea" label="Description of Previous Testing:" rows="5"
      name={prefix ? prefix + 'prevtestingdesc' : 'prevtestingdesc'}
      value={formData[`${prefix ? prefix + 'prevtestingdesc' : 'prevtestingdesc'}`]}
      onChange={handleChange}
      labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
    />
    {hasParentMethods ? renderParentEvidence('Answer to Genome-Wide Analysis Methods Question Associated with ' + parentName + ':',
      (lodashGet(parentMethod, "genomeWideStudy", null) === true ? 'Yes' : (lodashGet(parentMethod, "genomeWideStudy", null) === false ? 'No' : ''))) : null}
    <Input type="select"
      label="Were genome-wide analysis methods used to identify the variant(s) described in this publication?:"
      name={prefix ? prefix + 'genomewide' : 'genomewide'} 
      value={formData[`${prefix ? prefix + 'genomewide' : 'genomewide'}`]}
      onChange={handleChange}
      labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
    >
      <option value="none">No Selection</option>
      <option disabled="disabled"></option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </Input>
    <Row className="mb-3">
      <Col sm={{ span: 7, offset: 5 }}>
        <h4>Genotyping Method</h4>
      </Col>
    </Row>
    {hasParentMethods ? renderParentEvidence('Method 1 Associated with ' + parentName + ':', lodashGet(parentMethod, "genotypingMethods[0]", null)) : null}
    <Input type="select" label="Method 1:"
      name={prefix ? prefix + 'genotypingmethod1' : 'genotypingmethod1'}
      value={formData[`${prefix ? prefix + 'genotypingmethod1' : 'genotypingmethod1'}`]}
      onChange={handleChange}
      labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
    >
      <option value="none">No Selection</option>
      <option disabled="disabled"></option>
      <option value="Chromosomal microarray">Chromosomal microarray</option>
      <option value="Denaturing gradient gel">Denaturing gradient gel</option>
      <option value="Exome sequencing">Exome sequencing</option>
      <option value="Genotyping">Genotyping</option>
      <option value="High resolution melting">High resolution melting</option>
      <option value="Homozygosity mapping">Homozygosity mapping</option>
      <option value="Linkage analysis">Linkage analysis</option>
      <option value="Next generation sequencing panels">Next generation sequencing panels</option>
      <option value="Other">Other</option>
      <option value="PCR">PCR</option>
      <option value="Restriction digest">Restriction digest</option>
      <option value="Sanger sequencing">Sanger sequencing</option>
      <option value="SSCP">SSCP</option>
      <option value="Whole genome shotgun sequencing">Whole genome shotgun sequencing</option>
    </Input>
    {hasParentMethods ? renderParentEvidence('Method 2 Associated with ' + parentName + ':', lodashGet(parentMethod, "genotypingMethods[1]", null)) : null}
    <Input type="select" label="Method 2:"
      name={prefix ? prefix + 'genotypingmethod2' : 'genotypingmethod2'}
      value={formData[`${prefix ? prefix + 'genotypingmethod2' : 'genotypingmethod2'}`]}
      onChange={handleChange}
      labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
      disabled={genotyping2Disabled}
    >
      <option value="none">No Selection</option>
      <option disabled="disabled"></option>
      <option value="Chromosomal microarray">Chromosomal microarray</option>
      <option value="Denaturing gradient gel">Denaturing gradient gel</option>
      <option value="Exome sequencing">Exome sequencing</option>
      <option value="Genotyping">Genotyping</option>
      <option value="High resolution melting">High resolution melting</option>
      <option value="Homozygosity mapping">Homozygosity mapping</option>
      <option value="Linkage analysis">Linkage analysis</option>
      <option value="Next generation sequencing panels">Next generation sequencing panels</option>
      <option value="Other">Other</option>
      <option value="PCR">PCR</option>
      <option value="Restriction digest">Restriction digest</option>
      <option value="Sanger sequencing">Sanger sequencing</option>
      <option value="SSCP">SSCP</option>
      <option value="Whole genome shotgun sequencing">Whole genome shotgun sequencing</option>
    </Input>
    {hasParentMethods ? renderParentEvidence('Description of genotyping method Associated with ' + parentName + ':', lodashGet(parentMethod, "specificMutationsGenotypedMethod", null)) : null}
    <Input type="textarea" name={prefix ? prefix + 'specificmutation' : 'specificmutation'}
      groupClassName="row mb-3" rows="5" onChange={handleChange}
      value={formData[`${prefix ? prefix + 'specificmutation' : 'specificmutation'}`]} placeholder={specificMutationPlaceholder}
      label="Description of genotyping method:" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
    />
    {isFamily ?
      <Input type="textarea" name={prefix ? prefix + 'additionalinfomethod' : 'additionalinfomethod'}
        groupClassName="row mb-3" rows="5" onChange={handleChange}
        value={formData["additionalinfomethod"]}
        label="Additional Information about Family Method:" labelClassName="col-sm-5 control-label"
        wrapperClassName="col-sm-7"
      />
    : null}
    </>
  );
};

// Create method object based on the form values
export const createMethod = (formData, prefix = "") => {
  let newMethod = {};
  let value1, value2;

  // Put together a new 'method' object
  value1 = formData[prefix ? prefix + 'prevtesting' : 'prevtesting'];
  if (value1 !== 'none') {
    newMethod.previousTesting = value1 === 'Yes';
  }
  value1 = formData[prefix ? prefix + 'prevtestingdesc' : 'prevtestingdesc'];
  if (value1) {
    newMethod.previousTestingDescription = value1;
  }
  value1 = formData[prefix ? prefix + 'genomewide' : 'genomewide'];
  if (value1 !== 'none') {
    newMethod.genomeWideStudy = value1 === 'Yes';
  }
  value1 = formData[prefix ? prefix + 'genotypingmethod1' : 'genotypingmethod1'];
  value2 = formData[prefix ? prefix + 'genotypingmethod2' : 'genotypingmethod2'];
  if (value1 !== 'none' || value2 !== 'none') {
    newMethod.genotypingMethods = [value1, value2].filter(val => val !== 'none');
  }
  value1 = formData[prefix ? prefix + 'specificmutation' : 'specificmutation'];
  if (value1) {
    newMethod.specificMutationsGenotypedMethod = value1;
  }
  value1 = formData[prefix ? prefix + 'additionalinfomethod' : 'additionalinfomethod'];
  if (value1) {
    newMethod.additionalInformation = value1;
  }
  newMethod.dateTime = moment().format();

  return Object.keys(newMethod).length ? newMethod : null;
};
