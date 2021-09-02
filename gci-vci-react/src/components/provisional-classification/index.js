import React, { Component } from 'react';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../utils';
import { connect } from 'react-redux';
import { isEmpty, get as lodashGet } from 'lodash';
import moment from 'moment';
import { queryKeyValue, editQueryValue, addQueryKey } from '../common/globals';
import CardPanel from '../common/CardPanel';
import { GdmHeader } from '../gene-central/GdmHeader';
import { ClassificationDefinition } from './definition';
import ProvisionalApproval from './provisional';
import ClassificationApproval from './approval';
import PublishApproval from './publish';
import Snapshots from './snapshots';
import { sortListByDate } from '../../helpers/sort';
import { isScoringForSupportedSOP, isScoringForCurrentSOP } from '../../helpers/sop';
import { ContextualHelp } from '../../helpers/contextual_help';
import { allowPublishGlobal } from '../../helpers/allow_publish';
import { getApproverNames } from '../../helpers/get_approver_names';
import { getAffiliationName } from '../../helpers/get_affiliation_name.js';
import { renderAnimalOnlyTag } from '../../helpers/render_classification_animal_only_tag';
import GeneDiseaseClassificationMatrix from '../../helpers/gene_disease_classification_matrix';
import GeneDiseaseClassificationMatrixSOPv7 from '../../helpers/gene_disease_classification_matrix_sop_v7';
import { getUserName } from "../../helpers/getUserName";
import { renderEarliestPublications } from '../../helpers/renderEarliestPublications';
import { getClassificationSavedDate } from '../../utilities/classificationUtilities';
import { Container } from 'react-bootstrap';
import { GdmClassificationRecords } from '../gene-central/GdmClassificationRecords';


class ProvisionalClassification extends Component {
  // propTypes: {
  //     href: PropTypes.string,
  //     session: PropTypes.object,
  //     affiliation: PropTypes.object,
  //     demoVersion: PropTypes.bool
  // },
  constructor(props) {
    super(props);

    // Set state to indicate user actions/intentions based on URL query string parameters
    let isApprovalActive, isPublishActive, isUnpublishActive;

    if (this.props.location && this.props.location.search) {
      const params = new URLSearchParams(this.props.location.search);

      isApprovalActive = params.get('approval');
      isPublishActive = params.get('publish');
      isUnpublishActive = params.get('unpublish');
    }

    this.state = {
      user: null, // login user uuid
      gdm: null, // current gdm object, must be null initially.
      provisional: {}, // login user's existing provisional object, must be null initially.
      variantPathogenicity: [], // variant pathogenicity for this gdm
      classificationStatus: 'In progress',
      classificationSnapshots: [],
      isApprovalActive: isApprovalActive,
      isPublishActive: isPublishActive,
      isUnpublishActive: isUnpublishActive,
      showProvisional: false,
      showApproval: false,
      publishProvisionalReady: false,
      publishSnapshotListReady: false,
      publishSnapshotUUID: null,
      showPublish: false,
      showUnpublish: false
    };

    this.updateProvisionalObj = this.updateProvisionalObj.bind(this);
    this.updateSnapshotList = this.updateSnapshotList.bind(this);
    this.setUNCData = this.setUNCData.bind(this);
    this.getContributors = this.getContributors.bind(this);
    this.approveProvisional = this.approveProvisional.bind(this);
    this.addPublishState = this.addPublishState.bind(this);
    this.clearPublishState = this.clearPublishState.bind(this);
    this.viewEvidenceSummary = this.viewEvidenceSummary.bind(this);
    this.getCurationCentral = this.getCurationCentral.bind(this);
    this.editClassification = this.editClassification.bind(this);
  }

  /**
   * Method to update the state-based (provisional) classification object
   * Called from child components upon the PUT request to update the classification.
   * @param {object} provisionalObj - The (provisional) classification object
   * @param {boolean} publishProvisionalReady - Indicator that (provisional) classification is ready for publish component (optional, defaults to false)
   */
  updateProvisionalObj(provisionalObj, publishProvisionalReady = false) {
    this.setState({ provisional: provisionalObj, classificationStatus: provisionalObj.classificationStatus, publishProvisionalReady: publishProvisionalReady }, () => {
      this.handleProvisionalApprovalVisibility();
    });
  }

