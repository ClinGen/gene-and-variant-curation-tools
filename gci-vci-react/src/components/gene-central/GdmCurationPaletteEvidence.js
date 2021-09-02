import React from "react";
import PropTypes from "prop-types";
import isEmpty from "lodash/isEmpty";
import lodashGet from "lodash/get";
import { Card, ListGroup, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { faPlusCircle, faPencilAlt, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getUserName } from "../../helpers/getUserName";
import { getFormattedDateTime } from "../../utilities/dateTimeUtilities";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getRouteTypeCuration, getEvidenceByPKFromActiveAnnotation } from "../../utilities/gdmEvidenceUtilities";
import { isOwnedByCurrentCuratingEntity } from "../../utilities/ownershipUtilities";

export const GdmCurationPaletteEvidenceList = ({
  evidenceList = [],
  title,
  plusIconHref,
  allowAdd
}) => {
  return (
    <>
      <Card className={`gdm-evidence__card-list-group-head ${evidenceList.length ? '' : 'gdm-curation-palette__card-list-group-head__empty-list'} ${allowAdd ? '' : ' no-add'}`}>
        {allowAdd ? (
          <Link className="text-decoration-none" to={plusIconHref}>
            <Card.Header as="h5" className={`mt-0 mb-0 pt-2 pb-2 text-white border-0`}>
              <span>{title}</span>
              <FontAwesomeIcon className="float-right" icon={faPlusCircle} />
            </Card.Header>
          </Link>
        ) : (
          <Card.Header as="h5" className={`mt-0 mb-0 pt-2 pb-2 text-white border-0`}>
            <span>{title}</span>
          </Card.Header>
        )}
      </Card>
      <ListGroup className="mb-2 rounded-0">
        {evidenceList.map((evidence, index) => {
          return (
            <ListGroup.Item key={index} className="gdm-curation-palette__card-list-group-item">
              <GdmCurationPaletteEvidence allowAdd={allowAdd} evidence={evidence} />
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </>
  );
};
GdmCurationPaletteEvidenceList.propTypes = {
  evidenceList: PropTypes.array,
  title: PropTypes.string,
  // the href link the plus icon links to
  plusIconHref: PropTypes.string.isRequired
};

export const GdmCurationPaletteEvidence = ({ allowAdd, evidence }) => {
  const auth = useSelector(state => state.auth);
  const allowEdit = allowAdd && isOwnedByCurrentCuratingEntity(evidence, auth);

  const gdmPK = useSelector(state => state.gdm.entity.PK);
  const annotationPK = useSelector(state => state.annotations.activePK);
  const typeCuration = getRouteTypeCuration(evidence.item_type);

  // Associations (only for family and individual, which have a parent evidence to associated with)
  const associatedEvidencesMeta = useSelector(state => {
    if (!['family', 'individual'].includes(evidence.item_type)) {
      return null;
    }

    return ['associatedGroups', 'associatedFamilies'].filter(key => evidence[key])
    .map(key => {
      const associatedEvidenceItemType = key === 'associatedGroups' ? 'group' : 'family';
      const associatedEvidencePK = evidence[key] && evidence[key].length > 0 ? evidence[key][0] : '';
      const associatedEvidenceLabel = getEvidenceByPKFromActiveAnnotation(state.annotations, associatedEvidencePK).label || '--';
      const associatedEvidenceTypeCuration = getRouteTypeCuration(associatedEvidenceItemType);
      return {
        pk: associatedEvidencePK, label: associatedEvidenceLabel, typeCuration: associatedEvidenceTypeCuration
      }
    })
  });

  // experimental subtype
  let experimentalEvidenceSubtype = '';
  if (evidence.item_type === 'experimental') {
    // determine if the evidence type has a subtype, and determine the subtype
    if (evidence.evidenceType === 'Biochemical function') {
        if (!isEmpty(evidence.biochemicalFunction.geneWithSameFunctionSameDisease)) {
            experimentalEvidenceSubtype = ' (A)';
        } else if (!isEmpty(evidence.biochemicalFunction.geneFunctionConsistentWithPhenotype)) {
            experimentalEvidenceSubtype = ' (B)';
        }
    } else if (evidence.evidenceType === 'Expression') {
        if (!isEmpty(evidence.expression.normalExpression)) {
            experimentalEvidenceSubtype = ' (A)';
        } else if (!isEmpty(evidence.expression.alteredExpression)) {
            experimentalEvidenceSubtype = ' (B)';
        }
    }
  }

  // variants
  const variants = evidence.item_type === 'family' ? lodashGet(evidence, 'segregation.variants', []) 
    : ['individual', 'experimental'].includes(evidence.item_type) ? evidence.variants || []
    : [];

  const viewLinkHelpText = (
    ['individual', 'caseControl', 'experimental'].includes(evidence.item_type)
  ) ? `View/Score ${evidence.item_type} evidence`
    : `View ${evidence.item_type} evidence`;

  return (
    <>
      {/* label link */}
      <div>
        <OverlayTrigger placement="auto" overlay={<Tooltip>{viewLinkHelpText}</Tooltip>}>
          <Link to={`/curation-central/${gdmPK}/annotation/${annotationPK}/${typeCuration}/${evidence.PK}/view`}>
            <strong>{evidence.label || '--'}</strong>
          </Link>
        </OverlayTrigger>

        {evidence.item_type === 'individual' && evidence.proband ? <i className="icon icon-proband"></i> : null}

        {/* edit link */}
        {allowEdit ? 
          <span className="float-right">
            <Link to={`/curation-central/${gdmPK}/annotation/${annotationPK}/${typeCuration}/${evidence.PK}/edit`}><FontAwesomeIcon icon={faPencilAlt} /> Edit</Link>
          </span> : null}
      </div>

      {/* experimental subtype */}
      {evidence.item_type === 'experimental' ? (
        <div>{evidence.evidenceType}{experimentalEvidenceSubtype}</div>
      ) : null}
      
      {/* last edited by */}
      <h6 className="mt-2">
        Last edited by: {getUserName(evidence.modified_by || evidence.submitted_by)}
      </h6>
      <h6><FontAwesomeIcon icon={faCalendarAlt} /> {getFormattedDateTime(evidence.last_modified, 'lll', true)}</h6>
      
      {/* Association (associated evidence, only applicable to case level evidences) */}
      {Array.isArray(associatedEvidencesMeta) ? 
        <div>
          {associatedEvidencesMeta.length ? (
            <>
              Associations:{' '}
              {(
                associatedEvidencesMeta.map((evidenceMeta, index) => 
                  <span key={evidenceMeta.pk}>
                    <Link to={`/curation-central/${gdmPK}/annotation/${annotationPK}/${evidenceMeta.typeCuration}/${evidenceMeta.pk}/view`}>{evidenceMeta.label}</Link>
                    {index !== associatedEvidencesMeta.length - 1 ? ', ' : null}
                  </span>)
              )}
            </>
          ) : 'No Association'}
        </div>
        : null
      }

      {/* variants */}
      {variants.length ? (
        <div>Variants: <strong>{variants.length}</strong></div>
      ) : null}

      {/* add indivudal or family (case level evidence only) */}
      {allowEdit ? (
        <div className="d-flex flex-wrap">
          {evidence.item_type === 'group' ? (
            <Button className="mt-1 mr-2" variant="light" as={Link} to={`/curation-central/${gdmPK}/annotation/${annotationPK}/family-curation?parentTypeCuration=${typeCuration}&parentEvidencePK=${evidence.PK}`}>Add Family</Button>
          ) : null}

          {['group', 'family'].includes(evidence.item_type) ? (
            <Button className="mt-1" variant="light" as={Link} to={`/curation-central/${gdmPK}/annotation/${annotationPK}/individual-curation?parentTypeCuration=${typeCuration}&parentEvidencePK=${evidence.PK}`}>
              Add Individual
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
};
GdmCurationPaletteEvidence.propTypes = {
  evidence: PropTypes.object,
};
