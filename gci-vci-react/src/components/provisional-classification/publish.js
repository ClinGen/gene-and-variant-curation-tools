import React, { Component } from 'react';
import lodashGet from 'lodash/get';

import moment from 'moment';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../utils';
import { connect } from 'react-redux';

import { getAffiliationName } from '../../helpers/get_affiliation_name';
import { getApproverNames, getContributorNames } from '../../helpers/get_approver_names';
import { getUserName } from '../../helpers/getUserName';

import LoadingSpinner from '../common/LoadingSpinner';
import Alert from '../common/Alert';
import { gdmPutParticipantsAndSetState } from '../../utilities/gdmUtilities';
import { AmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';
import { setGdmAction } from '../../actions/gdmActions';

class PublishApproval extends Component {

    constructor(props) {
        super(props);
        let selectedSnapshot = {};

        // Determine which type of resource (GCI GDM or VCI interpretation) is being published
        const selectedResourceType = props.gdm && props.gdm.PK ? 'gdm' : props.interpretation && props.interpretation.PK ? 'interpretation' : null;

        // If both the data to identify a "selected" snapshot (props.selectedSnapshotUUID and props[selectedResourceType].PK) and a list of
        // snapshots to search (props.snapshots) exist, then try to find the specified snapshot
        if (props.selectedSnapshotUUID && selectedResourceType && props.snapshots) {
            // snapshot[selectedResourceType] doesn't exit, but seems not causing issue
            selectedSnapshot = props.snapshots.find(snapshot => (snapshot['PK'] &&
                snapshot['PK'] === props.selectedSnapshotUUID &&
                (snapshot[selectedResourceType] === props[selectedResourceType].PK ||
                    snapshot.resourceParent && snapshot.resourceParent.s3_archive_key &&
                    snapshot.resourceParent.s3_archive_key.split('/', 3)[1] === props[selectedResourceType].PK)));

        // Otherwise, find the current approved snapshot (props.snapshots is assumed to be sorted)
        } else if (props.snapshots) {
            selectedSnapshot = props.snapshots.find(snapshot => snapshot.approvalStatus === 'Approved');
        }

        // If a "selected" snapshot exists, retrieve the "selected" provisional from it
        const selectedProvisional = selectedSnapshot && selectedSnapshot.resource ? selectedSnapshot.resource : {};

        // Check if the "selected" provisional is also the current one (using data other than the shared UUID)
        const isSelectedProvisionalCurrent = props.provisional &&
            selectedProvisional.provisionalDate === props.provisional.provisionalDate &&
            selectedProvisional.provisionalSubmitter === props.provisional.provisionalSubmitter &&
            selectedProvisional.approvalDate === props.provisional.approvalDate &&
            selectedProvisional.approvalSubmitter === props.provisional.approvalSubmitter &&
            selectedProvisional.affiliation === props.provisional.affiliation;

        this.initialState = {
            selectedResourceType: selectedResourceType,
            selectedSnapshot: selectedSnapshot,
            selectedProvisional: selectedProvisional,
            isSelectedProvisionalCurrent: isSelectedProvisionalCurrent,
            publishDate: undefined,
            publishComment: undefined,
            publishSubmitter: undefined,
            publishAffiliation: undefined,
            isPublishPreview: false,
            showAlertMessage: false,
            alertType: null,
            alertClass: null,
            alertMsg: null,
            submitBusy: false // Flag to indicate that the submit button is in a 'busy' state
        };
        this.state = this.initialState;
        this.requestRecycler = new AmplifyAPIRequestRecycler();
    }

    componentWillUnmount() {
        this.requestRecycler.cancelAll();
    }

    // Set state of comments set in textarea
    handleCommentsChange = (value) => {
        this.setState({ publishComment: value });
    }

    /**
     * Method to handle previewing publish form
     */
    handlePreviewPublish = (e) => {
        e.preventDefault();
        let affiliationSubgroup;
        const selectedResourceType = this.state.selectedResourceType;
        const affiliation = this.props.affiliation;

        // Set variables based on the (parent) resource type
        if (selectedResourceType === 'gdm') {
            affiliationSubgroup = 'gcep';
        } else if (selectedResourceType === 'interpretation') {
            affiliationSubgroup = 'vcep';
        }

        const publishAffiliation = affiliation && affiliation.subgroups && affiliation.subgroups[affiliationSubgroup] &&
            affiliation.subgroups[affiliationSubgroup].id ? affiliation.subgroups[affiliationSubgroup].id : undefined;
        this.setState({
            publishSubmitter: getUserName(this.props.auth),
            publishAffiliation: publishAffiliation,
            isPublishPreview: true
        });
    }

    /**
     * Method to handle resetting the publish form data
     */
    handleCancelPublish = () => {
        this.setState({
            publishSubmitter: undefined,
            publishAffiliation: undefined,
            publishComment: undefined,
            isPublishPreview: false
        });
    }

    /**
     * Method to handle editing the publish form data
     */
    handleEditPublish = () => {
        this.setState({ isPublishPreview: false });
    }

    /**
     * Method to show error alert
     * @param {string} alertType - The type of alert (added to class)
     * @param {string} alertClass - Custom classes for the alert
     * @param {object} alertMsg - The alert message
     */
    showAlert = (alertType, alertClass, alertMsg) => {
        this.setState({
            showAlertMessage: true,
            alertType: alertType,
            alertClass: alertClass,
            alertMsg: alertMsg
        }, () => {
            setTimeout(this.hideAlert, 10000);
        });
    }

    /**
     * Method to hide error alert
     */
    hideAlert = () => {
        this.setState({ showAlertMessage: false });
    }

    /**
     * Method to publish data to the Data Exchange
     * @param {string} objType - The type of the data's source object (e.g. snapshot)
     * @param {string} objUUID - The UUID of the data's source object
     */
    publishToDataExchange = (objType, objUUID) => {
        let alertType = 'danger';
        let alertClass = 'publish-error';
        let alertMsg = (<span>Request failed; please try again in a few minutes or contact helpdesk: <a
            href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a></span>);

        return new Promise((resolve, reject) => {
            if (objType && objUUID) {
                const url = `/messaging/publish/${objUUID}`;
                API.get(API_NAME, url).then(result => {
                    if (result.status === 'Success') {
                        resolve(result);
                    } else {
                        console.log('Message delivery failure: %s', result.message);
                        this.setState({ submitBusy: false });
                        this.showAlert(alertType, alertClass, alertMsg);
                        reject(result);
                    }
                }).catch(error => {
                    console.log('Internal data retrieval error: %o', error);
                    this.setState({ submitBusy: false });
                    this.showAlert(alertType, alertClass, alertMsg);
                    reject(error);
                });
            } else {
                this.setState({ submitBusy: false });
                this.showAlert(alertType, alertClass, alertMsg);
                reject(null);
            }
        });
    }

    /**
     * Method to send GDM publish/unpublish provisional data to Data Exchange
     * @param {object} provisional - provisional classification object
     * @param {string} publishSnapshotId - current publish/unpublish snapshot Id
     */
    sendToDataExchange = (provisional, publishSnapshotId) => {
        const publishSubmitter = this.props.auth;
        const status = provisional.publishClassification ? 'published' : 'unpublished';
        const publishRole = provisional.publishClassification ? ['publisher'] : ['unpublisher'];
        // Get all contributors
        const contributors = this.props.getContributors(publishSnapshotId);

        // Add this provisional publisher/unpublisher to contributors list
        if (publishSubmitter) {
            contributors.push({ 
                name: getUserName(publishSubmitter),
                id: lodashGet(publishSubmitter, 'PK', ''),
                email: lodashGet(publishSubmitter, 'email', ''),
                roles: publishRole
            });
        }

        // Create data object to be sent to Data Exchange
        const publishDate = provisional.publishDate ? provisional.publishDate : '';
        let uncData = this.props.setUNCData(provisional, status, publishDate, publishDate, publishSubmitter, contributors);

        // Post published/unpublished data to Data Exchange
        this.props.postTrackData(uncData).then(response => {
            console.log('Successfully sent %s data to Data Exchange for provisional %s at %s', status, provisional.PK, moment(publishDate).toISOString());
        }).catch(error => {
            console.log('Error sending %s data to Data Exchange for provisional %s at %s - Error: %o', status, provisional.PK, moment(publishDate).toISOString(), error);
        });
    }

    /**
     * Method to send full GDM data snapshot to Data Exchange when provisional classification is published
     */
    publishGDMToDataExchange = (snapshot) => {
        // Post published GDM data snapshot to Data Exchange
        return new Promise((resolve, reject) => {
            // Check if snapshot has necessary data
            if (snapshot && snapshot.resource && snapshot.resourceParent) {
                // If gdm object is in snapshot.resourceParent, delete it
                if (snapshot.resourceParent.gdm) {
                  delete snapshot.resourceParent['gdm'];
                }
                const params = { body: {snapshot} };
                API.post(API_NAME, '/messaging/publish-gdm', params).then(result => {
                    if (result.status === 'Success') {
                        console.log('Post full gdm succeeded: %o', result);
                        resolve(result);
                    } else {
                        console.log('Post full gdm failed: %o', result);
                        reject(result);
                    }
                }).catch(error => {
                    console.log('Post full gdm internal data retrieval error: %o', error);
                    reject(error);
                });
            } else {
                console.log('Post full gdm Error: Missing expected data');
                reject({'message': 'Missing expected data'});
            }
        });
    }

    /**
     * Method to handle submitting the publish form
     * @param {object} e - The submitted event object
     */
    submitForm = (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.setState({ submitBusy: true });
        if (this.state.selectedSnapshot && this.state.selectedSnapshot['item_type'] && this.state.selectedSnapshot['PK']) {
            let associatedResourceSnapshots, resourceProperName, resourceName;
            const selectedResourceType = this.state.selectedResourceType;

            // Set variables based on the (parent) resource type
            if (selectedResourceType === 'gdm') {
                associatedResourceSnapshots = 'associatedClassificationSnapshots';
                resourceProperName = 'Classification';
                resourceName = 'classification';
            } else if (selectedResourceType === 'interpretation') {
                associatedResourceSnapshots = 'associatedInterpretationSnapshots';
                resourceProperName = 'Interpretation';
                resourceName = 'interpretation';
            }

            this.publishToDataExchange(this.state.selectedSnapshot['item_type'], this.state.selectedSnapshot['PK']).then(response => {
                let publishProvisional = this.state.selectedProvisional ? this.state.selectedProvisional : {};
                let currentProvisional = this.props.provisional ? this.props.provisional : {};
                const submissionTimestamp = new Date();

                // Update published (or unpublished) provisional with form data (to be included when selected/published snapshot object is sent to the DB)
                publishProvisional.publishClassification = !this.state.selectedProvisional.publishClassification;
                publishProvisional.publishSubmitter = this.state.publishSubmitter;
                publishProvisional.publishAffiliation = this.state.publishAffiliation;
                publishProvisional.publishDate = moment(submissionTimestamp).toISOString();

                if (this.state.publishComment && this.state.publishComment.length) {
                    publishProvisional.publishComment = this.state.publishComment;
                } else if (publishProvisional.publishComment) {
                    publishProvisional['publishComment'] = null;
                }

                // Additional provisional data that would otherwise be lost (when snapshot object is sent to the DB)
                publishProvisional.last_modified = moment(submissionTimestamp).utc().format('Y-MM-DDTHH:mm:ss.SSSZ');
                publishProvisional.modified_by = lodashGet(this.props.auth, 'PK', null);

                // Only update current provisional object with form data when publish event is on current approved snapshot
                if (this.state.isSelectedProvisionalCurrent) {
                    currentProvisional.publishClassification = !this.props.provisional.publishClassification;
                    currentProvisional.publishSubmitter = this.state.publishSubmitter;
                    currentProvisional.publishAffiliation = this.state.publishAffiliation;
                    currentProvisional.publishDate = moment(submissionTimestamp).toISOString();

                    if (this.state.publishComment && this.state.publishComment.length) {
                        currentProvisional.publishComment = this.state.publishComment;
                    } else if (currentProvisional.publishComment) {
                        currentProvisional['publishComment'] = null;
                    }
                    currentProvisional.modified_by = lodashGet(this.props.auth, 'PK', null);
                }

                if (selectedResourceType === 'gdm') {
                    if (this.state.isSelectedProvisionalCurrent) {
                        const url = '/provisional-classifications/' + this.props.provisional.PK;
                        const params = {body: {currentProvisional}};

                        // Send updated current provisional object to the DB
                        API.put(API_NAME, url, params).then(responseProvisional => {
                            // Send publish GDM provisional data to Data Exchange
                            this.sendToDataExchange(responseProvisional, this.state.selectedSnapshot.PK);
                            // Only update provisional state object when publish event is on current approved snapshot
                            this.props.updateProvisionalObj(responseProvisional);
                            return Promise.resolve(responseProvisional);
                        }).catch(error => {
                            console.log('Updating provisional error = : %o', error);
                        });
                    }

                    // Create selected/published snapshot object, updated with publish event data
                    const publishSnapshot = {
                        resourceId: publishProvisional.PK,
                        resourceType: this.state.selectedSnapshot.resourceType,
                        approvalStatus: this.state.selectedSnapshot.approvalStatus,
                        resource: publishProvisional,
                        resourceParent: this.state.selectedSnapshot.resourceParent,
                        disease: this.state.selectedSnapshot.disease ? this.state.selectedSnapshot.disease : null,
                        diseaseTerm: this.state.selectedSnapshot.diseaseTerm ? this.state.selectedSnapshot.diseaseTerm : null,
                        modeInheritance: this.state.selectedSnapshot.modeInheritance ? this.state.selectedSnapshot.modeInheritance : null,
                        modeInheritanceAdjective: this.state.selectedSnapshot.modeInheritanceAdjective ? this.state.selectedSnapshot.modeInheritanceAdjective : null,
                        associatedSnapshot: this.state.selectedSnapshot.associatedSnapshot,
                        date_created: this.state.selectedSnapshot.date_created,
                        modified_by: lodashGet(this.props.auth, "PK", null),
                    };

                    let url = '/snapshots/' + this.state.selectedSnapshot.PK + '?type=gdm';
                    let params = {body: {publishSnapshot}};

                    // Send updated selected/published snapshot object to the DB
                    API.put(API_NAME, url, params).then(responseSnapshot => {
                        this.props.updateSnapshotList(responseSnapshot);
                        return Promise.resolve(responseSnapshot);
                    }).then(resultSnapshot => {
                        // Send published GDM data (snapshot) to Data Exchange
                        this.publishGDMToDataExchange(resultSnapshot);

                        // When publish event is a publish, automatically unpublish a previously-published snapshot (if one exists)
                        if (publishProvisional.publishClassification) {
                            const previouslyPublishedSnapshot = this.props.snapshots ? this.props.snapshots.find(snapshot => (snapshot.resource &&
                                snapshot.resource.publishClassification && snapshot.PK !== this.state.selectedSnapshot.PK)) : {};

                            if (previouslyPublishedSnapshot && previouslyPublishedSnapshot.resource) {
                                // Update previously-published snapshot with automatic unpublish data
                                previouslyPublishedSnapshot.resource.publishComment = resourceProperName + ' previously published by ' +
                                    previouslyPublishedSnapshot.resource.publishSubmitter + ' on ' +
                                    moment(previouslyPublishedSnapshot.resource.publishDate).format('YYYY MMM DD') +
                                    (previouslyPublishedSnapshot.resource.publishComment ? ' with the following comment: ' +
                                        previouslyPublishedSnapshot.resource.publishComment : '');
                                previouslyPublishedSnapshot.resource.publishClassification = false;
                                previouslyPublishedSnapshot.resource.publishSubmitter = publishProvisional.publishSubmitter +
                                    ' (automatic due to publication of another ' + resourceName + ')';
                                previouslyPublishedSnapshot.resource.publishAffiliation = publishProvisional.publishAffiliation;
                                previouslyPublishedSnapshot.resource.publishDate = publishProvisional.publishDate;
                                previouslyPublishedSnapshot.resource.last_modified = publishProvisional.last_modified;
                                previouslyPublishedSnapshot.resource.modified_by = publishProvisional.modified_by;

                                const autoUnpublishSnapshot = {
                                    resourceId: previouslyPublishedSnapshot.resource.PK,
                                    resourceType: previouslyPublishedSnapshot.resourceType,
                                    approvalStatus: previouslyPublishedSnapshot.approvalStatus,
                                    resource: previouslyPublishedSnapshot.resource,
                                    resourceParent: previouslyPublishedSnapshot.resourceParent,
                                    disease: previouslyPublishedSnapshot.disease ? previouslyPublishedSnapshot.disease : null,
                                    diseaseTerm: previouslyPublishedSnapshot.diseaseTerm ? previouslyPublishedSnapshot.diseaseTerm : null,
                                    modeInheritance: previouslyPublishedSnapshot.modeInheritance ? previouslyPublishedSnapshot.modeInheritance : null,
                                    modeInheritanceAdjective: previouslyPublishedSnapshot.modeInheritanceAdjective ? previouslyPublishedSnapshot.modeInheritanceAdjective : null,
                                    associatedSnapshot: previouslyPublishedSnapshot.associatedSnapshot,
                                    date_created: previouslyPublishedSnapshot.date_created,
                                    modified_by: lodashGet(this.props.auth, "PK", null),
                                };

                                url = '/snapshots/' + previouslyPublishedSnapshot.PK + '?type=gdm';
                                params = {body: {autoUnpublishSnapshot}};

                                // Send updated (unpublished) previously-published snapshot object to the DB
                                API.put(API_NAME, url, params).then(responseSnapshot => {
                                    this.props.updateSnapshotList(responseSnapshot);
                                    return Promise.resolve(responseSnapshot);
                                }).then(resultSnapshot => {
                                    // Send unpublish GDM provisional data to Data Exchange
                                    if (resultSnapshot && resultSnapshot.resource) {
                                        this.sendToDataExchange(resultSnapshot.resource, resultSnapshot.PK);
                                    }
                                }).catch(error => {
                                    console.log('Automatic unpublishing snapshot error = : %o', error);
                                });
                            }
                        }

                        // Clear publish-related URL query parameters and state data
                        this.props.clearPublishState();
                    }).catch(error => {
                        console.log('Publishing snapshot error = : %o', error);
                    }).then(() => 
                        // update gdm participants && also get the latest provisional classifications and snapshots
                        gdmPutParticipantsAndSetState({
                            requestRecycler: this.requestRecycler,
                            gdm: this.props.gdm,
                            auth: this.props.auth,
                            setGdm: this.props.setGdmAction
                        })
                    );
                } else if (selectedResourceType === 'interpretation') {
                    const interpretationObj = this.props.interpretation;
                    // Create selected/published snapshot object, updated with publish event data
                    const publishSnapshot = {
                        PK: this.state.selectedSnapshot.PK,
                        approvalStatus: this.state.selectedSnapshot.approvalStatus,
                        resourceType: this.state.selectedSnapshot.resourceType,
                        resourceParent: this.state.selectedSnapshot.resourceParent,
                        associatedSnapshot: this.state.selectedSnapshot.associatedSnapshot,
                        disease: interpretationObj.disease ? interpretationObj.disease : null,
                        diseaseTerm: interpretationObj.diseaseTerm ? interpretationObj.diseaseTerm : null,
                        modeInheritance: interpretationObj.modeInheritance ? interpretationObj.modeInheritance : null,
                        modeInheritanceAdjective: interpretationObj.modeInheritanceAdjective ? interpretationObj.modeInheritanceAdjective : null,
                        interpretation: interpretationObj.PK,
                        resource: publishProvisional,
                        date_created: this.state.selectedSnapshot.date_created,
                        modified_by: lodashGet(this.props.auth, 'PK', null)
                    };

                    // Send updated selected/published snapshot object to the DB
                    const params = {body: {publishSnapshot}}
                    const url = `/snapshots/${publishSnapshot.PK}?type=interpretation`;
                    API.put(API_NAME, url, params).then(responseSnapshot => {
                        this.props.updateSnapshotList(responseSnapshot);
                        return Promise.resolve(responseSnapshot);
                    }).then(resultSnapshot => {

                        // Only update provisional state object when publish event is on current approved snapshot
                        if (this.state.isSelectedProvisionalCurrent) {
                            // Update status of current provisional variant and interpretation to "Published"
                            const publishStatus = publishProvisional.publishClassification ? "Published" : "Unpublished";
                            currentProvisional.classificationStatus = publishStatus;
                            currentProvisional.last_modified = moment(submissionTimestamp).toISOString();
                            currentProvisional.modified_by = lodashGet(this.props.auth, "PK", null);
                            interpretationObj.status = publishStatus;
                            interpretationObj.provisionalVariant = currentProvisional; 
                            interpretationObj.modified_by = currentProvisional.modified_by;
                            const params = {body: {interpretationObj}}

                            API.put(API_NAME, '/interpretations/' + interpretationObj.PK, params).then(result => {
                                console.log('interpretation updated', result)
                                this.props.updateInterpretation(result);
                                this.props.updateProvisionalObj(result.provisionalVariant);
                            })
                        }

                        // When publish event is a publish, automatically unpublish a previously-published snapshot (if one exists)
                        if (publishProvisional.publishClassification) {
                            const previouslyPublishedSnapshot = this.props.snapshots ? this.props.snapshots.find(snapshot => (snapshot.resource &&
                                snapshot.resource.publishClassification && snapshot['PK'] !== this.state.selectedSnapshot['PK'])) : {};

                            if (previouslyPublishedSnapshot && previouslyPublishedSnapshot.resource) {
                                // Update previously-published snapshot with automatic unpublish data
                                previouslyPublishedSnapshot.resource.publishComment = resourceProperName + ' previously published by ' +
                                    previouslyPublishedSnapshot.resource.publishSubmitter + ' on ' +
                                    moment(previouslyPublishedSnapshot.resource.publishDate).format('YYYY MMM DD') +
                                    (previouslyPublishedSnapshot.resource.publishComment ? ' with the following comment: ' +
                                        previouslyPublishedSnapshot.resource.publishComment : '');
                                previouslyPublishedSnapshot.resource.publishClassification = false;
                                previouslyPublishedSnapshot.resource.publishSubmitter = publishProvisional.publishSubmitter +
                                    ' (automatic due to publication of another ' + resourceName + ')';
                                previouslyPublishedSnapshot.resource.publishAffiliation = publishProvisional.publishAffiliation;
                                previouslyPublishedSnapshot.resource.publishDate = publishProvisional.publishDate;
                                previouslyPublishedSnapshot.resource.last_modified = publishProvisional.last_modified;
                                previouslyPublishedSnapshot.resource.modified_by = publishProvisional.modified_by;

                                const autoUnpublishSnapshot = {
                                    PK: previouslyPublishedSnapshot.resource.PK,
                                    resourceType: previouslyPublishedSnapshot.resourceType,
                                    approvalStatus: previouslyPublishedSnapshot.approvalStatus,
                                    resource: previouslyPublishedSnapshot.resource,
                                    resourceParent: previouslyPublishedSnapshot.resourceParent,
                                    associatedSnapshot: previouslyPublishedSnapshot.associatedSnapshot,
                                    disease: previouslyPublishedSnapshot.disease ? previouslyPublishedSnapshot.disease : null,
                                    diseaseTerm: previouslyPublishedSnapshot.diseaseTerm ? previouslyPublishedSnapshot.diseaseTerm : null,
                                    modeInheritance: previouslyPublishedSnapshot.modeInheritance ? previouslyPublishedSnapshot.modeInheritance : null,
                                    modeInheritanceAdjective: previouslyPublishedSnapshot.modeInheritanceAdjective ? previouslyPublishedSnapshot.modeInheritanceAdjective : null,
                                    interpretation: previouslyPublishedSnapshot.interpretation,

                                    date_created: previouslyPublishedSnapshot.date_created,
                                    modified_by: lodashGet(this.props.auth, 'PK', null)
                                };

                                // Send updated (unpublished) previously-published snapshot object to the DB
                                const params = {body: {autoUnpublishSnapshot}}
                                const url = `/snapshots/${previouslyPublishedSnapshot.PK}?type=interpretation`;
                                API.put(API_NAME, url, params).then(responseSnapshot => {
                                    this.props.updateSnapshotList(responseSnapshot);
                                    return Promise.resolve(responseSnapshot);
                                }).then(resultSnapshot => {
                                    // Send unpublish GDM provisional data to Data Exchange
                                    if (selectedResourceType === 'gdm' && resultSnapshot && resultSnapshot.resource && this.props.gdm && Object.keys(this.props.gdm).length) {
                                        this.sendToDataExchange(resultSnapshot.resource, resultSnapshot.PK);
                                    }
                                }).catch(error => {
                                    console.log('Automatic unpublishing snapshot error = : %o', error);
                                });
                            }

                            // When publishing an interpretation (to the Evidence Repository), display a temporary "link may not work immediately" alert
                            if (selectedResourceType === 'interpretation') {
                                this.props.triggerPublishLinkAlert();
                            }
                        }

                        // Clear publish-related URL query parameters and state data
                        this.props.clearPublishState();
                    }).catch(error => {
                        console.log('Publishing snapshot error = : %o', error);
                    });
                }
                /*
                }).catch(error => {
                    console.log('Updating provisional error = : %o', error);
                });
                */
            }).catch(error => {
                console.log('%s publication error = : %o', resourceProperName, error);
            });
        } else {
            this.setState({ submitBusy: false });
            console.log("No selected snapshot to be published.");
        }
    }

    render() {
        const publishSubmitter = this.state.publishSubmitter;
        const publishDate = this.state.publishDate ? moment(this.state.publishDate).format('YYYY MMM DD, h:mm a') : moment().format('YYYY MMM DD, h:mm a');
        const publishComment = this.state.publishComment && this.state.publishComment.length ? this.state.publishComment : '';
        const provisional = this.state.selectedProvisional;
        const additionalApprover = provisional ? provisional.additionalApprover : null;
        const classificationContributors = provisional ? provisional.classificationContributors : null;
        //const classification = this.props.classification;
        const affiliation = provisional.affiliation ? provisional.affiliation : (this.props.affiliation ? this.props.affiliation : null);
        const interpretation = this.props.interpretation;
        const publishEvent = provisional.publishClassification ? 'Unpublish' : 'Publish';
        const publishEventLower = provisional.publishClassification ? 'unpublished' : 'published';
        const publicationEventLower = provisional.publishClassification ? 'unpublication' : 'publication';
        const selectedResourceType = this.state.selectedResourceType;
        const submitBusy = this.state.submitBusy;
        let affiliationSubgroup;

        // Set variables based on the (parent) resource type
        if (selectedResourceType === 'gdm') {
            affiliationSubgroup = 'gcep';
        } else if (selectedResourceType === 'interpretation') {
            affiliationSubgroup = 'vcep';
        }

        return (
            <div className="publish-approval-panel-content">
                <form onSubmit={this.submitForm}>
                    {this.state.isPublishPreview ?
                        <>
                            <div className="row">
                                <div className="col-sm-4">
                                        <h5><strong>ClinGen Affiliation:</strong> {affiliation ? getAffiliationName(affiliation, affiliationSubgroup) : null}</h5>
                                        <h5><strong>Classification Approver:</strong> {additionalApprover ? getApproverNames(additionalApprover) : null}</h5>

                                        <dl className="inline-dl clearfix">
                                            <dt><span>Classification Contributor(s):</span></dt>
                                            <dd>{classificationContributors ? getContributorNames(classificationContributors).join(', ') : null}</dd>
                                        </dl>
                                    <div className="publish-submitter">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Classification {publishEventLower} by:</span></dt>
                                            <dd>{publishSubmitter ? publishSubmitter : null}</dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-sm-4">
                                    <h5><strong>Date {publishEventLower}: {publishDate}</strong></h5>
                                </div>
                                <div className="col-sm-4">
                                    <dl className="inline-dl clearfix preview-publish-comment">
                                        <h5><strong>Additional comments:</strong></h5>
                                        {publishComment ? publishComment : null}
                                    </dl>
                                </div>
                            </div>
                            <div className="alert alert-warning publish-preview-note">
                                <i className="icon icon-exclamation-circle"></i> This is a Preview only; you must still {publishEvent} this
                                {interpretation ? ' Interpretation' : ' Classification'}.
                            </div>
                        </>
                        :
                        <div className="publish-edit">
                            <div className="row">
                                <div className="col-sm-6">
                                    <h5><strong>ClinGen Affiliation:</strong> 
                                        {affiliation ? getAffiliationName(affiliation, affiliationSubgroup) : null}
                                    </h5>
                                    <h5><strong>Entered by:</strong>
                                        <span className="text-muted">Current curator's name will be entered upon {publicationEventLower}</span>
                                    </h5>
                                    <h5><strong>Date {publishEventLower}:</strong> 
                                        <span className="text-muted">Current date and time will be entered upon {publicationEventLower}</span>
                                    </h5>
                                </div>
                                <div className="col-sm-6">
                                    <div className="publish-comments">
                                        <h5><strong>Additional comments:</strong></h5>
                                        <textarea placeholder="Enter additional comments..."
                                            value={this.state.publishComment} rows="5"
                                            onChange={e => this.handleCommentsChange(e.currentTarget.value)}
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                    <div className="col-md-12 publish-form-buttons-wrapper">
                        {this.state.isPublishPreview ?
                            <div className="button-group">
                                <button type="button" className="btn btn-light btn-lg mr-1"
                                    onClick={this.handleCancelPublish} disabled={submitBusy}>
                                    Cancel {publishEvent}
                                </button>
                                <button type="button" className="btn btn-info btn-lg mr-1"
                                    onClick={this.handleEditPublish} disabled={submitBusy}>
                                    Edit <i className="icon icon-pencil"></i>
                                </button>
                                <button type="submit" className="btn btn-primary btn-lg ml-uto" disabled={submitBusy}>
                                    {submitBusy ? <LoadingSpinner size="1x"/> : null}
                                    {publishEvent} <i className="icon icon-check-square-o"></i>
                                </button>

                                {this.state.showAlert && (
                                    <Alert type={this.state.alertType} 
                                    value={this.state.alertMsg}
                                    className={this.state.alertClass}
                                    dismissible
                                />
                                )}
           
                            </div>
                            :
                            <div className="button-group">
                                <button type="button" className="btn btn-primary"
                                    onClick={this.handlePreviewPublish}>
                                    Preview {publishEvent}
                                </button>
                            </div>
                        }
                    </div>
                </form>
            </div>
        );
    }
}

const mapStateToProps = state => ({
  auth: state.auth
});

const mapDispatchToProps = dispatch => ({
    setGdmAction: gdm => dispatch(setGdmAction(gdm)),
})

export default connect(mapStateToProps, mapDispatchToProps)(PublishApproval);
