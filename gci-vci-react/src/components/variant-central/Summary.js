import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux'
import lodashGet from 'lodash/get';
import moment from 'moment';
import { API } from 'aws-amplify';
import { API_NAME } from '../../utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faSpinner } from '@fortawesome/free-solid-svg-icons'

import { updateInterpretation } from '../../actions/actions';
import { renderSelectedModeInheritance } from '../../helpers/render_mode_inheritance';

import ProvisionalApproval from '../provisional-classification/provisional';
import ClassificationApproval  from '../provisional-classification/approval';
import PublishApproval from '../provisional-classification/publish';
import Snapshots from '../provisional-classification/snapshots';
import CardPanel from '../common/CardPanel';
import SummaryTable from './SummaryTable';
import { useIsMyInterpretation } from '../../utilities/ownershipUtilities';
import { allowPublishGlobal } from '../../helpers/allow_publish';

//import { sortListByDate } from '../../helpers/sort';

// Evaluation Form
function Summary(props) {

const {
    affiliation,
    updateSnapshotList,
    updateProvisionalObj,
} = props;

const dispatch = useDispatch();

// Hooks Overload, Need to consolidate!
const [evaluations, setEvaluations] = useState(props.evaluations);
const [interpretation, setInterpretation] = useState(props.interpretation);
const [classificationViewOnly, setClassificationViewOnly] = useState(false);
const [provisionalPathogenicity, setProvisionalPathogenicity] = useState('');
const [provisionalReason, setProvisionalReason] = useState('');
const [evidenceSummary, setEvidenceSummary] = useState(props.evidenceSummary || "");
const [shouldProvisionClassification, setShouldProvisionClassification] = useState(false);
const [modifiedPathogenicity, setModifiedPathogenicity] = useState(null);
const [classificationStatus, setClassificationStatus] = useState(props.classificationStatus);
const [showProvisional, setShowProvisional] = useState(false);
const [approvalActive, setApprovalActive] = useState(null);
const [showApproval, setShowApproval] = useState(false);
const [publishActive, setPublishActive] = useState(null);
const [unpublishActive, setUnpublishActive] = useState(null);
const [snapshotPK, setSnapshotPK] = useState(null);
const [showPublish, setShowPublish] = useState(false);
const [showUnpublish, setShowUnpublish] = useState(false);
const [showPublishLinkAlert, setShowPublishLinkAlert] = useState(false);
const [classificationSaved, setClassificationSaved] = useState(false);
const [sortedSnapshotList, setSortedSnapshotList] = useState(props.classificationSnapshots);
const [isLoading, setIsLoading] = useState(false);
const [provisionalVariant, setProvisionalVariant] = useState(props.provisionalVariant);
const isAllowedToEdit = useIsMyInterpretation();
const allowPublishButton = allowPublishGlobal(affiliation, 'interpretation'); // Need to add this for affiliation checks

useEffect(()=>{
    setEvaluations(props.evaluations);
    setInterpretation(props.interpretation);
    
    if (props.provisionalPathogenicity){
        // TODO: Temporary codes to handle invalid alteredClassification
        // Initialize "Modify Pathogenicity" field to "No Selection"
        if (props.provisionalPathogenicity === "Uncertain significance - insufficient evidence") {
            setProvisionalPathogenicity("none")
        } else {
            setProvisionalPathogenicity(props.provisionalPathogenicity)

            // Check to set reason is required if alteredClassification has valid value
            if (lodashGet(props, "provisionalReason", null) === null) {
                handleRequiredInput('setAttribute');
            }
        }
    } else {
        setProvisionalPathogenicity("none")
    }

    if (props.provisionalReason){
        setProvisionalReason(props.provisionalReason)
    }

    if (props.provisionalVariant && props.provisionalVariant.alteredClassification) {
      setModifiedPathogenicity(props.provisionalVariant.alteredClassification);
    }
    
    if (props.classificationSnapshots){
        setSortedSnapshotList(props.classificationSnapshots);
    }

}, [props.provisionalPathogenicity, props.evaluations, props.interpretation, props.calculatedAssertion, 
    props.classificationSnapshots, evaluations, props.provisionalVariant, provisionalVariant, 
    props.provisionalReason, sortedSnapshotList, showApproval, showPublish]);

useEffect(() => {
    if (props.classificationStatus !== classificationStatus) {
        setClassificationStatus(props.classificationStatus);
    }
}, [props.classificationStatus]);

useEffect(() => {
    handleProvisionalApprovalVisibility();
}, [classificationStatus, classificationSaved, approvalActive, publishActive, unpublishActive]);

// Method to alert users about requied input missing values
const handleRequiredInput = (action) => {
    const inputElement = document.querySelector('.provisional-pathogenicity textarea');
    if (action === 'setAttribute') {
        if (!inputElement.getAttribute('required')) {
            inputElement.setAttribute('required', 'required');
        }
    }
    if (action === 'removeAttribute') {
        inputElement.removeAttribute('required');
    }
}


// Value changes in Pathogenicity <select>
const handlePathogenicityChange = (e) => {

    const activeValue = e;

    if (activeValue !== 'none'){
        setProvisionalPathogenicity(activeValue);
        if (!provisionalReason) {
            handleRequiredInput('setAttribute');
        } else {
            handleRequiredInput('removeAttribute');
        }
    }
    else {
        setProvisionalPathogenicity('none');
        // Disable save button if a reason is provided without the modification
        if (provisionalReason) {
            handleRequiredInput('removeAttribute');
        } else {
            handleRequiredInput('removeAttribute');
        }
    }
}

// Value changes in reason textbox
const handleReasonChange = (e) => {
    if (e){
        setProvisionalReason(e);
    }
    else{
        setProvisionalReason("");
        if (provisionalPathogenicity !== "none") {
            handleRequiredInput('setAttribute');
        }
    }
}

// Handle freetext evaluation evidence summary
const handleEvidenceSumaryText = (e) => {
    if (e) {
        setEvidenceSummary(e);
    }
    else{
        setEvidenceSummary("");
    }
}

const handleEditClassification = () => {
    setClassificationViewOnly(false);
    setShouldProvisionClassification(false);
    setApprovalActive(null);
    setShowProvisional(false);
    setShowApproval(false);
}

// Saving Provisional Variant
async function submitForm (e) {
    e.preventDefault(); 

  // TODO: Temporary check to make sure reason is entered if modified classification is selected
  if (provisionalPathogenicity && provisionalPathogenicity !== "none" && (!provisionalReason || provisionalReason === "")) {
    handleRequiredInput('setAttribute');
  } else {
    if (interpretation) {
        if (!provisionalVariant) {
            setIsLoading(true);
            // Configure 'provisional-variant' object properties
            // Use case #1: user makes pathogenicity modification and saves the interpretation classification
            // Use case #2: user saves the interpretation classification without any modification
            const provisionalObj = {};
            const nowUTC = moment().toISOString();

            provisionalObj.date_created = nowUTC;
            provisionalObj.last_modified = nowUTC;
            //provisionalObj.item_type = 'provisional_variant';
            // Reset the interpretation classification status to 'In progress' whenever the user saves it
            provisionalObj.classificationStatus = "In progress";
            provisionalObj.classificationDate = nowUTC;
            // At least save the calculated assertion
            provisionalObj.autoClassification = props.calculatedAssertion || "";
            // If evidence summary is not nil, save it as well
            if (evidenceSummary) {
                provisionalObj.evidenceSummary = evidenceSummary;
                // Pass state change back to parent component
                props.setProvisionalEvaluation('evidence-summary', evidenceSummary);
            }
            // If reason, save it
            if (provisionalReason) {
                provisionalObj.reason = provisionalReason;
                // Pass state change back to parent component
                props.setProvisionalEvaluation('provisional-reason', provisionalReason);
            }
            // If the modified pathogenicity selection is not nil, save it as well along with its explanation
            if (provisionalPathogenicity && provisionalPathogenicity !== "none") {
                provisionalObj.alteredClassification = provisionalPathogenicity;
                setModifiedPathogenicity(provisionalPathogenicity)
                // Pass state change back to parent component
                props.setProvisionalEvaluation('provisional-pathogenicity', provisionalPathogenicity);
            }

            provisionalObj.submitted_by = props.auth ? props.auth.PK : null;
            provisionalObj.modified_by = props.auth ? props.auth.PK : null;
            
            const interpretationObj = interpretation;
            interpretationObj.status = "In progress";

            // Add affiliation if the user is associated with an affiliation
            // and if the data object has no affiliation
            if (affiliation) {
                if (!provisionalObj.affiliation) {
                    provisionalObj.affiliation = affiliation.affiliation_id;
                }
                // Add affiliation to interpretation, when creating interpretation?
                interpretationObj.affiliation = affiliation.affiliation_id;
            }

            interpretationObj.provisionalVariant = provisionalObj;
            interpretationObj.modified_by = provisionalObj.modified_by;

            const url = '/interpretations/' + interpretation.PK;
            const params = {body: {interpretationObj}}

            API.put(API_NAME, url, params).then(response => {
                console.log('put response', response)
                // Update interpretation object with provisionalVariant
                const provisionalVariantObj = response.provisionalVariant;
                
                if (provisionalVariantObj){
                    console.log('/provisional', provisionalVariantObj, response);
                    // Update parent provisonal Variant object
                    setProvisionalVariant(provisionalVariantObj);
                    props.updateProvisionalObj(provisionalVariantObj)
                    setClassificationViewOnly(true);
                    setModifiedPathogenicity(provisionalVariantObj.alteredClassification);

                    //setAutoClassification(provisionalVariantObj.autoClassification);
                    setClassificationStatus(provisionalVariantObj.classificationStatus);
                    
                    setClassificationSaved(true);

                    if (modifiedPathogenicity || provisionalPathogenicity){
                        handleShouldProvisionClassification(response);
                    }
                    
                    // Update interpretation store
                    updateInterpretationObj(response);
                    setShowProvisional(true)
                    setIsLoading(false);
                }
                
            }).catch(err => {
                console.log(err);
                setIsLoading(false);
            });
        } else {
            setIsLoading(true)
            const newProvisionalVariantObj = provisionalVariant;
            const nowUTC = moment().toISOString();

            newProvisionalVariantObj.last_modified = nowUTC;
            // Configure 'provisional-variant' object properties
            // Use case #1: user updates pathogenicity modification and saves the interpretation classification
            // Use case #2: user removes pre-existing modification and updates the form
            newProvisionalVariantObj['classificationStatus'] = 'In progress';
            newProvisionalVariantObj['classificationDate'] = nowUTC;
            newProvisionalVariantObj['autoClassification'] = props.calculatedAssertion || "";
            newProvisionalVariantObj['evidenceSummary'] = evidenceSummary || "";
            // Pass state change back to parent component
            props.setProvisionalEvaluation('evidence-summary', newProvisionalVariantObj['evidenceSummary']);

            // If the modified pathogenicity selection is not nil, save it as well along with its explanation
            if (provisionalPathogenicity && provisionalPathogenicity !== "none") {
                newProvisionalVariantObj['alteredClassification'] = provisionalPathogenicity;
                newProvisionalVariantObj['reason'] = provisionalReason;
                // Pass state change back to parent component
                props.setProvisionalEvaluation('provisional-pathogenicity', provisionalPathogenicity);
                props.setProvisionalEvaluation('provisional-reason', provisionalReason);
            } else {
                if ('alteredClassification' in newProvisionalVariantObj) {
                    delete newProvisionalVariantObj['alteredClassification'];
                }
                if ('reason' in newProvisionalVariantObj) {
                    delete newProvisionalVariantObj['reason'];
                }
                // Pass state change back to parent component
                props.setProvisionalEvaluation('provisional-pathogenicity', "");
                props.setProvisionalEvaluation('provisional-reason', "");
            }

            // Reset provisional and approval data
            newProvisionalVariantObj['provisionedClassification'] = false;
            if (newProvisionalVariantObj['provisionalSubmitter']) delete newProvisionalVariantObj['provisionalSubmitter'];
            if (newProvisionalVariantObj['provisionalDate']) delete newProvisionalVariantObj['provisionalDate'];
            if (newProvisionalVariantObj['provisionalReviewDate']) delete newProvisionalVariantObj['rovisionalReviewDate'];
            if (newProvisionalVariantObj['provisionalComment']) delete newProvisionalVariantObj['provisionalComment'];
            newProvisionalVariantObj['approvedClassification'] = false;
            if (newProvisionalVariantObj['approvalSubmitter']) delete newProvisionalVariantObj['approvalSubmitter'];
            if (newProvisionalVariantObj['classificationApprover']) delete newProvisionalVariantObj['classificationApprover'];
            if (newProvisionalVariantObj['approvalDate']) delete newProvisionalVariantObj['approvalDate'];
            if (newProvisionalVariantObj['approvalReviewDate']) delete newProvisionalVariantObj['approvalReviewDate'];
            if (newProvisionalVariantObj['approvalComment']) delete newProvisionalVariantObj['approvalComment'];
            newProvisionalVariantObj['publishClassification'] = false;
            if (newProvisionalVariantObj['publishSubmitter']) delete newProvisionalVariantObj['publishSubmitter'];
            if (newProvisionalVariantObj['publishAffiliation']) delete newProvisionalVariantObj['publishAffiliation'];
            if (newProvisionalVariantObj['publishDate']) delete newProvisionalVariantObj['publishDate'];
            if (newProvisionalVariantObj['publishComment']) delete newProvisionalVariantObj['publishComment'];

            newProvisionalVariantObj.modified_by = props.auth ? props.auth.PK : null;

            // Add latest provisionalVariant to interpretation
            const interpretationObj = interpretation;
            interpretationObj.provisionalVariant = newProvisionalVariantObj;
            interpretationObj.modified_by = newProvisionalVariantObj.modified_by;

            // Add affiliation if the user is associated with an affiliation
            if (affiliation) {
                interpretationObj.affiliation = affiliation.affiliation_id;
            }

            const url = '/interpretations/' + interpretation.PK;
            const params = {'body': {interpretationObj}}
            console.log('inter put', interpretationObj)
            API.put(API_NAME, url, params).then(response => {
                // Update Provisional Variant + Parent Interpretation
                const provisionalVariantObj = response.provisionalVariant;
                console.log('updated provisional variant', provisionalVariantObj)
                
                // Update parent provisonal Variant object
                setProvisionalVariant(provisionalVariantObj);
                setClassificationViewOnly(true);
                setClassificationStatus(provisionalVariantObj.classificationStatus);
                setClassificationSaved(true);
                setModifiedPathogenicity(provisionalVariantObj.alteredClassification);
                handleShouldProvisionClassification(interpretation);
                updateProvisionalObj(provisionalVariantObj);
                updateInterpretationObj(response)
                setShowProvisional(true);
                setIsLoading(false)
            }).catch(err => {
                console.log(err);
                setIsLoading(false)
            });

        }
    }
  }
}

const approveProvisional = () => {
    setApprovalActive('yes');
    setShouldProvisionClassification(false);
    setClassificationViewOnly(true);
    handleProvisionalApprovalVisibility();
}

// Update Interpretation Object in global and local state
const updateInterpretationObj = (interpretationObject) => {
    dispatch(updateInterpretation(interpretationObject));
    setInterpretation(interpretationObject);
}

// Handles what panels to show, need to clean this up it's carry-over from legacy code
const handleProvisionalApprovalVisibility = () => {

    const isPublishActive = publishActive;
    const isUnpublishActive = unpublishActive;

    if (classificationStatus === 'In progress' || classificationStatus === 'Provisional') {
        if (approvalActive === 'yes') {
            setShowProvisional(false);
            setShowApproval(true);
            setShowPublish(false);
            setShowUnpublish(false);
        } else if (isPublishActive === 'yes' || isPublishActive === 'auto') {
            setShowProvisional(false);
            setShowApproval(false);
            setShowPublish(true);
            setShowUnpublish(false);
        } else if (isUnpublishActive === 'yes') {
            setShowProvisional(false);
            setShowApproval(false);
            setShowPublish(false);
            setShowUnpublish(true);
        } else if (classificationSaved) {
            // Automatic display of the approval panel (system directing user through approval process)
            if (classificationStatus === 'Provisioned') {
                setApprovalActive('yes');
                setShowProvisional(false);
                setShowApproval(true);
                setShowPublish(false);
                setShowUnpublish(false);
            // Automatic display of the provisional panel (system directing user through approval process)
            } else {
                setShowProvisional(true);
                setShowApproval(false);
                setShowProvisional(false);
                setShowUnpublish(false);
            }
        } else {
            setShowProvisional(false);
            setShowApproval(false);
            setShowPublish(false);
            setShowUnpublish(false);
        }
    } else if (classificationStatus === 'Approved' || classificationStatus === 'Published' || classificationStatus === 'Unpublished') {
        const publishProvisionalReady = props.publishProvisionalReady;
        const publishSnapshotListReady = props.publishSnapshotListReady;
        const publishClassification = lodashGet(provisionalVariant, 'publishClassification', null) ? provisionalVariant.publishClassification : false;

        if (allowPublishButton) {

            // Before displaying the publish panel, check that the current interpretation has not been published (!publishClassification)
            if (!publishClassification && (isPublishActive === 'yes' || isPublishActive === 'auto')) {
                setShowProvisional(false);
                setShowApproval(false);
                setShowPublish(true);
                setShowUnpublish(false);

            // Only update state data (to automatically display publish panel) when the approval step is complete
            } else if (!publishClassification && publishProvisionalReady && publishSnapshotListReady) {
                setApprovalActive(null);
                setPublishActive('auto');
                setShowProvisional(false);
                setShowApproval(false);
                setShowPublish(true);
                setShowUnpublish(false);
                props.resetPublishReadyState();

            } else if (isUnpublishActive === 'yes') {
                setShowProvisional(false);
                setShowApproval(false);
                setShowPublish(false);
                setShowUnpublish(true);
            }

        // End approval process (for users without publication rights)
        } else {
            setApprovalActive(null);
            setShowProvisional(false);
            setShowApproval(false);
            setShowPublish(false);
            setShowUnpublish(false)
        }
    } else {
        setShowProvisional(false);
        setShowApproval(false);
        setShowPublish(false);
        setShowUnpublish(false)
    }
}

/**
 * Method to add publish-related state data
 * Under certain circumstances (when user clicks the publish/unpublish button), called at the start of a publish event
 * @param {string} snapshotUUID - The UUID of the source snapshot
 * @param {string} eventType - The type of event being initiated (publish or unpublish)
 */
function addPublishState(snapshotPKValue, eventType) {
    console.log('add publish', snapshotPKValue)
    if (snapshotPKValue) {
        setSnapshotPK(snapshotPKValue);

        if (eventType === 'publish') {
            setPublishActive('yes');
            setUnpublishActive(null);
            setShowPublish(true);
            
        } else if (eventType === 'unpublish') {
            setPublishActive(null);
            setUnpublishActive('yes');
            setShowPublish(true);
        }
    }
}

/**
 * Method to clear publish-related state data
 * Called at the end of every publish event
 */
 function clearPublishState() {
     setPublishActive(null);
     setUnpublishActive(null);
     //setPublishSnapshotPK(null);
     setShowPublish(false);
     setShowUnpublish(false);
     props.resetPublishReadyState();
 }

/**
 * Method to update state data in order to trigger the display of an alert near the publish link (in the published snapshot panel)
 * Called after publishing an interpretation (to the Evidence Repository)
 */
 function triggerPublishLinkAlert() {
     setShowPublishLinkAlert(true);
 }

/**
 * Method to clear state data responsible for displaying an alert near the publish link (in the published snapshot panel)
 * Called after the state data (to trigger the alert) has been acted upon
 */
 function clearPublishLinkAlert() {
     setShowPublishLinkAlert(false);
 }

    return (
        <div className="container">
                
                {(evaluations) ?

                    <>
                <div className="card">
                <h3 className="card-header">Evaluation Summary</h3>

                <div className="card-body">
                    <div className="row">
                        <div className="col-sm-6">
                            <h5><strong>Calculated Pathogenicity:</strong> {props.calculatedAssertion ? props.calculatedAssertion : 'None'}</h5>
                            <h5><strong>Modified Pathogenicity:</strong> {modifiedPathogenicity ? modifiedPathogenicity : 'None'}</h5>
                        </div>
                        <div className="col-sm-6">
                            <h5><strong>Disease:</strong> {interpretation.diseaseTerm ? interpretation.diseaseTerm : 'None'}</h5>
                            <h5><strong>Mode of Inheritance:</strong> {renderSelectedModeInheritance(interpretation)}</h5>
                        </div>
                    </div>
                            
                    {!classificationViewOnly && isAllowedToEdit ?
                        <form onSubmit={submitForm}>
                            <div className="mt-3">
                                <div className="row">
                                    <div className="col-sm-6">
                                        <div className="evaluation-provision provisional-pathogenicity">
                                            <label><strong>Modify Pathogenicity:</strong> <span className="text-muted">(optional)</span></label>
                                            <select id="provisional-pathogenicity" label={<span>Modify Pathogenicity:<i>(optional)</i></span>}
                                                value={provisionalPathogenicity} onChange={e => handlePathogenicityChange(e.currentTarget.value)}
                                                className="form-control">
                                                <option value='none'>No Selection</option>
                                                <option disabled="disabled"></option>
                                                <option value="Benign">Benign</option>
                                                <option value="Likely benign">Likely Benign</option>
                                                <option value="Uncertain significance - conflicting evidence">Uncertain Significance</option>
                                                <option value="Likely pathogenic">Likely Pathogenic</option>
                                                <option value="Pathogenic">Pathogenic</option>
                                            </select>
                                            <label className="mt-3"><strong>Reason(s) for change:</strong><i>(required for modified pathogenicity)</i></label>
                                            <textarea id="provisional-reason" value={provisionalReason} 
                                                onChange={(e) => handleReasonChange(e.currentTarget.value)} rows="3"
                                                placeholder="Note: If you selected a pathogenicity different from the Calculated Pathogenicity, you must provide a reason for the change here."
                                                className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-sm-6">
                                        <div className="evaluation-provision evidence-summary">
                                            <label><strong>Evidence Summary:</strong></label>
                                            <textarea id="evaluation-evidence-summary" label="Evidence Summary:"
                                                value={evidenceSummary} onChange={(e) => handleEvidenceSumaryText(e.currentTarget.value)}
                                                placeholder="Summary of the evidence and rationale for the clinical significance (optional)." rows="6"
                                                className="form-control" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex align-items-center mb-3 mt-3">
                                <button type="submit" className="btn btn-primary btn-lg" id="submit">
                                    <FontAwesomeIcon className="mr-3" icon={ isLoading ? faSpinner : faSave } /> Save
                                </button>
                                <span className="text-muted ml-3">Interpretation will remain In Progress until Saved as Provisional.</span>
                            </div>
                            
                        </form>
                        :
                        <div className="card">
                            <div className="card-body">
                            <div className="row">
                                <div className="col-sm-4">
                                    <h5><strong>Modified Pathogenicity:</strong> {modifiedPathogenicity ? modifiedPathogenicity : 'None'}</h5>
                                </div>
                                <div className="col-sm-4 text-pre-wrap">
                                    <h5><strong>Reason(s) for change:</strong> {provisionalReason && provisionalReason.length ? provisionalReason : 'None'}</h5>
                                </div>
                                <div className="col-sm-4 text-pre-wrap">
                                    <h5><strong>Evidence Summary:</strong> {evidenceSummary && evidenceSummary.length ? evidenceSummary : 'None'}</h5>
                                </div>
                            </div>
                            {classificationStatus === 'In progress' ?
                                <button type="button" className="btn btn-info btn-lg mt-3"
                                    onClick={handleEditClassification}>Edit <i className="icon icon-pencil"></i></button>
                            : null}
                            </div>
                        </div>
                    }
                    </div>
                </div>   
                    {provisionalVariant && showProvisional ?
                        <div className="provisional-approval-content-wrapper">
                            {shouldProvisionClassification ?
                                <>
                                    <div className="alert alert-info mt-3 mb-3">
                                        <i className="icon icon-info-circle"></i> Save this Interpretation as Provisional if you have finished all your evaluations and wish to mark it as complete. Once
                                        you have saved it as Provisional, you will not be able to undo it, but you will be able to make a new current Provisional Interpretation, archiving the current
                                        one, with access to its Evaluation Summary.
                                    </div>
                                    <CardPanel title="Save Interpretation as Provisional" className="mt-3 mb-3">
                                            <ProvisionalApproval
                                                interpretation={interpretation}
                                                classification={provisionalPathogenicity && provisionalPathogenicity !== 'none' ? provisionalPathogenicity : props.calculatedAssertion}
                                                classificationStatus={classificationStatus}
                                                provisional={provisionalVariant}
                                                updateSnapshotList={updateSnapshotList}
                                                updateProvisionalObj={updateProvisionalObj}
                                                approveProvisional={approveProvisional}
                                                updateInterpretation={updateInterpretationObj}
                                            />
                                    </CardPanel>
                                </>
                                :
                                <div className="alert alert-warning">
                                    <i className="icon icon-exclamation-circle"></i> The option to save an Interpretation as Provisional will not appear when the saved calculated or modified value
                                    is "Likely Pathogenic" or "Pathogenic" and there is no associated disease.
                                </div>
                            }
                        </div>
                        : null}
                    {provisionalVariant && showApproval ?

                        <div className="card text-white bg-warning mb-3 mt-3">
                            <h3 className="card-header">Approve Interpretation</h3>
                            <div className="card-body bg-white text-dark">
                                <p className="card-text">
                                    <span className="text-muted"><i className="icon icon-info-circle text-warning"></i> When ready, you may save this Provisional Interpretation as Approved. Once you have saved it as Approved it will become
                                    uneditable, but you will be able to save a new current Approved Interpretation, thus archiving this current one and retaining access to its Evaluation Summary.</span>
                                </p>
                                <ClassificationApproval
                                    interpretation={interpretation}
                                    classification={provisionalPathogenicity && provisionalPathogenicity !== 'none' ? provisionalPathogenicity : props.calculatedAssertion}
                                    classificationStatus={classificationStatus}
                                    provisional={provisionalVariant}
                                    affiliation={affiliation}
                                    updateSnapshotList={updateSnapshotList}
                                    updateProvisionalObj={updateProvisionalObj}
                                    snapshots={sortedSnapshotList}
                                    updateInterpretation={updateInterpretationObj}
                                />
                            </div>
                        </div>

                        : null}
                    {provisionalVariant && (showPublish || showUnpublish) ?
                        <div className={'publish-approval-content-wrapper' + (showUnpublish ? ' unpublish' : '')}>
                            <div className="publish-approval-note">
                                {publishActive === 'auto' ?
                                    <p className="alert alert-info">
                                        <i className="icon icon-info-circle"></i> Publish the current (<i className="icon icon-flag"></i>)
                                            Approved Interpretation to the Evidence Repository.
                                    </p>
                                    :
                                    <p className="alert alert-info">
                                        <i className="icon icon-info-circle"></i> {showUnpublish ? 'Unpublish' : 'Publish'} the selected
                                            Approved Interpretation {showUnpublish ? 'from' : 'to'} the Evidence Repository.
                                    </p>
                                }
                            </div>

                            <CardPanel title={(showUnpublish ? 'Unpublish Interpretation from' : 'Publish Interpretation to') + ' the Evidence Repository'} panelMarginClass = "mt-5 mb-5 border-info">
                                <PublishApproval
                                        interpretation={interpretation}
                                        classification={provisionalPathogenicity && provisionalPathogenicity !== 'none' ? provisionalPathogenicity : props.calculatedAssertion}
                                        classificationStatus={classificationStatus}
                                        provisional={provisionalVariant}
                                        affiliation={affiliation}
                                        updateSnapshotList={updateSnapshotList}
                                        updateProvisionalObj={updateProvisionalObj}
                                        snapshots={sortedSnapshotList}
                                        selectedSnapshotUUID={snapshotPK}
                                        clearPublishState={clearPublishState}
                                        triggerPublishLinkAlert={triggerPublishLinkAlert}
                                        updateInterpretation={updateInterpretationObj}
                                    />
                            </CardPanel>
                        </div>
                        : null}
                    {!showProvisional && !showApproval && !allowPublishButton ?
                        <div className="alert alert-info mt-3">
                            <i className="icon icon-info-circle"></i> The option to publish an approved interpretation to the Evidence Repository is
                                currently only available for VCEPs that have guidelines approved by the Sequence Variant Interpretation Working Group.
                        </div>
                        : null}
                    {sortedSnapshotList && sortedSnapshotList.length ?
                        <CardPanel title="Saved Provisional and Approved Interpretation(s)" panelMarginClass = "mt-5 mb-5 body-p-0">
                            <Snapshots
                                snapshots={sortedSnapshotList}
                                approveProvisional={approveProvisional}
                                addPublishState={(snapshotPK, e)=>addPublishState(snapshotPK, e)}
                                isApprovalActive={approvalActive}
                                isPublishEventActive={publishActive || unpublishActive ? true : false}
                                classificationStatus={classificationStatus}
                                interpretation={interpretation}
                                allowPublishButton={allowPublishButton}
                                showPublishLinkAlert={showPublishLinkAlert}
                                clearPublishLinkAlert={clearPublishLinkAlert}
                            />
                        </CardPanel>
                        : null}

                        <SummaryTable evaluations={Object.values(evaluations)}/>
                </>
                :
                <div className="summary-content-wrapper"><p>No evaluations found in this interpretation.</p></div>
            }
        
        </div>
        
)

/**
 * Method to evaluate whether we should render the provisional approval form
 * @param {object} interpretation - The interpretation data object
*/
function handleShouldProvisionClassification (interpretation){
    let calculatedAssertionValue = props.calculatedAssertion;
    let modifiedPathogenicityValue = modifiedPathogenicity ? modifiedPathogenicity : provisionalPathogenicity;
    // Should generally allow users to provision an interpretation classificaion unless the following conditions are present
    if (modifiedPathogenicityValue) {
        if (modifiedPathogenicityValue === 'Pathogenic' || modifiedPathogenicityValue === 'Likely pathogenic') {
            setShouldProvisionClassification(interpretation.disease && interpretation.disease.term ? true : false)
        } else {
            setShouldProvisionClassification(true)
        }
    } else if (calculatedAssertionValue) {
        if (calculatedAssertionValue === 'Pathogenic' || calculatedAssertionValue === 'Likely pathogenic') {
            setShouldProvisionClassification(interpretation.disease && interpretation.disease.term ? true : false)
        } else {
            setShouldProvisionClassification(true)
        }
    }
}

}

const mapStateToProps = state => ({
    auth: state.auth,
    variant: state.variant,
    interpretation: state.interpretation
});

const mapDispatchToProps = dispatch => ({
    updateInterpretation: interpretation => dispatch(updateInterpretation(interpretation)),
    dispatch
})

export default connect(mapStateToProps, mapDispatchToProps)(Summary);
