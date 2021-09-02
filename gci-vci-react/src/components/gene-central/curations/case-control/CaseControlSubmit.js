import React from 'react';
import { useSelector } from 'react-redux'
import { useHistory, Link } from "react-router-dom";
import { Jumbotron, Container, Row, Col, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import lodashGet from "lodash/get";
import LoadingSpinner from '../../../common/LoadingSpinner';


const CaseControlSubmit = ({
  submitCaseControl,
  ...props }) => {

  const history = useHistory();

  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  });
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);

  const caseControl = submitCaseControl;

  // Build the link to go back and edit the newly created case control page
  const editCaseControlLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(caseControl, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/case-control-curation/${caseControl.PK}/edit`
    : '';
  // Build the link to add more case control
  const addCaseControlLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/case-control-curation` : "/dashboard";
  // Build back to curation page
  const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
    : "/dashboard";

  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : caseControl ? (
    <>
      <div className="viewer-titles submit-titles">
        <h1>Case Control Information: {caseControl.label}</h1> <Link to={editCaseControlLink} className="btn btn-info">Edit</Link>
      </div>
        <div className="submit-results-panel">
        <p><em>Your Case-Control Data has been saved!</em></p>
        </div>
        <div className="submit-results-panel submit-results-response">
          <div className="submit-results-buttons">
            <Row>
              <Col sm="6">
                <span className="group-submit-results-btn">
                  <Button variant="outline-dark" onClick={e => history.push(addCaseControlLink)}>Add another Case-Control entry</Button>
                </span>
              </Col>
              <Col sm="6">
                <span className="group-submit-results-btn">
                  <Button variant="outline-dark" onClick={e => history.push(curationLink)}>Return to Record Curation page <FontAwesomeIcon icon={faBriefcase}/></Button>
                </span>
              </Col>
            </Row>
          </div>
        </div>
    </>
  ) : (
    <Jumbotron>
      <Container>
        <h2>Case Control not found</h2>
      </Container>
    </Jumbotron>
  );
}

export default CaseControlSubmit;
