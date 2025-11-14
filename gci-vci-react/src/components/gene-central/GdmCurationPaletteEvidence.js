import React from "react";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import isEmpty from "lodash/isEmpty";
import lodashGet from "lodash/get";
import { Card, ListGroup, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import {
  faPlusCircle,
  faPencilAlt,
  faChevronUp,
  faChevronDown
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getRouteTypeCuration, getEvidenceByPKFromActiveAnnotation } from "../../utilities/gdmEvidenceUtilities";

export const GdmCurationPaletteEvidenceList = ({
  evidenceList = [],
  title,
  plusIconHref,
  allowAdd,
  showList=true
}) => {

  const [ show, setShow ] = useState(showList);

  useEffect(() => {
    setShow(showList);
  }, [evidenceList]);

  const handleAccordionClick = (e) => {
    e.preventDefault(); // Prevent auto-scroll to top on state change
    setShow(!show);
  }

  const showAccordionIcon = show
    ? <FontAwesomeIcon icon={faChevronUp} />
    : <FontAwesomeIcon icon={faChevronDown} />;

  return (
    <>
      <Card
        className={`gdm-evidence__card-list-group-head
          ${evidenceList?.length ?
            ''
          : 'gdm-curation-palette__card-list-group-head__empty-list'}
            ${allowAdd ? '' : ' no-add'}`
        }
      >
        <Card.Header as="h5" className="my-0 py-1 text-white border-0">
          <>
            <span>{title}</span>
            <span>
              <a href="#"
                className="ml-4 text-white"
                onClick={handleAccordionClick}
              >
                {showAccordionIcon}
              </a>
            </span>
            {allowAdd ? (
              <Link className="text-decoration-none text-white"
                to={plusIconHref}
              >
                <FontAwesomeIcon className="float-right" icon={faPlusCircle} />
              </Link>
            ) : null}
          </>
        </Card.Header>
      </Card>

      {/* if evidence list is hidden, display a gap between groups */}
      {!show && <div className="mb-1" />}

      <ListGroup className={`mb-1 rounded-0 ${!show ? "hidden" : ""}`}>
        {evidenceList?.length ?
          evidenceList.map((evidence, index) => {
            return (
              <ListGroup.Item
                key={index}
                className="py-1 gdm-curation-palette__card-list-group-item"
              >
                <GdmCurationPaletteEvidence allowAdd={allowAdd} evidence={evidence} />
              </ListGroup.Item>
            );
          })
        :
          <ListGroup.Item
            className="py-1 gdm-curation-palette__card-list-group-item text-center text-muted"
          >
            No {title} has been added
          </ListGroup.Item>
        }
      </ListGroup>
    </>
  );
};

GdmCurationPaletteEvidenceList.propTypes = {
  evidenceList: PropTypes.array,
  title: PropTypes.string,
  // the href link the plus icon links to
  plusIconHref: PropTypes.string.isRequired,
  allowAdd: PropTypes.boolean,
  showList: PropTypes.boolean
};

export const GdmCurationPaletteEvidence = ({ allowAdd, evidence }) => {
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
    if (evidence.evidenceType === 'Biochemical Function') {
      if (!isEmpty(evidence.biochemicalFunction?.geneWithSameFunctionSameDisease)) {
        experimentalEvidenceSubtype = ' (A)';
      } else if (!isEmpty(evidence.biochemicalFunction?.geneFunctionConsistentWithPhenotype)) {
        experimentalEvidenceSubtype = ' (B)';
      }
    } else if (evidence.evidenceType === 'Expression') {
      if (!isEmpty(evidence.expression?.normalExpression)) {
        experimentalEvidenceSubtype = ' (A)';
      } else if (!isEmpty(evidence.expression?.alteredExpression)) {
        experimentalEvidenceSubtype = ' (B)';
      }
    }
  }

  /**
   * Render current evidence score
   * Only individual, case control and experimental evidences have score
  */
  const renderEvidenceScore = () => {
    let calculatedScore = 0, modifiedScore = 0;

    // Only count score if scoreStatus is 'Score'
    // Individual evidence:
    // pre-SOPv8 has scores[] which no longer used so counted as 0 score
    // only consider score in variantScores[]
    if (evidence.item_type === 'individual' && evidence.variantScores?.length) {
      for (var i=0; i<evidence.variantScores.length; i++) {
        if (evidence.variantScores[i].scoreStatus === 'Score') {
          calculatedScore += evidence.variantScores[i].calculatedScore;
          modifiedScore += evidence.variantScores[i].score
            ? evidence.variantScores[i].score
            : evidence.variantScores[i].calculatedScore;
        }
      }
    }

    // Case Control and Experimal evidences has scores[]
    if ((evidence.item_type === 'caseControl' ||
      evidence.item_type === 'experimental') && evidence.scores?.length) {
      // Should only has one score so take the first one
      if (evidence.scores[0].scoreStatus === 'Score') {
        calculatedScore = evidence.scores[0].calculatedScore;
        modifiedScore = evidence.scores[0].score
          ? evidence.scores[0].score
          : evidence.scores[0].calculatedScore;
      }
    }

    return (
      <span className="ml-2">
        <strong>Score: {modifiedScore}
          {evidence.item_type !== 'caseControl' ?
            <> ({calculatedScore})</>
          : null}
        </strong>
      </span>
    );
  };

  // Get variants that are included in the evidence
  let variants = [];
  switch (evidence.item_type) {
    case 'family':
      variants = lodashGet(evidence, 'segregation.variants', []);
      break;
    case 'individual':
      // SOPv8 and after proband individual has variantScores[] so consider this list first
      // pre-SOPv8 proband and non-proband individual has variants[]
      variants = evidence.proband ? (
        evidence.variantScores ?
          evidence.variantScores
        : evidence.variants
      ) : (evidence.variants ? evidence.variants : []);
      break;
    case 'experimental':
      variants = evidence.variants ? evidence.variants : [];
      break;
  }

  const viewLinkHelpText = evidence.item_type === "caseControl"
    ? "View Case-Control evidence"
    : `View ${evidence.item_type} evidence`;

  return (
    <>
      <div>
        {/* label link */}
        <OverlayTrigger
          placement="auto"
          overlay={<Tooltip>{viewLinkHelpText}</Tooltip>}>
          <Link
            to={`/curation-central/${gdmPK}/annotation/${annotationPK}/${typeCuration}/${evidence.PK}/view`}
          >
            <strong>{evidence.label || '--'}</strong>
          </Link>
        </OverlayTrigger>

        {/* proband icon */}
        {evidence.item_type === 'individual' && evidence.proband ?
          <i className="icon icon-proband"></i>
        : null}

        {/* evidence score */}
        {evidence.item_type === 'individual' ||
          evidence.item_type === 'caseControl' ||
          evidence.item_type === 'experimental' ?
          renderEvidenceScore()
        : null}

        {/* edit link */}
        {allowAdd ?
          <span className="float-right">
            <Link
              to={`/curation-central/${gdmPK}/annotation/${annotationPK}/${typeCuration}/${evidence.PK}/edit`}
            >
              <FontAwesomeIcon icon={faPencilAlt} /> Edit
            </Link>
          </span>
        : null}
      </div>

      {/* experimental subtype */}
      {evidence.item_type === 'experimental' ? (
        <div>Type: {evidence.evidenceType}{experimentalEvidenceSubtype}</div>
      ) : null}

      {/* Association (associated evidence, only applicable to case level evidences) */}
      {Array.isArray(associatedEvidencesMeta) ? 
        <div>
          {associatedEvidencesMeta.length ? (
            <>
              Associations:{' '}
              {(
                associatedEvidencesMeta.map((evidenceMeta, index) => 
                  <span key={evidenceMeta.pk}>
                    <Link
                      to={`/curation-central/${gdmPK}/annotation/${annotationPK}/${evidenceMeta.typeCuration}/${evidenceMeta.pk}/view`}
                    >
                      {evidenceMeta.label}
                    </Link>
                    {index !== associatedEvidencesMeta.length - 1 ? ', ' : null}
                  </span>)
              )}
            </>
          ) : 'No Association'}
        </div>
      : null}

      {/* variants */}
      {variants?.length ? (
        <div>Variants: <strong>{variants.length}</strong></div>
      ) : null}

      {/* add indivudal or family link (case level evidence only) */}
      {allowAdd ? (
        <div className="d-flex flex-wrap justify-content-end">
          {/* add individual or family (case level evidence only) */}
          {evidence.item_type === 'group' ? (
            <Button
              className="py-0"
              variant="light"
              as={Link}
              to={`/curation-central/${gdmPK}/annotation/${annotationPK}/family-curation?parentTypeCuration=${typeCuration}&parentEvidencePK=${evidence.PK}`}
            >
              Add Family
            </Button>
          ) : null}

          {['group', 'family'].includes(evidence.item_type) ? (
            <Button
              className="py-0 ml-1"
              variant="light"
              as={Link}
              to={`/curation-central/${gdmPK}/annotation/${annotationPK}/individual-curation?parentTypeCuration=${typeCuration}&parentEvidencePK=${evidence.PK}`}
            >
              Add Individual
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

GdmCurationPaletteEvidence.propTypes = {
  allowAdd: PropTypes.boolean,
  evidence: PropTypes.object
};
