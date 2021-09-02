import React, { Component } from "react";
import PropTypes from "prop-types";
import { Formik, Field as FormikField } from "formik";
import { connect } from "react-redux";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { Form, Button, Col } from "react-bootstrap";
import { isEmpty } from "lodash";

import { API_NAME } from "../../../utils";
import PmidSummary from "./PmidSummary";
import Modal from "../Modal";
import { LoadingButton } from "../LoadingButton";

// Class for the add (article) resource button. This class only renders the button to add and clear the fields, and contains the modal wrapper.
// The modal itself is defined as well.
class AddArticleModalButton extends Component {
  static propTypes = {
    buttonText: PropTypes.string, // text for the button that will open the modal
    className: PropTypes.string, // styling class name for the button that will open the modal
    modalButtonText: PropTypes.string, // text for submit button in modal
    renderButton: PropTypes.func, // function that renders component that will replace the button for opening modal
    
    onButtonClick: PropTypes.func.isRequired, // function to call AFTER add/edit button is clicked
    onArticleSaveClick: PropTypes.func.isRequired, // function to call AFTER save button in modal is clicked
    onArticleSaved: PropTypes.func.isRequired, // function to call AFTER an article is submitted successfully
    onArticleSaveFailed: PropTypes.func, // function to call AFTER an article tries to submit but failed
    onCancel: PropTypes.func.isRequired, // function to call AFTER modal is dismissed, including cancel button clicked
    
    disabled: PropTypes.bool, // disables the add button as well as form's submit button
    modalTitle: PropTypes.string, // text displayed in modal header
    isModalOpen: PropTypes.bool,
    submitResourceBusy: PropTypes.bool, // Flag to indicate that the modal's submit button is in a 'busy' state
    alreadyExistInGdm: PropTypes.func, // function to check if article already exists in GDM
  };

  state = {
    tempResource: {}, // Temporary object to hold the resource response
  };

  ongoingRequests = new Set();

  componentWillUnmount() {
    // cancel request (`API.cancel()`) requires latest version (as of 2020-06, aws-amplify=3.0.18) of aws-amplify
    // also make sure we use `import { RestAPI as API } from "@aws-amplify/api-rest"` instead of `import { API } from "aws-amplify"` in order to use `API.cancel()`.
    // see https://github.com/aws-amplify/amplify-js/pull/5753#issuecomment-633728124
    this.cancelRequests();
  }

  /**
   * when this component unmounted e.g. modal cancel button pressed
   * make sure api requests are aborted, in order to solve React error 'update state after unmount'
   */
  cancelRequests() {
    for (const request of this.ongoingRequests) {
      API.cancel(request, "Request was canceled");
    }
    this.ongoingRequests.clear();
  }

  // called when the button to ping the outside resource is pressed
  queryResource = async ({ pmid }, { setSubmitting }) => {
    this.setState({ tempResource: null });

    // Remove possible prefix like "PMID:" before sending queries
    var id = pmid.replace(/^PMID\s*:\s*(\S*)$/i, "$1");
    const retrieveArticleRequest = API.get(API_NAME, "/articles/" + id);
    this.ongoingRequests.add(retrieveArticleRequest);
    try {
      const article = await retrieveArticleRequest;

      this.setState({
        tempResource: article,
      });
    } catch (error) {
      if (!API.isCancel(error)) {
        alert("Failed to retrieve article " + pmid);
        console.error(error);
      } else {
        // ignore error if it's a cancel error

        // return immediately, since when request is canceled, it's likely the modal is closed & unmounted, so does formik unmounted.
        // Therefore, don't fire setSubmitting() because it will try to update formik's isSubmitting state and we'll get
        // React warning: `Can't perform a React state update on an unmounted component.`
        return;
      }
    }

    this.ongoingRequests.delete(retrieveArticleRequest);
    setSubmitting(false);
  };

  localStateCleanUp = () => {
    return new Promise((res) => {
      // close modal when save succeed
      this.setState({ tempResource: {} }, res);
    });
  };

