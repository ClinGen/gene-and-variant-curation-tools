import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { ListGroup } from "react-bootstrap";
import { StatusTooltipExplanationIcon } from "../common/StatusTooltipExplanationIcon";
import { getMyAndOtherClassifications } from "../../utilities/classificationUtilities";
import { OwnerTextDisplay } from '../../utilities/ownershipUtilities';
import { renderClassificationStatus } from '../recordStatus/gdmClassificationStatus';


export const ClassificationRecord = () => {
  const gdm = useSelector(state => state.gdm.entity);
  const auth = useSelector(state => state.auth);

  const { myClassification, otherClassifications } = useMemo(() => getMyAndOtherClassifications(gdm, auth), [gdm, auth]);
  const classification = myClassification
   ? myClassification
   : otherClassifications
     ? otherClassifications[0]
     : null;
  const isMyClassification = myClassification ? true : false;

  const renderClassificationRecord = () => {
    // Only have one classification per GDM
    return (
      <>
        <h4>
          Classification
          <StatusTooltipExplanationIcon className="mx-1" resourceType="Classifications" />
          by <OwnerTextDisplay object={classification} />
        </h4>
        <div>
          {classification.autoClassification &&
            <span className="ml-1">
              <strong>Calculated: </strong> {classification.autoClassification};
            </span>
          }
          {classification.alteredClassification &&
            <span className="ml-1">
              <strong>Modified: </strong> {classification.alteredClassification};
            </span>
          }
          {renderClassificationStatus(
            classification,
            gdm,
            isMyClassification)
          }
        </div>
      </>
    );
  };

  return (
    <>
      <ListGroup>
        <ListGroup.Item className="py-2">
          {classification
            ? renderClassificationRecord()
            : <span className="text-muted">No classification has been created yet</span>
          }
        </ListGroup.Item>
      </ListGroup>
    </>
  );
};

ClassificationRecord.propTypes = {};
