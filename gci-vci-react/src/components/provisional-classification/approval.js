import React, { Component } from 'react';
import lodashGet from 'lodash/get';

import moment from 'moment';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../utils';
import { connect } from 'react-redux';

import { getAffiliationName, getAllAffliations, getAffiliationSubgroups } from '../../helpers/get_affiliation_name';
import { getAffiliationApprover } from '../../helpers/get_affiliation_approver';
import { getUserName } from '../../helpers/getUserName';

import { getApproverNames, getContributorNames } from '../../helpers/get_approver_names';
import { sopVersions } from '../../helpers/sop';
import Select from 'react-select';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import { formatDate, parseDate } from 'react-day-picker/moment';

import LoadingSpinner from '../common/LoadingSpinner';
import Modal from "../common/Modal";
import { gdmPutParticipantsAndSetState, gdmProvisionalClassificationsReducer } from '../../utilities/gdmUtilities';
import { setGdmAction } from '../../actions/gdmActions';
import { AmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';

class ClassificationApproval extends Component {

    constructor(props) {
        super(props);
        this.initialState = {
            affiliationsList: [],
            approversList: [],
            classificationContributors: this.props.provisional && this.props.provisional.classificationContributors ? this.props.provisional.classificationContributors : [],
            additionalApprover: this.props.provisional && this.props.provisional.additionalApprover ? this.props.provisional.additionalApprover : '',
            //retainSelectedApprover: this.props.provisional && this.props.provisional.retainSelectedApprover ? this.props.provisional.retainSelectedApprover : [],
            retainSelectedContributor: this.props.provisional && this.props.provisional.retainSelectedContributor ? this.props.provisional.retainSelectedContributor : [],
            contributorComment: this.props.provisional && this.props.provisional.contributorComment ? this.props.provisional.contributorComment : '',
            approvalReviewDate: this.props.provisional && this.props.provisional.approvalReviewDate ? this.props.provisional.approvalReviewDate : undefined,
            approvalDate: this.props.provisional && this.props.provisional.approvalDate ? this.props.provisional.approvalDate : undefined,
            approvalComment: this.props.provisional && this.props.provisional.approvalComment ? this.props.provisional.approvalComment : '',
            classificationApprover: this.props.provisional && this.props.provisional.classificationApprover ? this.props.provisional.classificationApprover : undefined,
            approvalSubmitter: this.props.provisional && this.props.provisional.approvalSubmitter ? this.props.provisional.approvalSubmitter : undefined,
            affiliationApprovers: undefined,
            isApprovalPreview: this.props.provisional && this.props.provisional.classificationStatus === 'Approved' ? true : false,
            isApprovalEdit: false,
            showAttributionForm: false,
            sopVersion: this.props.provisional && this.props.provisional.sopVersion ? this.props.provisional.sopVersion : '8',
            submitBusy: false, // Flag to indicate that the submit button is in a 'busy' state
            approverError: null,
            isModalOpen: false
        };
        this.state = this.initialState;
        this.requestRecycler = new AmplifyAPIRequestRecycler();
    }

    componentDidMount() {
        console.log('snapshots', this.props.snapshots)
        this.getAffiliationApprovers();
        this.parseAffiliationsList();
        this.parseApproversList();
    }

    componentWillUnmount() {
        this.requestRecycler.cancelAll();
    }

    // Method to get full affiliations list and reformat obj so it's compatible w/ react-select
    parseAffiliationsList() {
        const affiliationsList = getAllAffliations();
        if (affiliationsList) {
            const parsedAffiliations = affiliationsList.map(affiliation => {
                return {
                    value: affiliation.id,
                    label: `${affiliation.fullName} (${affiliation.id})`
                };
            });
            parsedAffiliations.sort((first, second) => first.label.localeCompare(second.label));
            this.setState({ affiliationsList: parsedAffiliations });
        }
    }

    // Method to get affiliation subgroups and pass to react-select
    parseApproversList() {
        const parsedApprovers = [];
        const approverList = getAffiliationSubgroups();
        if (approverList) {
            approverList.forEach(approver => {
                if (approver.gcep) {
                    parsedApprovers.push({
                        value: approver.gcep.id,
                        label: approver.gcep.fullname
                    });
                }
                if (approver.vcep) {
                    parsedApprovers.push({
                        value: approver.vcep.id,
                        label: approver.vcep.fullname
                    });
                }
            });
            parsedApprovers.sort((first, second) => first.label.localeCompare(second.label));
            this.setState({ approversList: parsedApprovers });
        }
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        if (this.props.interpretation) {
            if (nextProps.provisional) {
                this.setState({
                    approvalDate: nextProps.provisional.approvalDate,
                    approvalReviewDate: nextProps.provisional.approvalReviewDate,
                    approvalComment: nextProps.provisional.approvalComment,
                    approvalSubmitter: nextProps.provisional.approvalSubmitter,
                    classificationApprover: nextProps.provisional.classificationApprover,
                    classificationContributors: nextProps.provisional.classificationContributors,
                    additionalApprover: nextProps.provisional.additionalApprover,
                    contributorComment: nextProps.provisional.contributorComment,
                    sopVersion: nextProps.provisional.sopVersion
                });
            }
        }
    }

    getAffiliationApprovers = () => {
        const provisional = this.props.provisional;
        let provisionalAffiliation = provisional && provisional.affiliation ? provisional.affiliation : null;
        let userAffiliation = this.props.affiliation ? this.props.affiliation.affiliation_id : null;
        if ((provisionalAffiliation || userAffiliation) && !provisional.approvedClassification) {
            let affiliationId = provisionalAffiliation ? provisionalAffiliation : userAffiliation;
            let approvers = getAffiliationApprover(affiliationId);
            if (approvers.length > 0) {
                this.setState({ affiliationApprovers: approvers.sort() }, () => {
                    if (provisional && provisional.classificationApprover) {
                        this.setState({ classificationApprover: provisional.classificationApprover }, () => {
                            // this.approverInput.setValue(this.state.classificationApprover && this.state.affiliationApprovers ? this.state.classificationApprover : 'none');
                        });
                    }
                });
            } else {
                if (provisional && provisional.classificationApprover) {
                    this.setState({ classificationApprover: provisional.classificationApprover });
                } else {
                    this.setState({ classificationApprover: getAffiliationName(affiliationId) });
                }
            }
        }
    }

    handleReviewDateChange = (approvalReviewDate) => {
        this.setState({ approvalReviewDate });
    }
    // Set state of approver comments set in textarea
    handleApproverCommentsChange = (value) => {
        this.setState({ approvalComment: value });
    }
    // Set state of contributor comments set in textarea
    handleContributorCommentsChange = (value) => {
        this.setState({ contributorComment: value });
    }
    // Set state of approver selected in dropdown
    handleApproverSelect = (value) => {
        this.setState({ classificationApprover: value, approverError: null });
    }

    // Set state of classification contributor(s) selected in dropdown
    handleClassificationContributorSelect = (selectedContributors) => {
        let contributorIDs = [];

        if (selectedContributors && selectedContributors.length) {
            selectedContributors.forEach(contributor => {
                contributorIDs.push(contributor.value);
            });
        }

        this.setState({ classificationContributors: contributorIDs, retainSelectedContributor: selectedContributors });
    }

    // Set state of classification approver selected in dropdown
    handleClassificationApproverSelect = (selectedApprover) => {
        this.setState({ additionalApprover: selectedApprover });
    }

    openAttributionForm = (e) =>{
        e.preventDefault();
        this.setState({ showAttributionForm: true });
    }

    handleSopSelect = (sopValue) => {
      this.setState({ sopVersion: sopValue });
    }

    onModalDashboard = () => {
        this.setState({ isModalOpen: false });
        window.location.href = '/dashboard/';
    }
    onModalCancel = (e) => {
        this.setState({ isModalOpen: false });
        this.handleCancelApproval(e);
    }

    /**
     * Method to handle previewing classification approval form
    **/
    handlePreviewApproval = (e) => {
      e.preventDefault();
      const provisionalAffiliation = lodashGet(this.props.provisional, 'affiliation', null);
      const currentUserAffiliation = lodashGet(this.props.auth, 'currentAffiliation.affiliation_id', null);
      let approver = this.state.classificationApprover ? this.state.classificationApprover : 'none';
      //let formErr = false;

      // Trigger alert modal if affiliations do not match 
      if (currentUserAffiliation !== provisionalAffiliation) {
        this.setState({
          isModalOpen: true,
          isApprovalPreview: false
        });
      }

      // If has affiliation approvers, require to select one
      if (!this.state.affiliationApprovers || (this.state.affiliationApprovers && approver && approver !== 'none')) {
        this.setState({
          approvalSubmitter: getUserName(this.props.auth),
        }, () => {
            this.setState({ isApprovalPreview: true });
            //formErr = false;
        });
        //formErr = false;
      } else {
        //formErr = true;
        this.setState({ approverError: 'Select an approver' });
        return false;
      }
    }

    /**
     * Method to handle resetting the approval form data
     */
    handleCancelApproval = (e) => {
        e.preventDefault();
        this.setState({
            approvalSubmitter: this.props.provisional && this.props.provisional.approvalSubmitter ? this.props.provisional.approvalSubmitter : undefined,
            approvalReviewDate: this.props.provisional && this.props.provisional.approvalReviewDate ? this.props.provisional.approvalReviewDate : undefined,
            approvalComment: this.props.provisional && this.props.provisional.approvalComment ? this.props.provisional.approvalComment : undefined,
            classificationApprover: this.props.provisional && this.props.provisional.classificationApprover ? this.props.provisional.classificationApprover : undefined,
            //retainSelectedApprover: this.props.provisional && this.props.provisional.retainSelectedApprover ? this.props.provisional.retainSelectedApprover : null,
            retainSelectedContributor: this.props.provisional && this.props.provisional.retainSelectedContributor ? this.props.provisional.retainSelectedContributor : [],
            classificationContributors: this.props.provisional && this.props.provisional.classificationContributors ? this.props.provisional.classificationContributors : null,
            additionalApprover: this.props.provisional && this.props.provisional.additionalApprover ? this.props.provisional.additionalApprover : null,
            contributorComment: this.props.provisional && this.props.provisional.contributorComment ? this.props.provisional.contributorComment : null,
            sopVersion: this.props.provisional && this.props.provisional.sopVersion ? this.props.provisional.sopVersion : '8',
            isApprovalPreview: false
        });
    }

    /**
     * Method to handle editing classification approval form
     */
    handleEditApproval = (e) => {
        e.preventDefault();
        this.setState({ isApprovalPreview: false });
    }

    /**
     * Method to send GDM approval data to Data Exchange
     * @param {object} provisional - provisional classification object
     */
    sendToDataExchange = (provisional) => {
        const approvalSubmitter = this.props.auth;
        // Get all contributors
        const contributors = this.props.getContributors();

        // Add this approval submitter to contributors list
        if (approvalSubmitter) {
            contributors.push({   
                name: getUserName(approvalSubmitter),
                id: lodashGet(approvalSubmitter, 'PK', ''),
                email: lodashGet(approvalSubmitter, 'email', ''),
                roles: ['approver']
            });
        }
        // Add curator who approved this classification to contributors list
        if (provisional.classificationApprover) {
            contributors.push({   
                name: provisional.classificationApprover,
                roles: ['secondary approver']
            });
        }
        // Add secondary approver (affiliation) to contributors list
        if (provisional.additionalApprover) {
            contributors.push({
                name: getApproverNames(provisional.additionalApprover),
                roles: ['secondary approver']
            });
        }
        // Add secondary contributors (affiliations) to contributors list
        if (provisional.classificationContributors) {
            provisional.classificationContributors.forEach(contributorId => {
                contributors.push({
                    id: contributorId,
                    name: getAffiliationName(contributorId),
                    roles: ['secondary approver']
                });
            });
        }

        // Create data object to be sent to Data Exchange
        const reviewDate = provisional.approvalReviewDate ? provisional.approvalReviewDate : (provisional.approvalDate ? provisional.approvalDate : '');
        const approvalDate = provisional.approvalDate ? provisional.approvalDate : '';
        const uncData = this.props.setUNCData(provisional, 'approved', reviewDate, approvalDate, approvalSubmitter, contributors);

        // Post approval data to Data Exchange
        this.props.postTrackData(uncData).then(response => {
            console.log('Successfully sent approval data to Data Exchange for provisional %s at %s', provisional.PK, moment(approvalDate).toISOString());
        }).catch(error => {
            console.log('Error sending approval data to Data Exchange for provisional %s at %s - Error: %o', provisional.PK, moment(approvalDate).toISOString(), error);
        });
    }

    /**
     * Method to handle submitting classification approval form
     */
    submitForm = (e) => {
        e.preventDefault();
        e.stopPropagation();
        let newProvisional = this.props.provisional ? this.props.provisional : {};
        const nowUTC = moment().toISOString();
        newProvisional.classificationStatus = 'Approved';
        newProvisional.approvedClassification = true;
        newProvisional.approvalSubmitter = this.state.approvalSubmitter;
        newProvisional.approvalDate = nowUTC;
        newProvisional.approvalReviewDate = this.state.approvalReviewDate;
        newProvisional.classificationApprover = this.state.classificationApprover;
        newProvisional.submitted_by = (newProvisional.submitted_by && newProvisional.submitted_by.PK)
            ? newProvisional.submitted_by.PK
            : lodashGet(this.props.auth, "PK", null);
        newProvisional.modified_by = lodashGet(this.props.auth, 'PK', null);
        if (this.props.gdm) {
            newProvisional.additionalApprover = this.state.additionalApprover;
            newProvisional.classificationContributors = this.state.classificationContributors;
            newProvisional.sopVersion = this.state.sopVersion;
        }
        if (this.state.contributorComment && this.state.contributorComment.length) {
            newProvisional.contributorComment = this.state.contributorComment;
        } else {
            if (newProvisional.contributorComment) {
                newProvisional['contributorComment'] = null;
            }
        }
        if (this.state.approvalComment && this.state.approvalComment.length) {
            newProvisional.approvalComment = this.state.approvalComment;
        } else {
            if (newProvisional.approvalComment) {
                newProvisional['approvalComment'] = null;
            }
        }

        let provisionalSnapshots = this.props.snapshots && this.props.snapshots.length ? this.props.snapshots.filter(snapshot => snapshot.approvalStatus === 'Provisioned') : [];
        // Prevent users from incurring multiple submissions
        this.setState({ submitBusy: true });
        let previousSnapshots = [];

        // To avoid provisional/snapshot data nesting, remove old snapshots from provisional that will be added to the new snapshot
        if (newProvisional && newProvisional.associatedClassificationSnapshots) {
            previousSnapshots = newProvisional.associatedClassificationSnapshots;
            delete newProvisional['associatedClassificationSnapshots'];
        }

        // gdm doesn't have all objects - annotations, variantPathogenicity
        if (this.props.gdm && Object.keys(this.props.gdm).length) {
            const newSnapshot = {
                resourceId: newProvisional.PK,
                resourceType: 'classification',
                approvalStatus: 'Approved',
                resource: newProvisional,
                resourceParent: {gdm: {
                    ...this.props.gdm, 
                    annotations: this.props.annotations, 
                    variantPathogenicity: this.props.variantPathogenicity,
                    ...gdmProvisionalClassificationsReducer(this.props.gdm, newProvisional)
                }},
                disease: this.props.gdm.disease && this.props.gdm.disease.PK ? this.props.gdm.disease.PK : null,
                diseaseTerm: this.props.gdm.diseaseTerm ? this.props.gdm.diseaseTerm : null,
                modeInheritance: this.props.gdm.modeInheritance ? this.props.gdm.modeInheritance : null,
                modeInheritanceAdjective: this.props.gdm.modeInheritanceAdjective ? this.props.gdm.modeInheritanceAdjective : null,
                associatedSnapshot: provisionalSnapshots && provisionalSnapshots[0] ? provisionalSnapshots[0]['PK'] : undefined,
                submitted_by: lodashGet(this.props.auth, 'PK', null),
                modified_by: lodashGet(this.props.auth, 'PK', null)
            };

            let url = '/snapshots/?type=gdm&action=approve';
            let params = {body: {newSnapshot}}

            // Send approval data to Data Exchange
            this.sendToDataExchange(newProvisional);

            // Save snapshot
            return API.post(API_NAME, url, params).then(snapshotResponse => {
                this.props.updateSnapshotList(snapshotResponse, true);
                return Promise.resolve(snapshotResponse);
            }).then(snapshotResult => {
                // Return old snapshots to provisional before adding latest snapshot
                if (previousSnapshots) {
                    newProvisional.associatedClassificationSnapshots = previousSnapshots;
                }
                // Add snapshot to list (in provisional data object)
                let snapshotList = newProvisional.associatedClassificationSnapshots || [];
                newProvisional.associatedClassificationSnapshots = [snapshotResult.PK].concat(snapshotList);

                url = '/provisional-classifications/' + newProvisional.PK;
                params = {body: {newProvisional}}

                // Update existing provisional data object
                return API.put(API_NAME, url, params).then(provisionalResponse => {
                    this.props.updateProvisionalObj(provisionalResponse, true);
                    return Promise.resolve(provisionalResponse);
                }).catch(err => {
                    console.log('Classification approval submission error = : %o', err);
                });
            }).catch(err => {
                console.log('Saving approval snapshot error = : %o', err);
            }).then(() => 
                // update gdm participants && also get the latest provisional classifications and snapshots
                gdmPutParticipantsAndSetState({
                    requestRecycler: this.requestRecycler,
                    gdm: this.props.gdm,
                    auth: this.props.auth,
                    setGdm: this.props.setGdmAction
                })
            );
        } else if (this.props.interpretation) {
            // To avoid provisional/snapshot data nesting, remove old snapshots from provisional to be added to the new snapshot
            // !!! TO-DO: GET /snapshots here or in parent to first get current list of snapshots
            // let previousSnapshots;
            // if (result && result.associatedInterpretationSnapshots) {
            //     previousSnapshots = result.associatedInterpretationSnapshots;
            //     delete result['associatedInterpretationSnapshots'];
            // }

            // Update classification data and its parent interpretation
            const interpretationObj = this.props.interpretation;
            const provisionalVariantObj = this.props.provisional;

            // reference to parent interpretation
            const resourceParentObj = {"interpretation": interpretationObj.PK}

            newProvisional.last_modified = nowUTC;

            // Create Approved Snapshot Obj
            const snapshotObj = {
                //resourceId: provisionalVariantObj.PK, // Not needed bc prov Variant object directly inside interpretation
                resourceType: 'interpretation',
                approvalStatus: 'Approved',
                resource: newProvisional,
                resourceParent: resourceParentObj,
                associatedSnapshot: provisionalSnapshots && provisionalSnapshots[0] ? provisionalSnapshots[0] : undefined,
                disease: interpretationObj.disease ? interpretationObj.disease : null,
                diseaseTerm: interpretationObj.diseaseTerm ? interpretationObj.diseaseTerm : null,
                modeInheritance: interpretationObj.modeInheritance ? interpretationObj.modeInheritance : null,
                modeInheritanceAdjective: interpretationObj.modeInheritanceAdjective ? interpretationObj.modeInheritanceAdjective : null,
                interpretation: interpretationObj.PK,
                submitted_by: lodashGet(this.props.auth, 'PK', null),
                modified_by: lodashGet(this.props.auth, 'PK', null)
            };

            // POST Approval snapshot
            const params = {body: {snapshotObj}}
            const url = '/snapshots/?type=interpretation&action=approve';
            console.log("Snapshot approval Params", params)
            API.post(API_NAME, url, params).then(response => {
                console.log("Snapshot Approval", response)
                let approvalSnapshot = response;
                this.props.updateSnapshotList(approvalSnapshot, true);
                return Promise.resolve(approvalSnapshot);
            }).then(snapshot => {
                // Return old snapshots to provisional before adding latest snapshot
                /* ???
                if (previousSnapshots) {
                    snapshot.associatedInterpretationSnapshots = previousSnapshots;
                }
                */

                //let newClassification = snapshot.resource;
                //let newSnapshot = snapshot;

                // Update status of provisional variant + interpretation to "Approved"
                provisionalVariantObj.classificationStatus = "Approved";
                interpretationObj.status = "Approved";
                interpretationObj.modified_by = newProvisional.modified_by;

                //interpretationObj.snapshot = snapshotObj;

                // Update interpretation with latest snapshots PKs
                let currentSnapshots = interpretationObj.snapshots || [];
                let latestSnapshots = [snapshot.PK].concat(currentSnapshots);
                interpretationObj.snapshots = latestSnapshots;

                // And update provisional Variant
                interpretationObj.provisionalVariant = provisionalVariantObj;

                const params = {body: {interpretationObj}}

                API.put(API_NAME, '/interpretations/' + interpretationObj.PK, params).then(result => {
                    console.log('interpretation updated', result)
                    this.props.updateInterpretation(result);
                    this.props.updateProvisionalObj(result.provisionalVariant, true);
                })
            }).catch(err => {
                console.log('Saving approval snapshot error = : %o', err);
            });

        }
    }

    render() {
        const approvalSubmitter = this.state.approvalSubmitter;
        const classificationApprover = this.state.classificationApprover;
        const contributorComment = this.state.contributorComment && this.state.contributorComment.length ? this.state.contributorComment : '';
        const approvalReviewDate = this.state.approvalReviewDate ? moment(this.state.approvalReviewDate).format('MM/DD/YYYY') : '';
        const approvalDate = this.state.approvalDate ? moment(this.state.approvalDate).format('YYYY MM DD, h:mm a') : moment().format('YYYY MM DD, h:mm a');
        const approvalComment = this.state.approvalComment && this.state.approvalComment.length ? this.state.approvalComment : '';
        const classificationContributorsList = this.state.affiliationsList ? this.state.affiliationsList : null;

        const classificationContributors = this.state.classificationContributors ? this.state.classificationContributors : '';
        const additionalApprover = this.state.additionalApprover ? this.state.additionalApprover : '';
        const sopVersion = this.state.sopVersion;
        const gdm = this.props.gdm;
        const provisional = this.props.provisional;
        const affiliation = lodashGet(provisional, 'affiliation', null) ? provisional.affiliation : (lodashGet(this.props.affiliation, 'affiliation_id', null));

        const affiliationApprovers = this.state.affiliationApprovers;
        const interpretation = this.props.interpretation;
        const submitBusy = this.state.submitBusy;
        const attributionButtonText = 'Acknowledge Other Contributors';
        const formHelpText = 'Acknowledge contributing and approving affiliation(s) for this gene-disease classification. Single or multiple affiliations or entities may be chosen.';
        const contributorHelpText = 'In the event that more than one affiliation or external curation group has contributed to the evidence and/or overall classification of this record, please select each from the dropdown menu.';
        const contributorWarningText = 'At present, designation of Classification Contributors is restricted to the GCI. In the future, Classification Contributors will appear on curation summaries published to the ClinGen website and/or Evidence Repository to facilitate recognition.';
        const approverHelpText = 'In the event that another affiliation approved the final approved classification, please select that affiliation from the dropdown menu.';
        const approversList = this.state.approversList ? this.state.approversList : [];
        //const classification = this.props.classification;
        const currentUserAffiliation = lodashGet(this.props.auth, 'currentAffiliation.affiliation_fullname', null);

        return (
            <div className="final-approval-panel-content">
                <form onSubmit={this.submitForm} >
                    {this.state.isApprovalPreview ?
                        <>
                            <div className="row">
                                <div className="col-sm-4">
                                    <h5><strong>ClinGen Affiliation:</strong> {affiliation ? getAffiliationName(affiliation) : null}</h5>
                                            
                                    <h5><strong>Approved Classification entered by:</strong> {approvalSubmitter ? approvalSubmitter : null}</h5>
                                    {affiliation && affiliation.length ?
                                        <h5><strong>Affiliation Approver:</strong> {classificationApprover}</h5> : null}
                                    {gdm ?
                                        <div className="pt-3 pb-3">
                                            <h5><strong>SOP Version:</strong> {sopVersion}</h5>
                                            <h5><strong>Classification Contributor(s):</strong> {classificationContributors ? getContributorNames(classificationContributors).join(', ') : null}</h5>
                                            <h5><span className="text-pre-wrap"><strong>Contributor Comments:</strong> {contributorComment}</span></h5>
                                        </div>
                                    : null}
                                </div>
                                

                                <div className="col-sm-5">
                                    <h5><strong>Date saved as Approved:</strong> {approvalDate ? formatDate(parseDate(approvalDate), "YYYY MMM DD, h:mm a") : null}</h5>
                                    <h5><strong>Final Approval Date:</strong> {approvalReviewDate ? formatDate(parseDate(approvalReviewDate), "YYYY MMM DD") : null}</h5>
                                    <h5><span className="text-pre-wrap"><strong>Approver Comments:</strong> {approvalComment ? approvalComment : null}</span></h5>
                                    {gdm ?
                                        <h5><strong>Classification Approver:</strong> {additionalApprover ? getApproverNames(additionalApprover) : null}</h5>
                                    : null}
                                </div>
                            </div>
                            <div className="alert alert-warning">
                                <i className="icon icon-exclamation-circle"></i> This is a Preview only; you must still Submit to save
                                this {interpretation ? 'Interpretation' : 'Classification'} as Approval.
                                {interpretation ? <strong> Approving an Interpretation does not submit it to ClinVar.</strong> : null}
                                {gdm ? 
                                    <p className="contributor-warning"><i className="icon icon-exclamation-circle"></i> {contributorWarningText}</p>
                                    : null}
                            </div>
                        </>
                        :
                        <div className="approval-edit">
                            <div className="row">
                                <div className="col-sm-4">
                                    <h5><strong>ClinGen Affiliation:</strong> {affiliation ? getAffiliationName(affiliation) : null}</h5>
                                    <h5><strong>Entered by:</strong><br/>
                                        {approvalSubmitter ?
                                            approvalSubmitter
                                            :
                                            <span className="text-muted">Current curator's name will be entered upon submission</span>
                                        }
                                    </h5>
                                </div>
                                <div className="col-sm-4">
                                    {affiliation ?
                                        <div className="classification-approver">
                                            {affiliationApprovers && affiliationApprovers.length ?
                                            <>
                                                <label><strong>Select Approver:</strong> </label>
                                                <select placeholder="Affiliation Approver:"
                                                    className="form-control"
                                                    value={this.state.classificationApprover}
                                                    onChange={e=>this.handleApproverSelect(e.currentTarget.value)}>
                                                    <option value="none">Select Approver</option>
                                                    <option value="" disabled className="divider"></option>
                                                    {affiliationApprovers.map((member, i) => {
                                                        return <option key={i} value={member}>{member}</option>
                                                    })}
                                                </select>
                                                { this.state.approverError && <span style={{ color: 'red', fontSize: 12 }}>{ this.state.approverError }</span>}
                                            </>
                                                :
                                                <h5><strong>Affiliation Approver:</strong> {getAffiliationName(affiliation)}</h5>
                                            }
                                        </div>
                                        : null}
                                    <div className="approval-review-date form-group">
                                        <label className="control-label"><strong>Final Approval Date:</strong></label><br/>
                                            <DayPickerInput
                                                value={approvalReviewDate}
                                                onDayChange={this.handleReviewDateChange}
                                                formatDate={formatDate}
                                                parseDate={parseDate}
                                                inputProps={{ className: "form-control" }}
                                                placeholder={`${formatDate(new Date())}`}
                                                dayPickerProps={{
                                                    selectedDays: approvalReviewDate ? parseDate(approvalReviewDate) : undefined
                                                }}
                                            />
                                    </div>
                                </div>
                                {gdm ? 
                                    <div className="col-sm-4 sop-version">
                                        <label><strong>SOP Version:</strong></label>
                                        <select onChange={e => this.handleSopSelect(e.currentTarget.value)} placeholder="SOP Version"
                                            value={this.state.sopVersion} className="form-control w-50">
                                            {sopVersions.map((version, i) => {
                                                return <option key={i} value={version}>{version}</option>;
                                            })}
                                        </select>
                                    </div>
                                    : 
                                    <div className="col-sm-4">
                                        <textarea placeholder="Approver Comments..." rows="5"
                                            onChange={e => this.handleApproverCommentsChange(e.currentTarget.value)}
                                            value={this.state.approvalComment} className="form-control additional-comment"
                                        />
                                    </div>
                                }
                                {(classificationContributorsList && classificationContributorsList.length) && this.state.showAttributionForm ?
                                    <div className="col-md-6 contributor-form">
                                        <div className="contributor-form">
                                            <label className="control-label"><strong>Classification Contributor(s):</strong></label>
                                            <span className="text-info contextual-help" data-toggle="tooltip" data-placement="top" data-tooltip={contributorHelpText}>
                                                <i className="icon icon-info-circle secondary-approvers-help ml-1"></i>
                                            </span>
                                            <Select isMulti placeholder="Select Affiliation(s)" defaultValue={this.state.retainSelectedContributor}
                                                onChange={this.handleClassificationContributorSelect} options={classificationContributorsList} />
                                        </div>
                                        <div className="contributor-form">
                                            <textarea
                                                onChange={e => this.handleContributorCommentsChange(e.currentTarget.value)}
                                                placeholder="Contributor Comments" value={contributorComment} rows="5"
                                                className="form-control control-label mt-4" />
                                        </div>
                                    </div>
                                    : null}
                                {this.state.showAttributionForm ?
                                    <div className="col-md-6 approval-form">
                                        <div className="curation-approvers approval-form">
                                            <label className="control-label"><strong>Classification Approver:</strong></label>
                                            <span className="text-info contextual-help" data-toggle="tooltip" data-placement="top" data-tooltip={approverHelpText}>
                                                <i className="icon icon-info-circle secondary-approvers-help ml-1"></i>
                                            </span>
                                            <select value={additionalApprover} className="form-control"
                                                onChange={e => this.handleClassificationApproverSelect(e.currentTarget.value)}>
                                                <option value="none">Select Classification Approver</option>
                                                {approversList.map((approver, i) => {
                                                    return <option key={i} value={approver.value}>{approver.label}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="approval-form">
                                            <textarea
                                                onChange={e => this.handleApproverCommentsChange(e.currentTarget.value)}
                                                placeholder="Approver Comments" value={this.state.approvalComment} rows="5" 
                                                className="form-control control-label mt-4" />
                                        </div>
                                    </div>
                                    : null}
                            </div>
                            {gdm && !this.state.showAttributionForm ?
                                <div className="col-md-12 contributor-toggle-button pl-0">
                                    <button className="btn btn-primary btn-inline-spacer ml-0" onClick={this.openAttributionForm}>{attributionButtonText}</button>
                                    <span className="text-info contextual-help" data-toggle="tooltip" data-placement="top" data-tooltip={formHelpText}>
                                        <i className="secondary-approvers-help icon icon-info-circle ml-1"></i>
                                    </span>
                                </div>
                                : null}
                        </div>
                    }
                    <div className="approval-form-buttons-wrapper">
                        {this.state.isApprovalPreview ?
                            <div className="button-group">
                                <button type="button" className="btn btn-light btn-lg mr-1"
                                    disabled={submitBusy} onClick={this.handleCancelApproval}>
                                    Cancel Approval
                                </button>
                                <button type="button" className="btn btn-info btn-lg mr-1"
                                    disabled={submitBusy} onClick={this.handleEditApproval}>
                                    Edit <i className="icon icon-pencil"></i>
                                </button>
                                <button type="submit" className="btn btn-primary btn-lg ml-auto" disabled={submitBusy}>
                                    {submitBusy ? <LoadingSpinner size="1x"/> : null}
                                    Submit Approval <i className="icon icon-check-square-o"></i>
                                </button>
                            </div>
                            :
                            <div className="button-group">
                                <button className="btn btn-primary btn-lg mt-3"
                                    onClick={this.handlePreviewApproval}>
                                    Preview Approval
                                </button>
                            </div>
                        }
                    </div>
                </form>
                <Modal
                  show={this.state.isModalOpen}
                  title="Warning"
                  className="conflicting-affiliation"
                  onHide={this.onModalCancel}
                  onSave={this.onModalDashboard}
                  saveButtonText="Go to Dashboard"
                  hideButtonText="Cancel"
                >
                    <p className="alert alert-warning">You are currently curating an Interpretation under the wrong affiliation. You are logged in as <strong>{currentUserAffiliation ? currentUserAffiliation : "No Affiliation"}</strong> and
                        curating an interpretation for <strong>{lodashGet(provisional, 'affiliation', null) ? getAffiliationName(provisional.affiliation) : 'No Affiliation'}</strong>. Either close this tab in your browser or redirect to the Dashboard below.
                    </p>
                </Modal>
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

export default connect(mapStateToProps, mapDispatchToProps)(ClassificationApproval);
