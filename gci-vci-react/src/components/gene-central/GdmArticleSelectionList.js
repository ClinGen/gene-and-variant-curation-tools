import React, { useReducer } from "react";
import PropTypes from "prop-types";
import lodashGet from "lodash/get";
import Popover from "../common/Popover";

import { Card, Row, Button } from "react-bootstrap";
import AddArticleModalButton, {
  articleModalButtonReducer,
  articleModalButtonInitialState,
  openArticleModalAction,
  dismissArticleModalAction,
  submittingArticleModalAction,
  submitFailureArticleModalAction,
  submitSuccessArticleModalAction,
} from "../common/article/AddArticleModalButton";
import PmidSummary from "../common/article/PmidSummary";
import { useSelector, useDispatch } from "react-redux";
import {
  useAmplifyAPIRequestRecycler,
  getDetailErrorMessageFromServerless,
} from "../../utilities/fetchUtilities";
import { gdmParticipantReducer } from '../../utilities/gdmUtilities';
import { setGdmAction } from "../../actions/gdmActions";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { API_NAME } from "../../utils";
import { addAnnotationAction } from "../../actions/annotationActions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faCheckSquare } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router-dom";
import { isOwnedByCurrentCuratingEntity } from "../../utilities/ownershipUtilities";
import { gdmAnnotationIsEarliestPublication } from "../../utilities/gdmUtilities";

export const GdmArticleSelectionList = ({ activeAnnotation, className }) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const gdm = useSelector((state) => state.gdm.entity);
  const annotations = useSelector((state) =>
    state.annotations.allPKs.map((PK) => state.annotations.byPK[PK])
  );
  const auth = useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const [articleModalState, dispatchArticleModalState] = useReducer(
    articleModalButtonReducer,
    articleModalButtonInitialState
  );

  const history = useHistory();

  const allowAdd = isOwnedByCurrentCuratingEntity(gdm, auth);

  const addAnnotation = async (article) => {
    if (
      annotations.some((annotation) => {
        return annotation.article.PK === article.PK;
      })
    ) {
      throw new Error(
        "This article has already been associated with this Gene-Disease Record"
      );
    }

    const newAnnotation = {
      article: article.pmid,
      associatedGdm: gdm.PK,
      submitted_by: lodashGet(auth, "PK", null),
      modified_by: lodashGet(auth, "PK", null),
    };

    // Add affiliation if the user is associated with an affiliation
    if (auth.currentAffiliation && auth.currentAffiliation.affiliation_id) {
      newAnnotation.affiliation = auth.currentAffiliation.affiliation_id;
    }

    // Post new annotation to DB
    let postAnnotationResult;
    try {
      postAnnotationResult = await requestRecycler.capture(
        API.post(API_NAME, "/annotations", { body: { newAnnotation } })
      );
    } catch (error) {
      if (API.isCancel(error)) {
        throw error;
      }
      throw new Error(
        getDetailErrorMessageFromServerless(
          "Failed to create new annotation",
          error
        )
      );
    }

    if (!postAnnotationResult || !postAnnotationResult.PK) {
      throw new Error("Empty response from server when creating annotation");
    }

    // add annotation to gdm
    const updateGdm = {
      ...gdm,
      annotations: [...(gdm.annotations || []), postAnnotationResult.PK], // TODO: backend auto-populate annotaions field?
      ...gdmParticipantReducer(gdm, auth),
    };

    // PUT gdm
    let putGdmResult;
    try {
      putGdmResult = await requestRecycler.capture(
        API.put(API_NAME, `/gdms/${gdm.PK}`, { body: { updateGdm } })
      );
    } catch (error) {
      throw new Error(
        getDetailErrorMessageFromServerless(
          "Failed to append annotation to GDM",
          error
        )
      );
    }

    if (
      !putGdmResult ||
      !Array.isArray(putGdmResult.annotations) ||
      putGdmResult.annotations.length !== updateGdm.annotations.length
    ) {
      throw new Error("Empty response from server when updating GDM");
    }

    return [putGdmResult, postAnnotationResult];
  };

  const onNewArticleAdd = async (article) => {
    dispatchArticleModalState(submittingArticleModalAction());
    let updatedGdm, addedAnnotation;
    try {
      [updatedGdm, addedAnnotation] = await addAnnotation(article);
      if (!(updatedGdm && addedAnnotation)) {
        throw new Error('updatedGdm or addedAnnotation is empty');
      }
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      alert(`Failed to add article: ${error.message}`);
      dispatchArticleModalState(submitFailureArticleModalAction());
      return;
    }

    // close the modal
    dispatchArticleModalState(submitSuccessArticleModalAction());

    // update redux for gdm and annotations
    dispatch(setGdmAction(updatedGdm));
    dispatch(addAnnotationAction(addedAnnotation));
    history.push(`/curation-central/${updatedGdm.PK}/annotation/${addedAnnotation.PK}`);
  };

  const onArticleSelect = (selectedAnnotation) => {
    // the GCI curation router switch will use the annotation in url to set the active annotation in redux for us
    // so no need to set active annotation in redux here
    history.push(`/curation-central/${gdm.PK}/annotation/${selectedAnnotation.PK}`);
  };

  // callbacks for add article modal

  const onAddArticleButtonClick = () => {
    dispatchArticleModalState(openArticleModalAction());
  };

  const onDismissArticleModal = () => {
    dispatchArticleModalState(dismissArticleModalAction());
  };

  const onArticleModalSaveClick = () => {
    dispatchArticleModalState(submittingArticleModalAction());
  };

  const articleExistsInGdm = (newArticlePK) => {
    const foundAnnotation = annotations.find(annotationObj => annotationObj.article.PK === newArticlePK);
    return (foundAnnotation);
  };

  return (
    <>
      <Card className={className}>
        <Card.Header className="d-flex align-items-center">
          <h4 className="mb-0 mr-auto">Select Paper</h4>
          {allowAdd ?
            <AddArticleModalButton
              renderButton={({ onButtonClick }) => (
                <Button
                  onClick={onButtonClick}
                >
                  <FontAwesomeIcon icon={faPlus} /> Add
                </Button>
              )}
              modalTitle="Add new PubMed Article"
              modalButtonText="Add Article"
              isModalOpen={articleModalState.isModalOpen}
              submitResourceBusy={articleModalState.submitResourceBusy}
              onButtonClick={onAddArticleButtonClick}
              onCancel={onDismissArticleModal}
              onArticleSaveClick={onArticleModalSaveClick}
              onArticleSaved={onNewArticleAdd}
              alreadyExistInGdm={articleExistsInGdm}
            />
          : null}
        </Card.Header>

        {/* display annotation list items */}
        <Card.Body className="p-0 pmid-selection-list">
          {annotations.length ? (
            annotations.map((annotation, index) => {
              return (
                <ArticleCard
                  key={index}
                  annotation={annotation}
                  activeAnnotation={activeAnnotation}
                  isEarliestPub={gdmAnnotationIsEarliestPublication(lodashGet(gdm, "earliestPublications", null), lodashGet(annotation, "PK", null))}
                  onSelect={onArticleSelect}
                />
              );
            })
          ) : (
            allowAdd ? (
              <ArticleCard
                placeholder={
                  <AddArticleModalButton
                    modalTitle="Add new PubMed Article"
                    renderButton={({ onButtonClick }) => {
                      return (
                        <Card.Body onClick={onButtonClick}>
                          <Row className="justify-content-center">
                            <Button className="rounded-circle">
                              <FontAwesomeIcon icon={faPlus} />
                            </Button>
                          </Row>
                          <Row className="text-center">
                            Add papers to begin curating evidence
                          </Row>
                        </Card.Body>
                      );
                    }}
                    modalButtonText="Add Article"
                    isModalOpen={articleModalState.isModalOpen}
                    submitResourceBusy={articleModalState.submitResourceBusy}
                    onButtonClick={onAddArticleButtonClick}
                    onCancel={onDismissArticleModal}
                    onArticleSaveClick={onArticleModalSaveClick}
                    onArticleSaved={onNewArticleAdd}
                  />
                }
              />
            ) : (
              <ArticleCard
                placeholder={
                  <Card.Body className="no-add">
                    <Row className="no-add text-center">
                      No paper has been added
                    </Row>
                  </Card.Body>
                }
              />
            )
          )}
        </Card.Body>
      </Card>
    </>
  );
};
GdmArticleSelectionList.propTypes = {
  activeAnnotation: PropTypes.object,
};

