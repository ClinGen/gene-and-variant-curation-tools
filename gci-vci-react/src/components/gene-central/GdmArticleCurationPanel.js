import React from "react";
import PropTypes from "prop-types";

import { Card, Row, Col, Jumbotron } from "react-bootstrap";
import { ExternalLink } from "../common/ExternalLink";
import { EXTERNAL_API_MAP } from "../../constants/externalApis";
import { PubMedNotesBox } from "./PubMedNotesBox";
import { useSelector } from "react-redux";
import CardPanel from "../common/CardPanel";
import { getAnnotationSourceTitle, } from "../../helpers/getAnnotationSourceTitle";
import { renderAnnotationSourceSummary, } from "../../helpers/renderAnnotationSourceSummary";

export const GdmArticleCurationPanel = ({ activeAnnotation }) => {
  const auth = useSelector(state => state.auth);

  const hasAnnotation = useSelector(
    (state) => !!state.annotations.allPKs.length
  );

  // We have to be careful to ensure `submitted_by` exists before we use it.
  // There are a lot of annotations in the database missing the `submitted_by`
  // field. For more information on this, see the GitHub issue below.
  // https://github.com/ClinGen/gci-vci-aws/issues/1595
  const renderAnnotationSubmitter = () => {
    try {
      if (activeAnnotation?.submitted_by?.PK !== auth.PK) {
        if (
          activeAnnotation?.article?.PK &&
          activeAnnotation?.submitted_by?.name &&
          activeAnnotation?.submitted_by?.family_name
        ) {
          return (
            <div>
              PMID:{activeAnnotation.article.PK} added by {activeAnnotation.submitted_by.name} {activeAnnotation.submitted_by.family_name}
            </div>
          );
        } else if (
          activeAnnotation?.scv?.scvId &&
          activeAnnotation?.submitted_by?.name &&
          activeAnnotation?.submitted_by?.family_name
        ) {
          return (
            <div>
              ClinVar:{activeAnnotation.scv.scvId} added by {activeAnnotation.submitted_by.name} {activeAnnotation.submitted_by.family_name}
            </div>
          );
        }
      }
      // We don't have enough info to render the annotation submitter. Don't
      // display anything.
      return <></>;
    }
    catch (e) {
      window.alert("Something went wrong. Please email the ClinGen help desk (clingen-helpdesk@lists.stanford.edu) with detailed steps on how this problem happened.");
      console.error(e);
    }
  }

  const title = `Notes for ${getAnnotationSourceTitle(activeAnnotation)}`;

  return !activeAnnotation ? (
    <Card className="placeholder-pmid-overview">
      <Card.Body>
        <Jumbotron className="text-center m-0">
          {hasAnnotation ? (
            <>
              <h2>Select an evidence source</h2>
              <p>
                Click on any added evidence source at left panel to view its information
                and begin curating evidence from that source.
              </p>
            </>
          ) : (
            <>
              <h2>Add an evidence source</h2>
              <p>
                Add evidence source to this Gene-Disease Record using the left panel.
              </p>
            </>
          )}
        </Jumbotron>
      </Card.Body>
    </Card>
  ) : (
    <CardPanel title={title}>
      {/* evidence source summary */}
      <Row>
        <Col>
          {/* params: annotation, displayJournal, displayAllAuthors, linkout, linkoutOnNewLine, showComment */}
          {renderAnnotationSourceSummary(activeAnnotation, true, true, false, false, false, true)}
        </Col>
      </Row>

      {/* evidence source external link */}
      <Row>
        <Col>
          {activeAnnotation.article?.pmid &&
            <ExternalLink
              asButton
              href={`${EXTERNAL_API_MAP["PubMed"]}${activeAnnotation.article.PK}`}
            >
              PubMed
            </ExternalLink>
          }
          {activeAnnotation.scv?.vcvId && activeAnnotation.scv?.scvId &&
            <ExternalLink
              asButton
              href={`${EXTERNAL_API_MAP["ClinVarSearch"]}${activeAnnotation.scv.vcvId}`}
            >
              {activeAnnotation.scv.scvId} ({activeAnnotation.scv.vcvId})
            </ExternalLink>
          }
        </Col>
      </Row>

      {/* if current user is not the annotation creator, display the creator's name */}
      {renderAnnotationSubmitter()}

      {/* curation form */}
      <PubMedNotesBox className="mt-4" activeAnnotation={activeAnnotation} />

      {activeAnnotation.article?.abstract && (
        <Row className="mt-4">
          <Col>
            <h4>Abstract</h4>
            <p>{activeAnnotation.article.abstract}</p>
          </Col>
        </Row>
      )}
    </CardPanel>
  );
};
GdmArticleCurationPanel.propTypes = {
  activeAnnotation: PropTypes.object,
};
