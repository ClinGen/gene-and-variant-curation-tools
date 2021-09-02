import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RestAPI as API } from "@aws-amplify/api-rest";

import { API_NAME } from "../../../utils";
import { updateInterpretation as getUpdateInterpretationAction } from "../../../actions/actions";
import { deleteCuratedEvidenceAction } from "../../../actions/curatedEvidenceActions";
import Modal from "../../common/Modal";
import { Button } from "react-bootstrap";
import { ArticleEvidencePropTypes } from "../../../propTypes/articlePropTypes";
import { useAmplifyAPIRequestRecycler } from "../../../utilities/fetchUtilities";

export const DeleteArticleEvidenceModalButton = ({ articleEvidence }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteRequestErrorMessage, setDeleteRequestErrorMessage] = useState();
  const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);

  const requestRecycler = useAmplifyAPIRequestRecycler();

  // redux interpretation r/w suit
  const dispatch = useDispatch();
  const interpretation = useSelector((state) => state.interpretation);
  const setInterpretation = useCallback(
    (i) => dispatch(getUpdateInterpretationAction(i)),
    [dispatch]
  );
  const deleteCuratedEvidence = useCallback(
    (curatedEvidence) => dispatch(deleteCuratedEvidenceAction(curatedEvidence)),
    [dispatch]
  );

  const onDeleteClick = () => {
    setIsModalOpen(true);
  };

  const onModalCancel = () => {
    requestRecycler.cancelAll();
    setIsModalOpen(false);
    setIsDeleteInProgress(false);
    setDeleteRequestErrorMessage();
  };

  const handleDeleteFailureCleanUp = (errorMessage) => {
    setDeleteRequestErrorMessage(errorMessage);
    setIsDeleteInProgress(false);
  };

  const onModalConfirmed = async () => {
    setDeleteRequestErrorMessage();
    setIsDeleteInProgress(true);

    // mark evidence as deleted
    const updatedCuratedEvidence = {
      ...articleEvidence,
      status: "deleted",
    };

    // PUT curated-evidence, update `status`

    try {
      const putResultCuratedEvidence = await requestRecycler.capture(API.put(
        API_NAME,
        `/curated-evidences/${updatedCuratedEvidence.PK}`,
        { body: { updatedCuratedEvidence } }
      ));
      if (!putResultCuratedEvidence) {
        throw new Error("Server responded null");
      }
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      handleDeleteFailureCleanUp(error.message);
      return;
    }

    // exclude evidence from interpretation immutably
    const updatedInterpretation = {
      ...interpretation,
      curated_evidence_list: (
        interpretation.curated_evidence_list || []
      ).filter((PK) => PK !== articleEvidence.PK),
    };

    // PUT interpretation
    try {
      const putResultInterpretation = await requestRecycler.capture(API.put(
        API_NAME,
        `/interpretations/${updatedInterpretation.PK}`,
        { body: { updatedInterpretation } }
      ));
      if (!putResultInterpretation) {
        throw new Error("Server responded null");
      }
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      handleDeleteFailureCleanUp(error.message);
      return;
    }

    // update UI interpretation (curated evidence removed)
    // after redux interpretation updated, this component will be unmounted
    // so make sure no further local state operation after this; otherwise will get error 'state update after unmount;
    setInterpretation(updatedInterpretation);
    deleteCuratedEvidence(updatedCuratedEvidence)
  };

  const article = articleEvidence.articles.length
    ? articleEvidence.articles[0]
    : {};

  return (
    <>
      <Modal
        show={isModalOpen}
        title="Confirm evidence deletion"
        className="confirm-interpretation-delete-evidence"
        onHide={onModalCancel}
        onSave={onModalConfirmed}
        isLoadingSave={isDeleteInProgress}
        saveError={deleteRequestErrorMessage}
        saveButtonText="Delete"
        saveButtonInProgressText="Deleting"
        hideButtonText="Cancel"
      >
        <p>
          Are you sure you want to delete this article evidence "{article.title}
          " (PMID: {article.pmid})?
        </p>
      </Modal>
      <Button variant="danger" onClick={onDeleteClick}>
        Delete
      </Button>
    </>
  );
};
DeleteArticleEvidenceModalButton.propTypes = {
  articleEvidence: ArticleEvidencePropTypes,
};
