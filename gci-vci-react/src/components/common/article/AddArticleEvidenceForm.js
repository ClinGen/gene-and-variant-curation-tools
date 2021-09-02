import React, { useState, useCallback, useMemo, useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { Form, Col, Button } from "react-bootstrap";
import { Formik as FormikForm, Field as FormikField } from "formik";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { API_NAME } from "../../../utils";
import { isEmpty, get as lodashGet } from "lodash";

import { updateInterpretation } from "../../../actions/actions";
import {
  updateCuratedEvidenceAction,
  addCuratedEvidenceAction,
} from "../../../actions/curatedEvidenceActions";
import PmidSummary from "./PmidSummary";
import { LoadingButton } from "../LoadingButton";
import AddArticleModalButton, { articleModalButtonReducer, articleModalButtonInitialState, openArticleModalAction, dismissArticleModalAction, submittingArticleModalAction, submitSuccessArticleModalAction } from "./AddArticleModalButton";
import Alert from "../Alert";
import {
  ArticleEvidencePropTypes,
  ArticlePropTypes,
} from "../../../propTypes/articlePropTypes";
import { useAmplifyAPIRequestRecycler } from "../../../utilities/fetchUtilities";

export const AddArticleEvidenceForm = ({
  initialArticleEvidence,
  article,
  criteriaList = [],
  onCancel,
  onSaveSuccess,
  category,
  subcategory,
}) => {
  const [previewArticle, setPreviewArticle] = useState(article);
  const [submitErrorMessage, setSubmitErrorMessage] = useState(null);

  const requestRecycler = useAmplifyAPIRequestRecycler();

  // update only when `props.initialArticleEvidence` change
  const [isEditForm, initialFormValues] = useMemo(() => {
    if (isEmpty(initialArticleEvidence)) {
      return [
        false,
        {
          evidenceCriteria: "none",
          evidenceDescription: "",
        },
      ];
    } else {
      return [true, initialArticleEvidence];
    }
  }, [initialArticleEvidence]);

  const [articleModalState, dispatchArticleModalState] = useReducer(articleModalButtonReducer, articleModalButtonInitialState);

  // bring in interpretation from redux
  const dispatch = useDispatch();
  const interpretation = useSelector((state) => state.interpretation);
  const setInterpretation = useCallback(
    (i) => dispatch(updateInterpretation(i)),
    [dispatch]
  );
  const updateCuratedEvidence = useCallback(
    (curatedEvidence) => dispatch(updateCuratedEvidenceAction(curatedEvidence)),
    [dispatch]
  );
  const addCuratedEvidence = useCallback(
    (curatedEvidence) => dispatch(addCuratedEvidenceAction(curatedEvidence)),
    [dispatch]
  );

  const auth = useSelector((state) => state.auth);
  const handleSubmitError = (error, setSubmitting) => {
    let errorDetailMessage;

    // default get detail error reason from amplify's API request
    // https://stackoverflow.com/a/49778338/9814131
    const serverDetailMessage = lodashGet(error, "response.data.error");

    if (serverDetailMessage) {
      errorDetailMessage = serverDetailMessage;
    }
    else if (error instanceof Error) {
      errorDetailMessage = error.message;
    } else if (typeof error === "string") {
      errorDetailMessage = error;
    } else {
      errorDetailMessage = JSON.stringify(error);
    }
    setSubmitErrorMessage(
      `Something went wrong whlie trying to save this evidence! More detail: ${errorDetailMessage}`
    );
    setSubmitting(false);
  };

  const submitEvidenceForm = async (
    {
      evidenceCriteria: validatedEvidenceCriteria,
      evidenceDescription: validatedDescription,
    },
    { setSubmitting }
  ) => {
    setSubmitting(true);
    setSubmitErrorMessage(null);

    // construct curated evidence object

    const postOrPutArticleEvidence = {
      item_type: "curated-evidence",
      variant: interpretation.variant,
      modified_by: lodashGet(auth, "PK", null),
      category: category,
      subcategory: subcategory,
      articles: [previewArticle],
      evidenceCriteria: validatedEvidenceCriteria,
      evidenceDescription: validatedDescription,
    };
    if (isEditForm) {
      if (!initialArticleEvidence.PK) {
        handleSubmitError(
          new Error("PK is missing on the existing article evidence"),
          setSubmitting
        );
        return;
      }
      postOrPutArticleEvidence.PK = initialArticleEvidence.PK;
    } else {
      if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
        postOrPutArticleEvidence.affiliation = lodashGet(auth, "currentAffiliation.affiliation_id");
      }
      postOrPutArticleEvidence.submitted_by = lodashGet(auth, "PK", null);
    }

    // submit curated evidence to DB

    let postOrPutResultArticleEvidence;
    const commonEndpoint = "/curated-evidences";
    const postOrPutRequestArgs = [
      API_NAME,
      isEditForm
        ? `${commonEndpoint}/${postOrPutArticleEvidence.PK}`
        : commonEndpoint,
      { body: { postOrPutArticleEvidence } },
    ];
    try {
      postOrPutResultArticleEvidence = await (isEditForm
        ? requestRecycler.capture(API.put(...postOrPutRequestArgs))
        : requestRecycler.capture(API.post(...postOrPutRequestArgs)));
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      handleSubmitError(error, setSubmitting);
      return;
    }

    if (!postOrPutResultArticleEvidence || !postOrPutResultArticleEvidence.PK) {
      handleSubmitError(
        new Error("No pk in posted article evidence"),
        setSubmitting
      );
      return;
    }

    // submit updated interpretation to DB

    // handle when field `curated_evidence_list` is undefined
    let putInterpretation = interpretation;
    if (!Array.isArray(putInterpretation.curated_evidence_list)) {
      // putInterpretation.curated_evidence_list = [];
      // make sure we don't mutate redux state object `interpretation` directly
      putInterpretation = {
        ...interpretation,
        curated_evidence_list: [],
      };
    }
    // construct a new interpretation object to update interpretation.curated_evidence_list immutably
    // the list only stores PK of curated evidence
    let putResultInterpretation;
    if (isEditForm) {
      // when editing existing curated evidence, no need to update interpretation.curated_evidence_list
      // since the list stores just PKs, and modifying content of a curated evidence does not change PK
      // also no need to update DB interpretation
    } else {
      // when create new curated evidence, just add its PK to interpretation (but immutably, avoid modifying `putInterpretation` directly)
      putInterpretation = {
        ...putInterpretation,
        curated_evidence_list: [
          postOrPutResultArticleEvidence.PK,
          ...putInterpretation.curated_evidence_list,
        ],
        modified_by: lodashGet(auth, 'PK', null)
      };

      try {
        putResultInterpretation = await requestRecycler.capture(API.put(
          API_NAME,
          `/interpretations/${interpretation.PK}`,
          { body: { putInterpretation } }
        ));
      } catch (error) {
        if (API.isCancel(error)) {
          return;
        }
        handleSubmitError(error, setSubmitting);
        return;
      }
    }

    // update UI state: curated evidence, and optionally interpretation

    if (isEditForm) {
      // update evidence
      updateCuratedEvidence(postOrPutResultArticleEvidence);
    } else {
      // update evidence
      addCuratedEvidence(postOrPutResultArticleEvidence);
      // update interpretation
      if (isEmpty(putResultInterpretation)) {
        handleSubmitError(
          new Error(
            "Server responded empty result while trying to update interpretation for the submitted curated evidence"
          ),
          setSubmitting
        );
        return;
      }
      setInterpretation(putResultInterpretation);
    }

    setSubmitting(false);
    onSaveSuccess();
  };

  /** Submit */

  const onArticleAdded = (article) => {
    setPreviewArticle(article);
    dispatchArticleModalState(submitSuccessArticleModalAction());
  };

  /** Validation */

  const validateCriteriaSelection = (criteriaSelectionValue) => {
    if (criteriaSelectionValue === "none") {
      return "You must select a criteria code";
    }
    if (!criteriaList.includes(criteriaSelectionValue)) {
      return `Invalid value selected: ${criteriaSelectionValue}`;
    }
  };

  const validateDescription = (descriptionValue) => {
    if (!descriptionValue) {
      return "Please provide some description";
    }
  };

  const onEditArticleButtonClick = () => {
    dispatchArticleModalState(openArticleModalAction());
  }

  const onDismissArticleModal = () => {
    dispatchArticleModalState(dismissArticleModalAction());
  }

  const onArticleModalSaveClick = () => {
    dispatchArticleModalState(submittingArticleModalAction());
  }

  return (
    <>
      <PmidSummary
        article={previewArticle}
        className="alert alert-info"
        pmidLinkout
      />

      <FormikForm
        onSubmit={submitEvidenceForm}
        formClassName="form-horizontal form-std"
        initialValues={initialFormValues}
        validateOnMount
      >
        {({ isValid: formikIsValid, isSubmitting, handleSubmit }) => (
          <Form noValidate onSubmit={handleSubmit}>
            <Form.Row>
              {/* Dropdown list */}

              <Col sm="4">
                <Form.Group controlId="articleEvidenceForm.evidenceCriteria">
                  <Form.Label>
                    <strong>Criteria</strong>
                  </Form.Label>
                  <FormikField
                    name="evidenceCriteria"
                    validate={validateCriteriaSelection}
                  >
                    {({ field, meta: { error, touched } }) => (
                      <>
                        <Form.Control
                          as="select"
                          {...field}
                          disabled={isSubmitting}
                          isInvalid={touched && error}
                        >
                          <option value="none">Select criteria code</option>
                          <option disabled="disabled"></option>
                          {criteriaList.map((item, i) => {
                            return (
                              <option key={i} value={item}>
                                {item}
                              </option>
                            );
                          })}
                        </Form.Control>
                        <Form.Control.Feedback type="invalid">
                          {error}
                        </Form.Control.Feedback>
                      </>
                    )}
                  </FormikField>
                </Form.Group>
              </Col>

              {/* Explanation */}

              <Col>
                <Form.Group controlId="articleEvidenceForm.evidenceDescription">
                  <FormikField
                    name="evidenceDescription"
                    validate={validateDescription}
                  >
                    {({ field, meta: { touched, error } }) => (
                      <>
                        <Form.Label>
                          <strong>Evidence</strong>
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          {...field}
                          disabled={isSubmitting}
                          isInvalid={touched && error}
                          rows="2"
                        />
                        <Form.Control.Feedback type="invalid">
                          {error}
                        </Form.Control.Feedback>
                      </>
                    )}
                  </FormikField>
                </Form.Group>
              </Col>
            </Form.Row>

            <Form.Row>
              {/* Edit PMID (go back to article modal) */}

              <Col sm="3">
                <AddArticleModalButton
                  modalTitle="Change PubMed Article for the evidence"
                  buttonText="Edit PMID"
                  modalButtonText="Add Article"
                  disabled={isSubmitting}
                  isModalOpen={articleModalState.isModalOpen}
                  submitResourceBusy={articleModalState.submitResourceBusy}

                  onButtonClick={onEditArticleButtonClick}
                  onCancel={onDismissArticleModal}
                  onArticleSaveClick={onArticleModalSaveClick}
                  onArticleSaved={onArticleAdded}
                />
              </Col>

              {/* Right bottom save / cancel */}

              <Col className="justify-content-end">
                <LoadingButton
                  type="submit"
                  className="float-right ml-2"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!formikIsValid}
                >
                  {isEditForm ? "Save Evidence" : "Add Evidence"}
                </LoadingButton>

                <Button
                  className="float-right"
                  variant="secondary"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              </Col>
            </Form.Row>
            <Form.Row>
              {submitErrorMessage ? (
                <Alert className="mt-1" dismissible>
                  {submitErrorMessage}
                </Alert>
              ) : null}
            </Form.Row>
          </Form>
        )}
      </FormikForm>
    </>
  );
};
AddArticleEvidenceForm.propTypes = {
  // sending in `initialArticleEvidence` means that it'll become a 'edit' form instead a 'new' form and affects either PUT/POST request to make when submit
  // if you intend for a 'new' form, do not pass in `initialArticleEvidence`
  initialArticleEvidence: ArticleEvidencePropTypes,
  criteriaList: PropTypes.arrayOf(PropTypes.string),
  onCancel: PropTypes.func,
  onSaveSuccess: PropTypes.func,
  article: ArticlePropTypes,
  category: PropTypes.string.isRequired,
  subcategory: PropTypes.string.isRequired,
};
