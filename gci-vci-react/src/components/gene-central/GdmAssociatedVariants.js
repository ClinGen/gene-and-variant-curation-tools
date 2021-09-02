import React from "react";
import PropTypes from 'prop-types';
import { Card, ListGroup, Row, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useEvidenceByPKFromAnnotation, getRouteTypeCuration } from "../../utilities/gdmEvidenceUtilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";


export const AssociatedVariants = ({ variantList }) => {
  return (
    <>
      <h4 className="mt-4">
        Associated Variants
      </h4>

      <Card className={`bg-light border-bottom-0 gdm-associated-variant__card-list-group-head`}>
        <Card.Header as="h6">
          <FontAwesomeIcon icon={faInfoCircle} /> Curate Variants from the “Gene-Disease Record Variants” section above.
        </Card.Header>
      </Card>

      <ListGroup className="mb-2">
        {!variantList.length && (
          <ListGroup.Item className="gdm-curation-palette__card-list-group-item text-center text-muted">
            No variants in any evidence yet
          </ListGroup.Item>
        )}

        {variantList.map((variant, index) => {
          return (
            <ListGroup.Item key={index} className="gdm-curation-palette__card-list-group-item">
              <AssociatedVariantCardBody variant={variant} />
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </>
  );
};
AssociatedVariants.propTypes = {
  variantList: PropTypes.array,
};

const AssociatedVariantCardBody = ({ variant }) => {
  const gdmPK = useSelector(state => state.gdm.entity.PK);
  const activeAnnotationPK = useSelector(state => state.annotations.activePK);
  const evidenceByPK = useEvidenceByPKFromAnnotation(activeAnnotationPK);

  return (
    <>
      <Row>
        <Col className="text-truncate">
          <OverlayTrigger delay={500} placement="auto" trigger={['click', 'hover', 'focus']} overlay={<Tooltip>{variant.preferredTitle}</Tooltip>}>
            <strong>{variant.preferredTitle}</strong>
          </OverlayTrigger>
        </Col>
      </Row>
      <Row>
        <Col>
          Associations:{' '}
          {variant.associatedEvidences.map(PK => evidenceByPK[PK]).map((evidence, index) => {
            const typeCuration = getRouteTypeCuration(evidence.item_type);
            return (
              <React.Fragment key={index} >
                <Link to={`/curation-central/${gdmPK}/annotation/${activeAnnotationPK}/${typeCuration}/${evidence.PK}/view`} >{evidence.label}</Link>

                {evidence.item_type === 'individual' && evidence.proband ? <i className="icon icon-proband"></i> : null}

                {index !== variant.associatedEvidences.length - 1 && <span>, </span>}
              </React.Fragment>
            )
          })}
        </Col>
      </Row>
    </>
  )
}