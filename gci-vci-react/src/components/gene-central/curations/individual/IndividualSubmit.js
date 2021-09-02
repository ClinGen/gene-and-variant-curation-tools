import React from 'react';
import { useSelector } from 'react-redux'
import lodashGet from "lodash/get";
import { Jumbotron, Container, Row, Col, Button } from "react-bootstrap";
import { useHistory } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import LoadingSpinner from '../../../common/LoadingSpinner';

export const IndividualSubmit = ({
  individual,
  associatedGroup = null,
  associatedFamily = null,
  ...props }) => {

  const history = useHistory();

  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  })
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);

  // Build the link to go back and edit the newly created group page
  /* ???
      {associatedGroup ?
        <h2>{`Group association: ${associatedGroup.label}`}</h2>
        : null}
      {associatedFamily ?
        <h2>{`Family association: ${associatedFamily.label}`}</h2>
        : null}
  */
  const baseLink = lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) 
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
    : null;
  const curationLink = baseLink ? baseLink : "/dashboard";
  const associatedParent = lodashGet(associatedGroup, "PK", null) 
    ? `?parentTypeCuration=group-curation&parentEvidencePK=${associatedGroup.PK}`
    : (lodashGet(associatedFamily, "PK", null) ? `?parentTypeCuration=family-curation&parentEvidencePK=${associatedFamily.PK}` : null);
  const editIndividualLink = baseLink && lodashGet(individual, "PK", null)
    ? `${baseLink}/individual-curation/${individual.PK}/edit` + (associatedParent ? associatedParent : '')
    : null;
  const addIndividualLink = baseLink ? `${baseLink}/individual-curation` + (associatedParent ? associatedParent : '') : null;
  const addIndividualTitle = associatedFamily ? ' for this Family' : (associatedGroup ? ' for this Group' : '');

  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : individual ? (
    <div>
      <div className="viewer-titles submit-titles">
        <h1>{`Individual Information: ${individual.label}`}</h1> <a href={editIndividualLink} className="btn btn-info">Edit</a>
      </div>
      <Row>
        <Col sm={{ span: 11, offset: 1}}>
          <div className="submit-results-panel">
            <Row className="mb-3">
              <Col sm="6">
                {addIndividualLink ?
                  <Button className="btn-individual-submit" variant="light" onClick={e => history.push(addIndividualLink)}>Add Another Individual{addIndividualTitle}</Button>
                  : null}
              </Col>
              <Col sm="6">
                <Button variant="light" className="btn-individual-submit" onClick={e => history.push(curationLink)}>Return to Record Curation page <FontAwesomeIcon icon={faBriefcase}/></Button>
                <div className="submit-results-note">Return to Record Curation page if you would like to add or add or edit a group, family, or individual.</div>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
    </div>
  ) : (
    <Jumbotron>
      <Container>
        <h2>Individual not found</h2>
      </Container>
    </Jumbotron>
  );
};
