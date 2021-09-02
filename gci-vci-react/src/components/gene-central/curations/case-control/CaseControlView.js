import React, { useState, useEffect } from 'react';
import { Jumbotron, Container } from "react-bootstrap";
import { useSelector } from 'react-redux'
import { get as lodashGet } from "lodash";
import { RestAPI as API } from '@aws-amplify/api-rest';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import { API_NAME } from '../../../../utils';
import CardPanel from "../../../common/CardPanel";
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import LoadingSpinner from '../../../common/LoadingSpinner';
import { renderPMIDList, renderAlleleFrequency, renderHPOList } from '../common/commonFunc';
import ScoreViewer from '../../score/ScoreViewer';
import { getAffiliationScore } from '../../score/helpers/getAffiliationScore';


import { useAmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';


export const CaseControlView = ({
  caseControl
}) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const auth = useSelector((state) => state.auth);
  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  })
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);

  const [ geneList, setGeneList ] = useState([]);

  useEffect(() => {
    loadGeneList();
  }, []);

  const loadGeneList = () => {
    if (lodashGet(caseControl, "caseCohort.otherGenes", null)) {
      setGeneList([]);
      caseControl.caseCohort.otherGenes.forEach((symbol, i) => {
        requestRecycler.capture(API.get(API_NAME, '/genes/' + symbol))
          .then(gene => {
            setGeneList(geneList => [...geneList, gene]);
          }).catch(err => {
            console.log("Found bad gene symbol in case control: %o", caseControl);
          });
      });
    }
  };

  const affiliation = lodashGet(auth, "currentAffiliation", null);
  const caseCohort = lodashGet(caseControl, "caseCohort", null);
  const caseCohortMethod = lodashGet(caseControl, "caseCohort.method", null);
  const controlCohort = lodashGet(caseControl, "controlCohort", null);
  const controlCohortMethod = lodashGet(caseControl, "controlCohort.method", null);
  const evidenceScores = lodashGet(caseControl, "scores", null);
  const gdmPK = lodashGet(gdm, "PK", null);
  const annotationPK = lodashGet(annotation, "PK", null);

  // Get evidenceScore object for gdm associated affiliation if exists
  let matchedScore = null;
  if (evidenceScores.length > 0) {
    matchedScore = getAffiliationScore(evidenceScores, lodashGet(gdm, "affiliation", null));
  }

  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : caseControl ? (
    <div>
      <Container>
        <div className="case-control-content-viewer">
          <div className="viewer-titles">
            <h1>View Case-Control: {caseControl.label}</h1>
            <h2>
              {gdmPK && annotationPK ? <a href={`/curation-central/${gdmPK}/annotation/${annotationPK}`}><FontAwesomeIcon icon={faBriefcase}/></a> : null}
              <span> &#x2F;&#x2F; {caseControl.label} (Case: {caseCohort.label}; Control: {controlCohort.label})</span>
            </h2>
          </div>
          <div className="mt-3 col-sm-12 diseases">
            <div className="col-sm-6 case-cohort-view">
              <CardPanel title="Case Cohort - Disease(s) & Phenotype(s)" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt>Common Diagnosis</dt>
                    <dd>{caseCohort.commonDiagnosis && caseCohort.commonDiagnosis.map(function(disease, i) {
                      return <span key={disease.PK + '_' + i}>{i > 0 ? ', ' : ''}{disease.term} {!disease.freetext ? <ExternalLink href={EXTERNAL_API_MAP['MondoSearch'] + disease.PK}>{disease.PK.replace('_', ':')}</ExternalLink> : null}</span>;
                    })}</dd>
                  </div>

                  <div>
                    <dt>HPO IDs</dt>
                    <dd>{caseCohort.hpoIdInDiagnosis && renderHPOList(caseCohort.hpoIdInDiagnosis)}</dd>
                  </div>

                  <div>
                    <dt>Phenotype Terms</dt>
                    <dd>{caseCohort.termsInDiagnosis}</dd>
                  </div>

                  <div>
                    <dt>NOT HPO IDs</dt>
                    <dd>{caseCohort.hpoIdInElimination && renderHPOList(caseCohort.hpoIdInElimination)}</dd>

                  </div>

                  <div>
                    <dt>NOT phenotype terms</dt>
                    <dd>{caseCohort.termsInElimination}</dd>
                  </div>
                </dl>
              </CardPanel>
            </div>
            <div className="col-sm-6 control-cohort-view">
              {/* Diseases and phenotypes data is not required for control cohort */}
            </div>
          </div>
          <div className="col-sm-12 demographics">
            <div className="col-sm-6 case-cohort-view">
              <CardPanel title="Case Cohort — Demographics" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt># Males</dt>
                    <dd>{caseCohort.numberOfMale}</dd>
                  </div>

                  <div>
                    <dt># Females</dt>
                    <dd>{caseCohort.numberOfFemale}</dd>
                  </div>

                  <div>
                    <dt>Country of Origin</dt>
                    <dd>{caseCohort.countryOfOrigin}</dd>
                  </div>

                  <div>
                    <dt>Ethnicity</dt>
                    <dd>{caseCohort.ethnicity}</dd>
                  </div>

                  <div>
                    <dt>Race</dt>
                    <dd>{caseCohort.race}</dd>
                  </div>

                  <div>
                    <dt>Age Range Type</dt>
                    <dd>{caseCohort.ageRangeType}</dd>
                  </div>

                  <div>
                    <dt>Age Range</dt>
                    <dd>{caseCohort.ageRangeFrom || caseCohort.ageRangeTo ? <span>{caseCohort.ageRangeFrom + ' – ' + caseCohort.ageRangeTo}</span> : null}</dd>
                  </div>

                  <div>
                    <dt>Age Range Unit</dt>
                    <dd>{caseCohort.ageRangeUnit}</dd>
                  </div>
                </dl>
              </CardPanel>
            </div>
            <div className="col-sm-6 control-cohort-view">
              <CardPanel title="Control Cohort — Demographics" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt># Males</dt>
                    <dd>{controlCohort.numberOfMale}</dd>
                  </div>

                  <div>
                    <dt># Females</dt>
                    <dd>{controlCohort.numberOfFemale}</dd>
                  </div>

                  <div>
                    <dt>Country of Origin</dt>
                    <dd>{controlCohort.countryOfOrigin}</dd>
                  </div>

                  <div>
                    <dt>Ethnicity</dt>
                    <dd>{controlCohort.ethnicity}</dd>
                  </div>

                  <div>
                    <dt>Race</dt>
                    <dd>{controlCohort.race}</dd>
                  </div>

                  <div>
                    {/* Age range type data is not required for control cohort */}
                    <dd>&nbsp;</dd>
                  </div>

                  <div>
                    <dt>Age Range</dt>
                    <dd>{controlCohort.ageRangeFrom || controlCohort.ageRangeTo ? <span>{controlCohort.ageRangeFrom + ' – ' + controlCohort.ageRangeTo}</span> : null}</dd>
                  </div>

                  <div>
                    <dt>Age Range Unit</dt>
                    <dd>{controlCohort.ageRangeUnit}</dd>
                  </div>
                </dl>
              </CardPanel>
            </div>
          </div>
          <div className="col-sm-12 methods">
            <div className="col-sm-6 case-cohort-view">
              <CardPanel title="Case Cohort — Methods" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt>Previous testing</dt>
                    <dd>{caseCohortMethod ? (caseCohortMethod.previousTesting === true ? 'Yes' : (caseCohortMethod.previousTesting === false ? 'No' : '')) : ''}</dd>
                  </div>

                  <div>
                    <dt>Description of previous testing</dt>
                    <dd>{caseCohortMethod && caseCohortMethod.previousTestingDescription}</dd>
                  </div>

                  <div>
                    <dt>Genome-wide study</dt>
                    <dd>{caseCohortMethod ? (caseCohortMethod.genomeWideStudy === true ? 'Yes' : (caseCohortMethod.genomeWideStudy === false ? 'No' : '')) : ''}</dd>
                  </div>

                  <div>
                    <dt>Genotyping methods</dt>
                    <dd>{caseCohortMethod && caseCohortMethod.genotypingMethods && caseCohortMethod.genotypingMethods.join(', ')}</dd>
                  </div>

                  {caseCohortMethod && (caseCohortMethod.entireGeneSequenced === true || caseCohortMethod.entireGeneSequenced === false) ?
                    <div>
                      <dt>Entire gene sequenced</dt>
                      <dd>{caseCohortMethod.entireGeneSequenced === true ? 'Yes' : 'No'}</dd>
                    </div>
                    : null}

                  {caseCohortMethod && (caseCohortMethod.copyNumberAssessed === true || caseCohortMethod.copyNumberAssessed === false) ?
                    <div>
                      <dt>Copy number assessed</dt>
                      <dd>{caseCohortMethod.copyNumberAssessed === true ? 'Yes' : 'No'}</dd>
                    </div>
                    : null}

                  {caseCohortMethod && (caseCohortMethod.specificMutationsGenotyped === true || caseCohortMethod.specificMutationsGenotyped === false) ?
                    <div>
                      <dt>Specific mutations genotyped</dt>
                      <dd>{caseCohortMethod.specificMutationsGenotyped === true ? 'Yes' : 'No'}</dd>
                    </div>
                    : null}

                  <div>
                    <dt>Description of genotyping method</dt>
                    <dd>{caseCohortMethod && caseCohortMethod.specificMutationsGenotypedMethod}</dd>
                  </div>
                </dl>
              </CardPanel>
            </div>
            <div className="col-sm-6 control-cohort-view">
              <CardPanel title="Control Cohort — Methods" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt>Previous testing</dt>
                    <dd>{controlCohortMethod ? (controlCohortMethod.previousTesting === true ? 'Yes' : (controlCohortMethod.previousTesting === false ? 'No' : '')) : ''}</dd>
                  </div>

                  <div>
                    <dt>Description of previous testing</dt>
                    <dd>{controlCohortMethod && controlCohortMethod.previousTestingDescription}</dd>
                  </div>

                  <div>
                    <dt>Genome-wide study</dt>
                    <dd>{controlCohortMethod ? (controlCohortMethod.genomeWideStudy === true ? 'Yes' : (controlCohortMethod.genomeWideStudy === false ? 'No' : '')) : ''}</dd>
                  </div>

                  <div>
                    <dt>Genotyping methods</dt>
                    <dd>{controlCohortMethod && controlCohortMethod.genotypingMethods && controlCohortMethod.genotypingMethods.join(', ')}</dd>
                  </div>

                  {controlCohortMethod && (controlCohortMethod.entireGeneSequenced === true || controlCohortMethod.entireGeneSequenced === false) ?
                    <div>
                      <dt>Entire gene sequenced</dt>
                      <dd>{controlCohortMethod.entireGeneSequenced === true ? 'Yes' : 'No'}</dd>
                    </div>
                    : null}

                  {controlCohortMethod && (controlCohortMethod.copyNumberAssessed === true || controlCohortMethod.copyNumberAssessed === false) ?
                    <div>
                      <dt>Copy number assessed</dt>
                      <dd>{controlCohortMethod.copyNumberAssessed === true ? 'Yes' : 'No'}</dd>
                    </div>
                    : null}

                  {controlCohortMethod && (controlCohortMethod.specificMutationsGenotyped === true || controlCohortMethod.specificMutationsGenotyped === false) ?
                    <div>
                      <dt>Specific mutations genotyped</dt>
                      <dd>{controlCohortMethod.specificMutationsGenotyped === true ? 'Yes' : 'No'}</dd>
                    </div>
                    : null}

                  <div>
                    <dt>Description of genotyping method</dt>
                    <dd>{controlCohortMethod && controlCohortMethod.specificMutationsGenotypedMethod}</dd>
                  </div>

                </dl>
              </CardPanel>
            </div>
          </div>
          <div className="col-sm-12 power">
            <div className="col-sm-6 case-cohort-view">
              <CardPanel title="Case Cohort — Power" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt>Number of Cases with variant(s) in the gene in question</dt>
                    <dd>{caseCohort.numberWithVariant}</dd>
                  </div>

                  <div>
                    <dt>Number of all Cases genotyped/sequenced</dt>
                    <dd>{caseCohort.numberAllGenotypedSequenced}</dd>
                  </div>

                  <div>
                    <dt>Case Frequency</dt>
                    <dd>{renderAlleleFrequency(caseCohort.numberWithVariant, caseCohort.numberAllGenotypedSequenced, caseCohort.alleleFrequency)}</dd>
                  </div>
                </dl>
              </CardPanel>
            </div>
            <div className="col-sm-6 control-cohort-view">
              <CardPanel title="Control Cohort — Power" panelClassName="panel-data">
                <dl className="dl-horizontal">
                  <div>
                    <dt>Number of Cases with variant(s) in the gene in question</dt>
                    <dd>{controlCohort.numberWithVariant}</dd>
                  </div>

                  <div>
                    <dt>Number of all Cases genotyped/sequenced</dt>
                    <dd>{controlCohort.numberAllGenotypedSequenced}</dd>
                  </div>

                  <div>
                    <dt>Control Frequency</dt>
                    <dd>{renderAlleleFrequency(controlCohort.numberWithVariant, controlCohort.numberAllGenotypedSequenced, controlCohort.alleleFrequency)}</dd>
                  </div>
                </dl>
              </CardPanel>
            </div>
          </div>
          <div className="col-sm-12 additional-information">
            <div className="col-sm-6 case-cohort-view">
              <CardPanel title="Case Cohort — Additional Information" panelClassName="panel-data additional-information">
                <dl className="dl-horizontal">
                  <div className="other-genes">
                    <dt>Other genes found to have variants in them</dt>
                    <dd>{geneList && geneList.map((gene, i) => {
                      return <span key={i}>{i > 0 ? ', ' : ''}<ExternalLink href={EXTERNAL_API_MAP['HGNC'] + gene.hgncId} title={"HGNC entry for " + gene.symbol + " in new tab"}>{gene.symbol}</ExternalLink></span>;
                    })}</dd>
                  </div>

                  <div>
                    <dt>Additional Information about Group</dt>
                    <dd>{caseCohort.additionalInformation}</dd>
                  </div>

                  <div className="other-pmids">
                    <dt>Other PMID(s) that report evidence about this same group</dt>
                    <dd>{caseCohort.otherPMIDs && renderPMIDList(caseCohort.otherPMIDs)}</dd>
                  </div>
                </dl>
              </CardPanel>
            </div>
            <div className="col-sm-6 control-cohort-view">
              <CardPanel title="Control Cohort — Additional Information" panelClassName="panel-data additional-information">
                <dl className="dl-horizontal">
                  <div className="other-genes">
                    {/* Other genes data is not required for control cohort */}
                    <dd>&nbsp;</dd>
                  </div>

                  <div>
                    <dt>Additional Information about Group</dt>
                    <dd>{controlCohort.additionalInformation}</dd>
                  </div>

                  <div className="other-pmids">
                    <dt>Other PMID(s) that report evidence about this same group</dt>
                    <dd>{controlCohort.otherPMIDs && renderPMIDList(controlCohort.otherPMIDs)}</dd>
                  </div>
                </dl>
              </CardPanel>
            </div>
          </div>
          <div className="col-sm-12">
            <CardPanel title="Case-Control Evaluation & Score" panelClassName="panel-data case-control-evaluation">
              <dl className="dl-horizontal">
                <div>
                  <dt>Study Type</dt>
                  <dd>{caseControl.studyType}</dd>
                </div>

                <div>
                  <dt>Detection Method</dt>
                  <dd>{caseControl.detectionMethod}</dd>
                </div>

                <div>
                  <dt>Test statistic</dt>
                  <dd>{caseControl.statisticalValues[0].valueType}</dd>
                </div>

                <div>
                  <dt>Other test statistic</dt>
                  <dd>{caseControl.statisticalValues[0].otherType}</dd>
                </div>

                <div>
                  <dt>Test statistic value</dt>
                  <dd>{caseControl.statisticalValues[0].value}</dd>
                </div>

                <div>
                  <dt>Confidence p-value</dt>
                  <dd>{caseControl.pValue}</dd>
                </div>

                <div>
                  <dt>Confidence interval (%)</dt>
                  <dd>{caseControl.confidenceIntervalFrom || caseControl.confidenceIntervalTo ? <span>{caseControl.confidenceIntervalFrom + ' – ' + caseControl.confidenceIntervalTo}</span> : null}</dd>
                </div>

                <div>
                  <dt>1. Are case and control cohorts matched by demographic information?</dt>
                  <dd>{caseControl.demographicInfoMatched}</dd>
                </div>

                <div>
                  <dt>If yes, select one of the following</dt>
                  <dd>{caseControl.factorOfDemographicInfoMatched}</dd>
                </div>

                <div>
                  <dt>Explanation</dt>
                  <dd>{caseControl.explanationForDemographicMatched}</dd>
                </div>

                <div>
                  <dt>2. Are case and control cohorts matched for genetic ancestry?</dt>
                  <dd>{caseControl.geneticAncestryMatched}</dd>
                </div>

                <div>
                  <dt>If no, select one of the following</dt>
                  <dd>{caseControl.factorOfGeneticAncestryNotMatched}</dd>
                </div>

                <div>
                  <dt>Explanation</dt>
                  <dd>{caseControl.explanationForGeneticAncestryNotMatched}</dd>
                </div>

                <div>
                  <dt>3. Are case and control cohorts equivalently evaluated for primary disease<br/>outcome and/or family history of disease?</dt>
                  <dd>{caseControl.diseaseHistoryEvaluated}</dd>
                </div>

                <div>
                  <dt>Explanation</dt>
                  <dd>{caseControl.explanationForDiseaseHistoryEvaluation}</dd>
                </div>

                <div>
                  <dt>4. Do case and control cohorts differ in any other variables?</dt>
                  <dd>{caseControl.differInVariables}</dd>
                </div>

                <div>
                  <dt>If yes, explain</dt>
                  <dd>{caseControl.explanationForDifference}</dd>
                </div>

                <div>
                  <dt>Comments regarding case-control evaluation</dt>
                  <dd>{caseControl.comments}</dd>
                </div>

              </dl>
            </CardPanel>
            <CardPanel title="Case-Control Score" panelClassName="panel-data case-control-score">
              <ScoreViewer
                auth={auth}
                evidence={caseControl}
                affiliation={affiliation}
                score={matchedScore}
              />
            </CardPanel>
          </div>
        </div>
      </Container>
    </div>
  ) : (
    <Jumbotron>
      <Container>
        <h2>Case Control not found</h2>
      </Container>
    </Jumbotron>
  );
}

export default CaseControlView;
