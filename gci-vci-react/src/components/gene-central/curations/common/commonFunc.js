import React from 'react';
import { Row, Col } from "react-bootstrap";
import { get as lodashGet } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import Popover from "../../../common/Popover";
import Alert from '../../../common/Alert';


/**
 * Returns a snippet of JSX to be inserted where you need to give the user
 * information about creating labels and not including private health
 * information (PHI) in those labels.
 *
 * @param {String} label - one of Individual, Family, Group, etc.
 * @returns {JSX.Element} - note with label inserted
 */
export const renderLabelNote = (label) => {
  return (
    <span className="curation-label-note">
      Note: Do not enter real names in this field. Please enter a label to help
      you keep track of this {label} within the interface. We suggest using the
      first author's last name and then the case descriptor used in the paper
      (e.g. Smith Case 5). <b>DO NOT</b> reuse the identifier for another piece
      of evidence within the curation.
    </span>
  );
};

/**
 * Returns a snippet of JSX to be inserted where you need a note that tells the
 * user to enter phenotypes.
 *
 * @author Liam Mulhall
 * @param {String} label - one of Individual, Family, or Group
 * @returns {JSX.Element} - note with label inserted
 */
export const addPhenotypeNote = (label) => {
  return (
    <p>
      Enter <span className="serious-text">phenotypes that are NOT present
      in {label}</span> if they are specifically noted in the paper.
    </p>
  );
}

// Pull values from a list of comma-separated values that match the regular expression given in 're'.
// If resulting values should be converted to uppercase, pass true in 'uppercase'.
const getIdsFromList = (list, re, uppercase = false) => {
  if (list && list.length) {
    let newList = {};
    const rawList = list.split(',');
    if (rawList && rawList.length) {
      newList = rawList.map((item) => {
        const m = re.exec(item);
        return m ? (uppercase ? m[1].toUpperCase() : m[1]) : null;
      });
    }
    return newList;
  }
  return null;
};

/**
 * Pull values from a list of comma-separated values that do not match
 * the regular expression given in 're'.
 *
 * @param {string} list - comma-separated values
 * @param {string} re - given regular expression
 * @Returns {array} - array of invalid values
 */
const getInvalidIdsFromList = (list, re) => {
  if (list && list.length) {
    const rawList = list.split(',');
    const badList = rawList.filter(item => {
      return re.exec(item) === null;
    });
    return badList;
  }
  return null;
};

// Find all the comma-separated invalid PMID occurrences. Return all invalid PMIDs in an array.
export const getInvalidPmidsFromList = (list) => {
  return getInvalidIdsFromList(list, /^\s*([1-9]{1}\d*)\s*$/);
};

// Find all the comma-separated PMID occurrences. Return all valid PMIDs in an array.
export const getPmidsFromList = (list) => {
  return getIdsFromList(list, /^\s*([1-9]{1}\d*)\s*$/);
};

// Find all the comma-separated invalid gene-symbol occurrences. Return all invalid symbols in an array.
export const getInvalidGenesFromList = (list) => {
  return getInvalidIdsFromList(list, /^\s*([\w-]+)\s*$/, true);
};

// Find all the comma-separated gene-symbol occurrences. Return all valid symbols in an array.
export const getGenesFromList = (list) => {
  return getIdsFromList(list, /^\s*([\w-]+)\s*$/, true);
};

// Find all the comma-separated HPO ID occurrences. Return all valid HPO ID in an array.
export const getHpoIdsFromList = (list) => {
  return getIdsFromList(list, /^\s*(HP:\d{7})\s*$/i, true);
};

// Find all the comma-separated Uberon ID occurrences. Return all valid Uberon ID in an array.
export const getUberonIdsFromList = (list) => {
  return getIdsFromList(list, /^\s*((UBERON_|UBERON:)\d{7})\s*$/i, true);
};

// Find all the comma-separated HPO/MP ID occurrences. Return all valid HPO/MP ID in an array.
export const getHpoMpIdsFromList = (list) => {
  return getIdsFromList(list, /^\s*((HP:|MP:)\d{7})\s*$/i, true);
};

// Find all the comma-separated GO_Slim ID occurrences. Return all valid GO_Slim ID in an array.
export const getGoSlimIdsFromList = (list) => {
  return getIdsFromList(list, /^\s*(GO:\d{7})\s*$/i, true);
};

