import React from "react";
import { Row, Col } from "react-bootstrap";
import PropTypes from "prop-types";
import CardPanel from "../common/CardPanel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faFlask,
} from "@fortawesome/free-solid-svg-icons";
import {
  GdmCurationPaletteEvidenceList,
} from "./GdmCurationPaletteEvidence";
import { AssociatedVariants } from "./GdmAssociatedVariants";
import { useSelector } from "react-redux";
import { isOwnedByCurrentCuratingEntity } from "../../utilities/ownershipUtilities";
import { getAnnotationSourceTitle } from "../../helpers/getAnnotationSourceTitle";

export const GdmCurationPalette = ({ className, activeAnnotation }) => {
  const gdm = useSelector(state => state.gdm.entity);

  const auth = useSelector((state) => state.auth);

  const isPreprint = activeAnnotation?.article?.is_preprint ? true : false;
  const allowAdd = isOwnedByCurrentCuratingEntity(gdm, auth);
  const showList = true;
  
  const [groups, families, individuals, caseControls, experimentalData] = useSelector(state => {
    const allEvidencesByItemType = state.annotations.allEvidencesByItemTypeByAnnotation[activeAnnotation.PK] || {};
    const evidenceByPK = state.annotations.evidenceByPKByAnnotation[activeAnnotation.PK] || {};
    return [
      (allEvidencesByItemType.group || []).map(PK => evidenceByPK[PK]),
      (allEvidencesByItemType.family || []).map(PK => evidenceByPK[PK]),
      (allEvidencesByItemType.individual || []).map(PK => evidenceByPK[PK]),
      (allEvidencesByItemType.caseControl || []).map(PK => evidenceByPK[PK]),
      (allEvidencesByItemType.experimental || []).map(PK => evidenceByPK[PK]),
    ]
  })

  const associatedVariants = useSelector(state => {
    return Array.from(state.annotations.allVariantsSetByAnnotation[activeAnnotation.PK] || new Set()).map(PK => 
      state.annotations.variantByPKByAnnotation[activeAnnotation.PK][PK])
  });

  const title = getAnnotationSourceTitle(activeAnnotation);

  return activeAnnotation ? (
    <>
      <CardPanel title={`Evidence for ${title}`} className={className}>
        <Row>
          <Col md="7">
            <h4>
              <FontAwesomeIcon icon={faUser} /> Genetic Evidence
            </h4>

            <h5>Case Level</h5>

            <GdmCurationPaletteEvidenceList
              title="Group"
              evidenceList={groups}
              plusIconHref={`/curation-central/${gdm.PK}/annotation/${activeAnnotation.PK}/group-curation`}
              allowAdd={allowAdd}
              showList={showList}
            />

            <GdmCurationPaletteEvidenceList
              title="Family"
              evidenceList={families}
              plusIconHref={`/curation-central/${gdm.PK}/annotation/${activeAnnotation.PK}/family-curation`}
              allowAdd={allowAdd}
              showList={showList}
            />

            <GdmCurationPaletteEvidenceList
              title="Individual"
              evidenceList={individuals}
              plusIconHref={`/curation-central/${gdm.PK}/annotation/${activeAnnotation.PK}/individual-curation`}
              allowAdd={allowAdd}
              showList={showList}
            />

            <h5 className="mt-4">Case Control</h5>

            <GdmCurationPaletteEvidenceList
              title="Case-Control"
              evidenceList={caseControls}
              plusIconHref={`/curation-central/${gdm.PK}/annotation/${activeAnnotation.PK}/case-control-curation`}
              allowAdd={allowAdd}
              showList={showList}
            />
          </Col>
          <Col md="5">
            <h4>
              <FontAwesomeIcon icon={faFlask} /> Experimental Evidence
            </h4>

            <GdmCurationPaletteEvidenceList
              title="Experimental Data"
              evidenceList={experimentalData}
              plusIconHref={`/curation-central/${gdm.PK}/annotation/${activeAnnotation.PK}/experimental-curation`}
              allowAdd={allowAdd}
              showList={showList}
            />

            <AssociatedVariants variantList={associatedVariants} />
          </Col>
        </Row>
      </CardPanel>
    </>
  ) : null;
};
GdmCurationPalette.propTypes = {
  activeAnnotation: PropTypes.object,
};
