import React, { useState, useReducer } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { orderBy as lodashOrderBy } from "lodash";
import { Row, Col, Table } from "react-bootstrap";
import lodashGet from "lodash/get";

// Internal libs
import Alert from "../../common/Alert";
import { curatedEvidenceHasSourceInfo } from "../helpers/curated_evidence_version";
import { AddArticleEvidenceForm } from "../../common/article/AddArticleEvidenceForm";
import AddArticleModalButton, { articleModalButtonReducer, articleModalButtonInitialState, submitSuccessArticleModalAction, openArticleModalAction, dismissArticleModalAction, submittingArticleModalAction } from "../../common/article/AddArticleModalButton"; // modal related
import { ArticleEvidenceRowView } from "./ArticleEvidenceRowView";
import { useIsMyInterpretation } from "../../../utilities/ownershipUtilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

export const AddArticleEvidenceTableView = ({
  category,
  subcategory,
  criteriaList,
}) => {
  
  // local states

  const [tempEvidence, setTempEvidence] = useState(null);
  const [articleModalState, dispatchArticleModalState] = useReducer(articleModalButtonReducer, articleModalButtonInitialState);

  // redux suite

  const curatedEvidencesNormalizedState = useSelector(
    (state) => state.curatedEvidences
  );
  const interpretation = useSelector((state) => state.interpretation);
  const auth = useSelector((state) => state.auth);
  const isMyInterpretation = useIsMyInterpretation();
  const hasInterpretation = !!lodashGet(interpretation, 'PK');

  // local variables

  const updateTempEvidence = (article) => {
    setTempEvidence(article);
    dispatchArticleModalState(submitSuccessArticleModalAction());
  };

  const clearTempEvidece = () => {
    setTempEvidence(null);
  };

  let curatedEvidencesByCategoryBySubcategory = [];
  // For case-segregation category, only display the curated evidences that are in old format (without sourceInfo)
  if (category === "case-segregation") {
    curatedEvidencesByCategoryBySubcategory = (
      curatedEvidencesNormalizedState.byCategory[category] || []
    )
      .map((PK) => curatedEvidencesNormalizedState.byPK[PK])
      .filter((curatedEvidence) => curatedEvidence.subcategory === subcategory)
      .filter((curatedEvidence) => !curatedEvidenceHasSourceInfo(curatedEvidence));
  } else {
    curatedEvidencesByCategoryBySubcategory = (
      curatedEvidencesNormalizedState.byCategory[category] || []
    )
      .map((PK) => curatedEvidencesNormalizedState.byPK[PK])
      .filter((curatedEvidence) => curatedEvidence.subcategory === subcategory);
  }

  const relevantEvidenceList = lodashOrderBy(
    curatedEvidencesByCategoryBySubcategory,
    ["date_created"],
    "desc"
  );


  const onAddArticleButtonClick = () => {
    dispatchArticleModalState(openArticleModalAction());
  }

  const onDismissArticleModal = () => {
    dispatchArticleModalState(dismissArticleModalAction());
  }

  const onArticleModalSaveClick = () => {
    dispatchArticleModalState(submittingArticleModalAction());
  }

  return (
    <Table>
      {/* table header */}

      {relevantEvidenceList.length > 0 ? (
        <thead>
          <tr>
            <th>Article</th>
            <th>Criteria</th>
            <th>Evidence</th>
            <th>Last edited by</th>
            <th>Last edited</th>
            <th></th>
          </tr>
        </thead>
      ) : null}

      <tbody>
        {(isMyInterpretation || 
          !hasInterpretation // right after creating variant (no interpretation yet)
        ) && (category !== "case-segregation") ? (
          <tr>
            <td colSpan="6">
              {tempEvidence ? (
                // Evidence form
                <AddArticleEvidenceForm
                  article={tempEvidence}
                  criteriaList={criteriaList}
                  onCancel={clearTempEvidece}
                  onSaveSuccess={clearTempEvidece}
                  category={category}
                  subcategory={subcategory}
                />
              ) : (
                <Row className="align-items-center">
                  {/* Add Evidence button; disabled if interepretation not yet created */}
                  <Col sm="auto">
                    <AddArticleModalButton
                      modalTitle="Add new PubMed Article"
                      buttonText="Add PMID"
                      modalButtonText="Add Article"
                      isModalOpen={articleModalState.isModalOpen}
                      submitResourceBusy={articleModalState.submitResourceBusy}
                      disabled={!hasInterpretation}
                      onButtonClick={onAddArticleButtonClick}
                      onArticleSaveClick={onArticleModalSaveClick}
                      onArticleSaved={updateTempEvidence}
                      onCancel={onDismissArticleModal}
                    />
                  </Col>

                  {/* hint text for Add Evidence button */}
                  <Col>
                    {!hasInterpretation ? (
                      <Alert type="warning">
                        <FontAwesomeIcon icon={faInfoCircle} /> Please create interpretation before adding any literature
                        evidence.
                      </Alert>
                    ) : (
                      <span>
                        Select "Add PMID" to curate and save a piece
                        of evidence from a published article.
                      </span>
                    )}
                  </Col>
                </Row>
              )}
            </td>
          </tr>
        ) : null}

        {/* Table rows displaying evidence details */}

        {relevantEvidenceList.length > 0 ? (
          relevantEvidenceList.map((evidence) => {
            // Set if logged in user can edit/delete given evidence
            const evidenceAffId = lodashGet(evidence, "affiliation", null);
            const evidenceUserId = lodashGet(evidence, "submitted_by.PK", null);
            const authAffId = lodashGet(auth, "currentAffiliation.affiliation_id", null);
            const authUserId = lodashGet(auth, "PK", null);
            const currentUserHasEditPermissionForThisEvidence =
               (evidenceAffId && authAffId && evidenceAffId === authAffId) ||
               (!evidenceAffId && !authAffId && evidenceUserId === authUserId);

            return (
              <ArticleEvidenceRowView
                key={evidence.PK}
                articleEvidence={evidence}
                category={category}
                subcategory={subcategory}
                criteriaList={criteriaList}
                readOnly={!currentUserHasEditPermissionForThisEvidence}
              />
            );
          })
        ) : (
          <tr><td>No evidence added.</td></tr>
        )}
      </tbody>
    </Table>
  );
};
AddArticleEvidenceTableView.propTypes = {
  category: PropTypes.string, // category (usually the tab) the evidence is part of
  subcategory: PropTypes.string, // subcategory (usually the panel) the evidence is part of
  criteriaList: PropTypes.arrayOf(PropTypes.string), // criteria code(s) pertinent to the category/subcategory
};