// Find all the comma-separated EFO ID occurrences. Return all valid EFO IDs in an array.
export const getEfoIdsFromList = (list) => {
  return getIdsFromList(list, /^\s*((EFO_|EFO:)\d{7})\s*$/i, true);
};

// Find all the comma-separated CL Ontology ID occurrences. Return all valid Uberon ID in an array.
export const getCloIdsFromList = (list) => {
  return getIdsFromList(list, /^\s*((CL_|CL:)\d{7})\s*$/i, true);
};

// Find all the comma-separated EFO/CLO ID occurrences. Return all valid EFO/CLO IDs in an array.
export const getEfoCloIdsFromList = (list) => {
  return getIdsFromList(list, /^\s*((EFO_|EFO:|CL_|CL:)\d{7})\s*$/i, true);
};

// HTML labels for inputs follow.
// not if true to show 'NOT' version of label
export const renderLabelPhenoTerms = (not) => {
  return (
    <label>
      <span>
        {not ? <span className="emphasis"><span className="serious-text">NOT Phenotype(s)</span>&nbsp;</span> : <span>Phenotype(s) in Common&nbsp;</span>}
          (<span className="normal">free text</span>):
      </span>
    </label>
  );
};

export const renderHPOList = (hpoList) => {
  // expect hpoList is array of hpo term
  return (
    <>
    {hpoList && hpoList.map((hpo, i) => {
      let id = hpo.match(/HP:\d{7}/g);
      return <span key={hpo}>{i > 0 ? ', ' : ''}<ExternalLink href={EXTERNAL_API_MAP['HPO'] + id} title={"HPO Browser entry for " + hpo + " in new tab"}>{hpo}</ExternalLink></span>;
    })}
    </>
  );
};

export const renderPMIDList = (pmidList) => {
  // expect pmidList is array of pmid
  return (
    <>
      {pmidList && pmidList.map((id, i) => {
        return <span key={i}>{i > 0 ? ', ' : ''}<ExternalLink href={EXTERNAL_API_MAP['PubMed'] + id} title={`PubMed entry for PMID:${id} in new tab`}>PMID:{id}</ExternalLink></span>;
      })}
    </>
  );
};

// Given an array of group or families in 'objList', render a list of IDs for all diseases in those
// groups or families.
export const renderDiseaseList = (objList, title) => {
  return (
    <div>
      {objList && objList.length ?
        <div>
          {objList.map(obj => {
            return (
              <Row key={obj.PK} className="form-group">
                <Col sm="5">
                  <strong className="float-right">Disease(s) Associated with {title}:</strong>
                </Col>
                <Col sm="7">
                  <strong>
                    {(obj.commonDiagnosis && obj.commonDiagnosis.length > 0) ?
                      obj.commonDiagnosis.map((disease, i) => {
                        const diseaseName = disease && disease.term && !disease.freetext
                          ? (disease.term + (disease.PK ? ` (${disease.PK})` : ''))
                          : (disease.term ? disease.term : '');
                        return (
                          <span key={disease.PK}>
                            {i > 0 ? ', ' : ''}
                            {diseaseName}
                          </span>
                        );
                      })
                      :
                      <span>&nbsp;</span>
                    }
                  </strong>
                </Col>
              </Row>
            );
          })}
        </div>
        : null
      }
    </div>
  );
};

