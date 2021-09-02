import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux'
import { Jumbotron, Container, Row, Col, Button } from "react-bootstrap";
import { useHistory, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import { cloneDeep, get as lodashGet } from "lodash";
import { getEvidenceByPKFromActiveAnnotation } from "../../../../utilities/gdmEvidenceUtilities";
import LoadingSpinner from '../../../common/LoadingSpinner';


export const FamilySubmit = ({
  submitFamily,
  associatedGroup = null,
  hadVar,
  ...props }) => {

  const history = useHistory();

  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotations = useSelector(state => state.annotations);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  })
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);

  const [ family, setFamily ] = useState(submitFamily);
  const [ haveIndividual, setHaveIndividual ] = useState("none");

  useEffect (() => {
    setFamily(submitFamily);
  }, []);

  // Handle value changes in the form
  const handleChange = (e) => {
    if (e.target.name === 'haveindividual') {
      setHaveIndividual(e.target.value);
    }
  };

  const renderHasVariantPanel = (probandIndividual) => {
    /* ???
                                                    <a className="btn btn-default" href={'/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&individual=' + probandIndividual.uuid}>Score / Add information about proband</a>
                                                    <a className="btn btn-default" href={'/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&individual=' + probandIndividual.uuid}>Score / Add information about proband</a>
    */

    const baseProbandIndLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(probandIndividual, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/individual-curation/${probandIndividual.PK}`
      : null;
    const viewProbandIndLink = baseProbandIndLink ? `${baseProbandIndLink}/view` : '';
    const editProbandIndLink = baseProbandIndLink ? `${baseProbandIndLink}/edit` : '';
    const addIndToFamilyLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(family, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/individual-curation?parentTypeCuration=family-curation&parentEvidencePK=${family.PK}`
      : '';
    const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/`
      : "/dashboard";

    return (
      <div className="submit-results-panel">
        <div className="submit-results-panel-info">
          <p>An individual entry for the proband <strong><Link to={viewProbandIndLink}>{lodashGet(probandIndividual, "label", null)}</Link></strong> and its associated variant(s) has been created.</p>
          <p>You can score and add additional information about this proband, create an entry for a non-proband in this Family, or return to the Record Curation page.</p>
          <p><em><strong>Note</strong>: Individual information includes associated variant(s), phenotypes, sex, etc. For a proband, variant information can only be added or edited on the Family page as it is associated with segregation information.</em></p>
        </div>
        <div className="submit-results-buttons">
          <Row className="mb-3">
            <Col sm="6">
              <span className="family-submit-results-btn">
                <Button variant="light" onClick={e => history.push(editProbandIndLink)}>Score / Add information about proband</Button>
              </span>
            </Col>
            <Col sm="6">
              <span className="family-submit-results-btn">
                <Button variant="light" onClick={e => history.push(addIndToFamilyLink)}>Add non-proband Individual</Button>
              </span>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col sm={{ span: 6, offset: 3 }}>
              <span className="family-submit-results-btn">
                <Button variant="light" onClick={e => history.push(curationLink)}>Return to Record Curation page <FontAwesomeIcon icon={faBriefcase}/></Button>
              </span>
            </Col>
          </Row>
        </div>
      </div>
    );
  };

  const renderEditFamilyButton = (probandIndividual) => {
    // ??? associatedGroup should have been added to family object by now
    const editFamilyLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(family, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/family-curation/${family.PK}/edit`
    : '';

    return (
      <div className="family-submit-results-choices">
        <Row className="mb-3">
          <Col sm={{ span: 8, offset: 4 }}>
            <span className="family-submit-results-btn">
              <Button variant="outline-dark" onClick={e => history.push(editFamilyLink)}>Edit this Family</Button>
            </span>   
          </Col>
        </Row>
      </div>  
    );
  };

  const renderAddNonProband = () => {
    const addIndToFamilyLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(family, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/individual-curation?parentTypeCuration=family-curation&parentEvidencePK=${family.PK}`
      : '';
    const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/`
      : "/dashboard";

    return (
      <div className="family-submit-results-choices">
        <div className="submit-results-panel-info">
          <p>You can add information about non-proband Individuals in this Family, including variant information by creating an Individual entry for them.</p>
          <p><strong>Note</strong>: Individual information includes associated variant(s), phenotypes, sex, etc.</p>
        </div>
        <div className="submit-results-buttons">
          <Row className="mb-3">
            <Col sm="6">
              <span className="family-submit-results-btn">
                <Button variant="outline-dark" onClick={e => history.push(addIndToFamilyLink)}>Add non-proband Individual</Button>
              </span>
            </Col>
            <Col sm="6">
              <span className="family-submit-results-btn">
                <Button variant="outline-dark" onClick={e => history.push(curationLink)}>Return to Record Curation page <FontAwesomeIcon icon={faBriefcase}/></Button>
              </span>
            </Col>
          </Row>
        </div>
      </div>
    );
  };

  const renderNoVariantPanel = (probandIndividual) => {
    const viewProbandIndLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(probandIndividual, "PK", null))
      ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/individual-curation/${probandIndividual.PK}/view`
      : null;

    return (
      <>
      <div className="submit-results-panel">
        {probandIndividual ? 
          <p>An Individual entry for the proband <strong><Link to={viewProbandIndLink}>{probandIndividual.label}</Link></strong> has been created.</p> 
        : null}
        <form className="form-horizontal mt-5">
          <Row className="mb-3">
            <Col sm="7" className="control-label">
              <label><strong>No segregating variant information has been associated with this Family. Would you like to add it?</strong></label>
            </Col>
            <Col sm="5">
              <select name="haveindividual" className="form-control" value={haveIndividual} onChange={handleChange}>
                <option value="none" disabled="disabled">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Col>
          </Row>
        </form>
        <p className="submit-results-panel-info">
          <em><strong>Note</strong>: If you want to associate variant(s) with the proband, you must edit the Family and add variant(s) there. This creates an Individual who is the proband for the Family.</em>
        </p>
      </div>
      {haveIndividual === 'Yes' || haveIndividual === 'No' ?
        <div className="submit-results-panel submit-results-response">
          {(haveIndividual === 'Yes' && gdm && annotation && family) ?
            renderEditFamilyButton()
          : ((haveIndividual === 'No' && gdm && annotation) ?
            renderAddNonProband()
            : null)}
        </div>
      : null}
      </>
    );
  };

  const getProbandIndividual = () => {
    let probandIndividual = null;
    if (family && family.individualIncluded) {
      (family.individualIncluded).forEach(individualPK => {
        const individual = getEvidenceByPKFromActiveAnnotation(annotations, individualPK);
        if (individual.proband) {
          probandIndividual = cloneDeep(individual);
        }
      })
    }
    return probandIndividual;
  };

  // Get the given family's proband individual if it has one; null if it doesn't.
  const probandIndividual = getProbandIndividual();
  const group = associatedGroup
    ? associatedGroup
    : (family && family.associatedGroups && family.associatedGroups.length > 0
      ? getEvidenceByPKFromActiveAnnotation(annotations, family.associatedGroups[0])
      : null);
  // Did family curation code detect that the family had variants, but now doesn't?
  const hasVariants = !!(family && family.segregation && family.segregation.variants && family.segregation.variants.length);
  // ??? const params = new URLSearchParams(lodashGet(props, "location.search", null));
  const hadVariants = (gdm && family) ? hadVar : false;
  // Build the link to go back and edit the newly created family page
  // ??? add associatedGroup
  const editFamilyLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(family, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/family-curation/${family.PK}/edit`
    : '';

  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : family ? (
    <div>
      <div className="viewer-titles submit-titles">
        <h1>{`Family Information: ${family.label}`}</h1> <Link to={editFamilyLink} className="btn btn-info">Edit</Link>
        {group ?
          <h2>{`Group association: ${group.label}`}</h2>
        : null}
      </div>
      <Row>
        <Col sm={{ span: 10, offset: 1}}>
          {hasVariants || hadVariants ?
            renderHasVariantPanel(probandIndividual)
          :
            renderNoVariantPanel(probandIndividual)
          }
        </Col>
      </Row>
    </div>
  ) : (
    <Jumbotron>
      <Container>
        <h2>Family not found</h2>
      </Container>
    </Jumbotron>
  );
};
