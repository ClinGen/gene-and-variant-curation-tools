// switch to that view
import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux'
import { useHistory, useParams } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import lodashGet from "lodash/get";
import isEmpty from "lodash/isEmpty";

import { updateInterpretation, updateVariant } from '../actions/actions';
import { setCuratedEvidencesAction } from "../actions/curatedEvidenceActions";

import VariantView from '../components/variant-central/VariantView';
import VariantDetails from '../components/variant-central/VariantDetails';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Popover from '../components/common/Popover';
import { LoadingStatus, AmplifyAPIRequestRecycler, useAmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';
import { isOwnedByCurrentCuratingEntity } from '../utilities/ownershipUtilities';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import Alert from '../components/common/Alert';

const VariantCentralItem = (props) => {
    // Get Variant & Interpretation PK from url params
    const { rid: variantPKFromRoute } = useParams();
    const { variant, interpretation, auth } = props;
    const history = useHistory();
    const dispatch = useDispatch();
    const requestRecycler = useAmplifyAPIRequestRecycler();
    
    //Store whether user is in Evidence or Interpretation View to Local Storage
    const [ view, setView ] = useState("Evidence");
    const { disease } = interpretation || {};
    const [ isLoadingInterpretation, setIsLoadingInterpretation ] = useState(false);
    const [ basicInfoTabExternalAPILoadingStatus, setBasicInfoTabExternalAPILoadingStatus ] = useState(LoadingStatus.INITIAL);
    const [ basicInfoTabExternalAPIData, setBasicInfoTabExternalAPIData ] = useState({});
    const [ basicInfoTabExternalAPIErrorMessage, setBasicInfoTabExternalAPIErrorMessage ] = useState('');
    const [ classification, setClassification ] = useState({});
    const [ cspecDoc, setCspecDoc ] = useState({});
    const [ relatedInterpretations, setRelatedInterpretations ] = useState([]);
    const [ relatedInterpretationsSnapshots, setRelatedInterpretationsSnapshots ] = useState([]);
    const [ calculatedPathogenicity, setCalculatedPathogenicity ] = useState('');

    // Retrieve variant and store in redux

    // Retrieve interpretations and store in redux and local states
    useEffect(()=>{
        // Check existing Interpretations for matching Variant PK, 
        // Then redirect/update store accordingly
        const searchInterpretations = (variantPK) => {
            setIsLoadingInterpretation(true);
            // This will get refactored once we can verify this more directly via endpoint
            // const url = '/interpretations';
            const url = '/interpretations/' + variantPK;
            return requestRecycler.capture(API.get(API_NAME, url)).then(res=> {
                const variantRelatedInterpretations = Array.isArray(res) ? res : [];                
                // set all relevant interpretations of same variant for display in basic info tab
                setRelatedInterpretations(variantRelatedInterpretations);

                getRelatedInterpretationSnapshots(variantRelatedInterpretations).then(interpretations => {
                  setRelatedInterpretationsSnapshots(interpretations);
                }); 

                if (variantRelatedInterpretations.length) {
                    // Find the current user's interpretation
                    // User is only allowed to view/edit own interpretations
                    const currentInterpretation = variantRelatedInterpretations.find(interpretation => isOwnedByCurrentCuratingEntity(interpretation, auth));
                    if (currentInterpretation) {
                        dispatch(updateInterpretation(currentInterpretation));
                        setView("Interpretation");
                        fetchCspecDoc(currentInterpretation);
                    } else {
                        dispatch(updateInterpretation({}));
                        setView("Evidence");
                    }
                } else {
                    //Otherwise reset Interpretation redux object and view
                    dispatch(updateInterpretation({}));
                    setView("Evidence");
                }
                    
                setIsLoadingInterpretation(false);
            })
            .catch(error => {
                if (API.isCancel(error)) {
                    return;
                }
                setIsLoadingInterpretation(false);
            });
        }

        if (variantPKFromRoute) {
            // reset redux data
            dispatch(updateVariant({}));
            dispatch(updateInterpretation({}));

            // Update variant object state by PK
            const url ='/variants/' + variantPKFromRoute;
            requestRecycler.capture(API.get(API_NAME, url))
            .then(res => {
                dispatch(updateVariant(res));
                searchInterpretations(res.PK)

                fetchBasicInfoTabExternalAPIData({
                    variant: res,
                    setBasicInfoTabExternalAPIData,
                    setBasicInfoTabExternalAPILoadingStatus,
                    setBasicInfoTabExternalAPIErrorMessage,
                    requestRecycler
                });

                // fetch all associated curated evidences (curatedEvidences of all interpretations assoicated with this variant)
                // make sure to re-fetch whenever variant is changed
                fetchAllVariantCuratedEvidences(res.PK, dispatch, requestRecycler)
            })
            .catch(AmplifyAPIRequestRecycler.defaultCatch);
        }

    }, [dispatch, history, variantPKFromRoute, auth, requestRecycler]);

    const getRelatedInterpretationSnapshots = async (relatedInterpretations) => {
      if (relatedInterpretations && relatedInterpretations.length) {
        const relatedInterpretationsSnapshots = [];
        for (let i = 0; i < relatedInterpretations.length; i++) {
          let snapshotPKs = relatedInterpretations[i].snapshots && relatedInterpretations[i].snapshots.length 
            ? relatedInterpretations[i].snapshots 
            : [];
          // Fetch snapshots for each related interpretation and set the result to be passed down to basic info
          await fetchSnapshots(snapshotPKs).then(fetchedSnapshots => {
            const interpretation = {...relatedInterpretations[i], snapshots: fetchedSnapshots};
            relatedInterpretationsSnapshots.push(interpretation);
          });
        }
        return relatedInterpretationsSnapshots;
      }
    }

    const fetchSnapshots = async (snapshotPKs) => {
      let snapshotArray = [];
      for (let j = 0; j < snapshotPKs.length; j++) {
        await API.get(API_NAME, '/snapshots/' + snapshotPKs[j]).then(snapshot => {
          // Add PK, resource to snapshot, fields within resource are needed
          // to render status badges in basic info, PK needed for link
          if (snapshot) {
            snapshotArray.push(snapshot);
          }
        });
      }
      return snapshotArray;
    }

    const fetchCspecDoc = (interpretation) => {
      const cspecId = interpretation && interpretation.cspec ? interpretation.cspec.cspecId : '';
      if (cspecId) {
        API.get(API_NAME, `/cspec/${cspecId}`).then(cspecDoc => {
          if (cspecDoc) {
            setCspecDoc(cspecDoc);
          }
        }).catch(err => {
          console.log('CSPEC FETCH ERROR', err);
        });
      } else {
        setCspecDoc({});
      }
    }

    const handleCspecUpdate = (cspecDoc) => {
      setCspecDoc(cspecDoc);
    }

    const classificationCallback = (classification) => {
        setClassification(classification);
    }
    
    const calculatedPathogenicityCallback = (assertion) => {
        setCalculatedPathogenicity(assertion);
    }
    const renderVariantSubtitle = () => {
        if (isLoadingInterpretation) {
            return (
                <>
                    {/* for disease term text */}
                    <LoadingSkeleton count={1} randomWidth minWidth={40} maxWidth={60} duration={1} />
                    {/* for mode of inheritance text */}
                    <LoadingSkeleton count={1} randomWidth minWidth={20} maxWidth={50} duration={1} />
                </>
            )
        }

        if (!isEmpty(interpretation)) {
            const { modeInheritance, modeInheritanceAdjective } = interpretation;
            const mode = modeInheritance ? modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
            const adjective = modeInheritanceAdjective ? modeInheritanceAdjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
            if (modeInheritance) {
                return (
                    <>
                        <h5>This interpretation is associated with <strong>{(disease && disease.term) || 'no disease'}</strong></h5>
                        <h5><i>{`${mode} ${adjective ? `(${adjective})` : ''}`}</i></h5>
                    </>
                );
            } else if (disease && disease.term) {
                return <h5>This interpretation is associated with <strong>{disease.term}</strong></h5>
            } else {
                return <h5>This interpretation is not yet associated with a disease or mode of inheritance</h5>
            }
        } else {
            return <h5>Evidence View</h5>
        }
      }
    
    const showSummary = () => {
        if (variant.PK){
            //FIX ME! Uncommenting this for now due to it creating an unnecessary re-render of entire page, causing redirect away from /summary
            //history.push(`/variant-central/${variant.PK}/interpretation/summary`);
            setView("Summary");
        }
    }
    const showInterpretation = () => {
        if (variant.PK){
            // Same as FIX ME Above!
            //history.push(`/variant-central/${variant.PK}/interpretation`);
            setView("Interpretation");
        }
    }
    const showAuditTrail = () => {
        if (variant.PK){
            setView("Audit Trail");
        }
    }

    // Save interpretation to redux store to be accessed globally 
    // & update related interpretation list for `all relevant interpretations table` in basic info tab
    const handleInterpretationUpdate = (interpretation) => {
        dispatch(updateInterpretation(interpretation));

        // existing interpretation, so update the relevant interpretations list
        if (relatedInterpretations.some(relatedInterpretation => relatedInterpretation.PK === interpretation.PK)) {
            setRelatedInterpretations(relatedInterpretations.map(relatedInterpretation => {
                if (relatedInterpretation.PK === interpretation.PK) {
                    return interpretation;
                }
                return relatedInterpretation;
            }));
        } 
        // newly created interpretation, so append to the list
        else {
            setRelatedInterpretations([interpretation, ...relatedInterpretations]);
        }
    }

    return !(variant && variant.PK) ? (
        <LoadingSpinner className="mt-4" />
    ) : (
        <>
        <div className="jumbotron jumbotron-fluid pb-5">
            <div className="container">
                
                <h1 className="variant-title">
                    <span>
                        {variant.preferredTitle}
                        <Popover
                            className="ml-1 btn-lg"
                            trigger={['hover', 'focus']}
                            triggerComponent={<i className="icon icon-info-circle" />}
                            popoverClassName="popover-bg-black"
                            content={
                                <span className="text-light">
                                    For ClinVar alleles, this represents the ClinVar 
                                    Preferred Title. For alleles not in ClinVar, this HGVS is based on 
                                    the MANE Select transcript. If there is no MANE Select transcript then 
                                    the HGVS is based on the transcript with the longest translation with no 
                                    stop codons or, if no translation, the longest non-protein-coding 
                                    transcript. If a single canonical transcript is not discernible the HGVS 
                                    is based on the GRCh38 genomic coordinates.
                                </span>
                            }
                        />
                    </span>
                    {isOwnedByCurrentCuratingEntity(interpretation, auth)
                        ? (view === "Audit Trail")
                            ? (
                                <button className="btn btn-outline-primary float-right audit-trail" onClick={showInterpretation}
                                    ><FontAwesomeIcon icon={faArrowLeft} /> Interpretation</button>)
                            : (
                                <button className="btn btn-outline-primary float-right audit-trail" onClick={showAuditTrail}
                                    disabled={variant.status === 'deleted'}>View Audit Trail</button>)
                        : null}
                    {(view === "Interpretation" || view === "Audit Trail") && isOwnedByCurrentCuratingEntity(interpretation, auth) && (
                        <button className="btn btn-outline-primary float-right" onClick={showSummary}
                            disabled={variant.status === 'deleted'}
                        >View Summary</button>
                    )}
                    {view === "Summary" && (
                        <button className="btn btn-outline-primary float-right" onClick={showInterpretation}><FontAwesomeIcon icon={faArrowLeft} /> Interpretation</button>
                    )}
                </h1>
                {renderVariantSubtitle()}
                <VariantDetails
                    viewValue={view}
                    isLoadingInterpretation={isLoadingInterpretation}
                    setIsLoadingInterpretation={setIsLoadingInterpretation}
                    onViewUpdate={setView} 
                    cspecDoc={cspecDoc}
                    classification={classification} 
                    calculatedPathogenicity={calculatedPathogenicity} 
                    relatedInterpretations={relatedInterpretations}
                    handleInterpretationUpdate={handleInterpretationUpdate}
                />
            </div>
        </div>

        <div className="container mt-5 mb-5">
            
            {isLoadingInterpretation && (
                <LoadingSpinner />
            )}

            {!isLoadingInterpretation && (
                variant.status !== 'deleted' ? 
                <VariantView
                  variant={variant}
                  interpretation={interpretation}
                  basicInfoTabExternalAPIData={basicInfoTabExternalAPIData}
                  basicInfoTabExternalAPILoadingStatus={basicInfoTabExternalAPILoadingStatus}
                  basicInfoTabExternalAPIErrorMessage={basicInfoTabExternalAPIErrorMessage}
                  relatedInterpretations={relatedInterpretations}
                  interpretationsWithSnapshots={relatedInterpretationsSnapshots}
                  internalAPILoadingStatus={isLoadingInterpretation}
                  handleInterpretationUpdate={handleInterpretationUpdate}
                  view={view}
                  cspecDoc={cspecDoc}
                  handleCspecUpdate={handleCspecUpdate}
                  viewHandler={setView}
                  setClassification={classificationCallback}
                  setCalculatedPathogenicity={calculatedPathogenicityCallback} />
                : (
                    <Alert className="mb-5" heading="This variant has been deleted">
                        <p>
                            This variant is marked as deleted and is not available for curation.
                        </p>
                    </Alert>
                )
            )}
        </div>

        </>
      );
    }
      

const mapStateToProps = state => ({
    variant: state.variant,
    interpretation: state.interpretation,
    affiliation: state.affiliation,
    auth: state.auth
});

const mapDispatchToProps = dispatch => ({
    updateInterpretation: interpretation => dispatch(updateInterpretation(interpretation)),
    updateVariant: variant => dispatch(updateVariant(variant)),
})

export default connect(mapStateToProps, mapDispatchToProps)(VariantCentralItem);


const fetchBasicInfoTabExternalAPIData = ({
    variant,
    setBasicInfoTabExternalAPIData,
    setBasicInfoTabExternalAPILoadingStatus,
    setBasicInfoTabExternalAPIErrorMessage,
    requestRecycler,
}) => {
    const basicInfoDataUrl = '/variants';
    console.log ("Variant ", variant)
    const basicInfoDataParams = {
        queryStringParameters: {
            basicInfo: true,
            variantSource: variant.clinvarVariantId ? 'clinvar' : variant.carId ? 'car' : null,
            variantId: variant.clinvarVariantId ? variant.clinvarVariantId : variant.carId ? variant.carId : null
        }
    };

    if (!(basicInfoDataParams.queryStringParameters.variantSource && basicInfoDataParams.queryStringParameters.variantId)) {
        setBasicInfoTabExternalAPIData({});
        return Promise.resolve();
    }
    
    setBasicInfoTabExternalAPILoadingStatus(LoadingStatus.LOADING);

    return requestRecycler.capture(API.get(API_NAME, basicInfoDataUrl, basicInfoDataParams))
        .then(res => {
            if (!res || !Object.keys(res).length) {
                setBasicInfoTabExternalAPILoadingStatus(LoadingStatus.ERROR);
                return;
            }

            setBasicInfoTabExternalAPIData(res);
            setBasicInfoTabExternalAPILoadingStatus(LoadingStatus.SUCCESS);
        })
        .catch(error => {
            if (API.isCancel(error)) {
                return;
            }

            const serverDetailMessage = lodashGet(error, "response.data.error", 'default error');
            console.error('basic info request failed', error);
            setBasicInfoTabExternalAPILoadingStatus(LoadingStatus.ERROR);
            setBasicInfoTabExternalAPIErrorMessage(`Cannot retrieve Clinvar and Ensembl VEP data, here's more detail: ${serverDetailMessage}`);
        });
}

const fetchAllVariantCuratedEvidences = (variantPK, dispatch, requestRecycler) => {
    return requestRecycler.capture(API.get(API_NAME, `/curated-evidences?variant=${variantPK}&status!=deleted`)).then(curatedEvidenceList => {
        dispatch(setCuratedEvidencesAction(curatedEvidenceList))
    })
    .catch(AmplifyAPIRequestRecycler.defaultCatch);
}