  /**
   * Method to update the state-based list of snapshots
   * Called from child components upon saving a new snapshot.
   * @param {object} snapshotObj - The newly saved snapshot object
   * @param {boolean} publishSnapshotListReady - Indicator that list of snapshots is ready for publish component (optional, defaults to false)
   */
  updateSnapshotList(snapshotObj, publishSnapshotListReady = false) {
    let classificationSnapshots = this.state.classificationSnapshots;
    let isNewSnapshot = true;

    // Check if snapshot already exists in list (and if so, replace it)
    for (let snapshot of classificationSnapshots) {
      if (snapshot['PK'] === snapshotObj['PK']) {
        snapshot = snapshotObj;
        isNewSnapshot = false;
        break;
      }
    }

    // Update snapshot list
    if (isNewSnapshot) {
      const newClassificationSnapshots = [snapshotObj, ...classificationSnapshots];

      if (publishSnapshotListReady) {
        this.setState({ classificationSnapshots: newClassificationSnapshots, publishSnapshotListReady: publishSnapshotListReady }, () => {
          this.handleProvisionalApprovalVisibility();
        });
      } else {
        this.setState({ classificationSnapshots: newClassificationSnapshots });
      }
    } else {
      this.setState({ classificationSnapshots: classificationSnapshots });
    }
  }

  /**
   * Method to post data to /track-data which sends data to Data Exchange for UNC tracking system
   * @param {object} data - data object
   */
  postTrackData(data) {
    return new Promise((resolve, reject) => {
      if (data) {
        const params = { body: {data} };
        API.post(API_NAME, '/messaging/track-data', params).then(result => {
          if (result.status === 'Success') {
            console.log('Post tracking data succeeded: %o', result);
            resolve(result);
          } else {
            console.log('Post tracking data failed: %o', result);
            reject(result);
          }
        }).catch(error => {
          console.log('Post tracking data internal data retrieval error: %o', error);
          reject(error);
        });
      } else {
        console.log('Post tracking data Error: Missing expected data');
        reject({ 'message': 'Missing expected data' });
      }
    });
  }

  /**
   * Method to get current GDM data that is used for UNC tracking
   */
  getGDMData() {
    const gdm = lodashGet(this, "state.gdm", null);
    let gdmData = {};
    if (gdm && gdm.gene && gdm.disease && gdm.modeInheritance) {
      const start = gdm.modeInheritance.indexOf('(');
      const end = gdm.modeInheritance.indexOf(')');
      const hpoNumber = start > -1 && end > -1 ? gdm.modeInheritance.substring(start + 1, end) : gdm.modeInheritance;

      gdmData = {
        mode_of_inheritance: hpoNumber,
        condition: gdm.disease.PK ? gdm.disease.PK.replace('_', ':') : '',
        gene: gdm.gene.hgncId || ''
      };
    }
    return gdmData;
  }

  /**
   * Method to get given provisional's gene_validity_evidence_level data that is used for UNC tracking
   * @param {object} provisional - provisional data object
   */
  getGeneEvidenceData(provisional) {
    return {
      genetic_condition: this.getGDMData(),
      evidence_level: provisional && provisional.alteredClassification && provisional.alteredClassification !== 'No Modification' ? provisional.alteredClassification : provisional.autoClassification,
      gene_validity_sop: provisional && provisional.sopVersion ? 'cg:gene_validity_sop_' + provisional.sopVersion : ''
    };
  }

  /**
   * Method to create necessary data object that needs to be sent to Data Exchange for UNC tracking
   * @param {object} provisional - provisional classification object
   * @param {string} status - current classification status
   * @param {string} statusDate - date that current classification status was reviewed/approved
   * @param {string} date - datetime current action performed
   * @param {object} submitter - current classification action submitter
   * @param {array} contributors - classification contributor list
   */
  setUNCData(provisional, status, statusDate, date, submitter, contributors) {
    let uncData = {};

    if (lodashGet(this, "state.gdm", null) && this.state.gdm.PK) {
      const affiliation = lodashGet(this, "props.auth.currentAffiliation", null);
      uncData = {
        report_id: this.state.gdm.PK,
        gene_validity_evidence_level: this.getGeneEvidenceData(provisional),
        date: moment(date).toISOString(),
        status: {
          name: status,
          date: moment(statusDate).toISOString()
        },
        performed_by: {
          name: getUserName(submitter),
          id: lodashGet(submitter, "PK", null) || '',
          email: lodashGet(submitter,"email", null) || '',
          on_behalf_of: {
            id: lodashGet(affiliation, "affiliation_id", null) || '',
            name: lodashGet(affiliation, "affiliation_fullname", null) || ''
          }
        },
        contributors: contributors
      }
    }

    return uncData;
  }