// Given an array of group or families in 'objList', render a list of HPO IDs and/or Phenotype free text in those groups and familes.
export const renderPhenotype = (objList, title, type = '', parentObjName) => {
  return (
    <div>
      {type === 'hpo' || type === '' ? <Col sm="5">&nbsp;</Col> : null}
      {title === 'Experimental' && (type === 'hpo' || type === '') ?
        <Col sm={{ span: 7, offset: 5 }} className="alert alert-warning">
          <p style={{ 'marginBottom': '10px' }}>
            Please enter the relevant phenotypic feature(s) <strong>(required)</strong> using the Human Phenotype Ontology (HPO)
            terms wherever possible (e.g. HP:0010704, HP:0030300). If you are unable to find an appropriate HPO term, use the free text box instead.
            Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
          </p>
        </Col>
        : null}
      {title === 'Family' && (type === 'hpo' || type === '') ?
        <Col sm={{ span: 7, offset: 5 }}>
          <p style={{ 'marginBottom': '10px' }}>
            Please enter the relevant phenotypic feature(s) of the Family using the Human Phenotype Ontology (HPO)
            terms wherever possible (e.g. HP:0010704, HP:0030300).
            If no HPO code exists for a particular feature, please describe it in the free text box instead.
          </p>
        </Col>
        : null}
      {title === 'Individual' && (type === 'hpo' || type === '') ?
        <Col sm={{ span: 7, offset: 5 }}>
          <p style={{ 'marginBottom': '10px' }}>
            Please enter the relevant phenotypic feature(s) of the Individual using the Human Phenotype Ontology (HPO)
            terms wherever possible (e.g. HP:0010704, HP:0030300).
            If no HPO code exists for a particular feature, please describe it in the free text box instead.
          </p>
        </Col>
        : null}
      {objList && objList.length ?
        <div>
          {objList.map(obj => {
            return (
              <Row key={obj.PK} className="form-group">
                <Col sm="5">
                  {(type === 'hpo' || type === 'ft') ? <strong className="float-right">Phenotype(s) Associated with {parentObjName ? parentObjName : title}
                    {type === 'hpo' ? <span style={{ fontWeight: 'normal' }}> (<ExternalLink href={EXTERNAL_API_MAP['HPOBrowser']} title="Open HPO Browser in a new tab">HPO</ExternalLink> ID(s))</span> : null}
                    {type === 'ft' ? <span style={{ fontWeight: 'normal' }}> (free text)</span> : null}
                  :</strong> : null}
                  {(type === 'nothpo' || type === 'notft') ? <strong className="float-right">NOT Phenotype(s) Associated with {parentObjName ? parentObjName : title}
                    {type === 'nothpo' ? <span style={{ fontWeight: 'normal' }}> (<ExternalLink href={EXTERNAL_API_MAP['HPOBrowser']} title="Open HPO Browser in a new tab">HPO</ExternalLink> ID(s))</span> : null}
                    {type === 'notft' ? <span style={{ fontWeight: 'normal' }}> (free text)</span> : null}
                  :</strong> : null}
                </Col>
                <Col sm="7">
                  {(type === 'hpo' || type === '') && (obj.hpoIdInDiagnosis && obj.hpoIdInDiagnosis.length > 0) ?
                    obj.hpoIdInDiagnosis.map((hpoid, i) => {
                      return (
                        <span key={hpoid}>
                          {hpoid}
                          {i < obj.hpoIdInDiagnosis.length - 1 ? ', ' : ''}
                          {i === obj.hpoIdInDiagnosis.length - 1 && obj.termsInDiagnosis && type === '' ? '; ' : null}
                        </span>
                      );
                    })
                    : null
                  }
                  {(type === 'nothpo' || type === '') && (obj.hpoIdInElimination && obj.hpoIdInElimination.length > 0) ?
                    obj.hpoIdInElimination.map((nothpoid, i) => {
                      return (
                        <span key={nothpoid}>
                          {nothpoid}
                          {i < obj.hpoIdInElimination.length - 1 ? ', ' : ''}
                          {i === obj.hpoIdInElimination.length - 1 && obj.termsInElimination && type === '' ? '; ' : null}
                        </span>
                      );
                    })
                    : null
                  }
                  {type === 'ft' && obj.termsInDiagnosis ?
                    <span>{obj.termsInDiagnosis}</span>
                    :
                    null
                  }
                  {type === 'notft' && obj.termsInElimination ?
                    <span>{obj.termsInElimination}</span>
                    :
                    null
                  }
                </Col>
              </Row>
            );
          })}
        </div>
        : null}
    </div>
  );
};

// Render a single item of evidence data (demographics, methods, etc.) from a "parent" group or family
export const renderParentEvidence = (label, value) => {
  return (
    <>
      <Row className="form-group parent-evidence">
        <Col sm="5" className="control-label">
          <label>{label}</label>
        </Col>
        <Col sm="7">
          {value ? <span>{value}</span> : null}
        </Col>
      </Row>
    </>
  );
}

