import React, { useState, useEffect } from 'react';
import { Jumbotron, Container, Row, Col } from "react-bootstrap";
import { useSelector } from 'react-redux'
import lodashGet from "lodash/get";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import { API } from 'aws-amplify';
import { API_NAME } from '../../../../utils';
import CardPanel from "../../../common/CardPanel";
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import LoadingSpinner from '../../../common/LoadingSpinner';
import { renderPMIDList, renderHPOList } from '../common/commonFunc';
import { useAmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';
import { Link } from 'react-router-dom';


export const GroupView = ({
  group
}) => {

  const requestRecycler = useAmplifyAPIRequestRecycler();
  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  })
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);
  const method = lodashGet(group, "method", null);

  const [ geneList, setGeneList ] = useState([]);

  useEffect(() => {
    loadGeneList();
  }, []);

  const loadGeneList = () => {
    if (lodashGet(group, "otherGenes", null)) {
      setGeneList([]);
      group.otherGenes.forEach((symbol, i) => {
        requestRecycler.capture(API.get(API_NAME, '/genes/' + symbol))
          .then(gene => {
            setGeneList(geneList => [...geneList, gene]);
          }).catch(err => {
            console.log("Found bad gene symbol in group: %o", group);
          });
      });
    }
  };


  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : group ? (
    <div>
      <Container>
        <Row className="row curation-content-viewer"><Col sm="12">
          <div className="viewer-titles">
            <h1>View Group: {group.label}</h1>
            <h2>
              {lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) ? <Link to={`/curation-central/${gdm.PK}/annotation/${annotation.PK}`}><FontAwesomeIcon icon={faBriefcase}/></Link> : null}
              <span> &#x2F;&#x2F; Group {lodashGet(group, "label", '')}</span>
            </h2>
          </div>
          <CardPanel title="Common Disease(s) & Phenotype(s)" panelClassName="panel-data">
            <dl className="dl-horizontal">
              <div>
                <dt>Common Diagnosis</dt>
                <dd>{lodashGet(group, "commonDiagnosis", null)  && group.commonDiagnosis.length > 0 && group.commonDiagnosis.map((disease, i) => {
                  return <span key={lodashGet(disease, "PK", '')}>{i > 0 ? ', ' : ''}{lodashGet(disease, "term", '')} {!disease.freetext ? <ExternalLink href={EXTERNAL_API_MAP['MondoSearch'] + disease.PK}>{disease.PK.replace('_', ':')}</ExternalLink> : null}</span>;
                })}</dd>
              </div>

              <div>
                <dt>HPO IDs</dt>
                <dd>{lodashGet(group, "hpoIdInDiagnosis", null) && renderHPOList(group.hpoIdInDiagnosis)}</dd>
              </div>

              <div>
                <dt>Phenotype Terms</dt>
                <dd>{lodashGet(group, "termsInDiagnosis", null)}</dd>
              </div>

              <div>
                <dt>NOT HPO IDs</dt>
                <dd>{lodashGet(group, "hpoIdInElimination", null) && renderHPOList(group.hpoIdInElimination)}</dd>
              </div>

              <div>
                <dt>NOT phenotype terms</dt>
                <dd>{lodashGet(group, "termsInElimination", null)}</dd>
              </div>
            </dl>
          </CardPanel>

          <CardPanel title="Group — Demographics" panelClassName="panel-data">
            <dl className="dl-horizontal">
              <div>
                <dt># Males</dt>
                <dd>{lodashGet(group, "numberOfMale", null)}</dd>
              </div>

              <div>
                <dt># Females</dt>
                <dd>{lodashGet(group, "numberOfFemale", null)}</dd>
              </div>

              <div>
                <dt>Country of Origin</dt>
                <dd>{lodashGet(group, "countryOfOrigin", null)}</dd>
              </div>

              <div>
                <dt>Ethnicity</dt>
                <dd>{lodashGet(group, "ethnicity", null)}</dd>
              </div>

              <div>
                <dt>Race</dt>
                <dd>{lodashGet(group, "race", null)}</dd>
              </div>

              <div>
                <dt>Age Range Type</dt>
                <dd>{lodashGet(group, "ageRangeType", null)}</dd>
              </div>

              <div>
                <dt>Age Range</dt>
                <dd>{lodashGet(group, "ageRangeFrom", null) || lodashGet(group, "ageRangeTo", null) ? <span>{group.ageRangeFrom + ' – ' + group.ageRangeTo}</span> : null}</dd>
              </div>

              <div>
                <dt>Age Range Unit</dt>
                <dd>{lodashGet(group, "ageRangeUnit", null)}</dd>
              </div>
            </dl>
          </CardPanel>

          <CardPanel title="Group — Information" panelClassName="panel-data">
            <dl className="dl-horizontal">
              <div>
                <dt>Total number individuals in group</dt>
                <dd>{lodashGet(group, "totalNumberIndividuals", null)}</dd>
              </div>

              <div>
                <dt># individuals with family information</dt>
                <dd>{lodashGet(group, "numberOfIndividualsWithFamilyInformation", null)}</dd>
              </div>

              <div>
                <dt># individuals WITHOUT family information</dt>
                <dd>{lodashGet(group, "numberOfIndividualsWithoutFamilyInformation", null)}</dd>
              </div>

              <div>
                <dt># individuals with variant in gene being curated</dt>
                <dd>{lodashGet(group, "numberOfIndividualsWithVariantInCuratedGene", null)}</dd>
              </div>

              <div>
                <dt># individuals without variant in gene being curated</dt>
                <dd>{lodashGet(group, "numberOfIndividualsWithoutVariantInCuratedGene", null)}</dd>
              </div>

              <div>
                <dt># individuals with variant found in other gene</dt>
                <dd>{lodashGet(group, "numberOfIndividualsWithVariantInOtherGene", null)}</dd>
              </div>

              <div>
                <dt>Other genes found to have variants in them</dt>
                <dd>{geneList && geneList.map((gene, i) => {
                  return <span key={i}>{i > 0 ? ', ' : ''}<ExternalLink href={EXTERNAL_API_MAP['HGNC'] + gene.hgncId} title={"HGNC entry for " + gene.symbol + " in new tab"}>{gene.symbol}</ExternalLink></span>;
                })}</dd>
              </div>
            </dl>
          </CardPanel>

          <CardPanel title="Group — Methods" panelClassName="panel-data">
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
                <dt>Additional Information about Group Method</dt>
                <dd>{method && method.additionalInformation}</dd>
              </div>
            </dl>
          </CardPanel>

          <CardPanel title="Group — Additional Information" panelClassName="panel-data">
            <dl className="dl-horizontal">
              <div>
                <dt>Additional Information about Group</dt>
                <dd>{group && group.additionalInformation}</dd>
              </div>

              <dt>Other PMID(s) that report evidence about this same group</dt>
              <dd>{group && group.otherPMIDs && renderPMIDList(group.otherPMIDs)}</dd>
            </dl>
          </CardPanel>
        </Col></Row>
      </Container>
    </div>
  ) : (
    <Jumbotron>
      <Container>
        <h2>Group not found</h2>
      </Container>
    </Jumbotron>
  );
};

