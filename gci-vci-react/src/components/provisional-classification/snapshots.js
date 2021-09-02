import React, { useState, useEffect } from 'react';
import moment from 'moment';
import lodashGet from 'lodash/get';

import { getAffiliationName, getAffiliationNameBySubgroupID } from '../../helpers/get_affiliation_name';
import { renderModeInheritanceLink } from '../../helpers/render_mode_inheritance';
import { getApproverNames, getContributorNames } from '../../helpers/get_approver_names';
import { sortListByDate } from '../../helpers/sort';
import { isScoringForSupportedSOP, snapshotHasApprovalPreviewDate, determineSOPVersion } from '../../helpers/sop';
import { formatDate } from 'react-day-picker/moment';
import StatusBadge from '../common/StatusBadge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faList, faCheck, faPencilAlt } from '@fortawesome/free-solid-svg-icons'
import { Link } from "react-router-dom";

import Alert from '../common/Alert';
import { useIsMyInterpretation } from '../../utilities/ownershipUtilities';
import ClinVarSubmissionData from '../variant-central/ClinVarSubmissionData';

const Snapshots = (props) => {

    const [snapshotsList, setSnapshotsList] = useState([]);
    const isMyInterpretation = useIsMyInterpretation();

    const {
        interpretation,
        gdm,
        snapshots,
        approveProvisional,
        addPublishState,
        isApprovalActive,
        isPublishEventActive,
        classificationStatus,
        allowPublishButton,
        showPublishLinkAlert,
        clearPublishLinkAlert,
        demoVersion,
        fromProvisionalCuration } = props;

    const currentApprovedSnapshot = snapshots ? snapshots.find(snapshot => snapshot.approvalStatus === 'Approved') : {};
    const currentApprovedSnapshotID = currentApprovedSnapshot ? currentApprovedSnapshot.PK : undefined;

    useEffect(()=>{
        //Set snapshot list ordered by date
        setSnapshotsList(sortListByDate(snapshots, 'date_created'));
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
     * Method to render the button that allows users to publish/unpublish an approved classification/interpretation
     * @param {object} resourceParent - The parent object of the classification/interpretation in a snapshot
     * @param {string} resourceType - The resource type (classification/interpretation) of the parent object
     * @param {string} snapshotPK - The PK of the source snapshot
     * @param {boolean} publishClassification - The published status of the classification/interpretation (per the source snapshot)
     */
    const renderPublishLink = (resourceParent, resourceType, snapshotPK, publishClassification) => {

        // Universal criteria to render a publish button/link:
        // User has permission to publish (allowPublishButton) and neither a publish event (!isPublishEventActive) nor the
        //  approval process (!isApprovalActive) is currently in progress
        if (allowPublishButton && !isPublishEventActive && !isApprovalActive) {
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
    const renderSnapshotPublishData = (snapshot, resourceParent, diseaseMatched, isSnapshotOnSupportedSOP, isSnapshotHasApprovalReviewDate, currentApprovedSnapshotID) => {
        if (lodashGet(snapshot, "resource.publishDate", null)) {
            const snapshotPK = snapshot.PK;

            if (snapshot.resource.publishClassification) {
                let publishAffiliation, publishSiteURL, publishSiteLinkName;
                let publishLinkAlert = false, publishLinkAlertType, publishLinkAlertClass, publishLinkAlertMessage;

                if (snapshot.resourceType === 'interpretation') {
                    publishAffiliation = snapshot.resource.publishAffiliation ? ' (' +
                        getAffiliationNameBySubgroupID('vcep', snapshot.resource.publishAffiliation) + ')' : '';
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
                    // For SOP5 (or earlier) snapshots, use approvalDate
                    // For after SOP5 to current, use approvalReviewDate if exists else use approvalDate
                    const publishSiteLinkDate = !isSnapshotHasApprovalReviewDate ? snapshot.resource.approvalDate :
                        snapshot.resource.approvalReviewDate ? snapshot.resource.approvalReviewDate : snapshot.resource.approvalDate;
                    publishAffiliation = snapshot.resource.publishAffiliation ? ' (' +
                        getAffiliationNameBySubgroupID('gcep', snapshot.resource.publishAffiliation) + ')' : '';
                    publishSiteURL = 'https://search' + (demoVersion ? '-staging' : '') + '.clinicalgenome.org/kb/gene-validity/' +
                        snapshot.resource.PK + '--' + moment(publishSiteLinkDate).utc().format('Y-MM-DDTHH:mm:ss');
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
                                
                            <h5>Additional comments: {snapshot.resource.publishComment ? snapshot.resource.publishComment : null}</h5>
                            <h5>Link: <span><a href={publishSiteURL} target="_blank" rel="noopener noreferrer">{publishSiteLinkName}</a></span>
                                {publishLinkAlert ?
                                    <Alert type={publishLinkAlertType}
                                        className={publishLinkAlertClass} value={publishLinkAlertMessage} />
                                    : null}
                            </h5>
                        </div>
                        <div className="col-sm-6 text-right">
                            {renderPublishLink(resourceParent, snapshot.resourceType, snapshotPK, snapshot.resource.publishClassification)}
                        </div>
                    </div>
                  </>
                );
            } else {
                // Special criteria to render a publish link (to the right of unpublish data):
                // Given snapshot has the same disease as current GDM, is on the supported SOP (isSnapshotOnSupportedSOP) and is the current approved (snapshot.PK === currentApprovedSnapshotID)
                const allowSnapshotPublish = diseaseMatched && isSnapshotOnSupportedSOP && snapshot.PK === currentApprovedSnapshotID;

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
                          <h5>Additional comments: {snapshot.resource.publishComment ? snapshot.resource.publishComment : null}</h5>
                        </div>
                        <div className="col-sm-6 text-right">
                            {allowSnapshotPublish ? renderPublishLink(resourceParent, snapshot.resourceType, snapshotPK, snapshot.resource.publishClassification) : null}
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
        // This is added so if disease has been changed in GDM, old classification cannot be approved
        // useIsMyInterpretation() is used to check for interpretation
        let allowToApprove = false;
        // This is added so if disease has been changed in GDM, old classification cannot be published
        // But no check for VCI interpretation
        let diseaseMatched = false;
        let allowClinVarSubmission = false;

        // resourceParent is set to current GDM or interpretation, mainly for PK, not for snapshot related data
        if (snapshot.resourceType === 'classification' && gdm) {
            isGDM = true;
            resourceParent = gdm;

            // SOP8 - changed to allow to publish both SOP v7 and v8
            // A classification snapshot must be on the supported SOP (based on the data model of the evidence scoring) to be approved and published
            isSnapshotHasApprovalReviewDate = snapshot.resource ? snapshotHasApprovalPreviewDate(snapshot.resource.classificationPoints) : null;
            isSnapshotOnSupportedSOP = snapshot.resource ? isScoringForSupportedSOP(snapshot.resource.classificationPoints) : false;

            // A classification snapshot must have same disease as current GDM and in supported SOP format to be approved or published
            diseaseMatched = snapshot.diseaseTerm === lodashGet(gdm, "disease.term", '');
            allowToApprove = diseaseMatched && isSnapshotOnSupportedSOP;
        } else if (snapshot.resourceType === 'interpretation') {
            resourceParent = interpretation;

            // Criteria to render ClinVar submission button/modal: snapshot is current approved, affiliation has been provided (affiliationID)
            //  and neither a publish event (!isPublishEventActive) nor the approval process (!isApprovalActive) is currently in progress
            allowClinVarSubmission = snapshotPK === currentApprovedSnapshotID && affiliationID && !isPublishEventActive && !isApprovalActive;

            isSnapshotHasApprovalReviewDate = true;
            isSnapshotOnSupportedSOP = true;
            diseaseMatched = true;
            allowToApprove = isMyInterpretation;
        }

        // Special criteria to render a publish link (above a "View Approved Summary" button):
        // Given snapshot is on the current supported SOP (isSnapshotOnSupportedSOP), has no publish activity (!snapshot.resource.publishDate) and
        // is the current approved (snapshot['@id'] === currentApprovedSnapshotID)
        const allowSnapshotPublish = diseaseMatched && isSnapshotOnSupportedSOP && !(lodashGet(snapshot, "resource.publishDate", null)) && snapshot.PK === currentApprovedSnapshotID;
        const summaryLink = isGDM
            ? `/curation-central/${resourceParent.PK}/gene-disease-evidence-summary/?snapshot=${snapshotPK}`
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
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-sm-6">
                            {affiliationID ? <h5><strong>ClinGen Affiliation:</strong> {getAffiliationName(affiliationID)}</h5> : null}
                            
                            <h5><strong>{snapshot.resourceType === 'classification'? 'Classification' : 'Interpretation'} entered by: </strong>
                              {lodashGet(snapshot, "resource.provisionalSubmitter", null)}
                            </h5>

                            <h5><strong>Date saved:</strong> {lodashGet(snapshot, "resource.provisionalDate", null) ? formatDate(snapshot.resource.provisionalDate, "YYYY MMM DD, h:mm a") : null}</h5>
                                
                            {lodashGet(snapshot, "resource.provisionalReviewDate", null) ? <h5><strong>Date reviewed:</strong> {formatDate(snapshot.resource.provisionalReviewDate, "YYYY MMM DD")}</h5> : null}
                        </div>
                        <div className="col-sm-6">
                            <h5><strong>{type === 'interpretation' ? 'Saved Pathogenicity: ' : 'Saved Classification: '}</strong>
                                {lodashGet(snapshot, "resource.alteredClassification", null) && snapshot.resource.alteredClassification !== 'No Modification' ?
                                <span>{snapshot.resource.alteredClassification} (modified)</span> : lodashGet(snapshot, "resource.autoClassification", null)}
                            </h5>
                            <h5><strong>Disease:</strong> {snapshot.diseaseTerm ? snapshot.diseaseTerm : "None"}</h5>
                            <h5><strong>Mode of Inheritance:</strong> {snapshot.modeInheritance ? renderModeInheritanceLink(snapshot.modeInheritance, snapshot.modeInheritanceAdjective) : "None"}</h5>
                            
                            {lodashGet(snapshot, "resource.provisionalComment", null) && (
                                <h5><strong>Additional comments:</strong> {snapshot.resource.provisionalComment}</h5>
                            )}
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
                            {allowClinVarSubmission ? <ClinVarSubmissionData resourcePK={snapshotPK} /> : null}
                            {allowSnapshotPublish ? renderPublishLink(resourceParent, snapshot.resourceType, snapshotPK, false) : null}
                        </div>
                    </div>
                    
                    <div className="row">
                        <div className="col-sm-6 mb-3">
                            {affiliationID ?
                                <h5><strong>ClinGen Affiliation:</strong> {getAffiliationName(affiliationID)}</h5> : null}
                                <h5><strong>Approved {snapshot.resourceType === 'classification'? 'Classification' : 'Interpretation'} entered by: </strong>
                                  {lodashGet(snapshot, "resource.approvalSubmitter", null)}
                                </h5>

                            {lodashGet(snapshot, "resource.classificationApprover", null) ?
                                <h5><strong>Affiliation Approver:</strong> {snapshot.resource.classificationApprover}</h5> : null}

                            {lodashGet(snapshot, "resource.additionalApprover", null) ?
                                <h5><strong>Classification Approver:</strong> {getApproverNames(snapshot.resource.additionalApprover)}</h5>
                                : null}
                            {lodashGet(snapshot, "resource.classificationContributors", null) ?
                                <h5><strong>Classification Contributors:</strong> {getContributorNames(snapshot.resource.classificationContributors).sort().join(', ')}</h5>
                                : null}

                            <h5><strong>Date saved as Approved:</strong> {lodashGet(snapshot, "resource.approvalDate", null) ? formatDate(snapshot.resource.approvalDate, "YYYY MMM DD, h:mm a") : null}</h5>
                            <h5><strong>Final Approval Date:</strong> {lodashGet(snapshot, "resource.approvalReviewDate", null) ? formatDate(snapshot.resource.approvalReviewDate, "YYYY MMM DD") : null}</h5>
                            
                        </div>
                        <div className="col-sm-6 mb-3">
                            <h5><strong>{type === 'interpretation' ? 'Saved Pathogenicity: ' : 'Saved Classification: '}</strong>
                                {lodashGet(snapshot, "resource.alteredClassification", null) && snapshot.resource.alteredClassification !== 'No Modification' ?
                                <span>{snapshot.resource.alteredClassification} (modified)</span> : lodashGet(snapshot, "resource.autoClassification", null)}
                            </h5>
                            <h5><strong>Disease:</strong> {snapshot.diseaseTerm ? snapshot.diseaseTerm : "None"}</h5>
                            <h5><strong>Mode of Inheritance:</strong> {snapshot.modeInheritance ? renderModeInheritanceLink(snapshot.modeInheritance, snapshot.modeInheritanceAdjective) : "None"}</h5>
                            <h5><strong>Approver comments:</strong> {lodashGet(snapshot, "resource.approvalComment", null) ? snapshot.resource.approvalComment : null}</h5>
                            
                            {isGDM ?
                                <>
                                    <h5><strong>Contributor comments:</strong> {lodashGet(snapshot, "resource.contributorComment", null) ? snapshot.resource.contributorComment : null}</h5>
                                    <h5><strong>SOP Version:</strong> {determineSOPVersion(snapshot.resource)}</h5>
                                </>
                                : null}
                        </div>
                    </div>
                    {renderSnapshotPublishData(snapshot, resourceParent, diseaseMatched, isSnapshotOnSupportedSOP,  isSnapshotHasApprovalReviewDate, currentApprovedSnapshotID)}
                </li>
            );
        }
    }

    if (snapshotsList){
        return (
            <div className="snapshot-list">
                <ul className="list-group">
                    {snapshotsList.map((snapshot, i) => renderSnapshot(snapshot, isApprovalActive, classificationStatus, currentApprovedSnapshotID, i))}
                </ul>
            </div>
        );
    }
    
}

export default Snapshots;
