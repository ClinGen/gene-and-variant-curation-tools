import React, { useState } from "react";
import PropTypes from "prop-types";
import lodashGet from "lodash/get";
import sortBy from 'lodash/sortBy';
import Popover from "../common/Popover";

import { Card, Row, Button } from "react-bootstrap";
import AddGCISourceModalButton from "../common/article/AddGCISourceModalButton";
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
import {
  faPlus,
  faClockRotateLeft,
  faPenRuler
} from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router-dom";
import { isOwnedByCurrentCuratingEntity } from "../../utilities/ownershipUtilities";
import { gdmAnnotationIsEarliestPublication } from "../../utilities/gdmUtilities";
import { renderAnnotationSourceSummary } from "../../helpers/renderAnnotationSourceSummary";
import EvidenceSourceNotesModal from "./EvidenceSourceNotesModal";


export const GdmArticleSelectionList = ({ activeAnnotation, className }) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const gdm = useSelector((state) => state.gdm.entity);
  const origAnnotations = useSelector((state) =>
    state.annotations.allPKs.map((PK) => state.annotations.byPK[PK])
  );
  // Sort the annotations list by evidence source type.
  // All PMIDs in a list, all ClinVar records in a subsequent list
  const annotations = origAnnotations && sortBy(origAnnotations, (annotation) => {
    return annotation?.article?.PK ? 0 : 1;
  });

  const auth = useSelector((state) => state.auth);

  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [submitResourceBusy, setSubmitResourceBusy] = useState(false);

  const dispatch = useDispatch();
  const history = useHistory();

  const allowAdd = isOwnedByCurrentCuratingEntity(gdm, auth);

  const addAnnotation = async (source) => {
    const sourceId = source?.pmid ? source?.pmid : source?.vcvId;
    const scvId = source?.scvId ? source?.scvId : null;
    if (sourceExistsInGdm(sourceId, scvId)) {
      throw new Error(
        "This evidence source has already been associated with this Gene-Disease Record"
      );
    }

    let newAnnotation = {}

    if (source?.pmid) {
      newAnnotation = {
        article: source.pmid,
        associatedGdm: gdm.PK,
        submitted_by: lodashGet(auth, "PK", null),
        modified_by: lodashGet(auth, "PK", null),
      };
    } else if (source?.vcvId && source?.scvId) {
      newAnnotation = {
        scv: {
          vcvId: source?.vcvId,
          scvId: source?.scvId,
          submitter: source?.submitter,
          variationId: source?.variationId,
          variationName: source?.variationName,
          date: source?.date,
          comment: lodashGet(source, "comment", null)
        },
        associatedGdm: gdm.PK,
        submitted_by: lodashGet(auth, "PK", null),
        modified_by: lodashGet(auth, "PK", null),
      };
    } else {
      throw new Error("No valid data to create an annotation.");
    }
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

  const onNewSourceAdd = async (source) => {
    setSubmitResourceBusy(true);

    let updatedGdm, addedAnnotation;
    try {
      [updatedGdm, addedAnnotation] = await addAnnotation(source);
      if (!(updatedGdm && addedAnnotation)) {
        throw new Error('updatedGdm or addedAnnotation is empty');
      }
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      alert(`Failed to add evidence source: ${error.message}`);
      setSubmitResourceBusy(false);

      return;
    }

    // close the modal
    setSubmitResourceBusy(false);
    setSourceModalOpen(false);

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

  const onAddSourceButtonClick = () => {
    setSourceModalOpen(true);
  };

  const onDismissSourceModal = () => {
    setSourceModalOpen(false);
    setSubmitResourceBusy(false);
  };

  const onSourceModalSaveClick = () => {
    setSubmitResourceBusy(true);
  };

  const sourceExistsInGdm = (sourceId, scvId) => {
    let foundAnnotation = null;
    if (sourceId.startsWith("VCV")) {
      foundAnnotation = annotations.find(annotationObj =>
        // Check same VCV Id and SCV Id has been added
        annotationObj?.scv?.vcvId === sourceId && annotationObj?.scv?.scvId === scvId
      );
    } else {
      foundAnnotation = annotations.find(annotationObj => annotationObj?.article?.PK === sourceId);
    }

    return (foundAnnotation);
  };

  return (
    <>
      <Card className={className}>
        <Card.Header className="d-flex align-items-center">
          <h4 className="mb-0 mr-auto">Select Evidence Source</h4>
          {allowAdd ?
            <AddGCISourceModalButton
              renderButton={({ onButtonClick }) => (
                <Button
                  onClick={onButtonClick}
                >
                  <FontAwesomeIcon icon={faPlus} /> Add
                </Button>
              )}
              modalTitle="Add new Evidence Source"
              modalButtonText="Add Evidence Source"
              isModalOpen={sourceModalOpen}
              submitResourceBusy={submitResourceBusy}
              onButtonClick={onAddSourceButtonClick}
              onSaveClick={onSourceModalSaveClick}
              onSaved={onNewSourceAdd}
              onCancel={onDismissSourceModal}
              alreadyExistInGdm={sourceExistsInGdm}
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
                  <AddGCISourceModalButton
                    modalTitle="Add new Evidence Source"
                    modalButtonText="Add Evidence Source"
                    renderButton={({ onButtonClick }) => {
                      return (
                        <Card.Body onClick={onButtonClick}>
                          <Row className="justify-content-center">
                            <Button className="rounded-circle">
                              <FontAwesomeIcon icon={faPlus} />
                            </Button>
                          </Row>
                          <Row className="text-center">
                            Add evidence source to begin curating evidence
                          </Row>
                        </Card.Body>
                      );
                    }}
                    isModalOpen={sourceModalOpen}
                    submitResourceBusy={submitResourceBusy}
                    onButtonClick={onAddSourceButtonClick}
                    onSaveClick={onSourceModalSaveClick}
                    onSaved={onNewSourceAdd}
                    onCancel={onDismissSourceModal}
                    alreadyExistInGdm={sourceExistsInGdm}
                  />
                }
              />
            ) : (
              <ArticleCard
                placeholder={
                  <Card.Body className="no-add">
                    <Row className="no-add text-center">
                      No evidence source has been added
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

  const earliestText = 'This evidence source is selected as earliest report of a variant in the gene causing the disease of interest in a human';
  const earliestPopover = <Popover
    triggerComponent={<FontAwesomeIcon className="text-info" icon={faClockRotateLeft} color="blue" size="lg"/>}
    content={earliestText}
    placement="top"
  />
  const isNonScorable = annotation?.articleNotes?.nonscorable?.checked;
  const nonScorableText = 'This evidence source is selected as Non-scorable evidence';
  const nonScorablePopover = <Popover
    triggerComponent={<FontAwesomeIcon className="text-info" icon={faPenRuler} color="blue" size="lg"/>}
    content={nonScorableText}
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
        {isEarliestPub ?
          <span className="float-right">{earliestPopover}</span>
        : null}

        {isNonScorable ?
          <span className="mr-1 float-right">{nonScorablePopover}</span>
        : null}

        {/* params: annotation, displayJournal, displayAllAuthors, linkout, linkoutOnNewLine, showComment */}
        {renderAnnotationSourceSummary(annotation, true, false, true, false, false)}
        <EvidenceSourceNotesModal
          annotation={annotation}
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
  isEarliestPub: PropTypes.boolean,
  onSelect: PropTypes.func,
};
