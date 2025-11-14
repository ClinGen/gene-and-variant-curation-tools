import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Form, Row, Col } from 'react-bootstrap';
import { get as lodashGet } from 'lodash';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTimes } from '@fortawesome/free-solid-svg-icons';
import MDEditor, { commands } from '@uiw/react-md-editor';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
import { parseDate, formatDate } from 'react-day-picker/moment';
import moment from 'moment';
import { getUserName } from '../../helpers/getUserName';
import Alert from './Alert';
import Modal from './Modal';
import Select from 'react-select';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../utils';
import { AffilsContext, getAllAffiliations, getAffiliationSubgroups } from '../../helpers/affiliationsHelpers';
import { getGDMContributors, getGeneEvidenceData, getPerformedByUserData, postTrackData } from '../../helpers/getGdmMsgData';

const EditPublishSnapshotModal = ({
  id,
  show,
  title,
  onHide,
  publishedSnapshot,
  gdm,
  snapshots,
  handleUpdateSnapshots,
  updateProvisionalObj,
}) => {
  const auth = useSelector((state) => state.auth);
  const [editingSummary, setEditingSummary] = useState(false);
  const [approvalReviewDate, setApprovalReviewDate] = useState(null);
  const [summaryText, setSummaryText] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [snapshotCopy, setSnapshotCopy] = useState(null);
  const [affiliationsList, setAffiliationsList] = useState([]);
  const [selectedAffiliations, setSelectedAffiliations] = useState([]);
  const [approversList, setApproversList] = useState([]);
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [showAlertMessage, setShowAlertMessage] = useState(false);
  const [alertType, setAlertType] = useState(null);
  const [alertClass, setAlertClass] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [submitBusy, setSubmitBusy] = useState(false); // Flag to indicate that the submit button is in a 'busy' state
  const newPublishDate = new Date().toISOString();
  const { affiliationsData } = useContext(AffilsContext);

  useEffect(() => {
    if (publishedSnapshot) {
      const snapshotClone = { ...publishedSnapshot, resource: { ...publishedSnapshot.resource } };
      setSnapshotCopy(snapshotClone);
      setSummaryText(snapshotClone.resource.evidenceSummary || '');
      setApprovalReviewDate(snapshotClone.resource.approvalReviewDate ? moment(snapshotClone.resource.approvalReviewDate).format('MM/DD/YYYY') : null);
      // Reset the checkbox state when the modal is shown/hidden
      setIsConfirmed(false);
      // Parse affiliations list
      const affiliations = getAllAffiliations(affiliationsData);
      if (affiliations) {
        const parsedAffiliations = affiliations.map(affiliation => ({
          value: affiliation.id,
          label: `${affiliation.fullName} (${affiliation.id})`
        }));
        parsedAffiliations.sort((first, second) => first.label.localeCompare(second.label));
        setAffiliationsList(parsedAffiliations);

        const classificationContributors = lodashGet(snapshotClone, "resource.classificationContributors", []);

        // Set selected affiliations
        const selectedAffiliations = classificationContributors.map(contributorId => {
          const affiliation = parsedAffiliations.find(a => a.value === contributorId);
          return affiliation || null;
        }).filter(Boolean);
        setSelectedAffiliations(selectedAffiliations);
      }

      // Parse approvers list
      const approvers = getAffiliationSubgroups(affiliationsData);
      if (approvers) {
        const parsedApprovers = [];
        approvers.forEach(approver => {
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
        // Add "None" option
        parsedApprovers.unshift({ value: "None", label: "None" });
        setApproversList(parsedApprovers);

        // Set selected approver
        const approver = parsedApprovers.find(a => a.value === snapshotClone.resource.additionalApprover);
        setSelectedApprover(approver || "");
      }
    }
  }, [publishedSnapshot, snapshots, show]);

  /**
   * Format date for display in the form
   * 'LL' format for Locale, e.g., 'July 20, 2024'
   * @param {string} dateString 
   */
  const formatDateDisplay = (dateString) => {
    return moment(dateString).format('LL');
  };

  /**
   * Method to get the list of user who has made contribution to current provisional classification.
   * But skip the publish user in the snapshot with given snapshot id.
   * @param {string} publishSnapshotId - snapshot id
   */
  const getContributors = (publishSnapshotId = null) => {
    let contributors = [];

    if (gdm && snapshots) {
      // Get the list of GDM contributors
      contributors = getGDMContributors(gdm, snapshots, publishSnapshotId, affiliationsData);
    }

    return contributors;
  }

  /**
   * Handler for Secondary Contributors input
   * @param {Object[]} selectedOptions
   * @param {string} selectedOptions[].value - The affiliation ID
   * @param {string} selectionOptions[].label - The affiliation name + (ID) for display
   */
  const handleAffiliationsChange = (selectedOptions) => {
    setSelectedAffiliations(selectedOptions);
  };

  /**
   * Handler for Secondary Approver input
   * @param {Object} selectedOption
   * @param {string} selectedOption.value - The expert panel ID (VCEP or GCEP)
   * @param {string} selectionOption.label - The expert panel name for display
   */
  const handleApproverChange = (selectedOption) => {
    setSelectedApprover(selectedOption);
  };

  /**
   * Handler for Approval Review Date input
   * @param {string} date
   */
  const handleApprovalReviewDateChange = (date) => {
    const today = moment().startOf('day');
    const selectedDate = moment(date).startOf('day'); // Only the date is compared, not the time
    if (selectedDate.isAfter(today)) {
      // Date is in the future, show an alert
      showAlert('danger', 'date-error', 'Approval Review Date cannot be in the future.');
      setShowAlertMessage(true);
    } else {
      setShowAlertMessage(false);
    }

    setApprovalReviewDate(date);
  };

  const hasChanges = () => {
    if (!snapshotCopy || !snapshotCopy.resource) return false;

    const contributorsMatch =
      selectedAffiliations && selectedAffiliations.length === (snapshotCopy.resource.classificationContributors || []).length &&
      selectedAffiliations.map(a => a.value).every(id => (snapshotCopy.resource.classificationContributors || []).includes(id));
  
    return (
      summaryText !== snapshotCopy.resource.evidenceSummary ||
      approvalReviewDate !== (snapshotCopy.resource.approvalReviewDate ? moment(snapshotCopy.resource.approvalReviewDate).format('MM/DD/YYYY') : null) ||
      !contributorsMatch ||
      (selectedApprover && selectedApprover.value) !== snapshotCopy.resource.additionalApprover
    );
  };

  /**
   * Method to create necessary data object that needs to be sent to Data Exchange for UNC tracking
   * @param {object} provisional - provisional classification object
   * @param {string} status - current classification status
   * @param {string} statusDate - date that current classification status was reviewed/approved
   * @param {string} date - datetime current action performed
   * @param {object} submitter - current classification action submitter
   * @param {array} contributors - classification contributor list
   */
  const setUNCData = (provisional, status, statusDate, date, submitter, contributors) => {
    let uncData = {};

    if (lodashGet(gdm, "PK", null)) {
      uncData = {
        report_id: gdm.PK,
        iri: provisional.PK,
        gene_validity_evidence_level: getGeneEvidenceData(gdm, provisional),
        date: moment(date).toISOString(),
        status: {
          name: status,
          date: moment(statusDate).toISOString()
        },
        performed_by: getPerformedByUserData(submitter),
        contributors: contributors
      }
    }

    return uncData;
  }

  /**
   * Handle save and republish logic for modal form
   * updates provisional classification and snapshot, send to data exchange
   */
  const handleSave = async () => {
    setSubmitBusy(true);
    if (snapshotCopy?.resourceType === 'classification') {
      try {
        const selectedProvisional = { ...snapshotCopy.resource };
        const currentProvisional = gdm && gdm.provisionalClassifications ? gdm.provisionalClassifications[0] : null;
        const isSelectedProvisionalCurrent = currentProvisional &&
          selectedProvisional.provisionalDate === currentProvisional.provisionalDate &&
          selectedProvisional.provisionalSubmitter === currentProvisional.provisionalSubmitter &&
          selectedProvisional.approvalDate === currentProvisional.approvalDate &&
          selectedProvisional.approvalSubmitter === currentProvisional.approvalSubmitter &&
          selectedProvisional.affiliation === currentProvisional.affiliation;

        selectedProvisional.curationReasons = ['Administrative Update Error Clarification'];
        selectedProvisional.evidenceSummary = summaryText;
        selectedProvisional.approvalReviewDate = approvalReviewDate ? moment(approvalReviewDate).toISOString() : null;
        selectedProvisional.publishComment = "Edited and republished";
        selectedProvisional.publishDate = new Date().toISOString();
        selectedProvisional.classificationContributors = selectedAffiliations ? selectedAffiliations.map(aff => aff.value) : [];
        selectedProvisional.additionalApprover = selectedApprover ? selectedApprover.value : null;
        selectedProvisional.isRepublish = true;

        const updatedSnapshot = {
          ...snapshotCopy,
          resource: selectedProvisional
        };
        // Save republish data to snapshot and send to data exchange, add edit history after (on success)
        const savedSnapshot = await saveUpdatedSnapshot(updatedSnapshot);
        const publishedResult = await publishToDataExchange(savedSnapshot.item_type, savedSnapshot.PK);
        if (publishedResult.status === 'Success') {
          console.log('GDM snapshot published successfully:', publishedResult);
          if (currentProvisional && isSelectedProvisionalCurrent) {
            // Capture the current state before the edit
            const previousState = {
              approvalReviewDate: snapshotCopy.resource.approvalReviewDate,
              evidenceSummary: snapshotCopy.resource.evidenceSummary,
              publishDate: snapshotCopy.resource.publishDate,
              classificationContributors: snapshotCopy.resource.classificationContributors,
              additionalApprover: snapshotCopy.resource.additionalApprover ? snapshotCopy.resource.additionalApprover : "",
            };
            // Add the editHistory array to track changes
            currentProvisional.publishEditHistory = currentProvisional.publishEditHistory || [];
            currentProvisional.publishEditHistory.push({
              timestamp: new Date().toISOString(),
              editor: getUserName(auth),
              changes: {
                before: previousState,
                after: {
                  approvalReviewDate: selectedProvisional.approvalReviewDate,
                  evidenceSummary: selectedProvisional.evidenceSummary,
                  publishDate: selectedProvisional.publishDate,
                  classificationContributors: selectedProvisional.classificationContributors,
                  additionalApprover: selectedProvisional.additionalApprover,
                }
              }
            });

            const url = '/provisional-classifications/' + currentProvisional.PK;
            const params = { body: { selectedProvisional } };
    
            // Send updated current provisional object to the DB and Data Exchange
            const responseProvisional = await API.put(API_NAME, url, params);
            await sendToDataExchange(responseProvisional, responseProvisional.PK);
            updateProvisionalObj(responseProvisional);
          }

          const previousState = {
            approvalReviewDate: snapshotCopy.resource.approvalReviewDate,
            evidenceSummary: snapshotCopy.resource.evidenceSummary,
            publishDate: snapshotCopy.resource.publishDate,
            classificationContributors: snapshotCopy.resource.classificationContributors,
            additionalApprover: snapshotCopy.resource.additionalApprover ? snapshotCopy.resource.additionalApprover : "",
          };
          // Add the editHistory array to track changes
          selectedProvisional.publishEditHistory = selectedProvisional.publishEditHistory || [];
          selectedProvisional.publishEditHistory.push({
            timestamp: new Date().toISOString(),
            editor: getUserName(auth),
            changes: {
              before: previousState,
              after: {
                approvalReviewDate: selectedProvisional.approvalReviewDate,
                evidenceSummary: selectedProvisional.evidenceSummary,
                publishDate: selectedProvisional.publishDate,
                classificationContributors: selectedProvisional.classificationContributors,
                additionalApprover: selectedProvisional.additionalApprover,
              }
            }
          });

          // Save snapshot again with successful response provisional, now contains edit history
          const republishSnapshot = {
            ...savedSnapshot,
            resource: selectedProvisional
          }

          const saveRepublishSnapshot = await saveUpdatedSnapshot(republishSnapshot);
          console.log("Publish GDM to data exchange", saveRepublishSnapshot)
          handleUpdateSnapshots(saveRepublishSnapshot);
          await publishGDMToDataExchange(saveRepublishSnapshot);

          setSubmitBusy(false);
          onHide(); // Hide modal and clear publish state
        } else {
          console.log('Failed to save initial republish snapshot and publish to data exchange:', publishedResult);
          showAlert('danger', 'publish-error', 'An error occurred while saving and republishing. Please try again.');
        }
      } catch (error) {
        setSubmitBusy(false);
        console.error('Error publishing GDM:', error);
        showAlert('danger', 'publish-error', 'An error occurred while saving and republishing. Please try again.');
      }
    }
  };

  /**
   * Method to hide error alert
   */
  const hideAlert = () => {
    setShowAlertMessage(false);
  }

  /**
   * Method to show error alert
   * @param {string} alertType - The type of alert (added to class)
   * @param {string} alertClass - Custom classes for the alert
   * @param {object} alertMsg - The alert message
   */
  const showAlert = (alertType, alertClass, alertMsg) => {
    setAlertType(alertType);
    setAlertClass(alertClass);
    setAlertMessage(alertMsg);
    setShowAlertMessage(true);
    setTimeout(hideAlert, 10000);
  }

  /**
   * Update snapshot in DB
   * @param {Object} updatedSnapshot 
   */
  const saveUpdatedSnapshot = async (updatedSnapshot) => {
    const params = { body: { updatedSnapshot } };
    const url = `/snapshots/${updatedSnapshot.PK}?type=gdm`;
    const updatedSelectedSnapshot = await API.put(API_NAME, url, params);
    return updatedSelectedSnapshot;
  };

  /**
 * Method to publish data to the Data Exchange
 * @param {string} objType - The type of the data's source object (e.g. snapshot)
 * @param {string} objUUID - The UUID of the data's source object
 */
  const publishToDataExchange = (objType, objUUID) => {
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
            setSubmitBusy(false);
            showAlert(alertType, alertClass, alertMsg);
            reject(result);
          }
        }).catch(error => {
          console.log('Internal data retrieval error: %o', error);
          setSubmitBusy(false);
          showAlert(alertType, alertClass, alertMsg);
          reject(error);
        });
      } else {
        setSubmitBusy(false);
        showAlert(alertType, alertClass, alertMsg);
        reject(null);
      }
    });
  }

  /**
   * Sends GDM to Data Exchange - gene validity
   * @param {Object} snapshot 
   */
  const publishGDMToDataExchange = async (snapshot) => {
    if (snapshot && snapshot.resource && snapshot.resourceParent) {
      // If gdm object is in snapshot.resourceParent, delete it
      // going to be added in messaging controller
      if (snapshot.resourceParent.gdm) {
        delete snapshot.resourceParent['gdm'];
      }
      const params = { body: { snapshot } };
      const result = await API.post(API_NAME, '/messaging/publish-gdm', params);
      if (result.status === 'Success') {
        console.log('Post full gdm succeeded:', result);
        return result;
      } else {
        console.log('Post full gdm failed:', result);
        throw new Error(result.message);
      }
    } else {
      console.log('Post full gdm Error: Missing expected data');
      throw new Error('Missing expected data');
    }
  };

  /**
   * Send provisional and snapshot information to Data Exchange
   * @param {Object} provisional - Provisonal Classification
   * @param {string} publishSnapshotId
   */
  const sendToDataExchange = async (provisional, publishSnapshotId) => {
    const publishSubmitter = auth;
    const status = 'published';
    const publishRole = ['publisher'];
    try {
      const contributors = getContributors(publishSnapshotId);
      // Add this provisional publisher to contributors list
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
      let uncData = setUNCData(provisional, status, publishDate, publishDate, publishSubmitter, contributors);

      // Post published data to Data Exchange
      postTrackData(uncData).then(() => {
        console.log('Successfully sent %s data to Data Exchange for provisional %s at %s', status, provisional.PK, moment(publishDate).toISOString());
      }).catch(error => {
        console.log('Error sending %s data to Data Exchange for provisional %s at %s - Error: %o', status, provisional.PK, moment(publishDate).toISOString(), error);
      });
    } catch (error) {
      console.error('sendToDataExchange error', error);
    }
  };

  /**
   * Toggle edit/view state for Evidence Summary in modal
   */
  const toggleEditSummary = () => {
    setEditingSummary(!editingSummary);
  };

  // Adds custom "close" button for MDEditor to toggle edit/view
  const closeButtonCommand = {
    name: "close",
    keyCommand: "close",
    buttonProps: {
      "aria-label": "Close editor",
      style: {
        position: 'absolute',
        right: '36px',
        top: '4px',
      },
    },
    icon: <FontAwesomeIcon icon={faTimes} />,
    execute: () => toggleEditSummary(),
  };

  return (
    <Modal
      id={id}
      show={show}
      size="lg"
      title={title}
      onHide={onHide}
      onSave={handleSave}
      isLoadingSave={submitBusy}
      saveButtonDisabled={!isConfirmed || showAlertMessage || submitBusy}
      saveButtonText={"Save and Republish"}
      className="edit-publish-snapshot-modal"
    >
      <Form>
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group controlId="approvalReviewDate">
              <Form.Label className="font-weight-bold">Approval Review Date</Form.Label>
              <DayPickerInput
                value={approvalReviewDate}
                onDayChange={handleApprovalReviewDateChange}
                formatDate={formatDate}
                parseDate={parseDate}
                inputProps={{ className: "form-control" }}
                placeholder={`${formatDate(new Date())}`}
                dayPickerProps={{
                  selectedDays: approvalReviewDate,
                  disabledDays: { after: new Date() }
                }}
                style={{ display: "block" }}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="publishDate">
              <Form.Label className="font-weight-bold">Date Initially Published</Form.Label>
              <Form.Control type="text" readOnly value={formatDateDisplay(snapshotCopy?.resource?.publishDate) || 'N/A'} />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="newPublishDate">
              <Form.Label className="font-weight-bold">New Publish Date</Form.Label>
              <Form.Control type="text" readOnly value={formatDateDisplay(newPublishDate)} />
            </Form.Group>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group controlId="publishSubmitter">
              <Form.Label className="font-weight-bold">Publish Submitter</Form.Label>
              <Form.Control type="text" readOnly value={snapshotCopy?.resource?.publishSubmitter || 'N/A'} />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="curationReasons">
              <Form.Label className="font-weight-bold">Curation Reasons</Form.Label>
              <Form.Control type="text" readOnly value="Administrative Update Error Clarification" />
            </Form.Group>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group controlId="secondaryContributor">
              <Form.Label className="font-weight-bold">Secondary Contributor(s)</Form.Label>
              <Select
                isMulti
                placeholder="Select Affiliation(s)"
                value={selectedAffiliations}
                onChange={handleAffiliationsChange}
                options={affiliationsList}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="additionalApprover">
              <Form.Label className="font-weight-bold">Secondary Approver</Form.Label>
              <Select
                placeholder="Select Approver"
                value={selectedApprover}
                onChange={handleApproverChange}
                options={approversList}
              />
            </Form.Group>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col md={12}>
            <Form.Group controlId="evidenceSummary">
              <Form.Label className="font-weight-bold">Evidence Summary</Form.Label>
              {editingSummary ? (
                <MDEditor
                  value={summaryText}
                  onChange={setSummaryText}
                  height={200}
                  commands={[
                    ...commands.getCommands(), // Include default tools in MD header
                    closeButtonCommand,
                  ]}
                />
              ) : (
                <div onClick={toggleEditSummary} style={{ cursor: 'pointer' }}>
                  <MDEditor.Markdown source={summaryText || 'No summary available'} />
                  <FontAwesomeIcon icon={faEdit} />
                </div>
              )}
            </Form.Group>
          </Col>
        </Row>
        <Form.Group controlId="confirmationCheckbox">
          <Form.Check
            type="checkbox"
            label={<strong>Check this box to confirm the information above is correct. By clicking "Save and Republish", the published record will be updated and sent to the ClinGen website.</strong>}
            checked={isConfirmed}
            onChange={(e) => {
                if (!hasChanges()) {
                  showAlert('warning', 'no-changes', 'You need to make an edit before republishing.')
                } else {
                  setIsConfirmed(e.target.checked)
                }
              }
            }
          />
        </Form.Group>
        {showAlertMessage && (
          <Alert type={alertType}
            value={alertMessage}
            className={alertClass}
            dismissible
          />
        )}
      </Form>
    </Modal>
  );
};

EditPublishSnapshotModal.propTypes = {
  id: PropTypes.string,
  show: PropTypes.bool.isRequired,
  title: PropTypes.string,
  onHide: PropTypes.func.isRequired,
  publishedSnapshot: PropTypes.object,
  gdm: PropTypes.object,
  snapshots: PropTypes.array,
  handleUpdateSnapshots: PropTypes.func,
  updateProvisionalObj: PropTypes.func,
};

export default EditPublishSnapshotModal;
