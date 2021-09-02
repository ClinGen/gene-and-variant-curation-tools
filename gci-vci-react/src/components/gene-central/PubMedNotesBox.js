import React, { useReducer, useEffect, useState } from "react";
import PropTypes from "prop-types";
import lodashCloneDeep from "lodash/cloneDeep";
import lodashGet from "lodash/get";

import { Form, Col, Button, Card } from "react-bootstrap";
import { useFormik } from "formik";
import { LoadingButton } from "../common/LoadingButton";
import Alert from "../common/Alert";
import {
  useAmplifyAPIRequestRecycler,
  getDetailErrorMessageFromServerless,
} from "../../utilities/fetchUtilities";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { API_NAME } from "../../utils";
import { useSelector, useDispatch } from "react-redux";
import { updateAnnotationAction } from "../../actions/annotationActions";
import { setGdmAction } from "../../actions/gdmActions";
import { Prompt } from "react-router-dom";
import { isOwnedByCurrentCuratingEntity } from "../../utilities/ownershipUtilities";


export const PubMedNotesBox = ({
  activeAnnotation,
  ...props
}) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const [
    { isEditingNotes, successMessage, failureMessage },
    dispatchPubMedNotesBoxState,
  ] = useReducer(
    pubMedNotesBoxReducer,
    pubMedNotesBoxInitialState(activeAnnotation.articleNotes)
  );

  const dispatch = useDispatch();

  const auth = useSelector((state) => state.auth);

  const gdm = useSelector(state => state.gdm.entity);

  const allowEdit = isOwnedByCurrentCuratingEntity(gdm, auth);

  const selectedEarliestPubList = lodashGet(gdm, "earliestPublications", null) ? gdm.earliestPublications : [];
  const initialEarliestChecked = selectedEarliestPubList.some((pub) => {
    if (lodashGet(activeAnnotation, "PK", null) === pub) {
      return true;
    }
    return false;
  });

  const [ earliestChecked, setEarliestChecked ] = useState(false);
  const [ earliestError, setEarliestError ] = useState(null);
  
  const updateAnnotation = async (articleNotes) => {
    const updateAnnotation = {
      ...activeAnnotation,
      articleNotes,
      modified_by: lodashGet(auth, "PK", null)
    };

    try {
      return await requestRecycler.capture(
        API.put(API_NAME, `/annotations/${activeAnnotation.PK}`, {
          body: { updateAnnotation },
        })
      );
    } catch (error) {
      if (API.isCancel(error)) {
        throw error;
      }
      throw new Error(
        getDetailErrorMessageFromServerless("Notes could not be saved", error)
      );
    }
  };

  const onFormEdit = () => {
    dispatchPubMedNotesBoxState(editModePubMedNotesBoxAction());
    setEarliestError(null);
  }

  const onFormCancel = () => {
    // Reset all form values
    setEarliestError(null);
    setEarliestChecked(initialEarliestChecked);
    dispatchPubMedNotesBoxState(readModePubMedNotesBoxAction());
    resetFormikForm();
    requestRecycler.cancelAll();
  }

  const onSubmit = async (values, { setSubmitting }) => {
    setEarliestError(null);

    saveEarliestPublication().then(result => {
      saveArticleNote(values).then(savedNote => {
        setSubmitting(false);
        return;
      }).catch(error => {
        if (!API.isCancel(error)) {
          dispatchPubMedNotesBoxState(
            savefailurePubMedNotesBoxAction(error.message)
          );
        }
        setSubmitting(false);
        return;
      })
    }).catch(error => {
      if (!API.isCancel(error)) {
        getDetailErrorMessageFromServerless("earliestPublications could not be saved", error)
        // set error
        const serverDetailMessage = lodashGet(error, 'response.data.error', 'Failed to save earliest publication to this GDM.');
        setEarliestError(serverDetailMessage);
      }
      setSubmitting(false);
      return;
    })
  }

  const saveArticleNote = async (values) => {
    // dynamoDB does not allow empty string so have to strip off textarea field(s) if empty
    const updateArticleNote = lodashCloneDeep(values);
    if (!updateArticleNote.nonscorable.text) {
      delete updateArticleNote.nonscorable.text;
    }
    if (!updateArticleNote.other.text) {
      delete updateArticleNote.other.text;
    }

    let putAnnotationResult;
    try {
      putAnnotationResult = await updateAnnotation(updateArticleNote);
    } catch (error) {
      throw error;
    }

    dispatchPubMedNotesBoxState(
      saveSuccessPubMedNotesBoxAction("Notes saved successfully!")
    );

    dispatch(updateAnnotationAction(putAnnotationResult));
  }

  const saveEarliestPublication = async () => {
    // Update earliestPublications on gdm if current earlist article selection has been changed
    if (earliestChecked !== initialEarliestChecked) {
      let updateGdm = null;
      // Add current article to earlist publication list
      if (earliestChecked) {
        updateGdm = {
          ...gdm,
          earliestPublications: [...(gdm.earliestPublications || []), activeAnnotation.PK],
        };
      } else {
        // Remove current article from  earliest publication list
        updateGdm = {
          ...gdm,
          earliestPublications: (gdm.earliestPublications || []).filter((i) => (i !== activeAnnotation.PK)),
        };
      }
      updateGdm.modified_by = lodashGet(auth, "PK", null);

      requestRecycler.capture(API.put(API_NAME, `/gdms/${gdm.PK}`, { body: { updateGdm } }))
        .then((gdmResult) => {
          dispatch(setGdmAction(gdmResult));
        }).catch((error) => {
          throw error;
        });
    } else {
      return;
    }
  };

  // bring in formik suite
  const formik = useFormik({
    initialValues:
      activeAnnotation.articleNotes
        ? activeAnnotation.articleNotes
        : defaultArticleNotes,
    onSubmit,
    enableReinitialize: true,
  });
  const { resetForm: resetFormikForm } = formik;

  // reset form when switching to a different annotation in UI
  useEffect(() => {
    // reset component states
    dispatchPubMedNotesBoxState(
      resetPubMedNotesBoxAction(activeAnnotation.articleNotes)
    );

    // reset form values and clear error message
    setEarliestError(null);
    setEarliestChecked(initialEarliestChecked);
    resetFormikForm();
  }, [activeAnnotation.PK, activeAnnotation.articleNotes, resetFormikForm, initialEarliestChecked]);

  // Handle when the earliest publication is checked/unchecked
  const  handleEarliestChange = (e) => {
    setEarliestError(null);
    setEarliestChecked(!earliestChecked);
  };

  return (
    <Card border="primary" {...props}>
      <Card.Body>
        <Prompt
          when={formik.dirty}
          message={`You have unsaved article notes for PMID:${activeAnnotation.article.PK}, are you sure you want to switch to another article? Your unsaved changes will be lost.`}
        />
        <Form onSubmit={formik.handleSubmit}>
          <Form.Group controlId="pubMedNotesBox.nonscorable">
            <Form.Row>
              <Col md="3">
                <Form.Label>
                  <strong>Non-scorable evidence</strong>
                </Form.Label>
              </Col>
              <Col md="1">
                {allowEdit && isEditingNotes ? (
                  <Form.Check
                    type="checkbox"
                    name="nonscorable.checked"
                    checked={formik.values.nonscorable.checked}
                    onChange={formik.handleChange}
                  />
                ) : (
                  formik.values.nonscorable.checked && (
                    <i className="icon icon-check" />
                  )
                )}
              </Col>
              <Col>
                {allowEdit && isEditingNotes ? (
                  <Form.Control
                    as="textarea"
                    rows="3"
                    name="nonscorable.text"
                    value={formik.values.nonscorable.text}
                    onChange={formik.handleChange}
                  />
                ) : formik.values.nonscorable.text ? (
                  formik.values.nonscorable.text
                ) : (
                  <span className="text-muted">
                    <i>(None)</i>
                  </span>
                )}
              </Col>
            </Form.Row>
          </Form.Group>
          <Form.Group controlId="pubMedNotesBox.other">
            <Form.Row>
              <Col md="3">
                <Form.Label>
                  <strong>Other comments on PMID</strong>
                </Form.Label>
              </Col>
              <Col md="1">
                {allowEdit && isEditingNotes ? (
                  <Form.Check
                    type="checkbox"
                    name="other.checked"
                    checked={formik.values.other.checked}
                    onChange={formik.handleChange}
                  />
                ) : (
                  formik.values.other.checked && (
                    <i className="icon icon-check" />
                  )
                )}
              </Col>
              <Col>
                {allowEdit && isEditingNotes ? (
                  <Form.Control
                    as="textarea"
                    rows="3"
                    name="other.text"
                    value={formik.values.other.text}
                    onChange={formik.handleChange}
                  />
                ) : formik.values.other.text ? (
                  formik.values.other.text
                ) : (
                  <span className="text-muted">
                    <i>(None)</i>
                  </span>
                )}
              </Col>
            </Form.Row>
          </Form.Group>
          <Form.Group controlId="pubMedNotesBox.earliest">
            <Form.Row>
              <Col md="1">
                {allowEdit && isEditingNotes ? (
                  <Form.Check
                    type="checkbox"
                    name="earliest-checked"
                    checked={earliestChecked}
                    onChange={handleEarliestChange}
                  />
                ) : (
                  earliestChecked ?
                    <i className="icon icon-check" />
                  : (
                    <span className="text-muted">
                      <i>(No)</i>
                    </span>
                  )
                )}
              </Col>
              <Col md="11">
                <Form.Label>
                  <strong>This is earliest report of a variant in the gene causing the disease of interest in a human</strong>
                </Form.Label>
              </Col>
            </Form.Row>
            {earliestError && (
              <Form.Row>
                <Col md="auto">
                  <Alert value={earliestError} className="mt-3"/>
                </Col>
              </Form.Row>
            )}
          </Form.Group>
          {allowEdit ? (
            <Form.Row className="justify-content-end">
              {successMessage && (
                <Col md="auto">
                  <Alert type="success">{successMessage}</Alert>
                </Col>
              )}
              {failureMessage && (
                <Col md="auto">
                  <Alert>{failureMessage}</Alert>
                </Col>
              )}
              <Col md="auto">
                {isEditingNotes ? (
                  <>
                    <LoadingButton
                      type="submit"
                      className="float-right"
                      textWhenLoading="Saving"
                      isLoading={formik.isSubmitting}
                    >
                      Save
                    </LoadingButton>
                    <Button
                      variant="secondary"
                      className="mr-1"
                      onClick={onFormCancel}
                    >Cancel</Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    id="edit"
                    className="btn-primary float-right"
                    onClick={onFormEdit}
                  >
                    Edit
                  </Button>
                )}
              </Col>
            </Form.Row>
          ) : null}
        </Form>
      </Card.Body>
    </Card>
  );
};

