import React from 'react';
import { Jumbotron, Container, Row, Col } from "react-bootstrap";
import { useSelector } from 'react-redux'
import { get as lodashGet } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import CardPanel from "../../../common/CardPanel";
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import LoadingSpinner from '../../../common/LoadingSpinner';
import { getEvidenceByPKFromActiveAnnotation } from "../../../../utilities/gdmEvidenceUtilities";
import { getUserName } from "../../../../helpers/getUserName";
import { renderHPOList, renderPMIDList, renderVariantLabelAndTitle } from '../common/commonFunc';
import { Link } from 'react-router-dom';

export const FamilyView = ({
  family
}) => {

  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotations = useSelector(state => state.annotations);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  });
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);

  const method = lodashGet(family, "method", null);
  const group = lodashGet(family, "associatedGroups", null) && family.associatedGroups.length > 0
    ? getEvidenceByPKFromActiveAnnotation(annotations, family.associatedGroups[0])
    : null;
  const segregation = lodashGet(family, "segregation", null);
  
  // SOP8 - variants are stored in family proband individual
  // See if any associated individual is a proband
  // Should only have one proband individual, do not assume it's the first one in individualIncluded list
  let familyProbandIndList = [];
  let familyProbandInd = null
  if (family && family.individualIncluded && family.individualIncluded.length) {
    (family.individualIncluded).forEach(indivPK => {
      const indiv = getEvidenceByPKFromActiveAnnotation(annotations, indivPK);
      if (indiv.proband) {
        familyProbandIndList = [...familyProbandIndList, indiv];
      }
    });
    familyProbandInd = familyProbandIndList && familyProbandIndList.length ? familyProbandIndList[0] : null;
  }
  const variantScores = (familyProbandInd || {}).variantScores;

  // Get assessments from segregation object
  const assessments = lodashGet(segregation, "assessments", null);
  const validAssessments = assessments && assessments.length
    ? assessments.filter(assessment => assessment.value !== 'Not Assessed')
    : [];

  const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;


  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : family ? (
    <div>
      <Container>
        <Row className="curation-content-viewer"><Col sm="12">
          <div className="viewer-titles">
            <h1>View Family: {family.label}</h1>
            <h2>
              {gdm && gdm.PK && annotation && annotation.PK ? <Link to={`/curation-central/${gdm.PK}/annotation/${annotation.PK}`}><FontAwesomeIcon icon={faBriefcase}/></Link> : null}

              {gdm && gdm.PK && annotation && annotation.PK && group ?
                <span> &#x2F;&#x2F; Group <span key={group.PK}><Link to={`/curation-central/${gdm.PK}/annotation/${annotation.PK}/group-curation/${group.PK}/view`}>{group.label}</Link></span></span>
                : null}
              <span> &#x2F;&#x2F; Family {family.label}</span>
            </h2>
          </div>
          <CardPanel title="Common Disease(s) & Phenotype(s)" className="panel-data">
            <dl className="dl-horizontal">
              <div>
                <dt>Common Diagnosis</dt>
                <dd>{family.commonDiagnosis && family.commonDiagnosis.length && family.commonDiagnosis.map((disease, i) => {
                  return <span key={disease.PK}>{i > 0 ? ', ' : ''}{disease.term} {!disease.freetext ? <ExternalLink href={EXTERNAL_API_MAP['MondoSearch'] + disease.PK}>{disease.PK.replace('_', ':')}</ExternalLink> : null}</span>;
                })}</dd>
              </div>

              <div>
                <dt>HPO IDs</dt>
                <dd>{family.hpoIdInDiagnosis && renderHPOList(family.hpoIdInDiagnosis)}</dd>
              </div>

              <div>
                <dt>Phenotype Terms</dt>
                <dd>{family.termsInDiagnosis}</dd>
              </div>

              <div>
                <dt>NOT HPO IDs</dt>
                <dd>{family.hpoIdInElimination && renderHPOList(family.hpoIdInElimination)}</dd>
              </div>

              <div>
                <dt>NOT phenotype terms</dt>
                <dd>{family.termsInElimination}</dd>
              </div>
            </dl>
          </CardPanel>

          <CardPanel title="Family — Demographics" panelClassName="panel-data">
            <dl className="dl-horizontal">
              <div>
                <dt>Country of Origin</dt>
                <dd>{family.countryOfOrigin}</dd>
              </div>

              <div>
                <dt>Ethnicity</dt>
                <dd>{family.ethnicity}</dd>
              </div>

              <div>
                <dt>Race</dt>
                <dd>{family.race}</dd>
              </div>
            </dl>
          </CardPanel>

          <CardPanel title="Family — Methods" panelClassName="panel-data">
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

              <div>
                <dt>Additional Information about Family Method</dt>
                <dd>{method && method.additionalInformation}</dd>
              </div>
            </dl>
          </CardPanel>

          {renderFamilySegregationView(segregation)}

          {/* Display pre-existing assessments data */}
          {validAssessments && validAssessments.length > 0 ?
            <div className="card card-panel mb-4">
              <div className="card-body">
                <dl className="dl-horizontal">
                  <div>
                    <dt>Assessments</dt>
                    <dd>
                      {validAssessments.map((assessment, i) => (
                        <span key={assessment.PK}>
                          {i > 0 ? <br /> : null}
                          {assessment.value + ' (' + getUserName(assessment.submitted_by) + ')'}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            : null
          }

          <CardPanel title="Family - Variant(s) Segregating with Proband" panelClassName="panel-data">
            {family.individualIncluded && family.individualIncluded.length ?
              <div>
                {family.individualIncluded.map((indivPK, index) => {
                  const indivObj = getEvidenceByPKFromActiveAnnotation(annotations, indivPK);
                  return (
                    <div key={index}>
                      {semiDom ?
                        <dl className="dl-horizontal">
                          <dt>The proband is</dt>
                          <dd>{indivObj.probandIs}</dd>
                        </dl>
                        :
                        <dl className="dl-horizontal">
                          <dt>Zygosity</dt>
                          <dd>{indivObj.proband && indivObj.recessiveZygosity ? indivObj.recessiveZygosity : "None selected"}</dd>
                        </dl>
                      }
                    </div>
                  );
                })}
              </div>
              : null }
            {variantScores && variantScores.length > 0 ?
              <>
              {variantScores.map((variantScore, i) => {
                const variant = variantScore.variantScored;
                return (
                  <div className="variant-view-panel" key={lodashGet(variant, "PK", null) ? variant.PK : i}>
                    <h5>Variant {i + 1}</h5>
                    <dl className="dl-horizontal">
                      {lodashGet(variant, "clinvarVariantId", null) ?
                        <div>
                          <dt>ClinVar Variation ID</dt>
                          <dd><ExternalLink href={`${EXTERNAL_API_MAP['ClinVarSearch']}${variant.clinvarVariantId}`} title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`}>{variant.clinvarVariantId}</ExternalLink></dd>
                        </div>
                        : null }
                      {lodashGet(variant, "carId", null) ?
                        <div>
                          <dt>ClinGen Allele Registry ID</dt>
                          <dd><ExternalLink href={`${EXTERNAL_API_MAP['CARallele']}${variant.carId}.html`} title={`ClinGen Allele Registry entry for ${variant.carId} in new tab`}>{variant.carId}</ExternalLink></dd>
                        </div>
                        : null }
                      {renderVariantLabelAndTitle(variant)}
                      {lodashGet(variant, "otherDescription", null) ?
                        <div>
                          <dt>Other description</dt>
                          <dd>variant.otherDescription}</dd>
                        </div>
                        : null }
                    </dl>
                  </div>
                );
              })}
            </>
            : null}
          </CardPanel>

          <CardPanel title="Family — Additional Information" panelClassName="panel-data">
            <dl className="dl-horizontal">
              <div>
                <dt>Additional Information about Family</dt>
                <dd>{family.additionalInformation}</dd>
              </div>
  
              <dt>Other PMID(s) that report evidence about this same Family</dt>
              <dd>{family.otherPMIDs && renderPMIDList(family.otherPMIDs)}</dd>
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

const renderFamilySegregationView = (segregation) => {
  return (
    <CardPanel title="Family — Segregation" panelClassName="panel-data">
      <dl className="dl-horizontal">
        <div>
          <dt>Number of AFFECTED individuals with genotype</dt>
          <dd>{segregation && segregation.numberOfAffectedWithGenotype}</dd>
        </div>

        <div>
          <dt>Number of UNAFFECTED individuals without the biallelic genotype</dt>
          <dd>{segregation && segregation.numberOfUnaffectedWithoutBiallelicGenotype}</dd>
        </div>

        <div>
          <dt>Number of segregations reported for this family</dt>
          <dd>{segregation && segregation.numberOfSegregationsForThisFamily}</dd>
        </div>

        <div>
          <dt>Inconsistent segregations amongst TESTED individuals</dt>
          <dd>{segregation && segregation.inconsistentSegregationAmongstTestedIndividuals}</dd>
        </div>

        <div>
          <dt>Explanation for the inconsistent segregations</dt>
          <dd>{segregation && segregation.explanationForInconsistent}</dd>
        </div>

        <div>
          <dt>Which mode of inheritance does this family display?</dt>
          <dd>{segregation && segregation.moiDisplayedForFamily}</dd>
        </div>

        <div>
          <dt>Does the family meet requirements for estimating LOD score?</dt>
          <dd>{segregation && segregation.lodRequirements}</dd>
        </div>

        <div>
          <dt>Consanguineous family</dt>
          <dd>{segregation && segregation.familyConsanguineous}</dd>
        </div>

        <div>
          <dt>Location of pedigree in publication</dt>
          <dd>{segregation && segregation.pedigreeLocation}</dd>
        </div>

        <div>
          <dt>Published Calculated LOD score?</dt>
          <dd>{segregation && segregation.lodPublished === true ? 'Yes' : (segregation.lodPublished === false ? 'No' : '')}</dd>
        </div>

        <div>
          <dt>Published Calculated LOD score</dt>
          <dd>{segregation && segregation.publishedLodScore}</dd>
        </div>

        <div>
          <dt>Estimated LOD score</dt>
          <dd>{segregation && segregation.estimatedLodScore}</dd>
        </div>

        <div>
          <dt>Include LOD score in final aggregate calculation?</dt>
          <dd>{segregation && segregation.includeLodScoreInAggregateCalculation === true ? 'Yes' : (segregation.includeLodScoreInAggregateCalculation === false ? 'No' : '')}</dd>
        </div>

        {segregation && segregation.includeLodScoreInAggregateCalculation ?
          <div>
            <dt>Sequencing Method</dt>
            <dd>{segregation && segregation.sequencingMethod}</dd>
          </div>
          : null}

        <div>
          <dt>Reason for including LOD or not</dt>
          <dd>{segregation && segregation.reasonExplanation}</dd>
        </div>

        <div>
          <dt>Additional Segregation information</dt>
          <dd>{segregation && segregation.additionalInformation}</dd>
        </div>
      </dl>
    </CardPanel>
  );
};