// Generate a display version (string) of the allele frequency (preferring fixed-point notation over exponential)
export const displayAlleleFrequency = (alleleFrequency) => {
  let alleleFreqDisplay = (alleleFrequency > 0 || alleleFrequency < 0) ? alleleFrequency.toFixed(5) : '0';

  // If there are no non-zero digits when using fixed-point notation (to 5 decimal places), switch to exponential
  if (alleleFreqDisplay.match(/^0+\.0+$/)) {
    alleleFreqDisplay = alleleFrequency.toExponential(2);

    // If there are more than 5 digits in the "integer part", switch to exponential
  } else if (alleleFreqDisplay.match(/^\d{6}/)) {
    alleleFreqDisplay = alleleFrequency.toExponential(2);
  }

  return alleleFreqDisplay;
}

// Generate HTML to display the allele frequency (as a fraction and a decimal number)
export const renderAlleleFrequency = (numberWithVariant, numberAllGenotypedSequenced, alleleFrequency) => {

  // Check that parameter is a non-zero number (if it's zero, only possible results of division are INF or NaN)
  if (numberAllGenotypedSequenced > 0 || numberAllGenotypedSequenced < 0) {

    // Check that parameter is a number
    if (numberWithVariant > 0 || numberWithVariant < 0 || numberWithVariant === 0) {

      // If provided allele frequency is a number, use it
      let alleleFreqDisplay = (alleleFrequency > 0 || alleleFrequency < 0 || alleleFrequency === 0)
        ? displayAlleleFrequency(Number(alleleFrequency)) : displayAlleleFrequency(numberWithVariant / numberAllGenotypedSequenced);

      return (
        <span>
          <sup>{numberWithVariant}</sup>&frasl;<sub>{numberAllGenotypedSequenced}</sub> = {alleleFreqDisplay}
        </span>
      );
    }
  }

  return;
}
export const LabelClinVarVariant = () => {
  return <span><ExternalLink href={EXTERNAL_API_MAP['ClinVar']} title="ClinVar home page at NCBI in a new tab">ClinVar</ExternalLink> Variation ID:</span>;
};

export const LabelCARVariant = () => {
  return <span><ExternalLink href={EXTERNAL_API_MAP['CAR']} title="ClinGen Allele Registry in a new tab">ClinGen Allele Registry</ExternalLink> ID:</span>;
};

export const LabelCACNVariant = () => {
  return <span><ExternalLink href={EXTERNAL_API_MAP['CAR']} title="ClinGen Allele Registry in a new tab">ClinGen Allele Registry</ExternalLink> Copy Number ID:</span>
};

/**
 * Method to render a mouseover explanation for the variant title
 */
export const renderVariantTitleExplanation = () => {
  const explanation = 'The HGVS is based on the Community Standard Title provided by the ClinGen Allele Registry, if there is no Community Standard Title, then the ClinVar Preferred Title is used. If there is no ClinVar Preferred Title, then the HGVS is based on the GRCh38 genomic coordinates.';
  return (
    <span className="variant-title-explanation">
      <Popover
        triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
        content={explanation}
        placement="top"
      />
    </span>
  );
};

export const LabelVariantTitle = (variant, linkout) => {
  const clinVarVariantTitle = <span><ExternalLink href={EXTERNAL_API_MAP['ClinVar']} title="ClinVar home page at NCBI in a new tab">ClinVar</ExternalLink> Preferred Title:</span>;
  let variantLabel = "";
  if (lodashGet(variant, "clinvarVariantTitle", null)) {
    variantLabel = linkout ? clinVarVariantTitle : 'ClinVar Preferred Title:';
  } else if (lodashGet(variant, "maneTranscriptTitle", null)) {
    variantLabel = 'MANE Transcript HGVS Title:';
  } else if (lodashGet(variant, "canonicalTranscriptTitle:", null)) {
    variantLabel = 'Canonical Transcript HGVS Title:';
  } else if (lodashGet(variant, "hgvsNames", null) && (lodashGet(variant, "hgvsNames.GRCh38", null) || lodashGet(variant, "hgvsNames.GRCh37", null))) {
    variantLabel = 'Genomic HGVS Title:';
  } else {
    variantLabel = 'Community Standard Title:';
  }

  return variantLabel;
};

