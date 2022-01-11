import React from 'react';
import moment from 'moment';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import MDEditor from "@uiw/react-md-editor";

import CardPanel from '../common/CardPanel';
import { ExternalLink } from '../common/ExternalLink.js';
import { EXTERNAL_API_MAP } from '../../constants/externalApis.js';
import { getAffiliationName } from '../../helpers/get_affiliation_name.js';
import { getApproverNames, getContributorNames } from '../../helpers/get_approver_names';
import { renderAnimalOnlyTag } from '../../helpers/render_classification_animal_only_tag';
import { determineSOPVersion } from '../../helpers/sop';
import { renderSimpleStatusLabel } from '../../helpers/render_simple_status_label';
import { renderEarliestPublications } from '../../helpers/renderEarliestPublications';
import { getClassificationSavedDate } from "../../utilities/classificationUtilities";

const GeneDiseaseEvidenceSummaryHeader = ({
  gdm,
  provisional,
  snapshotPublishDate,
}) => {

  // Expecting the required fields of a GDM to always have values:
  // e.g. gene, disease, mode of inheritance
  const gene = gdm && gdm.gene, disease = gdm && gdm.disease;
  const modeInheritance = gdm && gdm.modeInheritance && gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1];
  const modeInheritanceAdjective = gdm && gdm.modeInheritanceAdjective ? gdm.modeInheritanceAdjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
  const publishStatus = provisional.publishClassification || snapshotPublishDate ? true : false;
  const approvalReviewDate = provisional.approvalReviewDate ? provisional.approvalReviewDate : '';
  const publishDate = provisional.publishDate ? provisional.publishDate : snapshotPublishDate;
  const additionalApprover = provisional.additionalApprover ? provisional.additionalApprover : null;
  const classificationContributors = provisional.classificationContributors ? provisional.classificationContributors.sort() : null;
  const sopVersion = determineSOPVersion(provisional);
  const cardPanelTitle = (
    <span>
      {`${gene && gene.symbol} – ${disease && disease.term} – `}
      <i>{modeInheritanceAdjective ? modeInheritance + ' (' + modeInheritanceAdjective + ')' : modeInheritance}</i>
    </span>
  );

  return (
    <>
      <h1 className="text-center mb-3">Evidence Summary</h1>
      <CardPanel title={cardPanelTitle}>
        <Row>
          <Col sm={{ span: 6 }} className="d-inline">
            <strong>Classification owner: </strong>
            <span>
              {provisional.affiliation
                ? getAffiliationName(provisional.affiliation)
                : (provisional && provisional.submitted_by) && `${provisional.submitted_by.name} ${provisional.submitted_by.family_name}`
              }
            </span>
            <br />
            {additionalApprover && additionalApprover.length ?
              <>
                <div>
                  <strong>Classification Approver: </strong>
                  <span>{getApproverNames(additionalApprover)}</span>
                </div>
                <br />
              </>
            : null}
            {classificationContributors && classificationContributors.length ?
              <>
                <div>
                  <strong>Classification Contributor(s): </strong>
                  <span>{getContributorNames(classificationContributors).join(', ')}</span>
                </div>
                <br />
              </>
            : null}
            <strong>Calculated classification: </strong>
            <span className="classificationSaved">{provisional && provisional.autoClassification}</span>
            <br />
            <strong>Modified classification: </strong>
            <span className="classificationModified">
              {provisional && provisional.alteredClassification ? (provisional.alteredClassification === 'No Selection' ? 'None' : provisional.alteredClassification) : null}
              &nbsp;{renderAnimalOnlyTag(provisional)}
            </span>
            <br />
            <strong>Reason for modified classification: </strong>
            <span className="classificationModifiedReason text-pre-wrap">
              {provisional && provisional.reasons ? provisional.reasons : 'None'}
            </span>
            <br />
            <strong>SOP: </strong>
            <span className="classificationSOP">
              <ExternalLink
                href="https://www.clinicalgenome.org/curation-activities/gene-disease-validity/educational-and-training-materials/standard-operating-procedures/"
              >
                Gene Clinical Validity Standard Operating Procedures (SOP), Version {sopVersion}
              </ExternalLink>
            </span>
          </Col>
          <Col sm={{ span: 6 }}>
            <strong>Classification status: </strong>
            <span className="classificationStatus">
              {provisional && provisional.classificationStatus
                ? renderSimpleStatusLabel(provisional.classificationStatus, publishStatus)
                : null
              }
            </span>
            <br />
            {provisional ?
              <>
                <div>
                  <strong>Date classification saved: </strong>
                  <span className="classificationSaved">{provisional.last_modified ? moment(getClassificationSavedDate(provisional)).format("YYYY MMM DD, h:mm a") : null}</span>
                </div>
              </>
              : null}
            {approvalReviewDate ? 
              <>
                <div>
                  <strong>Final Approval Date: </strong>
                  <span className="approvalReviewDate">{approvalReviewDate ? moment(approvalReviewDate).format("YYYY MMM DD") : null}</span>
                </div>
              </>
              : null}
            {publishStatus && publishDate &&
              <>
                <div>
                  <strong>Date classification published: </strong>
                  <span className="classificationPublished">{moment(publishDate).format("YYYY MMM DD, h:mm a")}</span>
                </div>
              </>
            }
            <strong>Replication Over Time: </strong>
            <span className="classification-replicated-over-time">{provisional && provisional.replicatedOverTime ? <span>Yes</span> : <span>No</span>}</span>
            {renderEarliestPublications(provisional.earliestArticles)}
            <br />
            <strong>Contradictory Evidence? </strong>
            <span className="contradictory-evidence">
              Proband: <strong>{provisional && provisional.contradictingEvidence && provisional.contradictingEvidence.proband ? <span className='emphasis'>Yes</span> : <span>No</span>}</strong>
              {', '}
              Experimental: <strong>{provisional && provisional.contradictingEvidence && provisional.contradictingEvidence.experimental ? <span className='emphasis'>Yes</span> : <span>No</span>}</strong>
            </span>
            <br />
            <strong>Disease: </strong>
            <span className="disease-term">{disease && disease.term ? <ExternalLink href={EXTERNAL_API_MAP['MondoSearch'] + disease.diseaseId} target="_blank">{disease.term}</ExternalLink> : null}</span>
          </Col>
        </Row>
      </CardPanel>
      <CardPanel title="Evidence Summary">
        <span>
          {provisional && provisional.evidenceSummary && provisional.evidenceSummary.length
            ? <MDEditor.Markdown source={provisional.evidenceSummary} />
            : 'No summary is provided.'
          }
        </span>
      </CardPanel>
    </>
  );
};

export default GeneDiseaseEvidenceSummaryHeader;
