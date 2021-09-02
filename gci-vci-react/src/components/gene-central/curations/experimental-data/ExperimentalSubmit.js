import React from 'react';
import { useSelector } from 'react-redux'
import { useHistory, Link } from 'react-router-dom';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBriefcase } from '@fortawesome/free-solid-svg-icons';
import lodashGet from 'lodash/get';

const ExperimentalSubmit = ({
  submitExperimental
}) => {

  const history = useHistory();

  const gdm = useSelector((state) => state.gdm.entity);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  });

  // Build the link to go back and edit the newly created experimental page
  const editExperimentalLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(submitExperimental, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/experimental-curation/${submitExperimental.PK}/edit`
    : '';
  const addNewExperimentalLink = `/curation-central/${gdm.PK}/annotation/${annotation.PK}/experimental-curation`;
  const returnToCurationLink = `/curation-central/${gdm.PK}/annotation/${annotation.PK}`;

  return (submitExperimental ? (
    <div>
      <div className="viewer-titles submit-titles">
        <h1>
          {submitExperimental.evidenceType}
          <br />
          {`Experimental Data Information: ${submitExperimental.label || ''} `}
        </h1>
        <Link to={editExperimentalLink} className="btn btn-info">Edit/Assess</Link>
      </div>
      <Row>
        <Col sm={{ span: 10, offset: 1 }}>
          <div className="submit-results-panel">
            <div className="submit-results-panel-info">
              <em>Your Experimental Data has been added!</em>
            </div>
          </div>
          {submitExperimental && annotation &&
            <div className="submit-results-panel submit-results-response d-flex justify-content-center">
              <Button
                variant="outline-dark"
                className="btn-light"
                onClick={() => history.push(addNewExperimentalLink)}
              >
                Add another Experimental Data entry
              </Button>
              <Button
                variant="outline-dark"
                className="ml-3 btn-light"
                onClick={() => history.push(returnToCurationLink)}
              >
                Return to Record Curation page <FontAwesomeIcon icon={faBriefcase} />
              </Button>
            </div>
          }
        </Col>
      </Row>
    </div>
  ) : (
    <Jumbotron>
      <Container>
        <h2>Experimental data not found</h2>
      </Container>
    </Jumbotron>
  ));
};

export default ExperimentalSubmit;