  /**
   * Method to get list of user who has performed an action in current provisional classification.
   * But skip the publish/unpublish user in the snapshot with given snapshot id.
   * @param {string} publishSnapshotId - snapshot id
   */
  getActionContributors(publishSnapshotId) {
    let contributors = [];

    // Add GDM creator
    if (lodashGet(this, "state.gdm", null)) {
      const gdm = this.state.gdm;
      if (gdm.submitted_by) {
        contributors.push({
          name: getUserName(gdm.submitted_by),
          id: lodashGet(gdm, "submitted_by.PK", null) || '',
          email: lodashGet(gdm, "submitted_by.email", null) || '',
          roles: ['creator']
        });
      }
    }

    // Get current classification snapshots
    let snapshots = lodashGet(this, "state.classificationSnapshots", null) && this.state.classificationSnapshots.length ? sortListByDate(this.state.classificationSnapshots, 'date_created') : [];

    // Loop through classification snapshots to get users who performed previous actions
    if (snapshots && snapshots.length) {
      snapshots.forEach(snapshot => {
        if (snapshot && snapshot.resource && snapshot.approvalStatus) {
          // Snapshot when classification was provisionally approved
          if (snapshot.approvalStatus === 'Provisioned') {
            if (snapshot.resource.provisionalSubmitter) {
              contributors.push({
                name: snapshot.resource.provisionalSubmitter,
                roles: ['provisional approver']
              });
            }
          } else if (snapshot.approvalStatus === 'Approved') {
            // Snapshot when classification was approved
            // Add approver
            if (snapshot.resource.approvalSubmitter) {
              contributors.push({
                name: snapshot.resource.approvalSubmitter,
                roles: ['approver']
              });
            }
            // Add curator who approved this classification
            if (snapshot.resource.classificationApprover) {
              contributors.push({
                name: snapshot.resource.classificationApprover,
                roles: ['secondary approver']
              });
            }
            // Add secondary approver (affiliation)
            if (snapshot.resource.additionalApprover) {
              contributors.push({
                id: snapshot.resource.additionalApprover,
                name: getApproverNames(snapshot.resource.additionalApprover),
                roles: ['secondary approver']
              });
            }
            // Add secondary contributors (affiliations)
            if (snapshot.resource.classificationContributors) {
              snapshot.resource.classificationContributors.forEach(contributorId => {
                contributors.push({
                  id: contributorId,
                  name: getAffiliationName(contributorId),
                  roles: ['secondary approver']
                });
              });
            }
            // Get the publisher/unpublisher data if it's not to be skipped
            if (snapshot.resource.publishDate) {
              if (publishSnapshotId === null || publishSnapshotId !== snapshot['@id']) {
                contributors.push({
                  name: snapshot.resource.publishSubmitter,
                  roles: snapshot.resource.publishClassification ? ['publisher'] : ['unpublisher']
                });
              }
            }
          }
        }
      });
    }

    return contributors;
  }

  /**
   * Method to get the list of user who has made contribution to current provisional classification.
   * But skip the publish/unpublish user in the snapshot with given snapshot id.
   * @param {string} publishSnapshotId - snapshot id
   */
  getContributors(publishSnapshotId = null) {
    let contributors = [];

    if (lodashGet(this, "state.gdm", null)) {
      // Get the list of GDM contributors
      const gdmSubmitters = lodashGet(this, "state.gdm.contributors", null) || [];

      // Extract submitters to contributors list
      // No role is set in this case
      contributors = gdmSubmitters.map(user => {
        return {
          name: getUserName(user),
          id: lodashGet(user, "PK", null) || '',
          email: lodashGet(user, "email", null) || '',
          roles: []
        }
      });
      // Add users who have action role to contributors list
      const actionSubmitters = this.getActionContributors(publishSnapshotId);
      contributors.push(...actionSubmitters);
    }

    return contributors;
  }

  /**
   * Method to retrieve a list of snapshots referenced by a (provisional) classification and add it to the state
   * Called only once in the componentDidMount() lifecycle method via the loadData() method.
   * @param {object} provisionalObj - A (provisional) classification object
   */
  async getClassificationSnaphots(provisionalObj) {
    let snapshots = [];
    if (provisionalObj && provisionalObj.associatedClassificationSnapshots && provisionalObj.associatedClassificationSnapshots.length) {
      for (let classificationSnapshot of provisionalObj.associatedClassificationSnapshots) {
        let snapshot;
        if (classificationSnapshot && typeof classificationSnapshot === 'object' && classificationSnapshot.resource) {
          snapshot = classificationSnapshot;
        } else {
          let snapshotPK = classificationSnapshot.uuid ? classificationSnapshot.uuid : classificationSnapshot;
          try {
            snapshot = await API.get(API_NAME, '/snapshots/' + snapshotPK);
          } catch (error) {
            if (API.isCancel(error)) {
              return;
            }
            console.error(error);
          }
        }

        if (snapshot) {
          snapshots.push(snapshot);
        }
      }
    }
    if (snapshots && snapshots.length) {
      this.setState({ classificationSnapshots: snapshots });
    }
  }

  async getPathogenicities(pathogenicityList) {
    const promises = pathogenicityList.map(async (pathogenicityId) => {
      const url = `/pathogenicity/${pathogenicityId}`;
        return await API.get(API_NAME, url);
    });

    Promise.all(promises).then((results) => {
      if (results && results.length) {
        this.setState({ variantPathogenicity: results });
      }
    }).catch((error) => {
      if (API.isCancel(error)) {
        return;
      }
      console.log(error);
    });
  }