export const renderVariantLabelAndTitle = (variant, linkout=false, showInHeader=false) => {
  let variantLabel = LabelVariantTitle(variant, linkout);

  if (linkout) {
    return (
      <Row>
        <Col sm="5" className="control-label"><label>{variantLabel}</label></Col>
        <Col sm="7" className={lodashGet(variant, "clinvarVariantTitle", null) ? "text-no-input clinvar-preferred-title" : "text-no-input"}>{lodashGet(variant, "preferredTitle", null)}{renderVariantTitleExplanation()}</Col>
      </Row>
    );
  } else if (showInHeader) {
    return (
      <span>
        <span className="term-name">{variantLabel}: </span>
        <span className="term-value font-weight-normal">{lodashGet(variant, "preferredTitle", null)}</span>
      </span>
    );
  } else {
    return (
      <div>
        <dt className="variant-title-row">{variantLabel}</dt>
        <dd className="variant-title-row">{lodashGet(variant, "preferredTitle", null)}</dd>
      </div>
    );
  }
};

export const renderVariantOverlappingGenes = (variant) => {
  if (variant && variant.overlappingGenes) {
    return (
      <div>
        <ul>
          {variant.overlappingGenes.map((symbol, i) => {
            return (
              <li key={i}>
                {symbol}
              </li>
            );
          })}
        </ul>
      </div>
    );
  } else {
    return (
      <span> No overlapping genes available for this Copy Number Variant</span>
    );
  }
};

export const renderNotOwnerMessage = (ownerError) => {
  const errorMessage = "<strong>You are not logged in with the same affiliation as the GDM owner so cannot do any modifications.</strong>";

  if (ownerError) {
    return (<Alert value={errorMessage} type="danger" className="mt-3"/>);
  } else {
    return null;
  }
};

/**
 * Return a snippet of JSX that show PMIDs related errors using given data
 *
 * @param {string} formError - input form error message
 * @param {array} badPmids - bad PubMed ID list
 * @param {array} preprintPmids - preprint PubMed ID list
 * @returns {JSX.Element} - PMIDs related errors
 */
export const renderPmidsErrorMessage = (formError=null, badPmids=[], preprintPmids=[]) => {
  if (formError || badPmids?.length || preprintPmids?.length) {
    const prePrintText = "Preprint is not supported, please remove.";
    return (
      <>
        {formError ? formError : null}
        {badPmids.length
          ? <div>PMID(s): {badPmids.join(', ')} cannot be found.</div>
          : null
        }
        {preprintPmids.length
          ? <span>Prepint(s): {preprintPmids.join(', ')}. {prePrintText}</span>
          : null
        }
      </>
    );
  } else {
    return null;
  }
}

/**
 * Return boolean flag if given GDM's MOI is "Semidominant" or
 * "Typified by somatic mosaicism"
 *
 * @param {object} gdm - GDM object
 * @returns {boolean} - true if MOI is matched else false
 */
export const isSemiOrSMo = (gdm) => {
  const result = gdm && gdm.modeInheritance
    ? (gdm.modeInheritance.indexOf('Semidominant') > -1
      || gdm.modeInheritance.indexOf('somatic mosaicism') > -1)
    : false;

  return result;
}

/**
 * Return boolean flag if given GDM's MOI is "Autosomal dominant"
 *
 * @param {object} gdm - GDM object
 * @returns {boolean} - true if MOI is matched else false
 */
export const isAutoDom = (gdm) => {
  const result = gdm && gdm.modeInheritance
    ? gdm.modeInheritance.indexOf('Autosomal dominant') > -1
    : false;

  return result;
}

/**
 * Return boolean flag if given GDM's MOI is "Autosomal recessive"
 *
 * @param {object} gdm - GDM object
 * @returns {boolean} - true if MOI is matched else false
 */
export const isAutoRec = (gdm) => {
  const result = gdm && gdm.modeInheritance
    ? gdm.modeInheritance.indexOf('Autosomal recessive') > -1
    : false;

  return result;
}

/**
 * Return boolean flag if given GDM's MOI is "X-linked inheritance"
 *
 * @param {object} gdm - GDM object
 * @returns {boolean} - true if MOI is matched else false
 */
export const isXLinked = (gdm) => {
  const result = gdm && gdm.modeInheritance
    ? gdm.modeInheritance.indexOf('X-linked inheritance') > -1
    : false;

  return result;
}