  // called when the button to submit the resource to the main form (local db) is pressed
  submitResource = async () => {
    this.props.onArticleSaveClick();

    if (isEmpty(this.state.tempResource)) {
      console.warn(
        "Nothing submitted because article object is empty",
        this.state.tempResource
      );
      await this.localStateCleanUp();
      this.props.onArticleSaveFailed && this.props.onArticleSaveFailed();
      return;
    }

    let queriedArticle = this.state.tempResource;

    if (queriedArticle.PK) {
      await this.localStateCleanUp();

      // make sure we call external callback func only after all local state update
      // to avoid React warning "Can't Perform a React state update on an unmounted component"
      // for parent component
      this.props.onArticleSaved(queriedArticle);
      return;
    }

    // if no article in db yet, server won't attach a `pk` field
    // and we have to POST the article to get the pk
    let postResultArticle;
    const createArticleRequest = API.post(API_NAME, `/articles/`, {
      body: { article: queriedArticle },
    });
    this.ongoingRequests.add(createArticleRequest);
    try {
      postResultArticle = await createArticleRequest;
    } catch (error) {
      if (!API.isCancel(error)) {
        alert("Failed to save article to database.");
        console.error("Failed to save article to database", error);
      } else {
        // request canceled (probably due to unmounted), do nothing
        return;
      }
    } finally {
      this.ongoingRequests.delete(createArticleRequest);
    }

    if (postResultArticle) {
      await this.localStateCleanUp();

      // make sure we call external callback func only after all local state update
      // to avoid React warning "Can't Perform a React state update on an unmounted component"
      // for parent component
      this.props.onArticleSaved(postResultArticle);
    } else {
      // submit fails
      await this.localStateCleanUp();
      this.props.onArticleSaveFailed && this.props.onArticleSaveFailed();
    }
  };

  // Called when the modal form's cancel button is clicked.
  cancelModal = async () => {
    this.cancelRequests();
    await this.localStateCleanUp();
    this.props.onCancel();
  };

  pubmedValidateForm = (formikValues) => {
    const errors = {};

    // validating the field for PMIDs
    const formInput = formikValues.pmid.trim();

    if (!formInput) {
      errors.pmid = "Please provide a PMID";
    }
    // valid if input isn't zero-filled
    else if (formInput.match(/^0+$/)) {
      errors.pmid = "This PMID does not exist";
    }
    // valid if input isn't zero-leading
    else if (formInput.match(/^0+/)) {
      errors.pmid = "Please re-enter PMID without any leading 0's";
    }
    // valid if the input only has numbers
    else if (!formInput.match(/^[0-9]*$/)) {
      errors.pmid = "PMID should contain only numbers";
    }
    // If alreadyExistInGdm function exists means need to do additional checking
    if (this.props.alreadyExistInGdm) {
      if (this.props.alreadyExistInGdm(formInput)) {
        errors.pmid = "This article has already been associated with this Gene-Disease Record";
      }
    }

    return errors;
  };

