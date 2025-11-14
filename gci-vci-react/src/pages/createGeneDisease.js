import React, { useContext, useState, useEffect } from 'react';
import { Row, Col, Container, Jumbotron, Button } from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faEdit, faCheck } from '@fortawesome/free-solid-svg-icons';
import lodashGet from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import moment from 'moment';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';
import axios from 'axios';
import { useHistory } from "react-router-dom";

import { parseHGNC } from '../helpers/parse-hgnc';
import { isUserAllowedToCreateGdm } from "../helpers/allowCreateGdm";
import { getUserName } from "../helpers/getUserName";
import { AffilsContext, getAffiliationName, getAffiliationByID } from '../helpers/affiliationsHelpers.js';
import { gdmModesOfInheritance } from '../components/gene-central/GdmModesOfInheritance';
import Modal from '../components/common/Modal';
import DiseaseModal from '../components/common/DiseaseModal';
import { LoadingButton } from "../components/common/LoadingButton";
import { useSelector } from 'react-redux';
import { EXTERNAL_API_MAP } from '../constants/externalApis'
import { convertDiseasePKToMondoId } from '../utilities/diseaseUtilities';
import { isProdSite } from '../utilities/siteUtilities';


/**
 * Create Gene Disease Page / Search
 * !!! TODO: Break this out into components
**/
function CreateGeneDisease() {

    const [HGNCGene, setHGNCGene] = useState('');
    const [adjective, setAdjective] = useState("");
    const [adjectives, setAdjectives] = useState([]);
    const [adjectiveDisabled, setAdjectiveDisabled] = useState(true);
    
    const [activeMOI, setActiveMOI] = useState("");
    const [showDiseaseModal, setShowDiseaseModal] = useState(false);
    const [disease, setDisease] = useState({});
    const [precurationId, setPrecurationId] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [geneSymbolValidation, setGeneSymbolValidation] = useState(null);
    const [diseaseValidation, setDiseaseValidation] = useState(null);
    const [moiValidation, setMoiValidation] = useState(null);
    const [precurationIdValidation, setPrecurationIdValidation] = useState(null);
    const [geneTrackerError, setGeneTrackerError] = useState(null);

    const [confirmGdm, setConfirmGdm] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const moiValues = Object.values(gdmModesOfInheritance);
    const history = useHistory();

    const auth = useSelector(state => state.auth);

    useEffect(()=>{
        console.log('disease', disease);
    }, [disease, confirmGdm])

    const handleCancel = () => {
        history.push("/dashboard");
    };

    // Handle Mode of Inheritance Select Changes & Adjective Options
    const handleMOIChange = (value) => {
        if (value){
            moiValues.forEach((object)=>{
                if (object.value === value){
                    setAdjectives(object.adjectives);
                    setActiveMOI(object.value);
                    setAdjective("");
                    setAdjectiveDisabled(false);
                }
            })
        }
        else {
            setAdjectives([]);
            setActiveMOI("");
            setAdjective("");
            setAdjectiveDisabled(true);
        }
        setErrorMsg(null);
        setMoiValidation(null);
        setGeneTrackerError(null);
        setPrecurationIdValidation(null);
    }

    const handleChange = (e) => {
        setErrorMsg(null);
        setGeneTrackerError(null);
        setPrecurationIdValidation(null);
        setGeneSymbolValidation(null);
        if (e.target.name === "geneSymbol") {
            if (e.target.value) {
                setHGNCGene((e.target.value.trim()).toUpperCase())
            } else {
                setHGNCGene("");
            }
        }
        if (e.target.name === "precurationId") {
            setPrecurationId(e.target.value.trim());
            setDiseaseValidation(null);
            setMoiValidation(null);
        }
    }

    const handleAdjective = (value) => {
        if (value){
            setAdjective(value);
        }
        else{
            setAdjective("");
        }
    }

    const handleDiseaseModal = (e) => {
        e.preventDefault();
        setShowDiseaseModal(true)
    }

    const handleCurate = () => {
      setShowConfirmModal(false);
      history.push('/curation-central/' + lodashGet(confirmGdm, "PK", ''));
    }

    const handleCancelCurate = () => {
      setShowConfirmModal(false);
    }

    const updateDisease = (disease) => {
        setDisease(disease);
        setDiseaseValidation(null);
        setShowDiseaseModal(false);
        setErrorMsg(null);
        setGeneTrackerError(null);
        setPrecurationIdValidation(null);
    }

    /**
     * Method to post GDM creation data to /track-data which sends data to Data Exchange for UNC tracking system
     * @param {object} data - data object
     */
    const postGdmCreationData = (data) => {
        return new Promise((resolve, reject) => {
            if (data) {
                const params = {body: {data}};
                API.post(API_NAME, '/messaging/track-data', params).then(result => {
                    if (result.status === 'Success') {
                        console.log(`Post tracking data for created GDM ${data}`);
                        console.log('Post tracking data succeeded: %o', result);
                        resolve(result);
                    } else {
                        console.error(`Post tracking data for created GDM ${data}`);
                        console.error('Post create GDM tracking data failed with Error - %o ', result);
                        reject(result);
                    }
                }).catch(error => {
                    console.error(`Post tracking data for created GDM ${data}`);
                    console.error('Post tracking data internal data retrieval error: %o', error);
                    reject(error);
                });
            } else {
                console.error('Post tracking data Error: Missing expected GDM creation data');
                reject({'message': 'Missing expected GDM creation data'});
            }
        });
    }

    /**
     * Method to create necessary data object to be sent to Data Exchange for UNC tracking
     * @param {object} gdm - GDM object
     * @param {string} hgncId - HGNC Id
     */
    const setUNCData = (gdm, disease, hgncId) => {
        const submitterName = getUserName(auth);
        const submitterPK = lodashGet(auth, "PK", '');
        const submitterEmail = lodashGet(auth, "email", '');
        const start = lodashGet(gdm, "modeInheritance", null) ? gdm.modeInheritance.indexOf('(') : -1;
        const end = lodashGet(gdm, "modeInheritance", null) ? gdm.modeInheritance.indexOf(')') : -1;
        const hpoNumber = (start > -1 && end > -1) ? gdm.modeInheritance.substring(start + 1, end) : gdm.modeInheritance ? gdm.modeInheritance : '';
        return {
            report_id: lodashGet(gdm, "PK", null),
            precuration_id: lodashGet(gdm, "precurationId", null),
            gene_validity_evidence_level: {
                genetic_condition: {
                    mode_of_inheritance: hpoNumber,
                    condition: lodashGet(disease, "PK", null) ? disease.PK.replace('_', ':') : '',
                    gene: hgncId
                },
                evidence_level: '',
                gene_validity_sop: ''
            },
            date: moment(lodashGet(gdm, "date_created", '')).toISOString(),
            status: 'created',
            performed_by: {
                name: submitterName,
                id: submitterPK,
                email: submitterEmail,
                on_behalf_of: {
                    id: lodashGet(gdm, "affiliation", null) ? gdm.affiliation : '',
                    name: lodashGet(gdm, "affiliation", null) ? getAffiliationName(gdm.affiliation, affiliationsData, 'gcep') : ''
                }
            },
            contributors: [
                {
                    name: submitterName,
                    id: submitterPK,
                    email: submitterEmail,
                    roles: ["creator"]
                }
            ]
        };
    }
    
    // Handle all search validation + checking GDM + Gene...should break this up more probably
    const submitForm = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        if (HGNCGene && disease.PK && activeMOI) {

            // First, check HGNC to see Gene Symbol is valid
            const response = await axios.get(EXTERNAL_API_MAP['HGNCFetch'] + HGNCGene);

            const hgncResponse = response.data.response;
            let hgncId = '';

            if (hgncResponse && hgncResponse.numFound > 0) {
                const hgncGene = hgncResponse.docs ? parseHGNC(hgncResponse.docs[0]) : null;
                setGeneSymbolValidation('valid');

                if (hgncGene && hgncGene.symbol) {
                    // Check if precurationId is valid and its data matches with GDM
                    validateGeneTrackerId().then(() => {
                        setHGNCGene(hgncGene.symbol);
                        const geneSymbol = hgncGene.symbol;
                        hgncId = hgncGene.hgncId;

                        // Check if gene already present in DB (by HGNC gene symbol)
                        API.get(API_NAME, `/genes/${geneSymbol}`).then(geneSearch => {
                            if (geneSearch && geneSearch.total !== 0) {
                                console.log("Gene already exists!", geneSearch);
                                return searchGDM(geneSymbol, disease, activeMOI, hgncId)
                            } else {
                                console.log('Gene doesnt exist yet', geneSymbol);
                                const params = { body: {hgncGene} };
                                // If not in DB, add gene
                                API.post(API_NAME, '/genes', JSON.parse(params)).then(postResult=>{
                                    if (postResult) {
                                        console.log("POST Gene", postResult)
                                        return searchGDM(geneSymbol, disease, activeMOI, hgncId)
                                    }
                                }).catch(err => {
                                    console.error(`Error adding gene ${geneSymbol} to DB: `, err);
                                    // display error
                                    setErrorMsg(`Problem saving gene ${geneSymbol} data to database.`);
                                    setIsLoading(false);
                                })
                            }
                        }).catch(err => {
                            console.error(`Error fetching gene ${geneSymbol} from DB: `, err);
                            setErrorMsg(`Problem fetching gene ${geneSymbol} data from database. Error: ${err}`);
                            setIsLoading(false);
                        })
                    }).catch(() => {
                        // All errors are taken care and set in validateGeneTrackerId()
                        setIsLoading(false);
                    });
                } else {
                    console.error(`Search by ID ${HGNCGene} from HGNC returned empty data`);
                    setErrorMsg(`Gene symbol ${HGNCGene} not found at HGNC.`);
                    setGeneSymbolValidation('invalid');
                    setIsLoading(false);
                }
            } else {
                // Fire Gene Symbol Validation
                console.error(`Search by ID ${HGNCGene} from HGNC failed`);
                setErrorMsg(`Gene symbol ${HGNCGene} not found at HGNC.`);
                setGeneSymbolValidation('invalid');
                setIsLoading(false);
            }
        } else {
            // Disease is missing
            if (!disease.PK) {
              setDiseaseValidation('invalid');
              setIsLoading(false);
            }
        }
    }

    /**
     * Method to display error message when checking precuration data in GeneTracker against GDM user is trying to create.
     */
    const renderGeneTrackerError = () => {
        const geneTrackerURL = `${EXTERNAL_API_MAP['geneTracker']}`;
        const precurationURL = `${EXTERNAL_API_MAP['geneTrackerCurations']}/${precurationId}`;
        const contactMsg = (<p>If you have any questions, please contact GeneTracker helpdesk at <a
            href='mailto:clingentrackerhelp@unc.edu'>clingentrackerhelp@unc.edu <i className="icon icon-envelope"></i></a> or Stanford helpdesk at <a
            href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a></p>);

        if (!geneTrackerError || geneTrackerError === "") {
            return null;
        } else if (geneTrackerError === "aff") {
            return (
                <>
                <p>The GeneTracker ID you have entered belongs to a different affiliation. Please check that you are curating within the correct affiliation.</p>
                {contactMsg}
                </>
            );
        } else if (geneTrackerError === "notFound") {
            return (
                <>
                <p>The GeneTracker precuration ID '{precurationId}' is invalid. Please check for the correct ID in the <a href={geneTrackerURL} target="_blank" rel="noopener noreferrer">GeneTracker</a></p>
                {contactMsg}
                </>
            );
        } else {
            const pos = geneTrackerError.lastIndexOf(',');
            const fieldNames = pos === -1 ? geneTrackerError
                : geneTrackerError.slice(0,pos) + ' and ' + geneTrackerError.slice(pos+1);

            return (
                <>
                <p>The precuration information in the GeneTracker does not match the GDM you are trying to create. Please confirm the correct {fieldNames} information in the <a href={precurationURL} target="_blank" rel="noopener noreferrer">GeneTracker</a></p>
                {contactMsg}
                </>
            );
        }
    }

    /**
     * Method to check if the given precurationID is valid and data returned from GeneTracker matches the gdm to be created.
     */
    const { affiliationsData } = useContext(AffilsContext);
    const validateGeneTrackerId = () => {

        return new Promise((resolve, reject) => {
            // If no precurationId is entered, no need to do checking.
            if (precurationId === "") {
                resolve();
            } else {
                let valid = true;
                // Get precuration data from GeneTracker to check if matches with GDM
                // TODO: can be changed to call from frontend if CORS is set in GeneTracker
                API.get(API_NAME, `/precurations/${precurationId}`).then(response => {
                    if (response.status_code === 200) {
                        const precurationData = lodashGet(response, "body.data");
                        if (!isEmpty(precurationData)) {
                            const foundGene = lodashGet(precurationData, "gene_symbol", null);
                            const foundDisease = lodashGet(precurationData, "mondo_id", null);
                            const foundMoi = lodashGet(precurationData, "moi.hp_id", null);
                            const foundAffClingenId = lodashGet(precurationData, "expert_panel.affiliation.clingen_id", "");
                            const start = activeMOI.indexOf('(');
                            const end = activeMOI.indexOf(')');
                            const hpoNumber = (start > -1 && end > -1) ? activeMOI.substring(start + 1, end) : activeMOI;
                            const gdmAffiliation = lodashGet(auth, "currentAffiliation.affiliation_id", null)
                             ? getAffiliationByID(auth.currentAffiliation.affiliation_id, affiliationsData) : null;
                            const gdmAffGCEPId = gdmAffiliation ? lodashGet(gdmAffiliation, "subgroups.gcep.id") : "";

                            let gtError = "";
                            if (foundGene !== HGNCGene) {
                                gtError = "gene";
                                setGeneSymbolValidation("notMatch");
                            }
                            if (foundDisease !== convertDiseasePKToMondoId(disease.PK)) {
                                gtError = `${gtError}${gtError === "" ? "" : ", "}disease`;
                                setDiseaseValidation("notMatch");
                            } else {
                                setDiseaseValidation("valid");
                            }
                            if (foundMoi !== hpoNumber) {
                                gtError = `${gtError}${gtError === "" ? "" : ", "}MOI`;
                                setMoiValidation("notMatch");
                            } else {
                                setMoiValidation("valid");
                            }
                            if (gtError === "") {
                                if (foundAffClingenId.toString() !== gdmAffGCEPId) {
                                    setGeneTrackerError("aff");
                                    setPrecurationIdValidation("notMatch");
                                    valid = false;
                                }
                            } else {
                                setGeneTrackerError(gtError);
                                setPrecurationIdValidation("notMatch");
                                valid = false;
                            }
                        } else {
                            // Given GeneTracker precuration ID is not found on GeneTracker.
                            setGeneTrackerError("notFound");
                            setPrecurationIdValidation("invalid");
                            valid = false;
                        }
                    } else {
                        setErrorMsg(`GeneTracker returned error: ${response.statusCode} - ${response.body.error}.`);
                        valid = false;
                        setPrecurationIdValidation("invalid");
                    }

                    if (valid) {
                        setPrecurationIdValidation("valid");
                        resolve();
                    } else {
                        reject();
                    }
                }).catch(err => {
                    const msg = lodashGet(err, "response.data.error", "");
                    console.error(`Error fetching precuration data for ID "${precurationId}" from Gene Tracker: ${err}\nReturned message:${msg}`);
                    // Catch the curation not found 404 error from GeneTracker
                    if (msg.includes("404 curation not found error")) {
                        setGeneTrackerError("notFound");
                    } else {
                        setErrorMsg(`Problem fetching precuration data for ID "${precurationId}" from Gene Tracker.  Returned message: ${msg}`);
                    }
                    setGeneSymbolValidation(null);
                    setPrecurationIdValidation("invalid");
                    reject();
                });
            }
        });
    }

    // Check existing GDM objects with matching Gene + Disease + MOI
    // If not found, POST new object, otherwise forward user to curation-central
    const searchGDM = (gene, disease, mode, hgncId) => {
        const url = '/gdms';
        API.get(API_NAME, `/gdms?gene=${gene}&disease=${disease.PK}&modeInheritance=${mode}`).then(gdmSearch => {
            console.log('gdm search result', gdmSearch)
            if (!gdmSearch.length && auth) {
                // No matching GDM found
                // Construct GDM Object to POST
                const newGdm = {
                    gene: gene,
                    disease: disease.PK,
                    diseaseTerm: disease.term,
                    modeInheritance: mode,
                    precurationId: precurationId,
                    status: "In progress",
                    contributors: [auth.PK],
                    submitted_by: auth.PK,
                    modified_by: auth.PK,
                };

                // Add affiliation if the user is associated with an affiliation
                if (auth.currentAffiliation) {
                    newGdm.affiliation = auth.currentAffiliation.affiliation_id;
                }

                if (adjective) {
                    newGdm['modeInheritanceAdjective'] = adjective;
                }

                const params = { body: {newGdm} };

                API.post(API_NAME, url, params).then(gdmResult => {

                    // Gather GDM creation data to be sent to Data Exchange
                    let uncData = setUNCData(gdmResult, disease, hgncId);

                    // Post GDM creation data to Data Exchange
                    postGdmCreationData(uncData).then(() => {
                        console.log('Successfully sent GDM creation data to Data Exchange for GDM %s at %s', gdmResult.PK, moment(gdmResult.date_created).toISOString());
                    }).catch(error => {
                        console.error('Error sending GDM creation data to Data Exchange for GDM %s at %s - Error: %o', gdmResult.PK, moment(gdmResult.date_created).toISOString(), error);
                        console.error(uncData);
                    });

                    setIsLoading(false);
                    history.push('/curation-central/' + gdmResult.PK);
                }).catch(err=> {
                    console.error(`Problem saving new GDM - ${newGdm} to database`);
                    console.error(err);
                    setErrorMsg('Problem saving GDM to database.');
                    setIsLoading(false);
                })
            } else if (gdmSearch && gdmSearch.length > 0 ) {
                // Otherwise exact GDM already exists, forward user to curation
                console.log('GDM Already Exists!', gdmSearch)

                // bring up a modal to check if user wants to curate this GDM or create different GDM
                setConfirmGdm(gdmSearch[0]);
                setShowConfirmModal(true);
                setIsLoading(false);
            }
        }).catch(err=> {
            console.error(err);
            setErrorMsg('Problem searching GDM data from database.');
            setIsLoading(false);
        })
    }
    

    const allowToCreateGdm = isUserAllowedToCreateGdm(auth);
    const submitError  = !allowToCreateGdm ? "Only GCEP curators have permission to create new Gene-Disease Records" : errorMsg;
    const submitErrClass = 'submit-err pull-right ' + (!submitError && !geneTrackerError ? ' hidden' : '');
    // The precuration ID is only required in production site but not other dev/test sites.
    // However, if the precuration ID is given on dev/test sites, it will be validated and data is
    // checked against GDM to be created.
    const precurationIdRequired = isProdSite();
    const precurationIdLabel = precurationIdRequired ? " precuration ID: *" : " precuration ID:";

    return (
        <>
        <Jumbotron>
            <Container>
                <h1>Create New Gene-Disease Record</h1>
                <p className="text-muted mb-3">
                    Before proceeding with curation, make sure all relevant precuration has been performed and catalogued into the <a href={EXTERNAL_API_MAP['geneTracker']} target="_blank" rel="noopener noreferrer">GeneTracker</a>
                </p>

                <form onSubmit={submitForm} className="mt-5">
                    <Row>
                        <Col sm="6">
                            <label className="h4 text-muted">
                                <a href={EXTERNAL_API_MAP['HGNCHome']} target="_blank" rel="noopener noreferrer">HGNC</a> gene symbol: *
                            </label>
                            <input type="text" placeholder="e.g. DICER1" name="geneSymbol"
                                value={HGNCGene} onChange={handleChange}
                                className={`form-control form-control-lg uppercase-input  
                                ${geneSymbolValidation === 'valid' && ( 'form-valid' )}  
                                ${geneSymbolValidation === 'invalid' && ( 'form-invalid' ) }`}
                                required autoFocus
                            />
                            {geneSymbolValidation === 'invalid' && (<div className="invalid-feedback show">Gene Symbol is invalid</div>)}
                            {geneSymbolValidation === 'notMatch' && (<div className="invalid-feedback show">Gene Symbol does not match value in given precuration</div>)}
                        </Col>
                        <Col sm="6">
                            <label className="h4 text-muted">Select disease: *</label>
                            {disease && disease.term
                                ? <p><strong>{disease.term}
                                  {diseaseValidation === 'valid' ? <FontAwesomeIcon className="ml-2" icon={faCheck} color="green" /> : null}
                                  <button className="btn btn-link" onClick={e=>handleDiseaseModal(e)}><FontAwesomeIcon icon={faEdit} /></button></strong></p>
                                : <button className="btn btn-outline-primary btn-lg btn-block" onClick={e=>handleDiseaseModal(e)}><FontAwesomeIcon className="mr-3" icon={faPlusCircle} /> Disease</button>}
                            {diseaseValidation === 'invalid' && (<div className="invalid-feedback show">Disease is required</div>)}
                            {diseaseValidation === 'notMatch' && (<div className="invalid-feedback show">Disease does not match value in given precuration</div>)}
                            
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        <Col sm="6">
                            <label className="h4 text-muted">Mode of Inheritance: *</label>
                            <select placeholder="Mode of Inheritance" value={activeMOI}
                              onChange={(e)=>handleMOIChange(e.currentTarget.value)}
                              className={`form-control form-control-lg
                                ${moiValidation === 'valid' ? ' form-valid ' : '' }`}
                                required>
                                <option value="">Select</option>
                                {moiValues.map((modeOfInheritance, i) => {
                                    return <option key={i} value={modeOfInheritance.value}>{modeOfInheritance.value}</option>;
                                })}
                            </select>
                            {moiValidation === 'notMatch' && (<div className="invalid-feedback show">Mode of Inheritance does not match value in given precuration</div>)}
                        </Col>
                
                        <Col sm="6">
                            <label className="h4 text-muted">Adjective</label>
                            <select placeholder="Select an adjective" value={adjective} onChange={e=>handleAdjective(e.currentTarget.value)} className="form-control form-control-lg" disabled={adjectiveDisabled}>
                                <option value="">Select</option>
                                {adjectives.map((adjective, i) => {
                                    return <option key={i} value={adjective}>{adjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1]}</option>;
                                })}
                            </select>
                        </Col>
                    </Row>
                    <Row className="mt-5"><Col sm={{ span: 12 }}>
                            <label className="h4 text-muted">
                                <a href={EXTERNAL_API_MAP['geneTracker']} target="_blank" rel="noopener noreferrer">GeneTracker</a>{precurationIdLabel}
                            </label>
                            <input type="text" name="precurationId"
                                placeholder='e.g. 5332 (the precuration’s numeric ID from the GeneTracker URL)'
                                value={precurationId}
                                onChange={handleChange}
                                className={`form-control form-control-lg
                                ${precurationIdValidation === 'valid' ? ' form-valid ' : '' }
                                ${precurationIdValidation === 'invalid' ? ' form-invalid ' : '' }`}
                                required={precurationIdRequired}
                            />
                      {precurationIdValidation === 'invalid' && (<div className="invalid-feedback show">Precuration ID is invalid</div>)}
                      {precurationIdValidation === 'notMatch' && (<div className="invalid-feedback show">Precuration ID does not match</div>)}
                    </Col></Row>
                    <Row className="mt-5"><Col sm={{ span: 6, offset: 3 }} className={submitErrClass}>
                      <div>{submitError}</div>
                      {precurationIdValidation && renderGeneTrackerError()}
                    </Col></Row>
                    <Row>
                      <Col>
                        <LoadingButton
                            variant="primary"
                            className="float-right align-self-end mb-2 ml-2 btn-lg "
                            type="submit"
                            text='Continue'
                            isLoading={isLoading}
                            disabled={!allowToCreateGdm}
                        />
                        <Button
                            variant="secondary"
                            className="float-right align-self-end mb-2 ml-2 btn-lg "
                            onClick={() => handleCancel()}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                      </Col>
                    </Row>
                </form>
            </Container>
        </Jumbotron>
                    
        <DiseaseModal
            show={showDiseaseModal}
            onHide={() => setShowDiseaseModal(false)}
            id="addDiseaseModal"
            title="Select Disease"
            updateDisease={disease => updateDisease(disease)}
        />

        <Modal
            id="confirmCuration"
            show={showConfirmModal}
            hideButtonText="Cancel"
            saveButtonText={lodashGet(confirmGdm, 'affiliation') && lodashGet(auth, 'currentAffiliation.affiliation_id') && confirmGdm.affiliation === auth.currentAffiliation.affiliation_id ? "Curate" : "View"}
            onHide={() => handleCancelCurate()}
            onSave={() => handleCurate()}
        >
            <h2 className="lead">A curation record already exists for this gene/disease/mode of inheritance:</h2>
            <p><strong>{HGNCGene && HGNCGene} &#8211; {disease && disease.term} &#8211; {activeMOI && activeMOI}</strong></p>
            <h2 className="lead">This record currently belongs to:</h2>
            <p><strong>{lodashGet(confirmGdm, 'affiliation') && getAffiliationName(confirmGdm.affiliation, affiliationsData)}</strong></p>
        </Modal>

        </>
    );
}

export default CreateGeneDisease;
