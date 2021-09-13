import React, {useState, useEffect} from 'react';
import { Row, Col, Container, Jumbotron } from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faEdit } from '@fortawesome/free-solid-svg-icons';
import lodashGet from 'lodash/get';
import moment from 'moment';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';
import axios from 'axios';
import { useHistory } from "react-router-dom";

import { parseHGNC } from '../helpers/parse-hgnc';
import { isUserAllowedToCreateGdm } from "../helpers/allowCreateGdm";
import { getUserName } from "../helpers/getUserName";
import { getAffiliationName } from '../helpers/get_affiliation_name.js';
import { modesOfInheritance } from '../components/variant-central/mapping/ModesOfInheritance';
import Modal from '../components/common/Modal';
import DiseaseModal from '../components/common/DiseaseModal';
import { LoadingButton } from "../components/common/LoadingButton";
import { useSelector } from 'react-redux';

/**
 * Create Gene Disease Page / Search
 * !!! TODO: Break this out into components
**/
function CreateGeneDisease(props) {

    const [HGNCGene, setHGNCGene] = useState('');
    const [adjective, setAdjective] = useState("");
    const [adjectives, setAdjectives] = useState([]);
    const [adjectiveDisabled, setAdjectiveDisabled] = useState(true);
    
    const [activeMOI, setActiveMOI] = useState("");
    const [showDiseaseModal, setShowDiseaseModal] = useState(false);
    const [disease, setDisease] = useState({});

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [geneSymbolValidation, setGeneSymbolValidation] = useState(null);
    const [diseaseValidation, setDiseaseValidation] = useState(null);

    const [confirmGdm, setConfirmGdm] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const moiValues = Object.values(modesOfInheritance);
    const history = useHistory();

    const auth = useSelector(state => state.auth);

    useEffect(()=>{
        console.log('disease', disease);
    }, [disease, confirmGdm])

    // Handle Mode of Inheritance Select Changes & Adjective Options
    const handleMOIChange = (value) => {
        if (value){
            moiValues.forEach((object, i)=>{
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
    }

    const handleTextChange = (value) => {
        setErrorMsg(null);
        setGeneSymbolValidation(null);
        if (value){
            setHGNCGene(value.toUpperCase())
        }
        else{
            setHGNCGene("");
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
                    name: lodashGet(gdm, "affiliation", null) ? getAffiliationName(gdm.affiliation, 'gcep') : ''
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
        
        if (HGNCGene && disease.PK && activeMOI){

            // First, check HGNC to see Gene Symbol is valid
            const response = await axios.get('https://rest.genenames.org/fetch/symbol/' + HGNCGene);

            const hgncResponse = response.data.response;
            let hgncId = '';

            if (hgncResponse && hgncResponse.numFound > 0) {
                const hgncGene = hgncResponse.docs ? parseHGNC(hgncResponse.docs[0]) : null;
                setGeneSymbolValidation('valid');

                if (hgncGene && hgncGene.symbol) {
                    setHGNCGene(hgncGene.symbol)
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
                                if (postResult){
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
                        setErrorMsg(`Problem fetching gene ${geneSymbol} data from database.`);
                        setIsLoading(false);
                    })
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
                    postGdmCreationData(uncData).then(response => {
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
    const submitErrClass = 'submit-err pull-right ' + (!submitError ? ' hidden' : '');

    return (
        <>
        <Jumbotron>
            <Container>
                <h1>Create New Gene-Disease Record</h1>
                <p className="text-muted mb-3">
                    Before proceeding with curation, make sure all relevant precuration has been performed and catalogued into the <a href="https://gene-tracker.clinicalgenome.org" target="_blank" rel="noopener noreferrer">GeneTracker</a>
                </p>

                <form onSubmit={submitForm} className="mt-5">
                    <Row>
                        <Col sm="6">
                            <label className="h4 text-muted">
                                <a href="https://www.genenames.org/" target="_blank" rel="noopener noreferrer">HGNC</a> gene symbol
                            </label>
                            <input type="text" placeholder="e.g. DICER1" value={HGNCGene} 
                                onChange={e=>handleTextChange(e.currentTarget.value)} 
                                className={`form-control form-control-lg uppercase-input  
                                ${geneSymbolValidation === 'valid' && ( 'form-valid' )}  
                                ${geneSymbolValidation === 'invalid' && ( 'form-invalid' ) }`}
                                required autoFocus
                            />
                            {geneSymbolValidation === 'invalid' && (<div className="invalid-feedback show">Gene Symbol Invalid</div>)}
                        </Col>
                        <Col sm="6">
                            <label className="h4 text-muted">Select disease</label>
                            {disease && disease.term ? <p><strong>{disease.term} <button className="btn btn-link" onClick={e=>handleDiseaseModal(e)}><FontAwesomeIcon icon={faEdit} /></button></strong></p>
                                : <button className="btn btn-outline-primary btn-lg btn-block" onClick={e=>handleDiseaseModal(e)}><FontAwesomeIcon className="mr-3" icon={faPlusCircle} /> Disease</button>}
                            {diseaseValidation === 'invalid' && (<div className="invalid-feedback show">Disease is required</div>)}
                            
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        <Col sm="6">
                            <label className="h4 text-muted">Mode of Inheritance</label>
                            <select placeholder="Mode of Inheritance" value={activeMOI} onChange={(e)=>handleMOIChange(e.currentTarget.value)} className="form-control form-control-lg" required>
                                <option value="">Select</option>
                                {moiValues.map((modeOfInheritance, i) => {
                                    return <option key={i} value={modeOfInheritance.value}>{modeOfInheritance.value}</option>;
                                })}
                            </select>
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
                    <Row className="mt-5"><Col sm={{ span: 6, offset: 3 }} className={submitErrClass}>
                      <span>{submitError}</span>
                    </Col></Row>
                    <Row><Col sm={{ span: 6, offset: 3 }}>
                        <LoadingButton
                            variant="primary btn-block btn-lg mt-5"
                            type="submit"
                            text='Continue'
                            isLoading={isLoading}
                            disabled={!allowToCreateGdm}
                        />
                    </Col></Row>
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
            <p><strong>{lodashGet(confirmGdm, 'affiliation') && getAffiliationName(confirmGdm.affiliation)}</strong></p>
        </Modal>

        </>
    );
}

export default CreateGeneDisease;
