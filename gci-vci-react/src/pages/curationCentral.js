import React from "react";
import { useSelector } from "react-redux";
import { Row, Col, Container } from "react-bootstrap";

import LoadingSpinner from "../components/common/LoadingSpinner";
import { GdmHeader } from "../components/gene-central/GdmHeader";
import { GdmClassificationRecords } from "../components/gene-central/GdmClassificationRecords";
import { GdmArticleSelectionList } from "../components/gene-central/GdmArticleSelectionList";
import { GdmArticleCurationPanel } from "../components/gene-central/GdmArticleCurationPanel";
import { GdmCurationPalette } from "../components/gene-central/GdmCurationPalette";
import GdmVariantsPanel from "../components/gene-central/GdmVariantsPanel";
import Alert from "../components/common/Alert";


export const CurationCentral = () => {
  const annotationsIsLoading = useSelector(state => state.annotations.isLoading);
  const annotationsFetchErrorMessage = useSelector(state => state.annotations.fetchErrorMessage);

  const activeAnnotation = useSelector(
    ({ annotations: { activePK, allPKs, byPK } }) => {
      return activePK && allPKs.length && byPK[activePK]
        ? byPK[activePK]
        : null;
    }
  );

  return (
    <>
      <GdmHeader />
      <Container fluid>
        <Row>
          <Col md="12">
            <GdmClassificationRecords className="mx-2" />
          </Col>
        </Row>
        <Row>
          <Col md="12">
          <GdmVariantsPanel className="mr-2 ml-2" />
          </Col>
        </Row>
      </Container>
      <Container fluid className="gdm-evidence-curation-container">
        {
          annotationsIsLoading ? (
            <div className="m-4 text-center">
              <LoadingSpinner />
              Loading Annotations
            </div>
          ) 
          : annotationsFetchErrorMessage ? (
            <Alert className="m-4" heading="Failed to load annotations">
              <p>
                Below is more detail information about the error:
              </p>
              <p>
                {annotationsFetchErrorMessage}
              </p>
            </Alert>
          ) : (
            <Row className="curation-content">
              <Col md="3">
                <GdmArticleSelectionList activeAnnotation={activeAnnotation} />
              </Col>
              <Col md="6">
                <GdmArticleCurationPanel activeAnnotation={activeAnnotation} />
              </Col>
              <Col md="3">
                {activeAnnotation ? <GdmCurationPalette activeAnnotation={activeAnnotation} /> : null}
              </Col>
            </Row>
          )
        }
      </Container>
    </>
  );
};
CurationCentral.propTypes = {};
export default CurationCentral;
