import React  from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { default as lodashGet } from 'lodash/get';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from '../../../common/ExternalLink';
import { renderVariantLabelAndTitle } from '../common/commonFunc';
import CardPanel from '../../../common/CardPanel';

import ScoreViewer from '../../score/ScoreViewer';
import { getAffiliationScore } from '../../score/helpers/getAffiliationScore';


const ExperimentalView = ({
  experimentalData = {},
}) => {
  const auth = useSelector((state) => state.auth);
  const gdm = useSelector((state) => state.gdm.entity);
  const annotation = useSelector((state) => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  });

  const handleSearchLinkById = (id) => {
    let searchURL;
    if (id.indexOf('EFO') > -1) {
      searchURL = EXTERNAL_API_MAP['EFOSearch'];
    } else if (id.indexOf('CL') > -1) {
      searchURL = EXTERNAL_API_MAP['CLSearch'];
    }
    return searchURL;
  };

  const msPhenotypeHpoObserved = experimentalData && experimentalData.modelSystems && experimentalData.modelSystems.phenotypeHPOObserved
    ? experimentalData.modelSystems.phenotypeHPOObserved.split(', ')
    : [];
  const msPhenotypeHpo = experimentalData && experimentalData.modelSystems && experimentalData.modelSystems.phenotypeHPO
    ? experimentalData.modelSystems.phenotypeHPO.split(', ')
    : [];
  const resPhenotypeHpo = experimentalData && experimentalData.rescue && experimentalData.rescue.phenotypeHPO
    ? experimentalData.rescue.phenotypeHPO.split(', ')
    : [];
    const assessments = experimentalData && experimentalData.assessments && experimentalData.assessments.length
    ? experimentalData.assessments
    : [];
  const validAssessments = assessments && assessments.length
    ? assessments.filter(assessment => assessment.value !== 'Not Assessed')
    : [];
  const evidenceScores = experimentalData && experimentalData.scores && experimentalData.scores.length
    ? experimentalData.scores
    : [];

  // Get evidenceScore object for gdm associated affiliation if exists
  let matchedScore = null;
  if (evidenceScores.length > 0) {
    matchedScore = getAffiliationScore(evidenceScores, lodashGet(gdm, "affiliation", null));
  }

  return (experimentalData ? (
    <div>
      <Container>
        <Row className="curation-content-viewer">
          <Col sm="12">
            <div className="viewer-titles">
              <h1>View Experimental Data {experimentalData.label}</h1>
              <h2>
                {gdm && gdm.PK && annotation && annotation.PK &&
                  <Link to={`/curation-central/${gdm.PK}/annotation/${annotation.PK}`}>
                    <i className="icon icon-briefcase" />
                  </Link>
                }
                <span> &#x2F;&#x2F; Experimental Data {experimentalData.label} ({experimentalData.evidenceType})</span>
              </h2>
            </div>
            {experimentalData.evidenceType === 'Biochemical Function' &&
            experimentalData.biochemicalFunction &&
              <CardPanel title="Biochemical Function" bodyClass="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">Identified function of gene in this record</dt>
                    <dd>
                      {experimentalData.biochemicalFunction.identifiedFunction &&
                        <ExternalLink
                          href={EXTERNAL_API_MAP['GOSearch'] + experimentalData.biochemicalFunction.identifiedFunction.replace(':', '_')}
                          title={"GO entry for " + experimentalData.biochemicalFunction.identifiedFunction + " in new tab"}
                        >
                          {experimentalData.biochemicalFunction.identifiedFunction}
                        </ExternalLink>
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Identified function of gene in this record (free text)</dt>
                    <dd>
                      {experimentalData.biochemicalFunction.identifiedFunctionFreeText &&
                        experimentalData.biochemicalFunction.identifiedFunctionFreeText
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Evidence for above function</dt>
                    <dd>{experimentalData.biochemicalFunction.evidenceForFunction}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Notes on where evidence found in paper</dt>
                    <dd>{experimentalData.biochemicalFunction.evidenceForFunctionInPaper}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.evidenceType === 'Biochemical Function' && experimentalData.biochemicalFunction && 
            experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease &&
            experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction &&
            experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction !== '' &&
              <CardPanel title="A. Gene(s) with same function implicated in same disease" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">Other gene(s) with same function as gene in record</dt>
                    <dd>
                      {experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes &&
                      experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes.map((gene, i) => (
                        <span key={gene.symbol}>
                          {i > 0 ? ', ' : ''}
                          <ExternalLink
                            href={EXTERNAL_API_MAP['HGNC'] + gene.hgncId}
                            title={"HGNC entry for " + gene.symbol + " in new tab"}
                          >
                            {gene.symbol}
                          </ExternalLink>
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Evidence that above gene(s) share same function with gene in record</dt>
                    <dd>{experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">This gene or genes have been implicated in the above disease</dt>
                    <dd>{experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">How has this other gene(s) been implicated in the above disease?</dt>
                    <dd>{experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Additional comments</dt>
                    <dd>{experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.evidenceType === 'Biochemical Function' && experimentalData.biochemicalFunction && 
              experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype &&
              ((experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO &&
              experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.join(', ') !== '') ||
              (experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText &&
              experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText !== '')) &&
              <CardPanel title="B. Gene function consistent with phenotype" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">HPO ID(s)</dt>
                    <dd>
                      {experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO &&
                      experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.map((hpo, i) => (
                        <span key={`${hpo}-${i}`}>
                          {i > 0 ? ', ' : ''}
                          <ExternalLink
                            href={EXTERNAL_API_MAP['HPO'] + hpo}
                            title={"HPOBrowser entry for " + hpo + " in new tab"}
                          >
                            {hpo}
                          </ExternalLink>
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Phenotype</dt>
                    <dd>{experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Explanation of how phenotype is consistent with disease</dt>
                    <dd>{experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Notes on where evidence found in paper</dt>
                    <dd>{experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.evidenceType === 'Protein Interactions' && experimentalData.proteinInteractions &&
              <CardPanel title="Protein Interactions" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">Interacting Gene(s)</dt>
                    <dd>
                      {experimentalData.proteinInteractions.interactingGenes &&
                      experimentalData.proteinInteractions.interactingGenes.map((gene, i) => (
                        <span key={gene.symbol + '-' + i}>
                          {i > 0 ? ', ' : ''}
                          <ExternalLink
                            href={EXTERNAL_API_MAP['HGNC'] + gene.hgncId}
                            title={"HGNC entry for " + gene.symbol + " in new tab"}
                          >
                            {gene.symbol}
                          </ExternalLink>
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Interaction Type</dt>
                    <dd>{experimentalData.proteinInteractions.interactionType}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Method by which interaction detected</dt>
                    <dd>{experimentalData.proteinInteractions.experimentalInteractionDetection}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">This gene or genes have been implicated in the above disease</dt>
                    <dd>{experimentalData.proteinInteractions.geneImplicatedInDisease ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Explanation of relationship of other gene(s) to the disease</dt>
                    <dd>{experimentalData.proteinInteractions.relationshipOfOtherGenesToDisese}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Information about where evidence can be found on paper</dt>
                    <dd>{experimentalData.proteinInteractions.evidenceInPaper}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.evidenceType === 'Expression' && experimentalData.expression &&
              <CardPanel title="Expression" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">Organ or tissue relevant to disease (Uberon ID)</dt>
                    <dd>
                      {experimentalData.expression.organOfTissue && experimentalData.expression.organOfTissue.map((uberonId, i) => {
                        if (uberonId.indexOf('UBERON') > -1) {
                            return (
                              <span key={uberonId}>
                                {i > 0 ? ', ' : ''}
                                <ExternalLink
                                  href={EXTERNAL_API_MAP['UberonSearch'] + uberonId.replace(':', '_')}
                                  title={"Uberon entry for " + uberonId + " in new tab"}
                                >
                                  {uberonId}
                                </ExternalLink>
                              </span>
                            );
                        } else {
                            return <span key={uberonId}>{i > 0 ? ', ' : ''}{uberonId}</span>
                        }
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Organ or tissue relevant to disease (free text)</dt>
                    <dd>{experimentalData.expression.organOfTissueFreeText}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.evidenceType === 'Expression' && experimentalData.expression
            && experimentalData.expression.normalExpression && experimentalData.expression.normalExpression.expressedInTissue &&
              <CardPanel title="A. Gene normally expressed in tissue relevant to the disease" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">The gene is normally expressed in the above tissue</dt>
                    <dd>{experimentalData.expression.normalExpression.expressedInTissue ? 'Yes' : 'No'}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Evidence for normal expression in disease tissue</dt>
                    <dd>{experimentalData.expression.normalExpression.evidence}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Notes on where evidence found in paper</dt>
                    <dd>{experimentalData.expression.normalExpression.evidenceInPaper}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.evidenceType === 'Expression' &&
            experimentalData.expression && experimentalData.alteredExpression &&
            experimentalData.expression.alteredExpression.expressedInPatients &&
              <CardPanel title="B. Altered expression in patients" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">Expression is altered in patients who have the disease</dt>
                    <dd>{experimentalData.expression.alteredExpression.expressedInPatients ? 'Yes' : 'No'}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Evidence for altered expression in patients</dt>
                    <dd>{experimentalData.expression.alteredExpression.evidence}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Notes on where evidence found in paper</dt>
                    <dd>{experimentalData.expression.alteredExpression.evidenceInPaper}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.evidenceType === 'Functional Alteration' &&
            experimentalData.functionalAlteration &&
              <CardPanel title="Functional Alteration" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">Cultured patient or non-patient cells carrying candidate variants?</dt>
                    <dd>{experimentalData.functionalAlteration.functionalAlterationType}</dd>
                  </div>
                  {experimentalData.functionalAlteration.functionalAlterationType === 'Patient cells'
                    ? (
                      <div>
                        <dt className="text-nowrap align-top">Patient cell type</dt>
                        <dd>
                          {experimentalData.functionalAlteration.patientCells &&
                            <ExternalLink
                              href={EXTERNAL_API_MAP['CLSearch'] + experimentalData.functionalAlteration.patientCells.replace(':', '_')}
                              title={"CL entry for " + experimentalData.functionalAlteration.patientCells + " in new tab"}
                            >
                              {experimentalData.functionalAlteration.patientCells}
                            </ExternalLink>
                          }
                        </dd>
                      </div>
                    ) : (
                      <div>
                        <dt className="text-nowrap align-top">Non-patient cell type</dt>
                        <dd>
                          {experimentalData.functionalAlteration.nonPatientCells &&
                            <ExternalLink
                              href={handleSearchLinkById(experimentalData.functionalAlteration.nonPatientCells) + experimentalData.functionalAlteration.nonPatientCells.replace(':', '_')}
                              title={"EFO entry for " + experimentalData.functionalAlteration.nonPatientCells + " in new tab"}
                            >
                              {experimentalData.functionalAlteration.nonPatientCells}
                            </ExternalLink>
                          }</dd>
                      </div>
                    )
                  }
                  {experimentalData.functionalAlteration.functionalAlterationType === 'Patient cells'
                    ? (
                      <div>
                        <dt className="text-nowrap align-top">Patient cell type (free text)</dt>
                        <dd>{experimentalData.functionalAlteration.patientCellsFreeText}</dd>
                      </div>
                    ) : (
                      <div>
                        <dt className="text-nowrap align-top">Non-patient cell type (free text)</dt>
                        <dd>{experimentalData.functionalAlteration.nonPatientCellsFreeText}</dd>
                      </div>
                    )
                  }
                  <div>
                    <dt className="text-nowrap align-top">Description of gene alteration</dt>
                    <dd>{experimentalData.functionalAlteration.descriptionOfGeneAlteration}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Normal function of gene</dt>
                    <dd>
                      {experimentalData.functionalAlteration.normalFunctionOfGene &&
                        <ExternalLink
                          href={EXTERNAL_API_MAP['GOSearch'] + experimentalData.functionalAlteration.normalFunctionOfGene.replace(':', '_')}
                          title={"GO entry for " + experimentalData.functionalAlteration.normalFunctionOfGene + " in new tab"}
                        >
                          {experimentalData.functionalAlteration.normalFunctionOfGene}
                        </ExternalLink>
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Normal function of gene (free text)</dt>
                    <dd>{experimentalData.functionalAlteration.normalFunctionOfGeneFreeText}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Evidence for altered function</dt>
                    <dd>{experimentalData.functionalAlteration.evidenceForNormalFunction}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Notes on where evidence found in paper</dt>
                    <dd>{experimentalData.functionalAlteration.evidenceInPaper}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.evidenceType === 'Model Systems' && experimentalData.modelSystems &&
              <CardPanel title="Model Systems" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">Non-human model organism or cell culture model?</dt>
                    <dd>{experimentalData.modelSystems.modelSystemsType}</dd>
                  </div>
                  {experimentalData.modelSystems.modelSystemsType === 'Non-human model organism'
                    ? (
                      <div>
                        <dt className="text-nowrap align-top">Non-human model organism type</dt>
                        <dd>{experimentalData.modelSystems.nonHumanModel}</dd>
                      </div>
                    ) : (
                      <div>
                        <dt className="text-nowrap align-top">Cell culture model type</dt>
                        <dd>
                          {experimentalData.modelSystems.cellCulture &&
                            <ExternalLink
                              href={handleSearchLinkById(experimentalData.modelSystems.cellCulture) + experimentalData.modelSystems.cellCulture.replace(':', '_')}
                              title={"EFO entry for " + experimentalData.modelSystems.cellCulture + " in new tab"}
                            >
                              {experimentalData.modelSystems.cellCulture}
                            </ExternalLink>
                          }
                        </dd>
                      </div>
                    )
                  }
                  {experimentalData.modelSystems.modelSystemsType === 'Cell culture model' &&
                    <div>
                      <dt className="text-nowrap align-top">Cell culture type (free text)</dt>
                      <dd>{experimentalData.modelSystems.cellCultureFreeText}</dd>
                    </div>
                  }
                  <div>
                    <dt className="text-nowrap align-top">Description of gene alteration</dt>
                    <dd>{experimentalData.modelSystems.descriptionOfGeneAlteration}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Phenotype(s) observed in model system (HPO or MP)</dt>
                    <dd>
                      {msPhenotypeHpoObserved && msPhenotypeHpoObserved.map((hpo, i) => {
                        if (hpo.indexOf('HP') > -1) {
                          return (
                            <span key={`${hpo}-${i}`}>
                              {i > 0 ? ', ' : ''}
                              <ExternalLink
                                href={EXTERNAL_API_MAP['HPO'] + hpo}
                                title={"HPO Browser entry for " + hpo + " in new tab"}
                              >
                                {hpo}
                              </ExternalLink>
                            </span>
                          );
                        } else {
                          return <span key={hpo}>{i > 0 ? ', ' : ''}{hpo}</span>
                        }
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Phenotype(s) observed in model system (free text)</dt>
                    <dd>{experimentalData.modelSystems.phenotypeFreetextObserved}</dd>
                  </div>
                  <div>
                      <dt className="text-nowrap align-top">Human phenotype(s) (HPO)</dt>
                      <dd>{msPhenotypeHpo && msPhenotypeHpo.map((hpo, i) => (
                         <span key={`${hpo}-${i}`}>
                           {i > 0 ? ', ' : ''}
                           <ExternalLink
                            href={EXTERNAL_API_MAP['HPO'] + hpo}
                            title={"HPO Browser entry for " + hpo + " in new tab"}

                          >
                            {hpo}
                          </ExternalLink>
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Human phenotype(s) (free text)</dt>
                    <dd>{experimentalData.modelSystems.phenotypeFreeText}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Explanation of how model system phenotype is similar to phenotype observed in humans</dt>
                    <dd>{experimentalData.modelSystems.explanation}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Information about where evidence can be found on paper</dt>
                    <dd>{experimentalData.modelSystems.evidenceInPaper}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.evidenceType === 'Rescue' && experimentalData.rescue &&
              <CardPanel title="Rescue" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt className="text-nowrap align-top">Rescue observed in the following</dt>
                    <dd>{experimentalData.rescue.rescueType}</dd>
                  </div>
                  {experimentalData.rescue.rescueType === 'Patient cells' &&
                    <div className="rescue-observed-group">
                      <div>
                        <dt className="text-nowrap align-top">Patient cell type</dt>
                        <dd>
                          {experimentalData.rescue.patientCells &&
                            <ExternalLink
                              href={EXTERNAL_API_MAP['CLSearch'] + experimentalData.rescue.patientCells.replace(':', '_')}
                              title={"CL entry for " + experimentalData.rescue.patientCells + " in new tab"}
                            >
                              {experimentalData.rescue.patientCells}
                            </ExternalLink>
                          }
                        </dd>
                      </div>
                      <div>
                        <dt className="text-nowrap align-top">Patient cell type (free text)</dt>
                        <dd>{experimentalData.rescue.patientCellsFreeText}</dd>
                      </div>
                    </div>
                  }
                  {experimentalData.rescue.rescueType === 'Cell culture model' &&
                    <>
                      <div>
                          <dt className="text-nowrap align-top">Cell culture model</dt>
                          <dd>
                            {experimentalData.rescue.cellCulture &&
                              <ExternalLink
                                href={handleSearchLinkById(experimentalData.rescue.cellCulture) + experimentalData.rescue.cellCulture.replace(':', '_')}
                                title={"EFO entry for " + experimentalData.rescue.cellCulture + " in new tab"}
                              >
                                {experimentalData.rescue.cellCulture}
                              </ExternalLink>
                            }
                          </dd>
                      </div>
                      <div>
                        <dt className="text-nowrap align-top">Cell culture model (free text)</dt>
                        <dd>{experimentalData.rescue.cellCultureFreeText}</dd>
                      </div>
                    </>
                  }
                  {experimentalData.rescue.rescueType === 'Non-human model organism' &&
                    <div>
                      <dt className="text-nowrap align-top">Non-human model organism</dt>
                      <dd>{experimentalData.rescue.nonHumanModel}</dd>
                    </div>
                  }
                  {experimentalData.rescue.rescueType === 'Human' &&
                    <div>
                      <dt className="text-nowrap align-top">Human</dt>
                      <dd>{experimentalData.rescue.humanModel}</dd>
                    </div>
                  }
                  <div>
                    <dt className="text-nowrap align-top">Description of gene alteration</dt>
                    <dd>{experimentalData.rescue.descriptionOfGeneAlteration}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Phenotype to rescue</dt>
                    <dd>
                      {resPhenotypeHpo && resPhenotypeHpo.map((hpo, i) => (
                        <span key={`${hpo}-${i}`}>
                          {i > 0 ? ', ' : ''}
                          <ExternalLink
                            href={EXTERNAL_API_MAP['HPO'] + hpo}
                            title={"HPO Browser entry for " + hpo + " in new tab"}
                          >
                            {hpo}
                          </ExternalLink>
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Phenotype to rescue</dt>
                    <dd>{experimentalData.rescue.phenotypeFreeText}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">Method used to rescue</dt>
                    <dd>{experimentalData.rescue.rescueMethod}</dd>
                  </div>

                  <div>
                    <dt className="text-nowrap align-top">The wild-type rescues the above phenotype</dt>
                    <dd>{experimentalData.rescue.wildTypeRescuePhenotype ? 'Yes' : 'No'}</dd>
                  </div>
                  {experimentalData.rescue.patientVariantRescue &&
                    <div>
                      <dt className="text-nowrap align-top">The patient variant rescues</dt>
                      <dd>{experimentalData.rescue.patientVariantRescue ? 'Yes' : 'No'}</dd>
                    </div>
                  }
                  <div>
                    <dt className="text-nowrap align-top">Explanation of rescue of phenotype</dt>
                    <dd>{experimentalData.rescue.explanation}</dd>
                  </div>
                  <div>
                    <dt className="text-nowrap align-top">Information about where evidence can be found on paper</dt>
                    <dd>{experimentalData.rescue.evidenceInPaper}</dd>
                  </div>
                </dl>
              </CardPanel>
            }
            {experimentalData.variants && experimentalData.variants.length > 0 &&
              <CardPanel title="Associated Variants" panelClassName="panel-data">
                {experimentalData.variants.map((variant, i) => (
                  <div key={'variant' + i} className="variant-view-panel">
                    <h5>Variant {i + 1}</h5>
                    <dl className="dl-horizontal">
                      {variant.clinvarVariantId &&
                        <div>
                          <dt className="text-nowrap align-top">ClinVar VariationID</dt>
                          <dd>
                            <ExternalLink
                              href={`${EXTERNAL_API_MAP['ClinVarSearch']}${variant.clinvarVariantId}`}
                              title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`}
                            >
                              {variant.clinvarVariantId}
                            </ExternalLink>
                          </dd>
                        </div>
                      }
                      {variant.carId &&
                        <div>
                          <dt className="text-nowrap align-top">ClinGen Allele Registry ID</dt>
                          <dd>
                            <ExternalLink
                              href={`${EXTERNAL_API_MAP['CARallele']}${variant.carId}.html`}
                              title={`ClinGen Allele Registry entry for ${variant.carId} in new tab`}
                            >
                              {variant.carId}
                            </ExternalLink>
                          </dd>
                        </div>
                      }
                      {renderVariantLabelAndTitle(variant)}
                      {variant.otherDescription &&
                        <div>
                          <dt className="text-nowrap align-top">Other description</dt>
                          <dd>{variant.otherDescription}</dd>
                        </div>
                      }
                    </dl>
                  </div>
                ))}
              </CardPanel>
              }
              {/* Retain pre-existing assessments data in display */}
              {validAssessments && Boolean(validAssessments.length) &&
                <div className="card card-panel mb-4">
                  <div className="card-body">
                    <dl className="dl-horizontal">
                      <div>
                        <dt className="text-nowrap align-top">Assessments</dt>
                        <dd>
                          {validAssessments.map((assessment, i) => (
                            <span key={assessment.uuid}>
                              {i > 0 ? <br /> : null}
                              {assessment.value + ' (' + assessment.submitted_by.title + ')'}
                            </span>
                          ))}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              }
              <CardPanel title="Experimental Data Score">
                <ScoreViewer
                  auth={auth}
                  evidence={experimentalData}
                  score={matchedScore}
                />
              </CardPanel>
          </Col>
        </Row>
      </Container>
    </div>
  ) : (
    <Jumbotron>
      <Container>
        <h2>Experimental data not found</h2>
      </Container>
    </Jumbotron>
  ));
};

export default ExperimentalView;
