import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import isEmpty from 'lodash/isEmpty';

import CardPanel from "../common/CardPanel";
import { Row, ListGroup, Col } from "react-bootstrap";
import { ClassificationRecord } from "./ClassificationRecord";
import { StatusTooltipExplanationIcon } from "../common/StatusTooltipExplanationIcon";
import { getMyAndOtherClassifications } from "../../utilities/classificationUtilities";


export const GdmClassificationRecords = ({ className }) => {
  const gdm = useSelector(state => state.gdm.entity);
  const auth = useSelector(state => state.auth);

  const { myClassification, otherClassifications } = useMemo(() => getMyAndOtherClassifications(gdm, auth), [gdm, auth]);

  return (
    <>
      <CardPanel
        title={<GdmClassificationRecordsPanelTitle />}
        className={className}
      >
        <Row>
          <Col><h4>My classification</h4></Col>
        </Row>
        <ListGroup>
          <ListGroup.Item>
            {myClassification ? <ClassificationRecord classification={myClassification} isMyClassification />
            : <span className="text-muted">You haven&apos;t created a classification yet</span>}
          </ListGroup.Item>
        </ListGroup>

        {otherClassifications && !isEmpty(otherClassifications) &&
          <>
            <Row className="mt-3">
              <Col><h4>Other classifications</h4></Col>
            </Row>
            <ListGroup>
              {otherClassifications.map((classification, index) => (
                <ListGroup.Item key={index}>
                  <ClassificationRecord classification={classification} />
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        }
      </CardPanel>
    </>
  );
};
GdmClassificationRecords.propTypes = {};


const GdmClassificationRecordsPanelTitle = () => {
  return (
    <>
      <span>All classifications for this record in the Gene Curation Interface (GCI)</span>
      <StatusTooltipExplanationIcon className="ml-1" resourceType="Classifications" />
    </>
  )
}
