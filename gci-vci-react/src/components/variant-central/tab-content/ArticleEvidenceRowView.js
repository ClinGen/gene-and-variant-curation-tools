import React, { useState } from "react";
import PropTypes from "prop-types";
import { get as lodashGet } from "lodash";
import { Button, Row, Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import moment from "moment";

import { AddArticleEvidenceForm } from "../../common/article/AddArticleEvidenceForm";
import PmidSummary from "../../common/article/PmidSummary";
import { DeleteArticleEvidenceModalButton } from "./DeleteArticleEvidenceModalButton";
import { ArticleEvidencePropTypes } from "../../../propTypes/articlePropTypes";
import { CODE_STRIP_LOOKUP_TABLE } from "../mapping/CodeStripValues";
import { getAffiliationName } from "../../../helpers/get_affiliation_name";
import { getUserName } from "../../../helpers/getUserName";

const ARTICLE_COLUMN_WIDTH = "27%";
const CRITERIA_COLUMN_WIDTH = "10%";
const EVIDENCE_COLUMN_WIDTH = "30%";

export const ArticleEvidenceRowView = ({
  articleEvidence,
  category,
  subcategory,
  criteriaList,
  readOnly,
}) => {
  const article = lodashGet(articleEvidence, "articles[0]", {});

  const [formIsOpen, setFormIsOpen] = useState(false);

  const handleFormCancel = () => {
    setFormIsOpen(false);
  };

  const handleFormSaveSuccess = () => {
    setFormIsOpen(false);
  };

  const handleEdit = () => {
    setFormIsOpen(true);
  };

  return (
    <tr>
      {formIsOpen ? (
        <td colSpan="6">
          <AddArticleEvidenceForm
            initialArticleEvidence={articleEvidence}
            article={article}
            criteriaList={criteriaList}
            onCancel={handleFormCancel}
            onSaveSuccess={handleFormSaveSuccess}
            category={category}
            subcategory={subcategory}
          />
        </td>
      ) : (
        <ArticleEvidenceRow
          articleEvidence={articleEvidence}
          onEditClick={handleEdit}
          readOnly={readOnly}
          category={category}
        />
      )}
    </tr>
  );
};
ArticleEvidenceRowView.propTypes = {
  articleEvidence: ArticleEvidencePropTypes,
  category: PropTypes.string,
  subcategory: PropTypes.string,
  criteriaList: PropTypes.arrayOf(PropTypes.string),
  readOnly: PropTypes.bool,
};

const ArticleEvidenceRow = ({ articleEvidence, onEditClick, readOnly, category }) => {
  const article = lodashGet(articleEvidence, "articles[0]", {});

  const handleEditClick = () => {
    onEditClick && onEditClick(articleEvidence);
  };

  const codeStrip = articleEvidence.evidenceCriteria && articleEvidence.evidenceCriteria !== 'none' ? (
    CODE_STRIP_LOOKUP_TABLE[articleEvidence.evidenceCriteria] ?
    CODE_STRIP_LOOKUP_TABLE[articleEvidence.evidenceCriteria] 
    : articleEvidence.evidenceCriteria
  ) : null;
  const affiliation = lodashGet(articleEvidence, "affiliation", null) ? getAffiliationName(articleEvidence.affiliation) : null;
  const submittedBy = affiliation ? `${affiliation} (${getUserName(articleEvidence.submitted_by)})` : `${getUserName(articleEvidence.submitted_by)}`;

  return (
    <>
      <td style={{ width: ARTICLE_COLUMN_WIDTH }}>
        <PmidSummary article={article} pmidLinkout />
      </td>
      <td style={{ width: CRITERIA_COLUMN_WIDTH }}>
        {
          // typeof null === 'null', so also have to check `codeStrip` is truthy
          // https://stackoverflow.com/a/18808270/9814131
          codeStrip && typeof codeStrip === 'object' ? 
          <OverlayTrigger overlay={<Tooltip>{codeStrip.definition}</Tooltip>}>
            <Badge className={`badge-${codeStrip.class}`}>
              {codeStrip.code}
            </Badge>
          </OverlayTrigger>
          :
          typeof codeStrip === 'string' ?
          codeStrip
          : <span>--</span>
        }
      </td>
      <td style={{ width: EVIDENCE_COLUMN_WIDTH }}>
        <p className="word-break text-pre-wrap">{articleEvidence.evidenceDescription}</p>
      </td>
      <td>{submittedBy}</td>
      <td>
        {moment(articleEvidence.date_created).format("YYYY MMM DD, h:mm a")}
      </td>
      {!readOnly ? <td>
        {(category !== "case-segregation") && (
        <Row>
          <Button
            className="btn btn-primary btn-inline-spacer"
            onClick={handleEditClick}
          >
            Edit
          </Button>
        </Row>
        )}
        <Row className="mt-1">
          <DeleteArticleEvidenceModalButton
            articleEvidence={articleEvidence}
          ></DeleteArticleEvidenceModalButton>
        </Row>
      </td> : null}
    </>
  );
};
ArticleEvidenceRow.propTypes = {
  articleEvidence: ArticleEvidencePropTypes,
  codeStrip: PropTypes.object,
  // fired when `Edit` button pressed
  onEditClick: PropTypes.func,
  readOnly: PropTypes.bool,
};
