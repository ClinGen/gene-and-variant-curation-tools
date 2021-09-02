import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux'
import { useHistory, Link } from "react-router-dom";
import { Jumbotron, Container, Row, Col, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import lodashGet from "lodash/get";
import Input from "../../../common/Input";
import LoadingSpinner from '../../../common/LoadingSpinner';


export const GroupSubmit = ({
  submitGroup,
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

  // ??? need to check if user can edit this const auth = useSelector((state) => state.auth);

  const [ group, setGroup ] = useState(submitGroup);
  const [ haveFamily, setHaveFamily ] = useState("none");
  const [ disabled, setDisabled ] = useState(false);

  useEffect (() => {
    setGroup(submitGroup);
  }, []);

  // Handle value changes in the form
  const handleChange = (e) => {
    if (e.target.name === 'havefamily') {
      setHaveFamily(e.target.value);
      setDisabled(true);
    }
  };

  const renderAddFamily = () => {
    const addFamilyLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(group, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/family-curation?parentTypeCuration=group-curation&parentEvidencePK=${group.PK}` : '';
    const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
      : "/dashboard";

    return (
      <div className="submit-results-panel submit-results-response">
        <p>
          <em>Any variant associated with a proband in a Family is captured at the Family level.</em>
        </p>
        <div className="group-submit-results-choices">
          <span className="submit-results-buttons">
            <div className="submit-results-note">To associate segregation, variant, or any other information for a family, <strong>Add New Family for this Group</strong>.</div>
            <Button variant="outline-dark" onClick={e => history.push(addFamilyLink)}>Add New Family for this Group</Button>
          </span>
          <span className="submit-results-choices-sep">OR</span>
          <span className="submit-results-buttons">
            <div className="submit-results-note">If you have previously created an entry for this Family, <strong>Return to Record Curation page</strong> to add this Family to the newly created Group.</div>
            <Button variant="outline-dark" onClick={e => history.push(curationLink)}>Return to Record Curation page <FontAwesomeIcon icon={faBriefcase}/></Button>
          </span>
        </div>
      </div>
    );
  };

  const renderAddIndividual = () => {
    const addIndividualLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(group, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/individual-curation?parentTypeCuration=group-curation&parentEvidencePK=${group.PK}`
      : "";
    const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
      : "/dashboard";

    return (
      <div className="submit-results-panel submit-results-response">
        <p>
          <em>Any variant associated with an individual that is a member of a Group but not part of a Family is captured at the Individual level.</em>
        </p>
        <div className="group-submit-results-choices">
          <span className="submit-results-buttons">
            <div className="submit-results-note">To associate a variant and/or information such as age, race, etc. with an individual in the Group, <strong>Add New Individuals for this Group</strong>.</div>
            <Button variant="outline-dark" onClick={e => history.push(addIndividualLink)}>Add New Individuals for this Group</Button>
          </span>
          <span className="submit-results-choices-sep">OR</span>
          <span className="submit-results-buttons">
            <div className="submit-results-note">If you have previously created an entry for this Individual, <strong>Return to Record Curation page</strong> to add this Individual to the newly created Group.</div>
            <Button variant="outline-dark" onClick={e => history.push(curationLink)}>Return to Record Curation page <FontAwesomeIcon icon={faBriefcase}/></Button>
          </span>
        </div>
      </div>
    );
  };

  // Get the query strings. Have to do this now so we know whether to render the form or not. The form
  // uses React controlled inputs, so we can only render them the first time if we already have the
  // family object read in.

  // Build the link to go back and edit the newly created group page
  const editGroupLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(group, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/group-curation/${group.PK}/edit`
    : '';

  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : group ? (
    <div>
      <div className="viewer-titles submit-titles">
        <h1>Group Information: {group.label}</h1> <Link to={editGroupLink} className="btn btn-info">Edit</Link>
      </div>
      <Row>
        <Col sm={{ span: 10, offset: 1 }}>
          <div className="submit-results-panel">
            <form className="form-horizontal mt-5">
              <Input type="select" name="havefamily"
                label="Do any of the probands or other individuals in this Group have Family Information?" groupClassName="row mb-3"
                value={haveFamily} onChange={handleChange}
                labelClassName="col-sm-7 control-label" wrapperClassName="col-sm-5"
              >
                <option value="none" disabled={disabled}>No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </Input>
            </form>
            <p>
              <em><strong>Note</strong>: Family Information includes any information about a proband in the group that is part of family and any relatives of the proband
                (e.g. average age of onset, race, family ethnicity, etc.) and information about segregation of phenotype(s) and variant(s).</em>
            </p>
          </div>
        </Col>
      </Row>
      <Row>
        <Col sm={{ span: 10, offset: 1 }}>
          {(haveFamily === 'Yes' && gdm && annotation && group)
            ? renderAddFamily()
            : ((haveFamily === 'No' && gdm && annotation && group)
              ?renderAddIndividual()
              : null)
          }
        </Col>
      </Row>
    </div>
  ) : (
    <Jumbotron>
      <Container>
        <h2>Group not found</h2>
      </Container>
    </Jumbotron>
  );
};

