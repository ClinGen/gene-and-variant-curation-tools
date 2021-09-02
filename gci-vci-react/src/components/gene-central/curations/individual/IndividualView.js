import React from 'react';
import { Jumbotron, Container, Row, Col } from "react-bootstrap";
import { useSelector } from 'react-redux'
import { Link } from "react-router-dom";
import { get as lodashGet } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import CardPanel from "../../../common/CardPanel";
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import LoadingSpinner from '../../../common/LoadingSpinner';
import { renderHPOList, renderPMIDList, renderVariantLabelAndTitle } from '../common/commonFunc';
import VARIANT_SCORE_VARIANT_TYPES from '../../score/constants/variantScoreTypes';
import { getAffiliationName } from '../../../../helpers/get_affiliation_name.js';
import { getUserName } from '../../../../helpers/getUserName.js';
import { getEvidenceByPKFromActiveAnnotation } from "../../../../utilities/gdmEvidenceUtilities";


export const IndividualView = ({
  individual
}) => {
  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  })
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);
  const annotations = useSelector(state => state.annotations);

  /**
   * HTML labels for inputs follow.
   * @param {object} individual - Individual's data object
   * @param {string} labelText - Value of label
   * @param {boolean} hasVariant - Flag for associated variant
   */
  const getLabelPanelTitleView = (labelText, hasVariant) => {
    if (hasVariant) {
      labelText = (individual && individual.associatedFamilies && individual.associatedFamilies.length > 0 && individual.proband)
        ? 'Variant(s) and Score(s) segregating with Proband'
        : (individual && individual.proband) ? 'Associated Variant(s) and Score(s)' : 'Associated Variant(s)';
    }

    return (
      <span className="panel-title-std">
        Individual{<span>{individual && individual.proband ? <i className="icon icon-proband"></i> : null}</span>} — {labelText}
      </span>
    );
  };

  const method = lodashGet(individual, "method", null);
  // Only display the varints list if not proband individual; otherwise, that's retired data
  const variants = (!individual.proband && lodashGet(individual, "variants", null) && individual.variants.length > 0) ? individual.variants : [];
  const variantScores = (lodashGet(individual, "variantScores", null) && individual.variantScores.length > 0) ? individual.variantScores : [];
  // group is set to individual.associatedGroups[0] if exists
  let group = lodashGet(individual, "associatedGroups", null) && individual.associatedGroups.length > 0
    ? getEvidenceByPKFromActiveAnnotation(annotations, individual.associatedGroups[0])
    : null;
  // family is set to individual.associatedFamilies[0] if exists
  const family = lodashGet(individual, "associatedFamilies", null) && individual.associatedFamilies.length > 0
    ? getEvidenceByPKFromActiveAnnotation(annotations, individual.associatedFamilies[0])
    : null;
  // If individual's associated family has associated group, set this
  if (lodashGet(family, "associatedGroups", null) && family.associatedGroups.length > 0) {
    group = getEvidenceByPKFromActiveAnnotation(annotations, family.associatedGroups[0]);
  }
  let probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);

  var probandIs = individual && individual.probandIs;
  const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
  const gdmPK = lodashGet(gdm, "PK", null);
  const annotationPK = lodashGet(annotation, "PK", null);

  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : individual ? (
    <div>
      <Container>
        <Row className="curation-content-viewer"><Col sm="12">
          <div className="viewer-titles">
            <h1>View Individual: {individual.label}{probandLabel}</h1>
            <h2>
              {gdmPK && annotationPK ? <a href={`/curation-central/${gdmPK}/annotation/${annotationPK}`}><FontAwesomeIcon icon={faBriefcase}/></a> : null}
              {gdmPK && annotationPK && group ?
                <span> &#x2F;&#x2F; Group <span key={group.PK}><Link to={`/curation-central/${gdmPK}/annotation/${annotationPK}/group-curation/${group.PK}/view`}>{group.label}</Link></span></span>
                : null}
              {gdmPK && annotationPK && family ?
                <span> &#x2F;&#x2F; Family <span key={family.PK}><Link to={`/curation-central/${gdmPK}/annotation/${annotationPK}/family-curation/${family.PK}/view`}>{family.label}</Link></span></span>
                : null}
              <span> &#x2F;&#x2F; Individual {individual.label}</span>
            </h2>
          </div>
          <CardPanel title={getLabelPanelTitleView('Disease & Phenotype(s)')} className="individual-view-panel">
            <dl className="dl-horizontal">
              <div>
                <dt>Common Diagnosis</dt>
                <dd>{individual.diagnosis && individual.diagnosis.map(function(disease, i) {
                  return <span key={disease.PK}>{i > 0 ? ', ' : ''}{disease.term} {!disease.freetext ? <ExternalLink href={EXTERNAL_API_MAP['MondoSearch'] + disease.PK}>{disease.PK.replace('_', ':')}</ExternalLink> : null}</span>;
                })}</dd>
              </div>

              <div>
                <dt>HPO IDs</dt>
                <dd>{individual.hpoIdInDiagnosis && renderHPOList(individual.hpoIdInDiagnosis)}</dd>
              </div>

              <div>
                <dt>Phenotype Terms</dt>
                <dd>{individual.termsInDiagnosis}</dd>
              </div>

              <div>
                <dt>NOT HPO IDs</dt>
                <dd>{individual.hpoIdInElimination && renderHPOList(individual.hpoIdInElimination)}</dd>
              </div>

              <div>
                <dt>NOT phenotype terms</dt>
                <dd>{individual.termsInElimination}</dd>
              </div>
            </dl>
          </CardPanel>

          <CardPanel title={getLabelPanelTitleView('Demographics')} className="individual-view-panel">
            <dl className="dl-horizontal">
              <div>
                <dt>Sex</dt>
                <dd>{individual.sex}</dd>
              </div>

              <div>
                <dt>Country of Origin</dt>
                <dd>{individual.countryOfOrigin}</dd>
              </div>

              <div>
                <dt>Ethnicity</dt>
                <dd>{individual.ethnicity}</dd>
              </div>

              <div>
                <dt>Race</dt>
                <dd>{individual.race}</dd>
              </div>

              <div>
                <dt>Age Type</dt>
                <dd>{individual.ageType}</dd>
              </div>

              <div>
                <dt>Value</dt>
                <dd>{individual.ageValue}</dd>
              </div>

              <div>
                <dt>Age Unit</dt>
                <dd>{individual.ageUnit}</dd>
              </div>
            </dl>
          </CardPanel>

          <CardPanel title={getLabelPanelTitleView('Methods')} className="individual-view-panel">
            <dl className="dl-horizontal">
              <div>
                <dt>Previous testing</dt>
                <dd>{method ? (method.previousTesting === true ? 'Yes' : (method.previousTesting === false ? 'No' : '')) : ''}</dd>
              </div>

              <div>
                <dt>Description of previous testing</dt>
                <dd>{method && method.previousTestingDescription}</dd>
              </div>

              <div>
                <dt>Genome-wide study</dt>
                <dd>{method ? (method.genomeWideStudy === true ? 'Yes' : (method.genomeWideStudy === false ? 'No' : '')) : ''}</dd>
              </div>

              <div>
                <dt>Genotyping methods</dt>
                <dd>{method && method.genotypingMethods && method.genotypingMethods.join(', ')}</dd>
              </div>

              {method && (method.entireGeneSequenced === true || method.entireGeneSequenced === false) ?
                <div>
                  <dt>Entire gene sequenced</dt>
                  <dd>{method.entireGeneSequenced === true ? 'Yes' : 'No'}</dd>
                </div>
              : null}

              {method && (method.copyNumberAssessed === true || method.copyNumberAssessed === false) ?
                <div>
                  <dt>Copy number assessed</dt>
                  <dd>{method.copyNumberAssessed === true ? 'Yes' : 'No'}</dd>
                </div>
              : null}

              {method && (method.specificMutationsGenotyped === true || method.specificMutationsGenotyped === false) ?
                <div>
                  <dt>Specific mutations genotyped</dt>
                  <dd>{method.specificMutationsGenotyped === true ? 'Yes' : 'No'}</dd>
                </div>
              : null}

              <div>
                <dt>Description of genotyping method</dt>
                <dd>{method && method.specificMutationsGenotypedMethod}</dd>
              </div>
            </dl>
          </CardPanel>

          <CardPanel title={getLabelPanelTitleView('', true)} className="individual-view-panel">
            {semiDom ?
              <div>
                <dl className="dl-horizontal">
                  <dt>The proband is</dt>
                  <dd>{probandIs}</dd>
                </dl>
              </div>
            : null}
            <div>
              <dl className="dl-horizontal">
                <dt>Curator</dt>
                <dd>{individual.affiliation ? getAffiliationName(individual.affiliation) : getUserName(individual.submitted_by)}</dd>
              </dl>
              <dl className="dl-horizontal">
                <dt>Zygosity</dt>
                <dd>{individual && individual.recessiveZygosity ? individual.recessiveZygosity : "None selected"}</dd>
              </dl>
            </div>
            {variants.map((variant, i) => {
              return (
                <div key={variant.PK ? variant.PK : i} className="variant-view-panel">
                  <h5>Variant {i + 1}</h5>
                  <dl className="dl-horizontal">
                    {variant.clinvarVariantId ?
                      <div>
                        <dt>ClinVar Variation ID</dt>
                        <dd><ExternalLink href={`${EXTERNAL_API_MAP['ClinVarSearch']}${variant.clinvarVariantId}`} title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`}>{variant.clinvarVariantId}</ExternalLink></dd>
                      </div>
                    : null }
                    {variant.carId ?
                      <div>
                        <dt>ClinGen Allele Registry ID</dt>
                        <dd><ExternalLink href={`${EXTERNAL_API_MAP['CARallele']}${variant.carId}.html`} title={`ClinGen Allele Registry entry for ${variant.carId} in new tab`}>{variant.carId}</ExternalLink></dd>
                      </div>
                    : null }
                    {renderVariantLabelAndTitle(variant)}
                    {variant.otherDescription ?
                      <div>
                        <dt>Other description</dt>
                        <dd>{variant.otherDescription}</dd>
                      </div>
                    : null }
                  </dl>
                </div>
              );
            })}

            {variantScores.map((variantScore, i) => {
              const variant = variantScore.variantScored;
              return (
                <div key={variant.PK ? variant.PK : i} className="variant-view-panel">
                  <h5>Variant {i + 1}</h5>
                  <dl className="dl-horizontal">
                    {variant.clinvarVariantId ?
                      <div>
                        <dt>ClinVar Variation ID</dt>
                        <dd><ExternalLink href={`${EXTERNAL_API_MAP['ClinVarSearch']}${variant.clinvarVariantId}`} title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`}>{variant.clinvarVariantId}</ExternalLink></dd>
                      </div>
                    : null }
                    {variant.carId ?
                      <div>
                        <dt>ClinGen Allele Registry ID</dt>
                        <dd><ExternalLink href={`${EXTERNAL_API_MAP['CARallele']}${variant.carId}.html`} title={`ClinGen Allele Registry entry for ${variant.carId} in new tab`}>{variant.carId}</ExternalLink></dd>
                      </div>
                    : null }
                    {renderVariantLabelAndTitle(variant)}
                    {variant.otherDescription ?
                      <div>
                        <dt>Other description</dt>
                        <dd>{variant.otherDescription}</dd>
                      </div>
                    : null }
                    {variantScore.variantType ?
                      <div>
                        <dt>Variant type</dt>
                        <dd>{VARIANT_SCORE_VARIANT_TYPES[variantScore.variantType]}</dd>
                      </div>
                    : null }
                    {variantScore.deNovo ?
                      <div>
                        <dt>Is this variant de novo?</dt>
                        <dd>{variantScore.deNovo}</dd>
                      </div>
                    : null }
                    {variantScore.maternityPaternityConfirmed ?
                      <div>
                        <dt>If variant is de novo, is the variant maternity and paternity confirmed?</dt>
                        <dd>{variantScore.maternityPaternityConfirmed}</dd>
                      </div>
                    : null }
                    {variantScore.functionalDataSupport ?
                      <div>
                        <dt>Is there functional data to support this variant?</dt>
                        <dd>{variantScore.functionalDataSupport}</dd>
                      </div>
                    : null }
                    {variantScore.functionalDataExplanation ?
                      <div>
                        <dt>If there is functional data to support, please describe functional data</dt>
                        <dd>{variantScore.functionalDataExplanation}</dd>
                      </div>
                    : null }
                    {variantScore.scoreStatus ?
                      <div>
                        <dt>Score Status</dt>
                        <dd>{variantScore.scoreStatus}</dd>
                      </div>
                    : null }
                    {variantScore.calculatedScore ?
                      <div>
                        <dt>Default Score</dt>
                        <dd>{variantScore.calculatedScore}</dd>
                      </div>
                    : null }
                    {variantScore.score ?
                      <div>
                        <dt>Changed Score</dt>
                        <dd>{variantScore.score}</dd>
                      </div>
                    : null}
                    {variantScore.scoreExplanation ?
                      <div>
                        <dt>Reason(s) for score change</dt>
                        <dd>{variantScore.scoreExplanation}</dd>
                      </div>
                    : null}
                  </dl>
                </div>
              );
            })}
          </CardPanel>

          <CardPanel title={getLabelPanelTitleView('Additional Information')} className="individual-view-panel">
            <dl className="dl-horizontal">
              <div>
                <dt>Additional Information about Individual</dt>
                <dd>{individual.additionalInformation}</dd>
              </div>

              <dt>Other PMID(s) that report evidence about this same Individual</dt>
              <dd>{individual.otherPMIDs && renderPMIDList(individual.otherPMIDs)}</dd>
            </dl>
          </CardPanel>

        </Col></Row>
      </Container>
    </div>
  ) : (
    <Jumbotron>
      <Container>
        <h2>Family not found</h2>
      </Container>
    </Jumbotron>
  );
};
