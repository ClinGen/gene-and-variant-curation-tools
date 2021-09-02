import React, { Component } from 'react';
import moment from 'moment';
import lodashGet from 'lodash/get';
import { getAffiliationName } from '../../helpers/get_affiliation_name';
import { getUserName } from '../../helpers/getUserName';
import { connect } from 'react-redux';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
import { formatDate, parseDate } from 'react-day-picker/moment';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../utils';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from "../common/Modal";
import { setGdmAction } from '../../actions/gdmActions';
import { AmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';
import { gdmPutParticipantsAndSetState, gdmProvisionalClassificationsReducer } from '../../utilities/gdmUtilities';

class ProvisionalApproval extends Component {
    constructor(props) {
        super(props);
        this.initialState = {
            interpretation: this.props.interpretation,
            provisional: this.props.provisional,
            provisionalDate: this.props.provisional && this.props.provisional.provisionalDate ? this.props.provisional.provisionalDate : undefined,
            provisionalReviewDate: this.props.provisional && this.props.provisional.provisionalReviewDate ? this.props.provisional.provisionalReviewDate : undefined,
            provisionalComment: this.props.provisional && this.props.provisional.provisionalComment ? this.props.provisional.provisionalComment : undefined,
            provisionalSubmitter: this.props.provisional && this.props.provisional.provisionalSubmitter ? this.props.provisional.provisionalSubmitter : undefined,
            isProvisionalPreview: this.props.provisional && this.props.provisional.classificationStatus === 'Provisional' ? true : false,
            isProvisionalEdit: false,
            submitBusy: false, // Flag to indicate that the submit button is in a 'busy' state
            snapshotPKs: this.props.snapshotPKs,
            isModalOpen: false
        };
        this.state = this.initialState;
        this.requestRecycler = new AmplifyAPIRequestRecycler();
    }

    componentWillUnmount() {
        this.requestRecycler.cancelAll();
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        if (this.props.interpretation) {
            if (nextProps.provisional) {
                this.setState({
                    provisionalDate: nextProps.provisional.provisionalDate,
                    provisionalReviewDate: nextProps.provisional.provisionalReviewDate,
                    provisionalComment: nextProps.provisional.provisionalComment,
                    provisionalSubmitter: nextProps.provisional.provisionalSubmitter,
                    isProvisionalPreview: nextProps.provisional && nextProps.provisional.classificationStatus === 'Provisional' ? true : false,
                });
            }
        }
        if (this.state.interpretation !== nextProps.interpretation){
            this.setState({interpretation: nextProps.interpretation}, ()=> {console.log('updated interpretation', this.state.interpretation)})
        }
        if (this.state.interpretation && nextProps.interpretation && this.state.interpretation.provisionalVariant !== nextProps.interpretation.provisionalVariant){
            this.setState({interpretation: nextProps.interpretation}, ()=> {console.log('updated interpretation 2', this.state.interpretation)})
        }
    }

    handleProvisionalReviewDateChange = (provisionalReviewDate) => {
        this.setState({provisionalReviewDate});
    }

    handleprovisionalComment = (e) => {
        this.setState({provisionalComment: e})
    }

    /**
     * Method to handle previewing provisional form data
     */
    handlePreviewProvisional = (e) => {
        e.preventDefault();
        const provisionalAffiliation = lodashGet(this.props.provisional, 'affiliation', null);
        const currentUserAffiliation = lodashGet(this.props.auth, 'currentAffiliation.affiliation_id', null);

        // Trigger alert modal if affiliations do not match
        if (currentUserAffiliation !== provisionalAffiliation) {
            this.setState({
              isModalOpen: true,
              isProvisionalPreview: false
            });
        }
        this.setState({
            provisionalSubmitter: getUserName(this.props.auth),
        }, () => {
            this.setState({isProvisionalPreview: true});
        });
    }

    onModalDashboard = () => {
        this.setState({isModalOpen: false});
        window.location.href = '/dashboard/';
    }

    onModalCancel = (e) => {
        this.setState({isModalOpen: false});
        this.handleCancelProvisional(e);
    }

    /**
     * Method to handle resetting the provisional form data
     */
    handleCancelProvisional = (e) => {
        e.preventDefault();
        this.setState({
            provisionalSubmitter: this.props.provisional && this.props.provisional.provisionalSubmitter ? this.props.provisional.provisionalSubmitter : undefined,
            provisionalReviewDate: this.props.provisional && this.props.provisional.provisionalDate ? this.props.provisional.provisionalDate : undefined,
            provisionalComment: this.props.provisional && this.props.provisional.provisionalComment ? this.props.provisional.provisionalComment : undefined,
            isProvisionalPreview: false
        });
    }

    /**
     * Method to handle editing provisional form
     */
    handleEditProvisional = (e) => {
        e.preventDefault();
        this.setState({isProvisionalPreview: false});
    }

    /**
     * Method to send GDM provisional data to Data Exchange
     * @param {object} provisional - provisional classification object
     */
    sendToDataExchange(provisional) {
        const provisionalSubmitter = this.props.auth;
        // Get all contributors
        const contributors = this.props.getContributors();

        // Add current provisional approver to contributors list
        if (provisionalSubmitter) {
            contributors.push({   
                name: getUserName(provisionalSubmitter),
                id: lodashGet(provisionalSubmitter, 'PK', ''),
                email: lodashGet(provisionalSubmitter, 'email', ''),
                roles: ['provisional approver']
            });
        }
    
        // Create data object to be sent to Data Exchange
        const reviewDate = provisional.provisionalReviewDate ? provisional.provisionalReviewDate : (provisional.provisionalDate ? provisional.provisionalDate : '');
        const provisionalDate = provisional.provisionalDate ? provisional.provisionalDate : '';
        const uncData = this.props.setUNCData(provisional, 'provisionally_approved', reviewDate, provisionalDate, provisionalSubmitter, contributors);

        // Post provisional data to Data Exchange
        this.props.postTrackData(uncData).then(response => {
            console.log('Successfully sent provisionally approved data to Data Exchange for provisional %s at %s', provisional.PK, moment(provisionalDate).toISOString());
        }).catch(error => {
            console.log('Error sending provisionally approved data to Data Exchange for provisional %s at %s - Error: %o', provisional.PK, moment(provisionalDate).toISOString(), error);
        });
    }

    /**
     * Method to handle submitting provisional form
     */
    submitForm = (e) => {
        e.preventDefault();
        e.stopPropagation();

        let newProvisional = this.state.provisional ? this.state.provisional : {};
        const nowUTC = moment().toISOString();
        newProvisional.classificationStatus = 'Provisional';
        newProvisional.provisionedClassification = true;
        newProvisional.provisionalSubmitter = this.state.provisionalSubmitter;
        newProvisional.provisionalDate = nowUTC;
        newProvisional.provisionalReviewDate = this.state.provisionalReviewDate;
        newProvisional.submitted_by = (newProvisional.submitted_by && newProvisional.submitted_by.PK)
            ? newProvisional.submitted_by.PK
            : lodashGet(this.props.auth, "PK", null);
        newProvisional.modified_by = lodashGet(this.props.auth, 'PK', null);
        if (this.state.provisionalComment && this.state.provisionalComment.length) {
            newProvisional.provisionalComment = this.state.provisionalComment;
        } else {
            if (newProvisional.provisionalComment) {
                newProvisional['provisionalComment'] = null;
            }
        }

        // Prevent users from incurring multiple submissions
        this.setState({submitBusy: true});
        if (this.props.gdm && Object.keys(this.props.gdm).length) {
            let previousSnapshots = [];

            // To avoid provisional/snapshot data nesting, remove old snapshots from provisional that will be added to the new snapshot
            if (newProvisional.associatedClassificationSnapshots) {
                previousSnapshots = newProvisional.associatedClassificationSnapshots;
                delete newProvisional['associatedClassificationSnapshots'];
            }

            // ??? gdm doesn't have all objects - annotations, variantPathogenicity
            const newSnapshot = {
                resourceId: newProvisional.PK,
                resourceType: 'classification',
                approvalStatus: 'Provisioned',
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
                submitted_by: lodashGet(this.props.auth, 'PK', null),
                modified_by: lodashGet(this.props.auth, 'PK', null)
            };

            let url = '/snapshots/?type=gdm&action=provision';
            let params = {body: {newSnapshot}}

            // Send provisional data to Data Exchange
            this.sendToDataExchange(newProvisional);

            // Save snapshot
            return API.post(API_NAME, url, params).then(snapshotResponse => {
                this.props.updateSnapshotList(snapshotResponse);
                return Promise.resolve(snapshotResponse);
            }).then(snapshotResult => {
                // Return old snapshots to provisional before adding latest snapshot
                if (Array.isArray(previousSnapshots) && previousSnapshots.length) {
                    newProvisional.associatedClassificationSnapshots = previousSnapshots;
                }

                // Add snapshot to list (in provisional data object)
                let snapshotList = newProvisional.associatedClassificationSnapshots || [];
                newProvisional.associatedClassificationSnapshots = [snapshotResult.PK].concat(snapshotList);

                url = '/provisional-classifications/' + newProvisional.PK;
                params = {body: {newProvisional}}

                // Update existing provisional data object
                return API.put(API_NAME, url, params).then(provisionalResponse => {
                    this.props.updateProvisionalObj(provisionalResponse);
                    return Promise.resolve(provisionalResponse);
                }).catch(err => {
                    console.log('Classification provisional submission error = : %o', err);
                });
            }).catch(err => {
                console.log('Saving provisional snapshot error = : %o', err);
            }).then(() => 
                // update gdm participants && also get the latest provisional classifications and snapshots
                gdmPutParticipantsAndSetState({
                    requestRecycler: this.requestRecycler,
                    gdm: this.props.gdm,
                    auth: this.props.auth,
                    setGdm: this.props.setGdmAction
                })
            );
        } else if (this.state.interpretation) {
            newProvisional.last_modified = nowUTC;
            console.log('Provisional Save', newProvisional)

            // reference to parent interpretation
            const resourceParentObj = {"interpretation": this.state.interpretation.PK}

            let newSnapshot = {
                resourceId: newProvisional.PK,
                resourceType: 'interpretation',
                approvalStatus: 'Provisioned',
                resource: newProvisional,
                //interpretation: this.state.interpretation.PK,
                resourceParent: resourceParentObj,
                disease: this.state.interpretation.disease ? this.state.interpretation.disease : null,
                diseaseTerm: this.state.interpretation.diseaseTerm ? this.state.interpretation.diseaseTerm : null,
                modeInheritance: this.state.interpretation.modeInheritance ? this.state.interpretation.modeInheritance : null,
                modeInheritanceAdjective: this.state.interpretation.modeInheritanceAdjective ? this.state.interpretation.modeInheritanceAdjective : null,
                submitted_by: lodashGet(this.props.auth, 'PK', null),
                modified_by: lodashGet(this.props.auth, 'PK', null)
            };

            const params = {body: {newSnapshot}}
            const url = '/snapshots/?type=interpretation&action=provision';

            console.log('newSnapshot', newSnapshot)
            API.post(API_NAME, url, params).then(response => {
                let provisionalSnapshot = response;
                this.props.approveProvisional('yes');
                console.log('provisional snapshot!', provisionalSnapshot)
                this.props.updateSnapshotList(provisionalSnapshot);
                return Promise.resolve(provisionalSnapshot);
            }).then(snapshot => {
                // console.log('after saving newSnapshot', snapshot)
                // POST Provisional Snapshot, then update parent interpretation
                const interpretationObj = this.state.interpretation;
                interpretationObj.status = "Provisional";
                interpretationObj.provisionalVariant = newProvisional;
                interpretationObj.modified_by = newProvisional.modified_by;
                //interpretationObj.snapshots = snapshot;

                // Update interpretation with latest snapshots PKs
                let currentSnapshots = interpretationObj.snapshots || [];
                let latestSnapshots = [snapshot.PK].concat(currentSnapshots);
                interpretationObj.snapshots = latestSnapshots;

                // Update parent interpretation
                const params = {body: {interpretationObj}}
                const url = '/interpretations/' + interpretationObj.PK;
                API.put(API_NAME, url, params).then(data => {
                    console.log('Added Snapshot to Interp', data);
                    this.props.updateInterpretation(data);
                    this.props.updateProvisionalObj(data.provisionalVariant);
                })
            }).catch(err => {
                console.log('Saving provisional snapshot error = : %o', err);
            });
        }
    }

    render() {
        const provisionalSubmitter = this.state.provisionalSubmitter;
        const provisionalDate = this.state.provisionalDate ? moment(this.state.provisionalDate).format('YYYY MM DD, h:mm a') : moment().format('YYYY MM DD, h:mm a');
        const provisionalReviewDate = this.state.provisionalReviewDate ? moment(this.state.provisionalReviewDate).format('MM/DD/YYYY') : '';
        const provisionalComment = this.state.provisionalComment ? this.state.provisionalComment : '';
        const interpretation = this.props.interpretation;
        const provisional = this.props.provisional;
        //const classification = this.props.classification;
        const currentUserAffiliation = lodashGet(this.props.auth, 'currentAffiliation.affiliation_fullname', null);
        const affiliation = lodashGet(provisional, 'affiliation', null) ? provisional.affiliation : lodashGet(this.props.auth, 'currentAffiliation.affiliation_id', null);
        const submitBusy = this.state.submitBusy;

        return (
            <div className="provisional-approval-panel-content">
                <form onSubmit={this.submitForm} className="form-horizontal form-std">
                    {this.state.isProvisionalPreview ?
                        <div className="provisional-preview">
                            <div className="row">
                                <div className="col-sm-4">
                                    <div className="provisional-affiliation">
                                        <dl className="inline-dl clearfix">
                                            <dt><strong>ClinGen Affiliation:</strong></dt>
                                            <dd>{affiliation ? getAffiliationName(affiliation) : "--"}</dd>
                                        </dl>
                                    </div>
                                    <div className="provisional-submitter">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Provisional Classification entered by:</span></dt>
                                            <dd>{provisionalSubmitter ? provisionalSubmitter : "-"}</dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-sm-3">
                                    <div className="provisional-date">
                                        <dl className="inline-dl clearfix preview-provisional-date">
                                            <dt><span>Date saved as Provisional:</span></dt>
                                            <dd><span>{provisionalDate ? formatDate(parseDate(provisionalDate), "YYYY MMM DD, h:mm a") : "--"}</span></dd>
                                        </dl>
                                    </div>
                                    <div className="approval-review-date">
                                        <dl className="inline-dl clearfix preview-provisional-review-date">
                                            <dt><span>Date reviewed:</span></dt>
                                            <dd><span>{provisionalReviewDate ? formatDate(parseDate(provisionalReviewDate), "YYYY MMM DD") : "--"}</span></dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-sm-5">
                                    <div className="provisional-comments">
                                        <dl className="inline-dl clearfix preview-provisional-comment">
                                            <dt><span>Additional comments:</span></dt>
                                            <dd><span>{provisionalComment ? provisionalComment : null}</span></dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            <div className="alert alert-warning provisional-preview-note">
                                <i className="icon icon-exclamation-circle"></i> This is a Preview only; you must still Submit to save
                                this {interpretation ? 'Interpretation' : 'Classification'} as Provisional.
                            </div>
                        </div>
                        :
                        <div className="provisional-edit">
                            <div className="row provisional-form-content-wrapper">
                                <div className="col-xs-12 col-sm-4">
                                    <div className="provisional-affiliation">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{affiliation ? getAffiliationName(affiliation) : "--"}</dd>
                                        </dl>
                                    </div>
                                    <div className="provisional-submitter">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Provisional Classification entered by:</span></dt>
                                            <dd>
                                                {provisionalSubmitter ?
                                                    provisionalSubmitter
                                                    :
                                                    <span className="text-muted">Current curator's name will be entered upon submission</span>
                                                }
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-3">
                                    <div className="provisional-review-date">
                                        <div className="form-group">
                                            <label>Date reviewed:</label>
                                                <DayPickerInput
                                                    value={provisionalReviewDate}
                                                    onDayChange={this.handleProvisionalReviewDateChange}
                                                    formatDate={formatDate}
                                                    inputProps={{ className: "form-control" }}
                                                    parseDate={parseDate}
                                                    placeholder={`${formatDate(new Date())}`}
                                                    dayPickerProps={{
                                                        selectedDays: provisionalReviewDate ? parseDate(provisionalReviewDate) : undefined
                                                    }}
                                                />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-5">
                                    <div className="provisional-comments">
                                        <label>Additional comments:</label>
                                        <textarea ref={(input) => { this.provisionalCommentInput = input; }}
                                            onChange={(e) => this.handleprovisionalComment(e.currentTarget.value)}
                                            defaultValue={provisionalComment} rows="3"
                                            className="form-control" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                    <div className="provisional-form-buttons-wrapper">
                        {this.state.isProvisionalPreview ?
                            <div className="button-group">
                                <button className="btn btn-light btn-lg mr-1"
                                    disabled={submitBusy} onClick={this.handleCancelProvisional}>
                                    Cancel Provisional
                                </button>
                                <button type="button" className="btn btn-info btn-lg mr-1"
                                    disabled={submitBusy} onClick={this.handleEditProvisional}>
                                    Edit <i className="icon icon-pencil"></i>
                                </button>
                                <button type="submit" className="btn btn-primary btn-lg ml-auto" disabled={submitBusy}>
                                    {submitBusy ? <LoadingSpinner size="1x"/> : null}
                                    Submit Provisional <i className="icon icon-check-square-o"></i>
                                </button>
                            </div>
                            :
                            <div className="button-group">
                                <button type="button" className="btn btn-primary btn-lg"
                                    onClick={this.handlePreviewProvisional}>
                                    Preview Provisional
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

export default connect(mapStateToProps, mapDispatchToProps)(ProvisionalApproval);
