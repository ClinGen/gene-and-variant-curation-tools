import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from "react-redux";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { get as lodashGet } from 'lodash';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../utils';

import { AffilsContext, getAffiliationName, getAffiliationNameBySubgroupID } from '../../helpers/affiliationsHelpers';
import { renderModeInheritanceLink } from '../../helpers/render_mode_inheritance';
import { getApproverNames, getContributorNames } from '../../helpers/get_approver_names';
import { sortListByDate } from '../../helpers/sort';
import { isScoringForSupportedSOP, snapshotHasApprovalPreviewDate, determineSOPVersion } from '../../helpers/sop';
import { formatDate } from 'react-day-picker/moment';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faList, faCheck, faPencilAlt, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { Link } from "react-router-dom";

import Alert from '../common/Alert';
import { useIsMyInterpretation } from '../../utilities/ownershipUtilities';
import ClinVarSubmissionData from '../variant-central/clinvar-submission/ClinVarSubmissionData';
import { inCurrentBatch, getOpenBatch, getBatchesByStatus, snapshotInBatch } from '../variant-central/clinvar-submission/helpers';

import { isDiseaseObsolete, renderObsoleteDiseaseIcon } from '../../utilities/diseaseUtilities';
import { useAmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';
import EditPublishSnapshotModal from '../common/EditPublishSnapshotModal';


const Snapshots = (props) => {

    const { affiliationsData } = useContext(AffilsContext);
    const requestRecycler = useAmplifyAPIRequestRecycler();
    const auth = useSelector(state => state.auth);
    const [snapshotsList, setSnapshotsList] = useState([]);
    const [submitBusy, setSubmitBusy] = useState(false);
    const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
    const isMyInterpretation = useIsMyInterpretation();

    const {
        interpretation,
        gdm,
        snapshots,
        approveProvisional,
        addPublishState,
        isApprovalActive,
        isPublishEventActive,
        isRepublishActive,
        classificationStatus,
        allowPublishButton,
        showPublishLinkAlert,
        clearPublishLinkAlert,
        demoVersion,
        fromProvisionalCuration,
        clinVarSubmissionBatches,
        handleClinVarSubmissionBatches,
        clearPublishState,
        updateProvisionalObj,
    } = props;

    const currentApprovedSnapshot = snapshots ? snapshots.find(snapshot => snapshot.approvalStatus === 'Approved') : {};
    const currentApprovedSnapshotID = currentApprovedSnapshot ? currentApprovedSnapshot.PK : undefined;

    useEffect(()=>{
        // Set snapshot list ordered by date
        setSnapshotsList(sortListByDate(snapshots, 'date_created'));
        // Redirected from provisional-curation page if isRepublishActive, show modal
        if (isRepublishActive) {
          setSnapshotModalOpen(true);
        }
    },[snapshots])

    const renderSnapshotStatusIcon = (snapshot, approvalStatus) => {
        let filteredSnapshots;
        if (approvalStatus === 'Provisioned') {
            // snapshot.approvalStatus = 'Provisional'
            filteredSnapshots = snapshots.filter(snapshot => snapshot.approvalStatus === 'Provisioned');
        } else if (approvalStatus === 'Approved') {
            filteredSnapshots = snapshots.filter(snapshot => snapshot.approvalStatus === 'Approved');
        }

        if (filteredSnapshots && filteredSnapshots.length) {

            let sortedSnapshots = sortListByDate(filteredSnapshots, 'date_created');
            if (snapshot === sortedSnapshots[0]) {
                return <i className="icon icon-flag text-success"></i>;
            } else {
                return <i className="icon icon-archive"></i>;
            }
        }
    }

    /**
     * Method to render the button that allows users to approval the most recently saved provisional
     * @param {object} resourceParent - The parent object of the classification in a snapshot
     * @param {integer} index - The index of the object in the snapshots array
     */
    const renderProvisionalSnapshotApprovalLink = (resourceParent, index) => {
        if (index.toString() === "0") {
            if (fromProvisionalCuration && resourceParent && resourceParent.item_type === 'gdm') {
                return (
                    <Link className="btn btn-primary ml-3" role="button" to={'/provisional-classification/' + resourceParent.PK + '/?approval=yes'}>
                        <FontAwesomeIcon icon={faCheck} className="mr-3" /> Approve
                    </Link>
                );
            } else {
                return (
                    <button className="btn btn-primary ml-3" onClick={approveProvisional}>
                        <FontAwesomeIcon icon={faCheck} className="mr-3" /> Approve
                    </button>
                );
            }
        }
    }

    /**
     * Method to update the interpretation's ClinVar submission batch list in state
     * @param {object} openBatch - open batch to be added to interpretation
     */
    const updateBatches = (openBatch) => {
        // Add or remove open batch in this interpretation's batch list
        // If openBatch is null, interpretation is removed so do not add open batch to list
        // If not, add the updated open batch to list
        const newBatches = getBatchesByStatus(clinVarSubmissionBatches, "closed");
        if (openBatch) {
            newBatches.push(openBatch);
        }
        // Update batches in interpretation
        handleClinVarSubmissionBatches(newBatches);
    }

    /**
     * Method to add approved interpretation snapshot to open ClinVar submission batch
     * @param {object} e - selected row object
     */
    const addToBatch = async (e) => {
        const snapshotPK = e.target.name;
        const affiliationPK = lodashGet(auth, "currentAffiliation.affiliation_id");
        const interpretationPK = lodashGet(interpretation, "PK");

        if (snapshotPK) {
            // Add interpretation/variant snapshot to open batch
            const url = `/clinvar-submission-batch/add/${affiliationPK}/${interpretationPK}?snapshot=${snapshotPK}`
            setSubmitBusy(true);

            try {
                // Add interpretation to open batch
                const newBatch = await requestRecycler.capture(API.put(API_NAME, url));
                if (newBatch) {
                    // Interpreation is added to open batch successfully
                    // Add open batch to this interpretation's batch list
                    updateBatches(newBatch);
                    setSubmitBusy(false);
                } else {
                    throw new Error("Server responded null");
                }
            } catch (error) {
                if (API.isCancel(error)) {
                    return;
                }
                alert (`Unable to add interpretation to open batch. ${error.message}`);
                const detailMessage = lodashGet(error, 'response.data.error', 'No error message from server');
                console.log(`Error adding interpretation to ClinVar batch - ${detailMessage} `);
                setSubmitBusy(false);
                return;
            }
        }
    }

    /**
     * Method to replace previous interpretation snapshot by new one in open ClinVar submission batch
     * @param {object} e - selected row object
     */
    const replaceInBatch = async (e) => {
        const snapshotPK = e.target.name;
        const affiliationPK = lodashGet(auth, "currentAffiliation.affiliation_id");
        const interpretationPK = lodashGet(interpretation, "PK");
        const openBatch = getOpenBatch(clinVarSubmissionBatches);
        const batchPK = lodashGet(openBatch, "PK");

        if (snapshotPK) {
            // If interpretation has previous snapshot added to open batch, replace it with new snapshot
            const url = `/clinvar-submission-batch/replace/${affiliationPK}/${interpretationPK}?batch=${batchPK}&snapshot=${snapshotPK}`
            setSubmitBusy(true);

            try {
                // Replace interpretation/snapshot in open batch
                const newBatch = await requestRecycler.capture(API.put(API_NAME, url));
                if (newBatch) {
                    // Interpreation is replace in open batch successfully
                    // Replace open batch in this interpretation's batch list
                    updateBatches(newBatch);
                    setSubmitBusy(false);
                } else {
                    throw new Error("Server responded null");
                }
            } catch (error) {
                if (API.isCancel(error)) {
                    return;
                }
                alert (`Unable to replace interpretation in open batch. ${error.message}`);
                const detailMessage = lodashGet(error, 'response.data.error', 'No error message from server');
                console.log(`Error replacing interpretation in ClinVar batch - ${detailMessage} `);
                setSubmitBusy(false);
                return;
            }
        }
    }

    /**
     * Method to remove approved interpretation snapshot from open ClinVar submission batch
     */
    const removeFromBatch = async () => {
        // Remove interpretation/variant snapshot from open batch
        const affiliationPK = lodashGet(auth, "currentAffiliation.affiliation_id");
        const interpretationPK = lodashGet(interpretation, "PK");
        const openBatch = getOpenBatch(clinVarSubmissionBatches);
        const batchPK = lodashGet(openBatch, "PK");

        if (batchPK) {
            const url = `/clinvar-submission-batch/remove/${affiliationPK}/${interpretationPK}?batch=${batchPK}`
            setSubmitBusy(true);

            try {
                // Remove interpretation from open batch
                const newBatch = await requestRecycler.capture(API.put(API_NAME, url));
                if (newBatch) {
                    // Interpreation is removed from open batch successfully
                    // Remove open batch from this interpretation's batch list
                    updateBatches(null);
                    setSubmitBusy(false);
                } else {
                    throw new Error("Server responded null");
                }
            } catch (error) {
                if (API.isCancel(error)) {
                    return;
                }
                alert (`Unable to remove interpretation from open batch. ${error.message}`);
                const detailMessage = lodashGet(error, 'response.data.error', 'No error message from server');
                console.log(`Error removing interpretation from ClinVar batch - ${detailMessage} `);
                setSubmitBusy(false);
                return;
            }
        }
    }

    /**
     * Method to render the button to add/replace/remove approved snapshot in interpretation's ClinVar
     * submission batch and the individual generate submission button
     * @param {string} snapshotPK - approved snapshot PK
     *
     * Note: Use OverlayTrigger instead of Popover because Popover creates a button which gives
     * warning about a button within a button
     */
    const renderClinVarSubmission = (snapshotPK) => {
        const batchText = "Add this interpretation to the current ClinVar submission batch. Please note: The submission batch does not auto-submit variants to ClinVar from the VCI, it is for VCI tracking and to generate the ClinVar submission file. To submit a set of variants to ClinVar, first add them to the current Submission Batch, then navigate to the ClinVar submission page on the dashboard to download the file which can then be submitted to ClinVar. Variants cannot be added to the current batch more than once.";
        const removePreviousText = "A previous approved interpretation is in current batch.  Replace with new approved interpretation will remove that from batch."
        // If current snaphot is not added to open batch, show "Add to <current batch>" button
        // else show "Remove from <current batch>" button
        // Get open batch
        const openBatch = getOpenBatch(clinVarSubmissionBatches);
        // Set if current snapshot has been added to open batch
        const isAdded = snapshotInBatch(openBatch, lodashGet(interpretation, "PK"), snapshotPK);
        const iconColor = isAdded ? "#ffffff" : "#007bff";
        // Set if previous snapshot has been added to open batch
        const previousInBatch = inCurrentBatch(clinVarSubmissionBatches, lodashGet(interpretation, "PK")) ? true : false;
        const showRemovePrevious = previousInBatch && !isAdded;

        // Get open batch name
        const batchName = openBatch && openBatch.batch_name ? openBatch.batch_name : "Current Batch"
        const buttonText = isAdded ? `Remove from ${batchName}` :
            (previousInBatch ? `Replace in ${batchName}` : `Add to ${batchName}`);
        const buttonClass = isAdded ? "btn btn-danger text-white mx-2 mb-2" : "btn btn-warning text-white mx-2 mb-2";

        return (
            <>
                <strong>ClinVar Submission: </strong>
                <button className={buttonClass} disabled={submitBusy} name={snapshotPK} onClick={isAdded ? removeFromBatch : (previousInBatch ? e=>replaceInBatch(e) : e=>addToBatch(e))}>
                    {buttonText}
                    <OverlayTrigger
                        overlay={
                            <Tooltip>
                                {batchText}
                            </Tooltip>
                        }
                    >
                        <FontAwesomeIcon icon={faInfoCircle} color={iconColor} className="ml-2" />
                    </OverlayTrigger>
                    {submitBusy ? <LoadingSpinner size="1x"/> : null}
                </button>
                <ClinVarSubmissionData resourcePK={snapshotPK} />
                {showRemovePrevious ? <p className="submit-err">{removePreviousText}</p> : null}
            </>
        );
    }

    /**
     * Method to render curation reasons data in the Publish snapshot panel
     * @param {object} snapshot - A saved copy of a provisioned/approved classification and its parent GDM/Interpretation
     */
    const renderCurationReasonsData = (snapshot) => {
      if (snapshot && snapshot.resource) {
        const curationReasons = snapshot.resource.curationReasons ? snapshot.resource.curationReasons : [];
        if (curationReasons && curationReasons.length) {
          return curationReasons.map((reason, i) => {
            return (
              <dl className="inline-dl clearfix" key={i}>
                <dd>{reason}</dd>
              </dl>
            );
          });
        }
      }
    }

    const handleSnapshotModalOpen = () => {
      setSnapshotModalOpen(true);
    }

    const handleSnapshotModalClose = () => {
      setSnapshotModalOpen(false);
      clearPublishState();
    }

    // Passed to EditPublishSnapshotModal, update snapshot list 
    // when edit is made to the current publish snapshot
    const handleUpdateSnapshots = (updatedSnapshot) => {
      const updatedSnapshots = snapshotsList.map(snapshot => 
        snapshot.PK === updatedSnapshot.PK ? updatedSnapshot : snapshot
      );
      setSnapshotsList(updatedSnapshots);
    }

    const renderGdmPublishEditLink = (resourceParent, snapshotPK) => {
      const eventType = "republish";
      const helpText = (
        <div className="alert alert-warning mt-2">
          <strong>Note:</strong> This "Edit Published Summary" feature is only for administrative edits.
        </div>
      );

      return (
        <div className="mt-4">
          {fromProvisionalCuration && resourceParent ? (
            <Link className="mt-2" role="button" to={`/provisional-classification/${resourceParent.PK}/?snapshot=${snapshotPK}&${eventType}=yes`}>
              <Button className="mt-2" onClick={handleSnapshotModalOpen}>Edit Published Summary</Button>
            </Link>
          ) : (
            <Button className="mt-2" onClick={handleSnapshotModalOpen}>Edit Published Summary</Button>
          )}
          {helpText}
        </div>
      );
    }

    /**
     * Method to render the button that allows users to publish/unpublish an approved classification/interpretation
     * @param {object} resourceParent - The parent object of the classification/interpretation in a snapshot
     * @param {string} resourceType - The resource type (classification/interpretation) of the parent object
     * @param {string} snapshotPK - The PK of the source snapshot
     * @param {string} snapshotCSpecID - The ID of the source snapshot's CSpec object (if present)
     * @param {boolean} publishClassification - The published status of the classification/interpretation (per the source snapshot)
     */
    const renderPublishLink = (resourceParent, resourceType, snapshotPK, snapshotCSpecID, publishClassification) => {

        // Universal criteria to render a publish button/link:
        // GCI - User has permission to publish and unpublish if
        // allowed (allowPublishButton) and
        // neither a publish event (!isPublishEventActive) nor
        // the approval process (!isApprovalActive) is currently in progress
        // VCI - User has permission to publish if allowed (allowPublishButton) and
        // snapshot has a specification document (snapshotCSpecID) and
        // neither a publish event (!isPublishEventActive) nor the approval process (!isApprovalActive) is currently in progress
        // VCI - User has permission to unpublish if allowed (allowPublishButton) and
        // neither a publish event (!isPublishEventActive) nor the approval process (!isApprovalActive) is currently in progress

        // GCI - allow to publish if allowPublishButton
        // VCI - allow to publish if allowPublishButton and has CSpec
        const allowPublish = resourceType === 'interpretation'
          ? allowPublishButton && snapshotCSpecID
          : allowPublishButton;
        // If allow to publish or unpublish, show the button
        if ((allowPublish ||
            (allowPublishButton && publishClassification)) &&
           !isPublishEventActive && !isApprovalActive) {
            let classData = 'btn publish-link-item';
            let eventType = 'publish';
            let buttonText = resourceType === 'interpretation' ? 'Publish to Evidence Repository' : 'Publish Summary';

            if (publishClassification) {
                classData += ' unpublish btn-outline-info';
                eventType = 'unpublish';
                buttonText = resourceType === 'interpretation' ? 'Unpublish from Evidence Repository' : 'Unpublish Summary';
            } else {
                classData += ' publish btn-info';
            }

            // If not within the GCI's approval process, present publish link as a link (that passes along required data in URL query parameters)
            if (fromProvisionalCuration) {
                if (resourceParent && resourceParent.PK) {
                    return (
                        <Link className={classData} role="button" to={'/provisional-classification/' +
                            resourceParent.PK + '/?snapshot=' + snapshotPK + '&' + eventType + '=yes'}><FontAwesomeIcon icon={faPencilAlt} className="mr-3" /> {buttonText}</Link>
                    );
                } else {
                    return null;
                }

            // Otherwise, for the VCI or within the GCI's approval process, present publish link as a button (that triggers a state update in a parent component)
            } else if (addPublishState) {
                return (
                    <button className={classData}
                        onClick={addPublishState.bind(null, snapshotPK, eventType)}><FontAwesomeIcon icon={faPencilAlt} className="mr-3" /> {buttonText}</button>
                );
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    /**
     * Method to render publish/unpublish data for a snapshot
     * @param {object} snapshot - The snapshot object
     * @param {object} resourceParent - The parent object of the classification/interpretation in a snapshot
     * @param {boolean} diseaseMatched - Indicator that the snapshot has same disease as current GDM
     * @param {boolean} isSnapshotOnSupportedSOP - Indicator that the snapshot on SOP version that has supported to publish
     * @param {boolean} isSnapshotHasApprovalReviewDate - Indicator that the snapshot on SOP version that has approval review date
     * @param {string} currentApprovedSnapshotID - The snapshot ID of the most recently approved classification/interpretation
     */
    const renderSnapshotPublishData = (snapshot, resourceParent, diseaseMatched, isSnapshotOnSupportedSOP, obsoleteDisease, isSnapshotHasApprovalReviewDate, currentApprovedSnapshotID, allowEdit) => {
        if (lodashGet(snapshot, "resource.publishDate", null)) {
            const snapshotPK = snapshot.PK;
            const publishEditHistory = snapshot.resource.publishEditHistory || [];
            // Link to edit history
            const editHistoryLink = publishEditHistory.length > 0 ? (
              <Link className="btn btn-link" to={`/edit-history/${snapshotPK}`} target="_blank" rel="noopener noreferrer">
                View Published Edits History
              </Link>
            ) : null;

            let isGdm;

            if (snapshot.resource.publishClassification) {
                // The classification/interpretation is published, render published data
                let publishAffiliation, publishSiteURL, publishSiteLinkName;
                let publishLinkAlert = false, publishLinkAlertType, publishLinkAlertClass, publishLinkAlertMessage;

                if (snapshot.resourceType === 'interpretation') {
                    publishAffiliation = snapshot.resource.publishAffiliation ? ' (' +
                        getAffiliationNameBySubgroupID('vcep', snapshot.resource.publishAffiliation, affiliationsData) + ')' : '';
                    publishSiteURL = 'https://' + (demoVersion ? 'genboree.org/evidence-repo' : 'erepo.clinicalgenome.org/evrepo') +
                        '/ui/classification/' + (resourceParent && resourceParent.PK ? resourceParent.PK : '');
                    publishSiteLinkName = 'Evidence Repository';

                    if (showPublishLinkAlert) {
                        publishLinkAlert = true;
                        publishLinkAlertType = 'alert-info'
                        publishLinkAlertClass = 'evidence-repository-info';
                        publishLinkAlertMessage = 'Please allow a minute for Evidence Repository link to return results.';

                        if (clearPublishLinkAlert) {
                            setTimeout(clearPublishLinkAlert, 10000);
                        }
                    }
                } else {
                    isGdm = true;
                    // For SOP5 (or earlier) snapshots, use approvalDate
                    // For after SOP5 to current, use approvalReviewDate if exists else use approvalDate
                    const publishSiteLinkDate = !isSnapshotHasApprovalReviewDate ? snapshot.resource.approvalDate :
                        snapshot.resource.approvalReviewDate ? snapshot.resource.approvalReviewDate : snapshot.resource.approvalDate;
                    publishAffiliation = snapshot.resource.publishAffiliation ? ' (' +
                        getAffiliationNameBySubgroupID('gcep', snapshot.resource.publishAffiliation, affiliationsData) + ')' : '';
                    publishSiteURL = 'https://search' + (demoVersion ? '-staging' : '') + '.clinicalgenome.org/kb/gene-validity/CGGV:' + snapshot.resource.PK;
                    publishSiteLinkName = (resourceParent && resourceParent.gene && resourceParent.gene.symbol ?
                        resourceParent.gene.symbol + ' ' : '') + 'Classification Summary';
                }

                return (
                  <>
                    <div className="row mb-1 pt-3 border-top snapshot-publish-approval">
                        <div className="col-sm-4">
                            <StatusBadge label="Published" className="mr-3" />
                            {renderSnapshotStatusIcon(snapshot, 'Published')}
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-6">
                            <h5><strong>Published by:</strong> {snapshot.resource.publishSubmitter + publishAffiliation}</h5>
                            <h5>Date published: {formatDate(snapshot.resource.publishDate, 'YYYY MMM DD, h:mm a')}</h5>
                                
                            <h5><span className="text-pre-wrap">Comments about publishing reasons (optional, for internal use only): {snapshot.resource.publishComment ? snapshot.resource.publishComment : null}</span></h5>
                            <h5>ClinGen website link: <span><a href={publishSiteURL} target="_blank" rel="noopener noreferrer">{publishSiteLinkName}</a></span>
                                {publishLinkAlert ?
                                    <Alert type={publishLinkAlertType}
                                        className={publishLinkAlertClass} value={publishLinkAlertMessage} />
                                    : null}
                            </h5>
                            {snapshot.resourceType === 'interpretation' ?
                              <>
                                <h5>
                                  <strong>Specification Document: </strong>
                                  {lodashGet(snapshot, 'cspec.documentName', 'None')}
                                </h5>
                                <h5>
                                  <strong>Specified Gene: </strong>
                                  {lodashGet(snapshot, 'cspec.specifiedGene', 'None Selected')}
                                </h5>
                              </>
                              : null}
                        </div>
                        <div className="col-sm-6 text-right">
                            {renderPublishLink(resourceParent, snapshot.resourceType, snapshotPK, lodashGet(snapshot, 'cspec.cspecId', null), snapshot.resource.publishClassification)}
                        </div>
                    </div>
                    <div className="row curation-reasons-snapshot">
                      <div className="col-sm-6">
                        <h4>Curation Reason(s): </h4>
                        {renderCurationReasonsData(snapshot)}
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-sm-4">
                        {isGdm && allowEdit ? renderGdmPublishEditLink(resourceParent, snapshotPK) : null}
                        {isGdm ? editHistoryLink : null}
                      </div>
                    </div>
                  </>
                );
            } else {
                // The classification/interpretation is unpublished, render un-published data

                // Special criteria to render a publish link (to the right of unpublish data):
                // For GDM, allow publish if login user is allowed (allowPublishButton),
                //  given snapshot has the same disease as current GDM (diseaseMatched),
                //  current GDM is not associated with obsolete disease (obsoleteDisease),
                //  is on the supported SOP (isSnapshotOnSupportedSOP), and
                //  is the current approved (snapshot.PK === currentApprovedSnapshotID)
                // For interpretation, allow publish if login user is allowed (allowPublishButton),
                //  or snapshot has a specification document (snapshotCSpecID)
                //  is the current approved (snapshot.PK === currentApprovedSnapshotID)
                //  isSnapshotOnSupportedSOP = true since SOP is not considered
                //  diseaseMatched = true since this is not being considered
                //  obsoleteDisease = false since obsolete disease is not being considered
                const snapshotCSpecID = lodashGet(snapshot, 'cspec.cspecId', null);
                const allowSnapshotPublish = allowPublishButton && snapshotCSpecID && !obsoleteDisease && diseaseMatched && isSnapshotOnSupportedSOP && snapshot.PK === currentApprovedSnapshotID;
                const showObsoleteDisease = allowPublishButton && obsoleteDisease && diseaseMatched && isSnapshotOnSupportedSOP && snapshot.PK === currentApprovedSnapshotID;

                return (
                    <>
                    <div className="row mb-1 pt-3 border-top snapshot-publish-approval">
                        <div className="col-sm-4">
                            <StatusBadge label="Unpublished" className="mr-3" />
                            {renderSnapshotStatusIcon(snapshot, 'Unpublished')}
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-6">
                          <h5><strong>Unpublished by:</strong> {snapshot.resource.publishSubmitter}</h5>
                          <h5>Date unpublished: {formatDate(snapshot.resource.publishDate, 'YYYY MMM DD, h:mm a')}</h5>
                          <h5><span className="text-pre-wrap">Comments about publishing reasons (optional, for internal use only): {snapshot.resource.publishComment ? snapshot.resource.publishComment : null}</span></h5>
                        </div>
                        <div className="col-sm-6 text-right">
                            {allowSnapshotPublish ? renderPublishLink(resourceParent, snapshot.resourceType, snapshotPK, snapshotCSpecID, snapshot.resource.publishClassification) : null}
                            {showObsoleteDisease && renderObsoleteDiseaseIcon("gdm")}
                            {editHistoryLink ? editHistoryLink : null}
                        </div>
                    </div>
                    </>
                );
            }
        } else {
            return null;
        }
    }

    /**
     * Method to render snapshots in table rows
     * @param {object} snapshot - A saved copy of a provisioned/approved classification and its parent GDM/Interpretation
     * @param {string} isApprovalActive - Indicator that the user is at the approval step of the approval process (panel is visible)
     * @param {string} classificationStatus - The status of the classification (in terms of progress through the approval process)
     * @param {string} currentApprovedSnapshotID - The snapshot ID of the most recently approved classification/interpretation
     * @param {integer} index - The index of the object in the snapshots array
     */
    const renderSnapshot = (snapshot, isApprovalActive, classificationStatus, currentApprovedSnapshotID, index) => {
        const type = snapshot.resourceType;
        // support old snapshot format which does not have PK but uuid
        const snapshotPK = snapshot.PK || snapshot.uuid;
        const affiliationID = snapshot.resource && snapshot.resource.affiliation ? snapshot.resource.affiliation : '';
        let isGDM = false;
        let isSnapshotOnSupportedSOP, isSnapshotHasApprovalReviewDate, resourceParent;
        let allowToApprove = false, allowToPublish = false;
        // This is added so if disease has been changed in GDM, old classification cannot be published
        // But not used for VCI interpretation, set to true.
        let diseaseMatched = false;
        // Show obsolete disease icon if appropriate
        let showPublishObsoleteDisease = false, showApproveObsoleteDisease = false;
        let allowClinVarSubmission = false;
        // Added to check if GDM associated with obsolete disease, then classification cannot be approved or published.
        // But not checked for VCI interpretation, set to false.
        let obsoleteDisease = false;
        let allowEdit = false;

        // resourceParent is set to current GDM or interpretation, mainly for PK, not for snapshot related data
        if (snapshot.resourceType === 'classification' && gdm) {
            isGDM = true;
            resourceParent = gdm;

            isSnapshotHasApprovalReviewDate = snapshot.resource ? snapshotHasApprovalPreviewDate(snapshot.resource.classificationPoints) : null;
            // SOP8 - changed to allow to publish both SOP v7 and v8
            // A classification snapshot must be on the supported SOP (based on the data model of the evidence scoring) to be approved and published
            isSnapshotOnSupportedSOP = snapshot.resource ? isScoringForSupportedSOP(snapshot.resource.classificationPoints) : false;
            // Set if current curator can edit this GDM.  GDM needs to associated with a GCEP and user has to login as same GCEP in order to act on the GDM.
            allowEdit = lodashGet(gdm, "affiliation") && lodashGet(auth, "currentAffiliation.affiliation_id") && lodashGet(gdm, "affiliation") === lodashGet(auth, "currentAffiliation.affiliation_id");
            obsoleteDisease = isDiseaseObsolete(lodashGet(gdm, "disease.term", ''));
            diseaseMatched = lodashGet(snapshot, "disease") === lodashGet(gdm, "disease.PK", '');

            // A classification snapshot can be approved must have same disease as current GDM, and
            // disease is not obsolete and not a candidate for obsoletion, and
            // in supported SOP format to be approved
            // Check disease Id instead of disease term because obsolete disease has diffent term
            // Need to check latest disease is not obsolete (assume disease in db will be updated when disease gets obsoleted)
            // TODO: Add to check if disease is candidate for obsoletion
            allowToApprove = allowEdit && diseaseMatched && !obsoleteDisease && isSnapshotOnSupportedSOP;
            showApproveObsoleteDisease = allowEdit && diseaseMatched && obsoleteDisease && isSnapshotOnSupportedSOP && !isPublishEventActive && !isApprovalActive && classificationStatus !== 'Approved';

            // Special criteria to render a publish link (above "View Approved Summary" button):
            // Given snapshot is on the current supported SOP (isSnapshotOnSupportedSOP),
            // snapshot must have same disease as current GDM, and
            // current gdm related disease is not obsolete, and
            // has no publish activity (!snapshot.resource.publishDate), and
            // is latest approved snapshot
            allowToPublish = allowPublishButton && diseaseMatched && !obsoleteDisease && isSnapshotOnSupportedSOP && !(lodashGet(snapshot, "resource.publishDate", null)) && snapshot.PK === currentApprovedSnapshotID;
            // Only display obsolete disease icon if curator is allowed to publish if GDM is not associated with obsolete disease
            showPublishObsoleteDisease = allowPublishButton && diseaseMatched && obsoleteDisease && isSnapshotOnSupportedSOP && !(lodashGet(snapshot, "resource.publishDate", null)) && snapshot.PK === currentApprovedSnapshotID;

        } else if (snapshot.resourceType === 'interpretation') {
            resourceParent = interpretation;

            // Criteria to render ClinVar submission button/modal: snapshot is current approved, affiliation has been provided (affiliationID)
            //  and neither a publish event (!isPublishEventActive) nor the approval process (!isApprovalActive) is currently in progress
            allowClinVarSubmission = snapshotPK === currentApprovedSnapshotID && affiliationID && !isPublishEventActive && !isApprovalActive;

            // Not used for interpretation, just initialized to true
            isSnapshotHasApprovalReviewDate = true;
            isSnapshotOnSupportedSOP = true;
            diseaseMatched = true;
            // For interpretation, do not check obsolete disease for now
            obsoleteDisease = false;
            showPublishObsoleteDisease = false;
            showApproveObsoleteDisease = false;
            // useIsMyInterpretation() is used to check for interpretation
            allowToApprove = isMyInterpretation;
            // Special criteria to render a publish link (above a "View Approved Summary" button):
            // Given snapshot has no publish activity (!snapshot.resource.publishDate), and
            // is latest approved snapshot
            allowToPublish = isMyInterpretation && !(lodashGet(snapshot, "resource.publishDate", null)) && snapshot.PK === currentApprovedSnapshotID;
        }

        // Add snapshot's affiliation as params to url which allows access to snapshots created by other affiliations
        const params = new URLSearchParams(`snapshot=${snapshotPK}`)
        if (affiliationID) {
          params.append('affiliationId', affiliationID);
        }

        const summaryLink = isGDM
            ? `/curation-central/${resourceParent.PK}/gene-disease-evidence-summary/?${params}`
            : `/snapshot-summary/?snapshot=${snapshotPK}`;

        if (snapshot.approvalStatus === 'Provisioned') {
            return (
                <li className="snapshot-item list-group-item" key={`${snapshotPK}-publish`} data-key={snapshotPK} data-status={snapshot.approvalStatus} data-index={index}>
                    <div className="row mb-3">
                        <div className="col-sm-4">
                            <StatusBadge label={snapshot.approvalStatus} className="mb-3 mr-3" />
                            {renderSnapshotStatusIcon(snapshot, 'Provisional')}
                        </div>
                        <div className="col-sm-8 text-right">
                            <Link className="btn btn-link" to={summaryLink} target="_blank" rel="noopener noreferrer">
                                <FontAwesomeIcon icon={faList} className="mr-3" />Provisional Summary
                            </Link>
                            {!isPublishEventActive && !isApprovalActive && classificationStatus !== 'Approved' && allowToApprove ?
                                renderProvisionalSnapshotApprovalLink(resourceParent, index)
                                : null}
                            {showApproveObsoleteDisease && index === 0 && renderObsoleteDiseaseIcon("gdm")}
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-sm-6">
                            {affiliationID ? <h5><strong>ClinGen Affiliation:</strong> {getAffiliationName(affiliationID, affiliationsData)}</h5> : null}
                            
                            <h5><strong>{snapshot.resourceType === 'classification'? 'Classification' : 'Interpretation'} entered by: </strong>
                              {lodashGet(snapshot, "resource.provisionalSubmitter", null)}
                            </h5>

                            <h5><strong>Date saved:</strong> {lodashGet(snapshot, "resource.provisionalDate", null) ? formatDate(snapshot.resource.provisionalDate, "YYYY MMM DD, h:mm a") : null}</h5>
                                
                            {lodashGet(snapshot, "resource.provisionalReviewDate", null) ? <h5><strong>Date reviewed:</strong> {formatDate(snapshot.resource.provisionalReviewDate, "YYYY MMM DD")}</h5> : null}
                        </div>
                        <div className="col-sm-6">
                            <h5><strong>Saved Classification: </strong>
                                {lodashGet(snapshot, "resource.alteredClassification", null) && snapshot.resource.alteredClassification !== 'No Modification' ?
                                <span>{snapshot.resource.alteredClassification} </span> : lodashGet(snapshot, "resource.autoClassification", null)}
                            </h5>
                            <h5><strong>Disease:</strong> {snapshot.diseaseTerm ? snapshot.diseaseTerm : "None"}</h5>
                            <h5><strong>Mode of Inheritance:</strong> {snapshot.modeInheritance ? renderModeInheritanceLink(snapshot.modeInheritance, snapshot.modeInheritanceAdjective) : "None"}</h5>
                            
                            {lodashGet(snapshot, "resource.provisionalComment", null) && (
                                <h5><span className="text-pre-wrap"><strong>Additional comments:</strong> {snapshot.resource.provisionalComment}</span></h5>
                            )}
                            {type === 'interpretation' ?
                              <>
                                <h5>
                                  <strong>Specification Document: </strong>
                                  {lodashGet(snapshot, 'cspec.documentName', 'None')}
                                </h5>
                                <h5>
                                  <strong>Specified Gene: </strong>
                                  {lodashGet(snapshot, 'cspec.specifiedGene', 'None Selected')}
                                </h5>
                              </>
                              : null}
                        </div>
                    </div>
                </li>
            );
        } else if (snapshot.approvalStatus === 'Approved') {
            return (
                <li className="snapshot-item list-group-item border-success" key={snapshotPK} data-key={snapshotPK} data-status={snapshot.approvalStatus} data-index={index}
                    data-associated={snapshot['associatedSnapshot'] ? snapshot['associatedSnapshot'] : null}>
                    
                    <div className="row mb-3">
                        <div className="col-sm-3">
                            <StatusBadge label="Approved" className="mr-3" />
                            {renderSnapshotStatusIcon(snapshot, 'Approved')}
                        </div>
                        <div className="col-sm-9 text-right">
                            <Link className="btn btn-link" to={summaryLink} target="_blank" rel="noopener noreferrer">
                                <FontAwesomeIcon icon={faList} className="mr-3" />Approved Summary
                            </Link>
                            {allowToPublish ? renderPublishLink(resourceParent, snapshot.resourceType, snapshotPK, lodashGet(snapshot, 'cspec.cspecId', null), false) : null}
                            {showPublishObsoleteDisease && renderObsoleteDiseaseIcon("gdm")}
                        </div>
                    </div>
                    <div className="row mb-3">
                        <div className="col-sm-3"></div>
                        <div className="col-sm-9 text-right">
                            {allowClinVarSubmission ? renderClinVarSubmission(snapshotPK) : null}
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-6 mb-3">
                            {affiliationID ?
                                <h5><strong>ClinGen Affiliation:</strong> {getAffiliationName(affiliationID, affiliationsData)}</h5> : null}
                                <h5><strong>Approved {snapshot.resourceType === 'classification'? 'Classification' : 'Interpretation'} entered by: </strong>
                                  {lodashGet(snapshot, "resource.approvalSubmitter", null)}
                                </h5>

                            {lodashGet(snapshot, "resource.classificationApprover", null) ?
                                <h5><strong>Affiliation Approver:</strong> {snapshot.resource.classificationApprover}</h5> : null}

                            {lodashGet(snapshot, "resource.additionalApprover", null) ?
                                <h5><strong>Classification Approver:</strong> {getApproverNames(snapshot.resource.additionalApprover, affiliationsData)}</h5>
                                : null}
                            {lodashGet(snapshot, "resource.classificationContributors", null) ?
                                <h5><strong>Classification Contributors:</strong> {getContributorNames(snapshot.resource.classificationContributors, affiliationsData).sort().join(', ')}</h5>
                                : null}

                            <h5><strong>Date saved as Approved:</strong> {lodashGet(snapshot, "resource.approvalDate", null) ? formatDate(snapshot.resource.approvalDate, "YYYY MMM DD, h:mm a") : null}</h5>
                            <h5><strong>Final Approval Date:</strong> {lodashGet(snapshot, "resource.approvalReviewDate", null) ? formatDate(snapshot.resource.approvalReviewDate, "YYYY MMM DD") : null}</h5>
                            
                        </div>
                        <div className="col-sm-6 mb-3">
                            <h5><strong>Saved Classification: </strong>
                                {lodashGet(snapshot, "resource.alteredClassification", null) && snapshot.resource.alteredClassification !== 'No Modification' ?
                                <span>{snapshot.resource.alteredClassification}</span> : lodashGet(snapshot, "resource.autoClassification", null)}
                            </h5>
                            <h5><strong>Disease:</strong> {snapshot.diseaseTerm ? snapshot.diseaseTerm : "None"}</h5>
                            <h5><strong>Mode of Inheritance:</strong> {snapshot.modeInheritance ? renderModeInheritanceLink(snapshot.modeInheritance, snapshot.modeInheritanceAdjective) : "None"}</h5>
                            <h5><span className="text-pre-wrap"><strong>Approver comments:</strong> {lodashGet(snapshot, "resource.approvalComment", null) ? snapshot.resource.approvalComment : null}</span></h5>
                            {type === 'interpretation' ?
                              <>
                                <h5>
                                  <strong>Specification Document: </strong>
                                  {lodashGet(snapshot, 'cspec.documentName', 'None')}
                                </h5>
                                <h5>
                                  <strong>Specified Gene: </strong>
                                  {lodashGet(snapshot, 'cspec.specifiedGene', 'None Selected')}
                                </h5>
                              </>
                              : null}
                            {isGDM ?
                                <>
                                    <h5><span className="text-pre-wrap"><strong>Contributor comments:</strong> {lodashGet(snapshot, "resource.contributorComment", null) ? snapshot.resource.contributorComment : null}</span></h5>
                                    <h5><strong>SOP Version:</strong> {determineSOPVersion(snapshot.resource)}</h5>
                                </>
                                : null}
                        </div>
                    </div>
                    <ul>
                      {renderSnapshotPublishData(snapshot, resourceParent, diseaseMatched, isSnapshotOnSupportedSOP, obsoleteDisease, isSnapshotHasApprovalReviewDate, currentApprovedSnapshotID, allowEdit)}
                    </ul>
                </li>
            );
        }
    }

    if (snapshotsList){
				const allowEdit = lodashGet(gdm, "affiliation") && lodashGet(auth, "currentAffiliation.affiliation_id") && lodashGet(gdm, "affiliation") === lodashGet(auth, "currentAffiliation.affiliation_id");
				const publishedSnapshot = snapshotsList
					.filter(snapshot => snapshot.resource.publishClassification === true)
					.reduce((latest, snapshot) => {
							return latest == null || new Date(snapshot.resource.publishDate) > new Date(latest.resource.publishDate) ? snapshot : latest;
					}, null);
				return (
            <div className="snapshot-list">
                <ul className="list-group">
                    {snapshotsList.map((snapshot, i) => renderSnapshot(snapshot, isApprovalActive, classificationStatus, currentApprovedSnapshotID, i))}
                </ul>
                <EditPublishSnapshotModal
                  id="editPublishSnapshotModal"
                  title="Edit Published Summary"
                  show={snapshotModalOpen}
                  onHide={handleSnapshotModalClose}
                  publishedSnapshot={publishedSnapshot}
                  gdm={gdm}
                  snapshots={snapshots}
									allowEdit={allowEdit}
                  clearPublishState={clearPublishState}
                  handleUpdateSnapshots={handleUpdateSnapshots}
                  updateProvisionalObj={updateProvisionalObj}
                />
            </div>
        );
    }
    
}

export default Snapshots;
