import React from "react";
import PropTypes from "prop-types";

import PmidSummary from "../common/article/PmidSummary";
import { Card, Row, Col, Jumbotron } from "react-bootstrap";
import { ExternalLink } from "../common/ExternalLink";
import { EXTERNAL_API_MAP } from "../../constants/externalApis";
import { PubMedNotesBox } from "./PubMedNotesBox";
import { useSelector } from "react-redux";
import CardPanel from "../common/CardPanel";

export const GdmArticleCurationPanel = ({ activeAnnotation }) => {
  const auth = useSelector(state => state.auth);

  const hasAnnotation = useSelector(
    (state) => !!state.annotations.allPKs.length
  );

  return !activeAnnotation ? (
    <Card className="placeholder-pmid-overview">
      <Card.Body>
        <Jumbotron className="text-center m-0">
          {hasAnnotation ? (
            <>
              <h2>Select a paper</h2>
              <p>
                Click on any added paper at left panel to view its abstract
                and begin curating evidence from that paper.
              </p>
            </>
          ) : (
            <>
              <h2>Add a paper</h2>
              <p>
                Add papers to this Gene-Disease Record using the left panel.
              </p>
            </>
          )}
        </Jumbotron>
      </Card.Body>
    </Card>
  ) : (
    <CardPanel title={`Notes for PMID:${activeAnnotation.article.pmid}`}>
      {/* article summary */}
      <Row>
        <Col>
          <PmidSummary article={activeAnnotation.article} />
        </Col>
      </Row>

      {/* article external link */}
      <Row>
        <Col>
          <ExternalLink
            asButton
            href={`${EXTERNAL_API_MAP["PubMed"]}${activeAnnotation.article.PK}`}
          >
            PubMed
          </ExternalLink>
        </Col>
      </Row>

      {/* if current user is not the annotation creator, display the creator's name */}
      {activeAnnotation.submitted_by && activeAnnotation.submitted_by.PK !== auth.PK ? (<div>PMID:{activeAnnotation.article.PK} added by {activeAnnotation.submitted_by.name} {activeAnnotation.submitted_by.family_name}</div>) : null}

      {/* curation form */}
      <PubMedNotesBox className="mt-4" activeAnnotation={activeAnnotation} />

      {activeAnnotation.article.abstract ? (
        <Row className="mt-4">
          <Col>
            <h4>Abstract</h4>
            <p>{activeAnnotation.article.abstract}</p>
          </Col>
        </Row>
      ) : null}
    </CardPanel>
  );
};
GdmArticleCurationPanel.propTypes = {
  activeAnnotation: PropTypes.object,
};
