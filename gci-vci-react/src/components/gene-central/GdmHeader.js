import React, { useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import { RestAPI as API } from "@aws-amplify/api-rest";
import lodashGet from "lodash/get";
import { API_NAME } from "../../utils";
import { useSelector, useDispatch } from "react-redux";
import { Jumbotron, Container, Button, Row, OverlayTrigger, Tooltip } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt, faFileAlt, faTable, faBriefcase } from "@fortawesome/free-solid-svg-icons";

import { GdmDetails } from "./GdmDetails";
import DiseaseModal from "../common/DiseaseModal";
import { setGdmAction } from "../../actions/gdmActions";
import { gdmParticipantReducer } from '../../utilities/gdmUtilities';
import { useAmplifyAPIRequestRecycler } from "../../utilities/fetchUtilities";
import Modal from "../common/Modal";
import { renderPublishStatus } from '../recordStatus//publishStatus';
import { isOwnedByCurrentCuratingEntity } from "../../utilities/ownershipUtilities";


export const GdmHeader = (props) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  
  const history = useHistory();

  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const gdm = useSelector((state) => state.gdm.entity);
  const allowEdit = isOwnedByCurrentCuratingEntity(gdm, auth);

  const { annotationPK: annotationPKFromRouter } = useParams();

  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false);
  const [isDuplicateGdmAlertModalOpen, setIsDuplicateGdmAlertModalOpen] = useState(false);
  const [duplicatedGdm, setDuplicatedGdm] = useState();

  // disease modal helpers

  const handleShowDiseaseModal = () => {
    setIsDiseaseModalOpen(true);
  };

  const handleHideDiseaseModal = () => {
    setIsDiseaseModalOpen(false);
  };

  const handleDiseaseModalSaved = async (disease) => {
    if (disease.PK === gdm.disease.PK) {
      return `This disease is already set to the current curation record.`;
    }

    // check gene-disease-mode duplication
    let existingGdms;
    // reset state for duplicated gdm pk
    setDuplicatedGdm();
    try {
      existingGdms = await requestRecycler.capture(API.get(API_NAME, `/gdms?gene=${gdm.gene.PK}&disease=${disease.PK}&modeInheritance=${gdm.modeInheritance}`));
    } catch (error) {
      console.log(error);
      const baseErrorMessage = 'Server error while checking gene-disease record duplication. ';
      return baseErrorMessage + lodashGet(error, 'response.data.error')
    }

    if (Array.isArray(existingGdms) && existingGdms.length) {
      // pop up modal to guide and allow user to redirect to that existing gdm's page
      setDuplicatedGdm(existingGdms[0]);
      setIsDuplicateGdmAlertModalOpen(true);
      return;
    }

    // PUT parent obj (gdm)
    const updateGdm = {
      ...gdm,
      disease: disease.PK,
      diseaseTerm: disease.term,
      ...gdmParticipantReducer(gdm, auth),
    };
    let putResultGdm;
    try {
      putResultGdm = await requestRecycler.capture(API.put(API_NAME, `/gdms/${gdm.PK}`, { body: { updateGdm } }))
    } catch (error) {
      console.log(error);
      const baseErrorMessage = 'Update gene-disease record for diease failed. ';
      return baseErrorMessage + lodashGet(error, 'response.data.error')
    }

    if (!putResultGdm) {
      return `Failed to update gene-disease record, server return empty result!`;
    }

    // update UI
    dispatch(
      setGdmAction({
        ...gdm,
        disease: putResultGdm.disease,
        diseaseTerm: putResultGdm.diseaseTerm
      })
    );
  };

  // duplicate GDM alert modal helpers

  const handleHideDuplicateGdmAlertModal = () => {
    setIsDuplicateGdmAlertModalOpen(false);
  }
  
  const handleRedirectToExistingGdm = () => {
    if (duplicatedGdm && duplicatedGdm.PK) {
      setIsDuplicateGdmAlertModalOpen(false);
      history.push(`/curation-central/${duplicatedGdm.PK}`);
    } else {
      setIsDuplicateGdmAlertModalOpen(false);
      alert('Failed to redirect you to the existing gene-disease record. The record is not set correctly.');
    }
  }

  const disableEditDiseaseButton = () => {
    let disabled = false;

    // Allow to change disease if all classifications have been unpublished
    // Go thru the snapshots in all provisional classifications in the GDM to check none of the classification is still published
    let classifications = gdm.provisionalClassifications && gdm.provisionalClassifications.length ? gdm.provisionalClassifications : [];

    for (let classification of classifications) {
      const associatedClassificationSnapshots = lodashGet(classification, 'associatedClassificationSnapshots', []);
      // some associatedClassificationSnapshots may lack of `.resource` data (the full classification object)
      // for rendering status, so just use the snapshot object itself
      const snapshots = associatedClassificationSnapshots
        // make sure the snapshot object is not null or undefined
        .filter(snapshot => !!snapshot);

      // If any of snapshot is still published, then cannot change disease
      if (snapshots && snapshots.length) {
        if (renderPublishStatus(snapshots, 'classification', true) === 'Published') {
          disabled = true;
          break;
        }
      }
    }

    return disabled;
  }

  const renderDisabledDiseaseButton = () => {
    return (
      <>
        <OverlayTrigger overlay={<Tooltip>Only unpublished records can be modified</Tooltip>}>
          <span className="ml-auto">
            <Button disabled style={{ pointerEvents: 'none' }}>
              Disease
              <FontAwesomeIcon className="ml-2" icon={faPencilAlt} />
            </Button>
          </span>
        </OverlayTrigger>
      </>
    );
  }

  return (
    <Jumbotron>
      <Container>
        <Row>
          <Link className="d-flex align-items-center text-decoration-none text-dark" to={`/curation-central/${gdm.PK}${annotationPKFromRouter ? `/annotation/${annotationPKFromRouter}` : ''}`}>
            <h2>{gdm.gene.PK}</h2>
            {gdm.disease && <h3 className="ml-2">- {gdm.disease.term}</h3>}
          <OverlayTrigger overlay={<Tooltip>Back to main page for this Gene-Disease Record</Tooltip>}>
            <Button variant="link">
              <FontAwesomeIcon icon={faBriefcase} />
            </Button>
          </OverlayTrigger>
          </Link>

          {!props.isSummary && allowEdit ?
            disableEditDiseaseButton() ?
              renderDisabledDiseaseButton()
              :
              <span className="ml-auto">
                <Button onClick={handleShowDiseaseModal}>
                  Disease
                  <FontAwesomeIcon className="ml-2" icon={faPencilAlt} />
                </Button>
              </span>
          : null}
          <DiseaseModal
            id="editGeneDiseaseModal"
            title="Edit Disease"
            show={isDiseaseModalOpen}
            onHide={handleHideDiseaseModal}
            initialDisease={gdm.disease}
            updateDisease={handleDiseaseModalSaved}
          />

          <Modal
            title="Duplicated Gene-Disease Record"
            show={isDuplicateGdmAlertModalOpen}
            onHide={handleHideDuplicateGdmAlertModal}
            onSave={handleRedirectToExistingGdm}
            saveButtonText="Go To Curation"
            hideButtonText="Cancel"
          >
            <DuplicateGdmAlertModalContent duplicatedGdm={duplicatedGdm} />
          </Modal>
        </Row>
        <Row>
          <i>
            {gdm.modeInheritance} {gdm.modeInheritanceAdjective ? gdm.modeInheritanceAdjective : null}
          </i>
          {!props.isSummary && allowEdit?
            <>
              <Link
                to={`/curation-central/${gdm.PK}/gene-disease-evidence-summary/?preview=yes`}
                target="_blank"
                className="ml-auto"
              >
                <Button>Preview Evidence Scored <FontAwesomeIcon icon={faFileAlt} /></Button>
              </Link>
              <Button as={Link} to={`/provisional-curation/${gdm.PK}`} className="ml-1">View Classification Summary <FontAwesomeIcon icon={faTable} /></Button>
            </>
            : null}
        </Row>

        <GdmDetails />
      </Container>
    </Jumbotron>
  );
};
GdmHeader.propTypes = {};


const DuplicateGdmAlertModalContent = ({ duplicatedGdm }) => {
  // duplicatedGdm object does not have disease object, only disease(string) and diseaseTerm(string)
  return (
    <>A curation record already exists for <strong>{lodashGet(duplicatedGdm, 'gene')} – {lodashGet(duplicatedGdm, 'diseaseTerm')} ({lodashGet(duplicatedGdm, 'disease')}) – {lodashGet(duplicatedGdm, 'modeInheritance')}</strong>.
    You may curate this existing record, or cancel and change the disease for a different gene – disease – mode combination.</>
  )
}
