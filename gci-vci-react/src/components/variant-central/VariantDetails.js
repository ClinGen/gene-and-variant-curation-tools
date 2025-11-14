import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux'
import { Button } from 'react-bootstrap';
import moment from 'moment';
import { useHistory, Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faRobot } from '@fortawesome/free-solid-svg-icons'
import { RestAPI as API } from '@aws-amplify/api-rest';
import isEmpty from 'lodash/isEmpty';
import lodashGet from "lodash/get";
import axios from 'axios';
import { API_NAME } from '../../utils';
import { getGenomicLinkouts, setContextLinks } from '../variant-central/helpers/helpers';
import ExternalResourcesPanel from '../common/ExternalResourcesPanel';
import { ExternalLink } from "../common/ExternalLink";
import InfoIcon from '../common/InfoIcon';
import DiseaseModal from '../common/DiseaseModal';
import Modal from '../common/Modal';
import Popover from '../common/Popover';
import { EXTERNAL_API_MAP } from '../../constants/externalApis';
import { isOwnedByCurrentCuratingEntity } from '../../utilities/ownershipUtilities';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { useAmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';
import { convertDiseasePKToMondoId, displayObsoleteDiseaseIcon } from '../../utilities/diseaseUtilities';
import { getOpenBatch, getBatchesByStatus } from './clinvar-submission/helpers';


const VariantDetails = (props) => {
    const requestRecycler = useAmplifyAPIRequestRecycler();
    const mondoUrl = 'https://www.ebi.ac.uk/ols4/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/';
    const [showDiseaseModal, setShowDiseaseModal] = useState(false);
    const [showPhiDisclaimerModal, setShowPhiDisclaimerModal] = useState(false);
    const [hypothesisData, setHypothesisData] = useState({});
    const [isLoadingHypothesis, setIsLoadingHypothesis] = useState(false);
    const [automatedAnnotationTotal, setAutomatedAnnotationTotal] = useState(0);
    const history = useHistory();
    const { 
      variant, 
      interpretation, 
      onViewUpdate, 
      cspecDoc,
      isLoadingCspecDoc,
      clinVarSubmissionBatches,
      viewValue, 
      isLoadingInterpretation, 
      setIsLoadingInterpretation, 
      relatedInterpretations, 
      handleInterpretationUpdate 
    } = props;
    const { disease } = interpretation || {};
    const myInterpretation = relatedInterpretations.find(interpretation => isOwnedByCurrentCuratingEntity(interpretation, props.auth));
    const isCurrentInterpretationMine = myInterpretation && interpretation && myInterpretation.PK === interpretation.PK;
    
    useEffect(() => {
      fetchHypothesisData();
    }, [])

    const updateView = (view) => {
        onViewUpdate(view);// also update state in parent
    }
    
    //POST to Interpretations Table
    async function updateInterpretations(variant) {
        const url = '/interpretations';
        if (variant){
            setIsLoadingInterpretation(true);
            //Temp. Hard-coded variant Object to pass to /interpretations
            const initialInterpretationObject = {
                affiliation: props.auth && props.auth.currentAffiliation && props.auth.currentAffiliation.affiliation_id,
                date_created: moment(new Date()).format("lll"),
                item_type: "interpretation",
                last_modified: moment(new Date()).format("lll"),
                submitted_by: props.auth.PK,
                modified_by: props.auth ? props.auth.PK : null,
                status: "In Progress",
                variant: variant.PK,
                population: "", // not sure what this is?
                diseaseTerm: "" //Sometimes available, otherwise empty/added later
            };
            const params = {body: {initialInterpretationObject}}
            requestRecycler.capture(API.post(API_NAME, url, params)).then(data => {
                // console.log('Interpretations POST Response', data);
                const interpretationObject = data;

                handleInterpretationUpdate(interpretationObject);
                
                setIsLoadingInterpretation(false);
                history.push(`/variant-central/${variant.PK}/interpretation/${interpretationObject.PK}`);
                updateView("Interpretation");
            })
            .catch(err => {
                if (API.isCancel(err)) {
                    return;
                }
                setIsLoadingInterpretation(false);
                console.log(err)
            });
        }
        else{
            console.log('Nothing to POST');
        }
    }

    const fetchHypothesisData = () => {
      setIsLoadingHypothesis(true);
      const carId = lodashGet(variant, 'carId');
      const clinvarVariantId = lodashGet(variant, 'clinvarVariantId');
      
      const urls = [
        { url: `https://hypothes.is/api/search?tag=CAID:${carId}&limit=200`, tag: `CAID:${carId}` },
        { url: `https://hypothes.is/api/search?tag=ClinVarID:${clinvarVariantId}&limit=200`, tag: `ClinVarID:${clinvarVariantId}` }
      ];
      
      let config = {
        headers: {
          "Authorization": `Bearer ${process.env.REACT_APP_HYPOTHESIS_TOKEN}`
        }
      };
      
      let requests = urls.map(item => axios.get(item.url, config).then(response => ({...response, tag: item.tag})));
    
      Promise.all(requests).then(response => {
        handleHypothesisData(response);
      })
      .catch(err => {
        if (axios.isCancel(err)) {
          return;
        }
        setIsLoadingHypothesis(false);
        console.error('Hypothesis Fetch Error=: %o', err);
      });
    };
    
    const handleHypothesisData = (responses) => {
      // Determine the response with the greatest total
      let response = responses.reduce((max, current) => max.data.total > current.data.total ? max : current);
      if (response.data && response.data.rows[0]) {
        // Construct the URL using the tag of the response with the greatest total
        const hypothesisLink = `https://hypothes.is/search?q=tag:${encodeURIComponent(response.tag)}`;
        const hypothesisTotal = response.data.total;
        let hypothesisData = {
          hypothesisLink,
          hypothesisTotal
        };
        setHypothesisData(hypothesisData);

        // Check for automated/ML annotations created by 
        // see https://github.com/ClinGen/gene-and-variant-curation-tools/issues/386
        const automatedAnnotations = response.data.rows.filter(
          row => row.user === ""
        );
        if (automatedAnnotations.length > 0) {
          setAutomatedAnnotationTotal(automatedAnnotations.length);
        }
        setIsLoadingHypothesis(false);
      }
    };

    const handleAgreeToDisclaimer = () => {
        updateInterpretations(variant);
        setShowPhiDisclaimerModal(false);
    };

    const renderDiseaseDescription = () => {
        if (disease && disease.PK) {
            if (disease.PK.includes('FREETEXT')) {
                return (
                    <span className="ml-1">
                        {`${disease.term} (`}
                        {disease.phenotypes
                            && (
                                <Popover
                                    trigger="focus"
                                    triggerComponent={<div className="m-0 link-button btn-link">View HPO Term(s)</div>}
                                    content={disease.phenotypes.join(', ')}
                                />
                            )
                        }
                        {disease.definition
                            && (
                                <>
                                    {disease.phenotypes ? ', ' : ''}
                                    <Popover
                                        trigger="focus"
                                        triggerComponent={<div className="m-0 link-button btn-link">View Definition</div>}
                                        content={disease.definition}
                                    />
                                </>
                            )
                        }
                        {')'}
                    </span>
                );
            } else {
                const formattedDiseaseId = convertDiseasePKToMondoId(disease.PK);
                return (
                    <span className="ml-1">
                        {displayObsoleteDiseaseIcon(disease.term, "interpretation")}
                        {disease.term} (<a href={`${mondoUrl}${disease.PK}`} target="_blank" rel="noopener noreferrer">{formattedDiseaseId}</a>)
                    </span>
                );
            }
        }
    }

    if (variant) {
        let dbSNPId = (variant.dbSNPIds && variant.dbSNPIds.length) ? variant.dbSNPIds[0] : null;
        if (dbSNPId && dbSNPId.indexOf('rs') < 0) {
            dbSNPId = 'rs' + dbSNPId;
        }
        let nameList;
        if (variant.otherNameList) {
            nameList = variant.otherNameList.map((name, i) => {
                return (
                    <li key={i}>{name}</li>
                )
            })
        }

        const { gRCh38, gRCh37 } = getGenomicLinkouts(variant);
        const gRCh38Links = gRCh38 && setContextLinks(gRCh38, 'GRCh38');
        const gRCh37Links = gRCh37 && setContextLinks(gRCh37, 'GRCh37');

        const cspecVersionUiLink = lodashGet(cspecDoc, 'ruleSetDoc.cspecInfo.cspecVersionUiLink', null);
        const cspecUiLink = lodashGet(cspecDoc, 'ruleSetDoc.cspecInfo.cspecUiLink', null);
          
        const cspecHref = cspecVersionUiLink ? cspecVersionUiLink : cspecUiLink;
        const cspecLink = cspecDoc?.ruleSetDoc?.cspecInfo?.documentName
          ? cspecDoc.ruleSetDoc.cspecInfo.documentName
          : null;
        
        const modifiedPathogenicity = interpretation && interpretation.provisionalVariant
            && interpretation.provisionalVariant.alteredClassification
            ? interpretation.provisionalVariant.alteredClassification
            : null;
        
        const calculatedPathogenicity = props.calculatedPathogenicity
            ? props.calculatedPathogenicity
            : interpretation && interpretation.provisionalVariant
                ? interpretation.provisionalVariant.autoClassification
                : null;

        const baselineTotal = hypothesisData.hypothesisTotal - automatedAnnotationTotal;
        let currentBatch = null;
        let previousBatches = null;
        if (clinVarSubmissionBatches && clinVarSubmissionBatches.length) {
            // clinVarSubmissionBatches has all batches (open & closed) that current interpretation has been added to
            // Check if current interpretation is included in current affiliation's open batch
            currentBatch = getOpenBatch(clinVarSubmissionBatches);
            // Get closed batches current interpretation is associated with and list the names as hoverover/expansion list
            const closedBatches = getBatchesByStatus(clinVarSubmissionBatches, "closed");
            previousBatches = closedBatches && closedBatches.length ? closedBatches.map((b) => { return b.batch_name; }).join(', ') : null;
        }

        //“ERepo” if interpretation status is published else --
        const publishingStatus = (interpretation.status === "Published") ? "erepo" : "--";

        return(
            <div className="card-group mt-3">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title text-muted">Variant ID Sources</h5>
                        <div className="card-text">
                            {variant.clinvarVariantId &&
                                <>
                                    ClinVar Variation ID:
                                    <a
                                        href={`${EXTERNAL_API_MAP['ClinVarSearch']}${variant.clinvarVariantId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`ClinVar page for ${variant.clinvarVariantId} in a new window`}
                                    >
                                        <strong> {variant.clinvarVariantId || "--"}</strong>
                                    </a>
                                    <br />
                                </>
                            }
                            {variant.carId &&
                                <>
                                    ClinGen Allele Registry ID:
                                    <a
                                        href={`http://reg.genome.network/allele/${variant.carId}.html`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`ClinGen Allele Registry page for ${variant.carId} in a new window`}
                                    >
                                        <strong> {variant.carId || "--"}</strong>
                                    </a>
                                    <br />
                                </>
                            }
                            {(variant.dbSNPIds && Boolean(variant.dbSNPIds.length)) &&
                                <>
                                    dbSNP ID:
                                    <a
                                        href={`https://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=${dbSNPId.replace('rs', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`dbSNP page for ${dbSNPId} in a new window`}
                                    >
                                        <strong> {dbSNPId}</strong>
                                    </a>
                                    <br />
                                </>
                            }
                            {nameList &&
                                <span>Other Names: <ul>{nameList}</ul></span>
                            } 
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title text-muted">Links to External Resources</h5>
                        <ExternalResourcesPanel
                            view="card"
                            gRCh38={gRCh38}
                            gRCh37={gRCh37}
                            gRCh38Links={gRCh38Links}
                            gRCh37Links={gRCh37Links}
                        />
                        {!isLoadingHypothesis && !isEmpty(hypothesisData) ? 
                          <div>
                            {baselineTotal > 0 && (
                              <div>
                                <ExternalLink href={hypothesisData.hypothesisLink}>
                                  {baselineTotal} Baseline Community Annotation(s)
                                </ExternalLink>
                                <InfoIcon tooltip={
                                  `Access the Hypothesis search for this variant via the link.
                                  Click the annotation and "Visit annotation in context" for more details.
                                  Note: Requires Hypothes.is login and group access.
                                  Need help? Contact volunteer@clinicalgenome.org.`
                                }/>
                              </div>
                            )}
                            {/* Display a separate link if automated/ML variant annotations exist in Hypothesis */}
                            {automatedAnnotationTotal > 0 && (
                              <div className="mt-2">
                                <ExternalLink href={`${hypothesisData.hypothesisLink}&user=`}>
                                  <FontAwesomeIcon icon={faRobot} className="mr-1" />
                                  {automatedAnnotationTotal} Automated Annotation(s) in Hypothesis
                                </ExternalLink>
                                <InfoIcon tooltip={
                                    `Access the Hypothesis search for this variant via the link. 
                                    These annotations are automated via our  user.
                                    Click the annotation and "Visit annotation in context" for more details. 
                                    Note: Requires Hypothes.is login and group access. Need help? Contact volunteer@clinicalgenome.org.`
                                  }
                                />
                              </div>
                            )}
                          </div>
                          : null}
                    </div>
                </div>
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title text-muted">
                            {viewValue !== 'Evidence' && !isCurrentInterpretationMine && myInterpretation ? (
                                <Link to={`/variant-central/${variant.PK}/interpretation/${myInterpretation.PK}`}>My interpretation</Link>
                            ) : <>My Interpretation</>}
                        </h5>
                        {isLoadingInterpretation ? (
                            <LoadingSkeleton count={4} randomWidth minWidth={50} duration={1} />
                        ) : <p className="card-text">
                            {/* create interpretation button */}
                            {(
                                viewValue === "Evidence" || 
                                !myInterpretation // when viewing others interpretation, show create button if no interpretation of mine yet
                            ) ? ( 
                                <button
                                    onClick={() => setShowPhiDisclaimerModal(true)}
                                    className="btn btn-outline-primary btn-lg btn-block"
                                    disabled={variant.status === 'deleted'}
                                >
                                    Interpretation <FontAwesomeIcon className="ml-3" icon={faPlus} />
                                </button>
                            ) : (
                                // display interpretation info
                                <>
                                <span className="d-flex">
                                    <strong>Disease: </strong>
                                    {!isEmpty(disease)
                                        ? renderDiseaseDescription()
                                        : (
                                            <Button
                                                className="ml-1 link-button"
                                                variant="link"
                                                onClick={() => setShowDiseaseModal(true)}
                                            >
                                                Add Disease <FontAwesomeIcon icon={faPlus} />
                                            </Button>
                                        )
                                    }
                                </span>
                                <strong>Classification: </strong>{modifiedPathogenicity || calculatedPathogenicity}<br/>
                                <strong>Provisional/Approved Status: </strong>
                                {props.interpretation.status === "Published" ?
                                    "Approved"
                                    : props.interpretation.status}
                                <br/>
                                <strong>Publishing Status: </strong>
                                {publishingStatus ?
                                    publishingStatus === "erepo" ?
                                        <span className={'badge badge-published'}>ERepo</span>
                                        : publishingStatus
                                    : null
                                }
                                {publishingStatus && <><br/></>}
                                {currentBatch &&
                                    <Button className="link-button" variant="link"
                                        onClick={() => history.push('/clinvar-batch-submit')}>{currentBatch.batch_name}
                                    </Button>
                                }
                                {currentBatch && <><br/></>}
                                {previousBatches &&
                                    <>
                                    <Popover
                                        triggerComponent={<div className="px-1 py-1 my-1 link-button btn-info">Closed Batches</div>}
                                        content={previousBatches}
                                        placement="top"
                                    />
                                    <span className="ml-1 classification-link-item">
                                    <Link to={'/clinvar-batch-submit'}>
                                        <i className="icon icon-link"></i>
                                    </Link>
                                    </span>
                                    </>
                                }
                                {previousBatches && <><br/></>}
                                {isLoadingCspecDoc ? (
                                  <LoadingSkeleton count={3} />
                                ) : cspecHref && cspecLink ? (
                                      <>
                                        <strong>Specification Document: </strong>
                                        <ExternalLink href={cspecHref}>{cspecLink}</ExternalLink>
                                      </>
                                ) : null}
                                <br/>
                                {isCurrentInterpretationMine
                                    ? (viewValue === 'Audit Trail')
                                        ? (
                                            <Button className="link-button" variant="link"
                                                onClick={() => onViewUpdate('Interpretation')}>View Interpretation
                                            </Button>)
                                        : (
                                            <Button className="link-button" variant="link"
                                                onClick={() => onViewUpdate('Audit Trail')}
                                                disabled={props.isCalculatingPathogenicity}>View Audit Trail
                                            </Button>)
                                    : null}
                                </>
                            )}
                        </p>}
                    </div>
                </div>
                <DiseaseModal
                    show={showDiseaseModal}
                    onHide={() => setShowDiseaseModal(false)}
                    id="addDiseaseModal"
                    title="Add Disease"
                    parentEndpoint="interpretations"
                    parentToInsertDisease={props.interpretation}
                    updateParentObj={handleInterpretationUpdate}
                    userPK={props.auth ? props.auth.PK : null}
                />
                <Modal
                    size="lg"
                    type="warning"
                    show={showPhiDisclaimerModal}
                    onHide={() => setShowPhiDisclaimerModal(false)}
                    id="phiDisclaimerModal"
                    title="Submission Policy Agreement"
                    saveButtonText="Agree"
                    hideButtonText="Disagree"
                    onSave={handleAgreeToDisclaimer}
                >
                    <p>
                        Users planning to submit evidence to the ClinGen curation interface(s)
                        acknowledge and agree to the following:
                    </p>
                    <ol>
                        <li>
                            Any data entered into the VCI may be made publicly accessible,
                            either through the VCI directly or by subsequent transfer to other
                            public resources (ClinVar, ClinGen Evidence Repository, etc.);
                        </li>
                        <li>
                            All unpublished patient-specific data entered into the VCI, which
                            is not explicitly consented for public sharing, should
                            be the <strong>minimum necessary</strong> to inform the clinical significance
                            of genetic variants; and
                        </li>
                        <li>
                            Data entered into the VCI should not
                            include <a href="https://www.hipaajournal.com/considered-phi-hipaa/" target="_blank" rel="noopener noreferrer">protected health information (PHI)</a> or
                            equivalent identifiable information as defined by regulations in your country or region;
                        </li>
                    </ol>
                    <p>Do you agree to these terms?</p>
                </Modal>
            </div>
        )
    }
}

const mapStateToProps = state => ({
    auth: state.auth,
    variant: state.variant,
    interpretation: state.interpretation,
});

export default connect(mapStateToProps)(VariantDetails);
