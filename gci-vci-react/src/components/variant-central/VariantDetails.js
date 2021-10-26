import React, { useState } from 'react';
import { connect } from 'react-redux'
import { Button } from 'react-bootstrap';
import moment from 'moment';
import { useHistory, Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { RestAPI as API } from '@aws-amplify/api-rest';
import isEmpty from 'lodash/isEmpty';
import { API_NAME } from '../../utils';
import { getGenomicLinkouts, setContextLinks } from '../variant-central/helpers/helpers';
import ExternalResourcesPanel from '../common/ExternalResourcesPanel';
import { ExternalLink } from "../common/ExternalLink";
import DiseaseModal from '../common/DiseaseModal';
import Modal from '../common/Modal';
import Popover from '../common/Popover';
import { EXTERNAL_API_MAP } from '../../constants/externalApis';
import { isOwnedByCurrentCuratingEntity } from '../../utilities/ownershipUtilities';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { useAmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';


const VariantDetails = (props) => {
    const requestRecycler = useAmplifyAPIRequestRecycler();
    const mondoUrl = 'https://www.ebi.ac.uk/ols/ontologies/mondo//terms?iri=http://purl.obolibrary.org/obo/';
    const [showDiseaseModal, setShowDiseaseModal] = useState(false);
    const [showPhiDisclaimerModal, setShowPhiDisclaimerModal] = useState(false);
    const history = useHistory();
    const { variant, interpretation, onViewUpdate, viewValue, isLoadingInterpretation, setIsLoadingInterpretation, relatedInterpretations, handleInterpretationUpdate } = props;
    const { disease } = interpretation || {};
    const myInterpretation = relatedInterpretations.find(interpretation => isOwnedByCurrentCuratingEntity(interpretation, props.auth));
    const isCurrentInterpretationMine = myInterpretation && interpretation && myInterpretation.PK === interpretation.PK;
    
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
                const formattedDiseaseId = disease.PK.replace('_', ':');
                return (
                    <span className="ml-1">
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

        const modifiedPathogenicity = interpretation && interpretation.provisionalVariant
            && interpretation.provisionalVariant.alteredClassification
            ? interpretation.provisionalVariant.alteredClassification
            : 'Not provided';
        
        const calculatedPathogenicity = props.calculatedPathogenicity
            ? props.calculatedPathogenicity
            : interpretation && interpretation.provisionalVariant
                ? interpretation.provisionalVariant.autoClassification
                : 'None';

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
                                        title={`GlinGen Allele Registry page for ${variant.carId} in a new window`}
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
                        {!props.isLoadingHypothesis && props.hypothesisData ? 
                          <div>
                            <i className="icon c3-icon"></i>
                            <ExternalLink href={props.hypothesisData.hypothesisLink}> {props.hypothesisData.hypothesisTotal} C3 Community Annotations</ExternalLink>
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
                                <strong>Pathogenicity: </strong>{calculatedPathogenicity}<br/>
                                <strong>Modified Pathogenicity: </strong>{modifiedPathogenicity}<br/>
                                <strong>Provisional/Approved Status: </strong>{props.interpretation.status}<br/>
                                {isCurrentInterpretationMine
                                    ? (viewValue === 'Audit Trail')
                                        ? (
                                            <Button className="link-button" variant="link"
                                                onClick={() => onViewUpdate('Interpretation')}>View Interpretation
                                            </Button>)
                                        : (
                                            <Button className="link-button" variant="link"
                                                onClick={() => onViewUpdate('Audit Trail')}>View Audit Trail
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