  async loadData() {
    if (lodashGet(this, "props.gdm", null) && lodashGet(this, "props.auth", null)) {
      let stateObj = {
        gdm: this.props.gdm,
        user: this.props.auth.PK
      };

      // Search for provisional owned by affiliation or current user
      if (stateObj.gdm.provisionalClassifications && stateObj.gdm.provisionalClassifications.length > 0) {
        const curatorAffiliation = this.props.auth.currentAffiliation;

        for (let provisionalClassification of stateObj.gdm.provisionalClassifications) {
          const provisionalAffiliation = provisionalClassification.affiliation;
          const creatorPK = lodashGet(provisionalClassification, "submitted_by.PK", null);

          if ((provisionalAffiliation && curatorAffiliation && provisionalAffiliation === curatorAffiliation.affiliation_id) || (!provisionalAffiliation && !curatorAffiliation && creatorPK === stateObj.user)) {
            stateObj.provisional = provisionalClassification;
            stateObj.classificationStatus = stateObj.provisional.hasOwnProperty('classificationStatus') ? stateObj.provisional.classificationStatus : 'In progress';
          }
        }
      }

      this.setState(stateObj);
      if (stateObj.provisional && stateObj.provisional.PK) {
        this.getClassificationSnaphots(stateObj.provisional);
      }
      if (this.props.gdm.variantPathogenicity && this.props.gdm.variantPathogenicity.length > 0) {
        this.getPathogenicities(this.props.gdm.variantPathogenicity);
      }
    } else {
      console.log('Failed to load GDM.');
    }
  }

  componentDidMount() {
    this.loadData();
    this.handleProvisionalApprovalVisibility();
  }

  componentDidUpdate(prevProps, prevState) {
    // Need to delay the function call until the DOM is rendered
    setTimeout(this.scrollElementIntoView, 500);
  }

  // FIXME: This method is not working as expected in the resulted behavior
  // Need to revisit in the next release
  highlightMatchingSnapshots() {
    // Color code each pair of Approval/Provisional snapshots
    let provisionalList = document.querySelectorAll('li.snapshot-item[data-status="Provisional"]');
    let approvalList = document.querySelectorAll('li.snapshot-item[data-status="Approved"]');
    let provisionalSnapshotNodes = Array.from(provisionalList);
    let approvalSnapshotNodes = Array.from(approvalList);
    if (approvalSnapshotNodes && approvalSnapshotNodes.length) {
      approvalSnapshotNodes.forEach(approval => {
        let label = document.createElement('LABEL');
        approval.appendChild(label);

        if (approval.getAttribute('data-associated').length) {
          let matchingProvisional = provisionalSnapshotNodes.filter(provisional => {
            return provisional.getAttribute('data-key') === approval.getAttribute('data-associated');
          });
          if (matchingProvisional && matchingProvisional.length) {
            matchingProvisional[0].appendChild(label);
          }
        }
      });
    }
  }

  /**
   * Method to show the saved classification data in viewport
   */
  scrollElementIntoView() {
    const element = document.querySelector('#classification-view');
    if (element) {
      element.scrollIntoView();
    }
  }

  getCurationCentral(e) {
    window.location.href = lodashGet(this, "state.gdm.PK", null) ? `/curation-central/${this.state.gdm.PK}` : '/dashboard';
  }

  editClassification(e) {
    window.location.href = lodashGet(this, "state.gdm.PK", null) ? `/provisional-curation/${this.state.gdm.PK}` : '';
  }

  viewEvidenceSummary(e) {
    if (lodashGet(this, "state.gdm.PK", null)) {
      window.open(`/curation-central/${this.state.gdm.PK}/gene-disease-evidence-summary/`, '_blank');
    }
  }