PubMedNotesBox.propTypes = {
  activeAnnotation: PropTypes.object.isRequired
};

const defaultArticleNotes = {
  other: {
    text: "",
    checked: false,
  },
  nonscorable: {
    text: "",
    checked: false,
  },
};

const pubMedNotesBoxInitialState = (initialArticleNotes) => ({
  isEditingNotes: initialArticleNotes ? false : true,
  successMessage: null,
  failureMessage: null,
});

const pubMedNotesBoxActionTypes = {
  reset: "PUBMED_NOTES_BOX_RESET",
  editMode: "PUBMED_NOTES_BOX_EDIT_MODE",
  readMode: "PUBMED_NOTES_BOX_READ_MODE",
  saveSuccess: "PUBMED_NOTES_BOX_SAVE_SUCCESS",
  saveFailure: "PUBMED_NOTES_BOX_SAVE_FAILURE",
};

const resetPubMedNotesBoxAction = (initialArticleNotes) => ({
  type: pubMedNotesBoxActionTypes.reset,
  initialArticleNotes,
});
const readModePubMedNotesBoxAction = () => ({
  type: pubMedNotesBoxActionTypes.readMode,
});
const editModePubMedNotesBoxAction = () => ({
  type: pubMedNotesBoxActionTypes.editMode,
});
const saveSuccessPubMedNotesBoxAction = (message) => ({
  type: pubMedNotesBoxActionTypes.saveSuccess,
  message,
});
const savefailurePubMedNotesBoxAction = (message) => ({
  type: pubMedNotesBoxActionTypes.saveFailure,
  message,
});

const pubMedNotesBoxReducer = (state, action) => {
  switch (action.type) {
    case pubMedNotesBoxActionTypes.reset:
      return pubMedNotesBoxInitialState(action.initialArticleNotes);
    
    case pubMedNotesBoxActionTypes.readMode:
      return {
        ...state,
        isEditingNotes: false,
      };

    case pubMedNotesBoxActionTypes.editMode:
      return {
        isEditingNotes: true,
        successMessage: null,
        failureMessage: null
      };

    case pubMedNotesBoxActionTypes.saveSuccess:
      return {
        ...state,
        successMessage: action.message,
        isEditingNotes: false,
      };

    case pubMedNotesBoxActionTypes.saveFailure:
      return {
        ...state,
        failureMessage: action.message,
      };

    default:
      return state;
  }
};
