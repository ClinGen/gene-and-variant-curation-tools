import React, { useState, useEffect } from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
import { formatDate, parseDate } from 'react-day-picker/moment';
import { isEmpty, isEqual, cloneDeep, get as lodashGet } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import Modal from '../../common/Modal';
import Input from "../../common/Input";
import { API } from 'aws-amplify';
import { API_NAME } from '../../../utils';
import { useAmplifyAPIRequestRecycler } from '../../../utilities/fetchUtilities';

export const ClinVarBatchModal = ({
    batch,
    isCurrent,
    updateBatch
}) => {
    const requestRecycler = useAmplifyAPIRequestRecycler();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBatch, setNewBatch] = useState(batch);
    const [confirmText, setConfirmText] = useState("");
    const [formErrors, setFormErrors] = useState({});
    const [loadingSave, setLoadingSave] = useState(false);
    const [saveError, setSaveError] = useState(null);

    useEffect(() => {
        setSaveError(null);
        setNewBatch(batch);
    }, [batch]);

    const onEditButtonClick = () => {
        setIsModalOpen(true);
    };

    const resetErrors = (fieldName) => {
        if (formErrors[fieldName]) {
            const errors = cloneDeep(formErrors);
            delete errors[fieldName];
            setFormErrors(errors);
        }
    }

    const handleChange = (e) => {
        if (e.target.name === "confirm") {
            setConfirmText(e.target.value);
        } else {
            const batchData = cloneDeep(newBatch);
            batchData[e.target.name] = e.target.value;
            if (e.target.name === "batch_status" && e.target.value === "open") {
                delete batchData["submit_date"];
            }
            setNewBatch(batchData);
        } 
        // Reset error
        resetErrors(e.target.name);
    };
    
    const handleDateChange = (newDate) => {
        const batchData = cloneDeep(newBatch);
        batchData["submit_date"] = newDate;
        setNewBatch(batchData);
        // Reset error
        resetErrors("submit_date");
    };

    const resetFormValues = () => {
        // Do this to reset form values
        setNewBatch(batch);
        setConfirmText("");
        setFormErrors({});
        setSaveError(null);
        setLoadingSave(false);
        setIsModalOpen(false);
    }

    const validateFormFields = () => {
        const errors = {};

        // Check all required fields have value
        // Check batch name has value
        if (!newBatch["batch_name"].trim()) {
            errors["batch_name"] = "A batch name is required";
        }

        // If current batch and status is set to "Submitted to ClinVar", check if date and confirm field is done
        if (isCurrent && newBatch["batch_status"] === "closed") {
            if (confirmText.trim().toLowerCase() !== "confirm") { // Don't worry about case or leading/trailing whitespace.
                errors["confirm"] = 'Type "Confirm" to set batch status to Submitted to ClinVar';
            }
        }

        if (!isEmpty(errors)) {
            setFormErrors(errors);
            return false;
        } else {
            return true;
        }
    }

    const handleSave = async () => {
        // Validate form
        if (validateFormFields()) {
            // check if data has been modified
            if (!isEqual(batch, newBatch)) {
                setLoadingSave(true);
                // update batch data
                const saveBatch = {
                    batch_name: newBatch.batch_name,
                    batch_status: newBatch.batch_status,
                    submit_date: newBatch.submit_date
                };
                const url = `/clinvar-submission-batch/update/${lodashGet(batch, "PK")}`
                const params = {body: {saveBatch}};
                try {
                    const newBatch = await requestRecycler.capture(API.put(API_NAME, url, params));
                    if (newBatch) {
                        // Batch is updated successfully, update display batch data
                        resetFormValues();
                        updateBatch(newBatch);
                    } else {
                        throw new Error("Server responded null");
                    }
                } catch (error) {
                    if (API.isCancel(error)) {
                        return;
                    }
                    setSaveError("Unable to save the batch - " + error.message);
                    console.log(`Error updating ClinVar batch ${error} `);
                    setLoadingSave(false);
                    return;
                }
            } else {
                setIsModalOpen(false);
            }
        }
    }

    /**
     * Cancel button is clicked.  Close modal and reset form data.
    */
    const handleCancel = ()  => {
        resetFormValues();
    };

    const batchName = lodashGet(batch, "name") || '';
    const title = isCurrent ? `Edit current batch named "${batchName}"`
                  : `Edit closed batch named "${batchName}"`
    const isSubmitStatus = lodashGet(newBatch, "batch_status") === "closed";
    const dayPickerClass = isSubmitStatus ? {className:"form-control"}
                           : {className:"form-control", disabled:true};
    const disableEdit = lodashGet(batch, "PK") === "none" ? true : false;

    return (
        <>
        <Modal
            show={isModalOpen}
            size="lg"
            title={title}
            className="batch-modal"
            onHide={handleCancel}
            hideButtonText="Cancel"
            onSave={handleSave}
            isLoadingSave={loadingSave}
            saveError={saveError}
        >
            <Row className="justify-content-md-center mb-3">
                <Col xs={3} className="text-right">
                    <strong>Name:*</strong>
                </Col>
                <Col xs={7}>
                    <Input
                        className="form-control"
                        name="batch_name"
                        type="text"
                        value={lodashGet(newBatch, "batch_name")}
                        onChange={handleChange}
                        error={formErrors['batch_name'] || null}
                    />
                </Col>
            </Row>
            {isCurrent ?
                <Row className="justify-content-md-center mb-3">
                    <Col xs={3} className="text-right">
                        <strong>Status:</strong>
                    </Col>
                    <Col xs={7}>
                        <select
                            className="form-control"
                            name="batch_status"
                            placeholder="Select"
                            value={lodashGet(newBatch, "batch_status")}
                            onChange={handleChange}
                        >
                            <option value="">Select</option>
                            <option disabled></option>
                            <option value="open">In Progress</option>
                            <option value="closed">Submitted to ClinVar</option>
                        </select>
                    </Col>
                </Row>
            :
                <Row className="justify-content-md-center mb-3">
                    <Col xs={3} className="text-right">
                        <strong>Status:</strong>
                    </Col>
                    <Col xs={7}>
                        Submitted to ClinVar
                    </Col>
                </Row>
            }
            <Row className="justify-content-md-center mb-3">
                <Col xs={3} className="text-right">
                    <strong>Date Submitted:</strong>
                </Col>
                <Col xs={7}>
                    <DayPickerInput
                        value={lodashGet(newBatch, "submit_date")}
                        onDayChange={handleDateChange}
                        formatDate={formatDate}
                        inputProps={dayPickerClass}
                        parseDate={parseDate}
                        placeholder={"N/A"}
                        dayPickerProps={{
                            selectedDays: lodashGet(newBatch, "submit_date") ? parseDate(lodashGet(newBatch, "submit_date")) : undefined
                        }}
                    />
                </Col>
            </Row>
            {formErrors["submit_date"] &&
                <Row className="justify-content-md-center mb-3">
                    <Col xs={3}></Col>
                    <Col xs={7} style={{ color: 'red', fontSize: 12 }}>{formErrors["submit_date"]}</Col>
                </Row>
            }
            {isSubmitStatus && isCurrent &&
                <Row className="justify-content-md-center mx-3 mb-3">
                    <Col>
                        <h1 className="text-center text-white bg-danger">WARNING</h1>
	                <ul className="ml-3 pl-1">
                            <li>Setting a batch to “Submitted to ClinVar” will close this in progress batch and start a new batch. This action cannot be undone.</li>
                            <li>The VCI does NOT currently support direct ClinVar submission.  The submission batch process is for tracking purposes only.</li>
                            <li>To submit variants to ClinVar, download the ClinVar submission file and submit directly through the ClinVar submission portal.</li>
                            <li>For more information on ClinVar submission contact variantcuration@clinicalgenome.org.</li>
                        </ul>
                        <p>
	                    <span className="font-weight-bold">
                            Please type "Confirm" in textbox below to acknowledge.  After you click Save this will set the status for this batch to "Submitted to ClinVar".
                            </span>
                        </p>
                        <Input
                            className="form-control"
                            name="confirm"
                            type="text"
                            onChange={handleChange}
                            value={confirmText}
                            error={formErrors['confirm'] || null}
                        />
                    </Col>
                </Row>
            }
        </Modal>

        <Button className="link-button" disabled={disableEdit} variant="link" onClick={onEditButtonClick}>
            <FontAwesomeIcon icon={faEdit} />Edit
        </Button>
        </>
    );
};