  // renders the main Add/Edit button
  // and define the modal component
  render = () => {
    return (
      <>
        {this.props.renderButton ? (
          this.props.renderButton({ onButtonClick: this.props.onButtonClick })
        ) : <Button disabled={this.props.disabled} onClick={this.props.onButtonClick} className={this.props.className}>
          {this.props.buttonText || "Add"}
        </Button>}
        <Modal
          title={this.props.modalTitle}
          className="add-resource-id-modal"
          show={this.props.isModalOpen}
          onHide={this.cancelModal}
          hideButtonText="Cancel"
          onSave={this.submitResource}
          saveButtonText={this.props.modalButtonText}
          saveButtonDisabled={
            this.props.disabled || isEmpty(this.state.tempResource)
          }
          isLoadingSave={this.props.submitResourceBusy}
          // Bug in react-bootstrap: input field's autoFucus won't work when modal animation enabled. See issue https://github.com/react-bootstrap/react-bootstrap/issues/5102
          animation={false}
        >
          <Formik
            initialValues={{ pmid: "" }}
            onSubmit={this.queryResource}
            validate={this.pubmedValidateForm}
            validateOnMount
          >
            {({
              handleSubmit: formikHandleSubmit,
              isSubmitting,
              isValid: formIsValid,
              dirty,
            }) => (
              <Form noValidate onSubmit={formikHandleSubmit}>
                <Form.Group controlId="article-pmid-input">
                  <Form.Label>
                    <strong>Enter a PMID</strong>
                  </Form.Label>
                  <Form.Row>
                    <FormikField name="pmid">
                      {({ field, meta: { error } }) => (
                        <Col style={{ position: "relative" }}>
                          <Form.Control
                            autoFocus
                            type="text"
                            {...field}
                            disabled={isSubmitting}
                            isInvalid={
                              (dirty && error) || (!dirty && !formIsValid)
                            }
                            isValid={dirty && !error}
                          />
                          <Form.Control.Feedback type="invalid">
                            {error}
                          </Form.Control.Feedback>
                        </Col>
                      )}
                    </FormikField>
                    <Col sm="4">
                      <LoadingButton
                        block
                        type="submit"
                        isLoading={isSubmitting}
                        disabled={!formIsValid}
                        text="Retrieve PubMed Article"
                        textWhenLoading="Retrieving Article"
                      />
                    </Col>
                  </Form.Row>
                </Form.Group>
              </Form>
            )}
          </Formik>

          {/* Help text */}

          {!isEmpty(this.state.tempResource) ? (
            <>
              <Form.Row>
                <Col>
                  Select "Add Article" (below) if the following citation is
                  correct; otherwise, edit the PMID (above) to retrieve a
                  different article.
                </Col>
              </Form.Row>
              <Form.Row>
                <Col sm={{ offset: 1 }}>
                  <PmidSummary
                    article={this.state.tempResource}
                    displayJournal
                    pmidLinkout
                  />
                </Col>
              </Form.Row>
            </>
          ) : null}
        </Modal>
      </>
    );
  };
}
const mapStateToProps = (state) => ({
  interpretation: state.interpretation,
  curatedEvidencesNormalizedState: state.curatedEvidences,
});

export default connect(mapStateToProps)(AddArticleModalButton);

export const articleModalButtonInitialState = {
  isModalOpen: false,
  submitResourceBusy: false
}

const articleModalButtonActionTypes = {
  open: 'ARTICLE_MODAL_OPEN',
  dismiss: 'ARTICLE_MODAL_DISMISS',
  submitting: 'ARTICLE_MODAL_SUBMITTING',
  submitSuccess: 'ARTICLE_MODAL_SUBMIT_SUCCESS',
  submitFailure: 'ARTICLE_MODAL_SUBMIT_FAILURE',
}

export const openArticleModalAction = () => ({
  type: articleModalButtonActionTypes.open
})

export const dismissArticleModalAction = () => ({
  type: articleModalButtonActionTypes.dismiss
})

export const submittingArticleModalAction = () => ({
  type: articleModalButtonActionTypes.submitting
})

export const submitSuccessArticleModalAction = () => ({
  type: articleModalButtonActionTypes.submitSuccess
})

export const submitFailureArticleModalAction = () => ({
  type: articleModalButtonActionTypes.submitFailure
})

export const articleModalButtonReducer = (state = articleModalButtonInitialState, action) => {
  switch (action.type) {
    case articleModalButtonActionTypes.open:
      return {
        ...state,
        isModalOpen: true,
      };
    
    case articleModalButtonActionTypes.dismiss:
    case articleModalButtonActionTypes.submitSuccess:
      return {
        isModalOpen: false,
        submitResourceBusy: false
      };
    
    case articleModalButtonActionTypes.submitting:
      return {
        ...state,
        submitResourceBusy: true
      };
    
    case articleModalButtonActionTypes.submitFailure:
      return {
        ...state,
        submitResourceBusy: false
      }
    
    default:
      return state;
  }
}
