import React, { useEffect, useState } from "react";
import lodashGet from "lodash/get";
import { Form, Row, Col, Button, Card } from "react-bootstrap";
import Modal from "../common/Modal";
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
import { isOwnedByCurrentCuratingEntity } from "../../utilities/ownershipUtilities";
import { renderAnnotationSourceSummary } from "../../helpers/renderAnnotationSourceSummary";


export const EvidenceSourceNotesModal = ({
  annotation
}) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const gdm = useSelector(state => state.gdm.entity);

  const allowEdit = isOwnedByCurrentCuratingEntity(gdm, auth);
  const selectedEarliestPubList = lodashGet(gdm, "earliestPublications", null) ?  gdm.earliestPublications : [];
  const initialEarliestChecked = selectedEarliestPubList.some((pub) => {
    if (lodashGet(annotation, "PK", null) === pub) {
      return true;
    }
    return false;
  });

  const [ isModalOpen, setIsModalOpen ] = useState(false);
  const [ nonscorableText, setNonscorableText ] = useState(null);
  const [ nonscorableChecked, setNonscorableChecked ] = useState(false);
  const [ otherText, setOtherText ] = useState(null);
  const [ otherChecked, setOtherChecked ] = useState(false);
  const [ earliestChecked, setEarliestChecked ] = useState(false);
  const [ earliestError, setEarliestError ] = useState(null);
  const [ notesError, setNotesError ] = useState(null);
  const [ nonscorableError, setNonscorableError ] = useState(null);
  const [ isSubmitting, setIsSubmitting ] = useState(false);

  useEffect(() => {
    if (annotation) {
      setNonscorableText(annotation.articleNotes?.nonscorable?.text ? annotation.articleNotes?.nonscorable?.text : "");
      setNonscorableChecked(annotation.articleNotes?.nonscorable?.checked);
      setOtherText(annotation.articleNotes?.other?.text ? annotation.articleNotes?.other?.text : "");
      setOtherChecked(annotation.articleNotes?.other?.checked);
      setEarliestChecked(initialEarliestChecked);
    }
  }, [annotation]);

  const onButtonClick = () => {
    setIsModalOpen(true);
  };

  // Handle when the earliest publication is checked/unchecked
  const handleEarliestChange = () => {
    setEarliestChecked(!earliestChecked);
    setEarliestError(null);
  };

  const resetForm = () => {
    if (annotation) {
      setNonscorableText(annotation.articleNotes?.nonscorable?.text ? annotation.articleNotes?.nonscorable?.text : "");
      setNonscorableChecked(annotation.articleNotes?.nonscorable?.checked);
      setOtherText(annotation.articleNotes?.other?.text ? annotation.articleNotes?.other?.text : "");
      setOtherChecked(annotation.articleNotes?.other?.checked);
      setEarliestChecked(initialEarliestChecked);
    } else {
      setNonscorableText("");
      setNonscorableChecked(false);
      setOtherText("");
      setOtherChecked(false);
      setEarliestChecked(false);
    }
    setEarliestError(null);
    setNotesError(null);
    setNonscorableError(null);
  };

  const updateAnnotation = async (articleNotes) => {
    const updateAnnotation = {
      ...annotation,
      articleNotes,
      modified_by: lodashGet(auth, "PK", null)
    };

    try {
      return await requestRecycler.capture(
        API.put(API_NAME, `/annotations/${annotation.PK}`, {
          body: { updateAnnotation },
        })
      );
    } catch (error) {
      if (!API.isCancel(error)) {
        setNotesError("Notes could not be saved");
      }
    }
  };

  const onCancel = () => {
    // Reset all form values
    resetForm();
    requestRecycler.cancelAll();
    setIsModalOpen(false);
  }

  const onSubmit = async () => {
    setEarliestError(null);
    setNotesError(null);
    setNonscorableError(null);

    if (nonscorableChecked && !nonscorableText?.length) {
      setNonscorableError("Please add explanation.");
    } else {
      setIsSubmitting(true);
      saveEarliestPublication().then(() => {
        saveArticleNote().then(() => {
          setIsSubmitting(false);
          setIsModalOpen(false);
          return;
        }).catch(error => {
          if (API.isCancel(error)) {
            return;
          } else {
            getDetailErrorMessageFromServerless("Article notes could not be saved", error)
            // set error
            const serverDetailMessage = lodashGet(error, 'response.data.error', 'Failed to save aricle notes to this annotation.');
            setNotesError(serverDetailMessage);
            setIsSubmitting(false);
            return;
          }
        })
      }).catch(error => {
        if (API.isCancel(error)) {
          return;
        } else {
          getDetailErrorMessageFromServerless("earliestPublications could not be saved", error)
          // set error
          const serverDetailMessage = lodashGet(error, 'response.data.error', 'Failed to save earliest publication to this GDM.');
          setEarliestError(serverDetailMessage);
          setIsSubmitting(false);
          return;
        }
      });
    }
  }

  const saveArticleNote = async () => {
    // dynamoDB does not allow empty string so have to strip off textarea field(s) if empty
    const updateArticleNote = {
      nonscorable: {
        text: nonscorableText,
        checked: nonscorableChecked
      },
      other: {
        text: otherText,
        checked: otherChecked
      }
    };
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
      alert("Problem updating data to evidence source.");
      throw error;
    }

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
          earliestPublications: [...(gdm.earliestPublications || []), annotation.PK],
        };
      } else {
        // Remove current article from earliest publication list
        updateGdm = {
          ...gdm,
          earliestPublications: (gdm.earliestPublications || []).filter((i) => (i !== annotation.PK)),
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

  const renderAnnotationSubmitter = () => {
    if (annotation?.submitted_by?.PK !== auth.PK) {
      if (
        (annotation?.article?.PK || annotation?.scv?.scvId) &&
        annotation?.submitted_by?.name &&
        annotation?.submitted_by?.family_name
      ) {
        return (
          <div className="mb-3">
            Added by {annotation.submitted_by.name} {annotation.submitted_by.family_name}
          </div>
        );
      }
      // We don't have enough info to render the annotation submitter. Don't display anything.
      return null;
    }
  };

  const renderSourceNotesView = () => {
    return (
      <>
        <Row>
          <Col md="3">
            <strong>Non-scorable evidence</strong>
          </Col>
          <Col>
            {nonscorableChecked && (
              <i className="icon icon-check mr-3" />
            )}
            <div className="border p-2 my-2 text-pre-wrap">
              {nonscorableText ? (
                nonscorableText
              ) : (
                <span className="text-muted">
                  <i>(None)</i>
                </span>
              )}
            </div>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col md="3">
	    <strong>Other comments on evidence source</strong>
          </Col>
          <Col>
            {otherChecked && (
              <i className="icon icon-check mr-3" />
            )}
            <div className="border p-2 my-2 text-pre-wrap">
              {otherText ? (
                otherText
              ) : (
                <span className="text-muted">
                  <i>(None)</i>
                </span>
              )}
            </div>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col md="1">
            {earliestChecked ?
              <i className="icon icon-check" />
            : (
              <span className="text-muted">
                <i>(No)</i>
              </span>
            )}
          </Col>
          <Col>
            <strong>This is earliest report of a variant in the gene causing the disease of interest in a human</strong>
          </Col>
        </Row>
      </>
    );
  };

  const renderSourceDetail = () => {
    if (annotation?.article?.abstract) {
      return (
        <Row className="mt-4">
          <Col>
            <h4>Abstract</h4>
            <p>{annotation.article.abstract}</p>
          </Col>
        </Row>
      );
    } 
    if (annotation?.scv?.comment) {
      return (
        <Row className="mt-4">
          <Col>
            <h4>SCV Comment</h4>
            <p>{annotation.scv.comment}</p>
          </Col>
        </Row>
      );
    }
  }

  const formHasChanges = () => {
    if (allowEdit) {
      if (annotation) {
        const origNonscorableText = annotation.articleNotes?.nonscorable?.text ?
          annotation.articleNotes?.nonscorable?.text : "";
        const origOtherText = annotation.articleNotes?.other?.text ?
          annotation.articleNotes?.other?.text : "";
        if (nonscorableText !== origNonscorableText ||
          nonscorableChecked !== annotation.articleNotes?.nonscorable?.checked ||
          otherText !== origOtherText ||
          otherChecked !== annotation.articleNotes?.other?.checked ||
          earliestChecked !== initialEarliestChecked) {
            return true;
          }
      } else {
        if (nonscorableText !== "" ||
          nonscorableChecked !== false ||
          otherText !== "" ||
          otherChecked !== false ||
          earliestChecked !== false ) {
            return true;
        }
      }
    }

    return false;
  }

  const saveError = nonscorableError ? "Please fix errors on the form and resubmit."
    : (notesError || earliestError ) ? "Error saving above form data.  Please try again later" : null;

  return (
    <>
      <Button onClick={onButtonClick} >
        {allowEdit ? "Edit Notes" : "View Notes"}
      </Button>

      <Modal
        title="Notes for Evidence Source"
        className="notes-modal"
        show={isModalOpen}
        onHide={onCancel}
        hideButtonText={allowEdit ? "Cancel" : ""}
        showHideButton={allowEdit ? true : false}
        onSave={allowEdit ? onSubmit : onCancel}
        saveButtonText={allowEdit ? "Save" : "Close"}
        saveButtonDisabled={allowEdit && !formHasChanges()}
        isLoadingSave={isSubmitting}
        saveError={saveError}
        // Bug in react-bootstrap: input field's autoFucus won't work when modal animation enabled. See issue https://github.com/react-bootstrap/react-bootstrap/issues/5102
        animation={false}
      >
        {/* params: annotation, displayJournal, displayAllAuthors, linkout, linkoutOnNewLine, showComment */}
        {renderAnnotationSourceSummary(annotation, true, true, true, false, false)}

        {renderAnnotationSubmitter()}

        <Card border="primary">
          <Card.Body>
            {!allowEdit && renderSourceNotesView()}

            {allowEdit && 
              <Form>
                <Form.Group controlId="nonscorable">
                  <Form.Row>
                    <Col md="3">
                      <Form.Label>
                        <strong>Non-scorable evidence</strong>
                      </Form.Label>
                    </Col>
                    <Col md="1">
                      <Form.Check
                        type="checkbox"
                        name="nonscorable.check"
                        disabled={isSubmitting}
                        checked={nonscorableChecked}
                        onChange={(e) => { setNonscorableChecked(e.target.checked); }}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        as="textarea"
                        rows="3"
                        name="nonscorable.text"
                        value={nonscorableText}
                        onChange={(e) => {
                          setNonscorableText(e.target.value);
                          setNonscorableError(null);
                        }}
                        isInvalid={nonscorableError}
                      />
                        <Form.Control.Feedback type="invalid">
                          {nonscorableError}
                        </Form.Control.Feedback>
                    </Col>
                  </Form.Row>
                </Form.Group>
                <Form.Group controlId="pubMedNotesBox.other">
                  <Form.Row>
                    <Col md="3">
                      <Form.Label>
                        <strong>Other comments on evidence source</strong>
                      </Form.Label>
                    </Col>
                    <Col md="1">
                      <Form.Check
                        type="checkbox"
                        name="other.checked"
                        checked={otherChecked}
                        onChange={(e) => { setOtherChecked(e.target.checked); }}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        as="textarea"
                        rows="3"
                        name="other.text"
                        value={otherText}
                        onChange={(e) => { setOtherText(e.target.value); }}
                      />
                    </Col>
                  </Form.Row>
                  {notesError && (
                    <Form.Row>
                      <Col md="auto">
                        <Alert value={notesError} className="mt-3"/>
                      </Col>
                    </Form.Row>
                  )}
                </Form.Group>
                <Form.Group controlId="pubMedNotesBox.earliest">
                  <Form.Row>
                    <Col md="1">
                      <Form.Check
                        type="checkbox"
                        name="earliest-checked"
                        checked={earliestChecked}
                        onChange={handleEarliestChange}
                      />
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
              </Form>
            }
          </Card.Body>
        </Card>

        {renderSourceDetail()}

      </Modal>
    </>
  );
};

export default EvidenceSourceNotesModal;