const ArticleCard = ({
  placeholder,
  annotation,
  activeAnnotation,
  isEarliestPub,
  onSelect,
}) => {
  const onCardClick = () => {
    onSelect(annotation);
  };

  const infoText = 'This article is selected as earliest report of a variant in the gene causing the disease of interest in a human';
  const infoPopover = <Popover
    triggerComponent={<FontAwesomeIcon className="text-info" icon={faCheckSquare} color="blue" size="lg"/>}
    content={infoText}
    placement="top"
  />

  return placeholder ? (
    <Card className="pmid-selection-list-item p-2">{placeholder}</Card>
  ) : (
    <Card
      className={`pmid-selection-list-item ${
        activeAnnotation && annotation.PK === activeAnnotation.PK
          ? "curr-pmid p-1"
          : "p-2"
      }`}
      onClick={onCardClick}
    >
      <Card.Body className="p-1">
        {isEarliestPub ? <span className="float-right">{infoPopover}</span> : null}
        <PmidSummary
          article={annotation.article}
          displayJournal
          pmidLinkout
          pmidLinkoutOnNewLine
        />
      </Card.Body>
    </Card>
  );
};
ArticleCard.propTypes = {
  // placeholder for guiding user to create article
  placeholder: PropTypes.element,

  annotation: PropTypes.object,
  activeAnnotation: PropTypes.object,
  onSelect: PropTypes.func,
};