  /**
   * Method to show the Approval form entry panel
   * Passed to the <Snapshots /> component as a prop
   */
  approveProvisional() {
    const isApprovalActive = this.state.isApprovalActive;
    if (!isApprovalActive) {
      window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'approval', 'yes'));
      this.setState({ isApprovalActive: 'yes' }, () => {
        this.handleProvisionalApprovalVisibility();
      });
    }
  }

  handleProvisionalApprovalVisibility() {
    const classificationStatus = this.state.classificationStatus;
    const isApprovalActive = this.state.isApprovalActive;
    const isPublishActive = this.state.isPublishActive;
    const isUnpublishActive = this.state.isUnpublishActive;
    const provisional = this.state.provisional;

    if (classificationStatus === 'In progress' || classificationStatus === 'Provisional') {
      if (isApprovalActive && isApprovalActive === 'yes') {
        this.setState({ showProvisional: false, showApproval: true, showPublish: false, showUnpublish: false });
      } else if (isPublishActive === 'yes' || isPublishActive === 'auto') {
        this.setState({ showProvisional: false, showApproval: false, showPublish: true, showUnpublish: false });
      } else if (isUnpublishActive === 'yes') {
        this.setState({ showProvisional: false, showApproval: false, showPublish: false, showUnpublish: true });

        // Automatic display of the approval panel (system directing user through approval process)
      } else if (classificationStatus === 'Provisional') {
        this.setState({ isApprovalActive: 'yes', showProvisional: false, showApproval: true, showPublish: false, showUnpublish: false });

        // Automatic display of the provisional panel (system directing user through approval process)
      } else {
        this.setState({ showProvisional: true, showApproval: false, showPublish: false, showUnpublish: false });
      }
    } else if (classificationStatus === 'Approved') {
      const gdm = this.state.gdm;
      const affiliation = this.props.auth ? this.props.auth.currentAffiliation : null;
      const allowPublish = gdm && gdm.disease ? allowPublishGlobal(affiliation, 'classification', gdm.modeInheritance, gdm.disease.PK) : false;
      // SOP8 - allow publish both GCI v7 and v8 format classifications
      const supportedSOP = provisional ? isScoringForSupportedSOP(provisional.classificationPoints) : false;

      if (allowPublish && supportedSOP) {

        // Check if the current classification has been published
        if (!provisional || !provisional.publishClassification) {
          if (isPublishActive === 'yes' || isPublishActive === 'auto') {
            this.setState({ showProvisional: false, showApproval: false, showPublish: true, showUnpublish: false });

            // Only update state data (to automatically display publish panel) when the approval step is complete
          } else if (this.state.publishProvisionalReady && this.state.publishSnapshotListReady) {
            this.setState({
              isApprovalActive: undefined, isPublishActive: 'auto', publishProvisionalReady: false,
              publishSnapshotListReady: false, showProvisional: false, showApproval: false, showPublish: true, showUnpublish: false
            });
          }
        } else if (isUnpublishActive === 'yes') {
          this.setState({ showProvisional: false, showApproval: false, showPublish: false, showUnpublish: true });
        }

        // End approval process (for users without publication rights)
      } else {
        this.setState({ isApprovalActive: undefined, showProvisional: false, showApproval: false, showPublish: false, showUnpublish: false });
      }
    } else {
      this.setState({ showProvisional: false, showApproval: false, showPublish: false, showUnpublish: false });
    }
  }

  /**
   * Method to add publish-related state data
   * Under certain circumstances (when URL of source page includes "provisional-classification"), called at the start of a publish event
   * @param {string} snapshotUUID - The UUID of the source snapshot
   * @param {string} eventType - The type of event being initiated (publish or unpublish)
   */
  addPublishState(snapshotUUID, eventType) {
    if (snapshotUUID) {
      if (eventType === 'publish') {
        this.setState({ isPublishActive: 'yes', isUnpublishActive: undefined, publishSnapshotUUID: snapshotUUID }, () => {
          this.handleProvisionalApprovalVisibility();
        });
      } else if (eventType === 'unpublish') {
        this.setState({ isPublishActive: undefined, isUnpublishActive: 'yes', publishSnapshotUUID: snapshotUUID }, () => {
          this.handleProvisionalApprovalVisibility();
        });
      }
    }
  }

  /**
   * Method to clear publish-related URL query parameters and state data
   * Called at the end of every publish event
   */
  clearPublishState() {
    if (typeof window !== "undefined" && window.location && window.location.href && window.history) {
      if (queryKeyValue('publish', window.location.href)) {
        window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'publish', null));
      }

      if (queryKeyValue('unpublish', window.location.href)) {
        window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'unpublish', null));
      }

      if (queryKeyValue('snapshot', window.location.href)) {
        window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'snapshot', null));
      }
    }

    this.setState({
      isPublishActive: undefined, isUnpublishActive: undefined, publishProvisionalReady: false,
      publishSnapshotListReady: false, publishSnapshotUUID: null, showPublish: false, showUnpublish: false
    });
  }

  render() {
    // this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
    // let calculate = queryKeyValue('calculate', this.props.href);
    // let edit = queryKeyValue('edit', this.props.href);
    // let session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;
    // const currOmimId = this.state.currOmimId;
    let gdm = this.state.gdm ? this.state.gdm : null;
    const annotations = this.props.annotations && !isEmpty(this.props.annotations.byPK)
      ? Object.keys(this.props.annotations.byPK).map(key => this.props.annotations.byPK[key])
      : null;
    let show_clsfctn = queryKeyValue('classification', this.props.href);
    // set the 'Current Classification' appropriately only if previous provisional exists
    const provisional = this.state.provisional ? this.state.provisional : {};
    const autoClassification = provisional.autoClassification;
    const classificationPoints = provisional.classificationPoints ? provisional.classificationPoints : {};
    const showAnimalOnlyTag = !(provisional.alteredClassification && provisional.alteredClassification !== 'No Modification');
    let currentClassification = provisional.alteredClassification && provisional.alteredClassification !== 'No Modification' ? provisional.alteredClassification : provisional.autoClassification;
    let sortedSnapshotList = this.state.classificationSnapshots.length ? sortListByDate(this.state.classificationSnapshots, 'date_created') : [];
    const classificationStatus = this.state.classificationStatus;
    const isApprovalActive = this.state.isApprovalActive;
    const lastSavedDate = provisional.last_modified ? getClassificationSavedDate(provisional) : null;
    const demoVersion = this.props.demoVersion;
    const affiliation = this.props.auth ? this.props.auth.currentAffiliation : null;
    const isPublishActive = this.state.isPublishActive;
    const isUnpublishActive = this.state.isUnpublishActive;
    const allowPublishButton = gdm && gdm.disease ? allowPublishGlobal(affiliation, 'classification', gdm.modeInheritance, gdm.disease.PK) : false;
    // SOP8 - allow publish both GCI v7 and v8 format classifications
    const supportedSOP = provisional ? isScoringForSupportedSOP(provisional.classificationPoints) : false;
    const currentSOP = provisional ? isScoringForCurrentSOP(classificationPoints) : false;

    const variantPathogenicity = this.state.variantPathogenicity ? this.state.variantPathogenicity : [];

    // If state has a snapshot UUID, use it; otherwise, check URL query parameters
    const snapshotUUID = this.state.publishSnapshotUUID ? this.state.publishSnapshotUUID :
      this.props.location && this.props.location.search ? new URLSearchParams(this.props.location.search).get('snapshot') : undefined;

    return (
      <div>
        {show_clsfctn === 'display' ?
          <div>{ClassificationDefinition()}</div>
          :
          (gdm && !isEmpty(provisional) ?
            <div>
              <GdmHeader isSummary={true} />
              <Container fluid>
                <GdmClassificationRecords className="mx-2" />
              </Container>
              <div className="container summary-provisional-classification-wrapper">
                <CardPanel title="Calculated Classification Matrix" panelClassName="panel-data" open>
                  <div className="form-group">
                    {currentSOP
                      ? <GeneDiseaseClassificationMatrix classificationPoints={classificationPoints} />
                      : <GeneDiseaseClassificationMatrixSOPv7 classificationPoints={classificationPoints} />
                    }
                    <div className="summary-provisional-classification-description">
                      <p className="alert alert-warning">
                        <i className="icon icon-exclamation-circle"></i> The <strong>Total Points</strong> shown above are based on the set of saved evidence and accompanying scores existing
                          when the "View Classification Matrix" button was clicked. To save a Classification for this Gene Disease Record based on this evidence, please see the section below.
                      </p>
                    </div>
                    <div className="provisional-classification-wrapper">
                      <table className="summary-matrix">
                        <tbody>
                          <tr className="header large bg-gray">
                            <td colSpan="5">Gene/Disease Pair</td>
                          </tr>
                          <tr>
                            <td>Assertion Criteria</td>
                            <td>Genetic Evidence (0-12 points)</td>
                            <td>Experimental Evidence (0-6 points)</td>
                            <td>Total Points (0-18 points)</td>
                            <td>Replication Over Time (Yes/No) <ContextualHelp content="> 2 pubs w/ convincing evidence over time (>3 yrs)" /></td>
                          </tr>
                          <tr className="header large bg-gray separator-below">
                            <td>Assigned Points</td>
                            <td>{classificationPoints['geneticEvidenceTotal']}</td>
                            <td>{classificationPoints['experimentalEvidenceTotal']}</td>
                            <td>{classificationPoints['evidencePointsTotal']}</td>
                            <td>{provisional['replicatedOverTime'] ? <span>Yes</span> : <span>No</span>}
                              {renderEarliestPublications(provisional.earliestArticles)}
                            </td>
                          </tr>
                          <tr className="header large">
                            <td colSpan="2" rowSpan="5">Calculated Classification</td>
                            <td className={autoClassification === 'No Known Disease Relationship' ? ' bg-emphasis' : null}>No Known Disease Relationship</td>
                            <td colSpan="2" className={autoClassification === 'No Known Disease Relationship' ? ' bg-emphasis' : null}>No Scored Genetic Evidence & No Contradictory Evidence</td>
                          </tr>
                          <tr className={"header large" + (autoClassification === 'Limited' ? ' bg-emphasis' : null)}>
                            <td>LIMITED</td>
                            <td colSpan="2">0.1-6</td>
                          </tr>
                          <tr className={"header large" + (autoClassification === 'Moderate' ? ' bg-emphasis' : null)}>
                            <td>MODERATE</td>
                            <td colSpan="2">7-11</td>
                          </tr>
                          <tr className={"header large" + (autoClassification === 'Strong' ? ' bg-emphasis' : null)}>
                            <td>STRONG</td>
                            <td colSpan="2">12-18</td>
                          </tr>
                          <tr className={"header large" + (autoClassification === 'Definitive' ? ' bg-emphasis' : null)}>
                            <td>DEFINITIVE</td>
                            <td colSpan="2">12-18 & Replicated Over Time</td>
                          </tr>
                          <tr>
                            <td colSpan="2" className="header large">Contradictory Evidence?</td>
                            <td colSpan="3">
                              Proband: <strong>{lodashGet(provisional, "contradictingEvidence.proband" , null) ? <span className='emphasis'>Yes</span> : 'No'}</strong>&nbsp;&nbsp;&nbsp;
                              Experimental: <strong>{lodashGet(provisional, "contradictingEvidence.experimental", null) ? <span className='emphasis'>Yes</span> : 'No'}</strong>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="5">
                              <a name="classification-view" id="classification-view"></a>
                              <div className="col-md-12 classification-form-content-wrapper view-only">
                                <div className="col-xs-12 col-sm-6">
                                  <div className="altered-classfication">
                                    <dl className="inline-dl clearfix">
                                      <dt>
                                        <span>Modify Calculated <a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>:</span>
                                      </dt>
                                      <dd>
                                        {provisional.alteredClassification}
                                      </dd>
                                    </dl>
                                  </div>
                                  <div className="altered-classification-reasons">
                                    <dl className="inline-dl clearfix">
                                      <dt>
                                        <span>Explain Reason(s) for Change:</span>
                                      </dt>
                                      <dd>
                                        {provisional.reasons}
                                      </dd>
                                    </dl>
                                  </div>
                                </div>
                                <div className="col-xs-12 col-sm-6">
                                  <div className="classification-evidence-summary">
                                    <dl className="inline-dl clearfix">
                                      <dt>
                                        <span>Evidence Summary:</span>
                                      </dt>
                                      <dd>
                                        {provisional.evidenceSummary}
                                      </dd>
                                    </dl>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                          <tr className="total-row header">
                            <td colSpan="2">Last Saved Summary Classification</td>
                            <td colSpan="4">
                              <div>
                                {currentClassification}
                                {showAnimalOnlyTag &&
                                  <span>&nbsp;{renderAnimalOnlyTag(provisional)}</span>
                                }
                                <br />
                                <span className="large">({moment(lastSavedDate).format("YYYY MMM DD, h:mm a")})</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {provisional && classificationStatus === 'In progress' ?
                      <div>
                        <p className="alert alert-info">
                          <i className="icon icon-info-circle"></i> Select "Edit Classification" to edit the Last Saved Classification or click "Evidence Summary" to view all evidence
                            associated with the saved Classification. If you don't wish to save, click "Record Curation page" to add more evidence.
                        </p>
                      </div>
                      : null}
                  </div>
                </CardPanel>
                {provisional && classificationStatus === 'In progress' ?
                  <div className='modal-footer'>
                    <button type="button" className="btn btn-default btn-inline-spacer" onClick={this.getCurationCentral}>Record Curation page <i className="icon icon-briefcase"></i></button>
                    <button type="button" className="btn btn-info btn-inline-spacer" onClick={this.editClassification}>Edit Classification <i className="icon icon-pencil"></i></button>
                    <button type="button" className="btn btn-primary btn-inline-spacer pull-right" onClick={this.viewEvidenceSummary}>Evidence Summary <i className="icon icon-file-text"></i></button>
                  </div>
                  : null}
              </div>
              {provisional && this.state.showProvisional ?
                <div className="provisional-approval-content-wrapper">
                  <div className="container">
                    <p className="alert alert-info">
                      <i className="icon icon-info-circle"></i> Save this Classification as Provisional if you are ready to send it for Review. Once saved as Provisional, the saved Provisional
                        Classification may not be edited, but it will always be viewable and can be saved as Approved if their are no further changes required. If changes need to be made, existing
                        evidence can be edited and/or new evidence added to the Gene:Disease Record at any time and a new current Provisional Classification made based on those changes. <em>Note: saving
                        a Classification does not prevent existing evidence from being edited or scored and archived Provisional Classifications are always viewable</em>.
                    </p>
                  </div>
                  <div className={classificationStatus === 'In progress' ? "container approval-process provisional-approval in-progress" : "container approval-process provisional-approval"}>
                    <CardPanel title="Save Classification as Provisional" panelClassName="panel-data" open>
                      <ProvisionalApproval
                        gdm={gdm}
                        annotations={annotations}
                        variantPathogenicity={variantPathogenicity}
                        classification={currentClassification}
                        classificationStatus={classificationStatus}
                        provisional={provisional}
                        updateSnapshotList={this.updateSnapshotList}
                        updateProvisionalObj={this.updateProvisionalObj}
                        postTrackData={this.postTrackData}
                        getContributors={this.getContributors}
                        setUNCData={this.setUNCData}
                      />
                    </CardPanel>
                  </div>
                </div>
                : null}
              {provisional && this.state.showApproval ?
                <div className="final-approval-content-wrapper">
                  <div className="container">
                    <p className="alert alert-info">
                      <i className="icon icon-info-circle"></i> Save the current (<i className="icon icon-flag"></i>) Provisional Classification as an Approved Classification
                        when ready to do so by using the form below, or return at a later date and use the "Approved this Saved Provisional" button. Alternatively, you continue
                        to edit/alter the existing evidence but you will need to create a new Provisional Classification for Approval.
                    </p>
                  </div>
                  <div className="container approval-process final-approval">
                    <CardPanel title="Approve Classification" panelClassName="panel-data" open>
                      <ClassificationApproval
                        gdm={gdm}
                        annotations={annotations}
                        variantPathogenicity={variantPathogenicity}
                        classification={currentClassification}
                        classificationStatus={classificationStatus}
                        provisional={provisional}
                        affiliation={affiliation}
                        updateSnapshotList={this.updateSnapshotList}
                        updateProvisionalObj={this.updateProvisionalObj}
                        postTrackData={this.postTrackData}
                        getContributors={this.getContributors}
                        setUNCData={this.setUNCData}
                        snapshots={sortedSnapshotList}
                      />
                    </CardPanel>
                  </div>
                </div>
                : null}
              {sortedSnapshotList.length && (this.state.showPublish || this.state.showUnpublish) ?
                <div className={'publish-approval-content-wrapper' + (this.state.showUnpublish ? ' unpublish' : '')}>
                  <div className="container">
                    {this.state.isPublishActive === 'auto' ?
                      <p className="alert alert-info">
                        <i className="icon icon-info-circle"></i> Publish the current (<i className="icon icon-flag"></i>) Approved Classification.
                      </p>
                      :
                      <p className="alert alert-info">
                        <i className="icon icon-info-circle"></i> {this.state.showUnpublish ? 'Unpublish' : 'Publish'} the selected Approved Classification.
                      </p>
                    }
                  </div>
                  <div className="container approval-process publish-approval">
                    <CardPanel title={this.state.showUnpublish ? 'Unpublish Classification' : 'Publish Classification'} panelClassName="panel-data" open>
                      <PublishApproval
                        gdm={gdm}
                        classification={currentClassification}
                        classificationStatus={classificationStatus}
                        provisional={provisional}
                        affiliation={affiliation}
                        snapshots={sortedSnapshotList}
                        selectedSnapshotUUID={snapshotUUID}
                        updateSnapshotList={this.updateSnapshotList}
                        updateProvisionalObj={this.updateProvisionalObj}
                        postTrackData={this.postTrackData}
                        getContributors={this.getContributors}
                        setUNCData={this.setUNCData}
                        clearPublishState={this.clearPublishState}
                      />
                    </CardPanel>
                  </div>
                </div>
                : null}
              {!this.state.showProvisional && !this.state.showApproval && (!allowPublishButton || !supportedSOP) ?
                <div className="container">
                  <p className="alert alert-info">
                    <i className="icon icon-info-circle"></i> The option to publish an approved classification is unavailable when any of the following
                      apply: 1) your affiliation does not have permission to publish in the GCI, 2) the mode of inheritance is not supported by the Clinical Validity
                      Classification framework, 3) the associated disease does not have a MONDO ID, 4) it is based on a previous version of the SOP.
                  </p>
                </div>
                : null}
              {sortedSnapshotList.length ?
                <div className="container snapshot-list">
                  <CardPanel title="Saved Provisional and Approved Classification(s)" panelClassName="panel-data" open>
                    <Snapshots
                      snapshots={sortedSnapshotList}
                      gdm={gdm}
                      approveProvisional={this.approveProvisional}
                      addPublishState={this.addPublishState}
                      isApprovalActive={isApprovalActive}
                      isPublishEventActive={isPublishActive || isUnpublishActive ? true : false}
                      classificationStatus={classificationStatus}
                      demoVersion={demoVersion}
                      allowPublishButton={allowPublishButton} />
                  </CardPanel>
                </div>
                : null}
            </div>
            :
            <p><br/><strong>&nbsp;&nbsp;No Classification to be displayed.</strong></p>
          )
        }
      </div>
    );
  }
}

const mapStateToProps = state => ({
  auth: state.auth,
  gdm: state.gdm.entity,
  annotations: state.annotations
});

// const mapDispatchToProps = dispatch => ({
//   setGdmAction: gdm => dispatch(setGdmAction(gdm)),
// })

// export default connect(mapStateToProps, mapDispatchToProps)(ProvisionalClassification);
export default connect(mapStateToProps)(ProvisionalClassification);
// export default ProvisionalClassification;
