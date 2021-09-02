import React, { useState } from "react";
import { cloneDeep, get as lodashGet } from "lodash";
import { useHistory } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "react-bootstrap";
import { RestAPI as API } from '@aws-amplify/api-rest';
import { updateAnnotationAction } from "../../../../actions/annotationActions";
import { API_NAME } from '../../../../utils';
import Modal from "../../../common/Modal";
import { default as BSPopover } from "react-bootstrap/Popover";
import { default as BSOverlayTrigger } from 'react-bootstrap/OverlayTrigger';
import { setGdmAction } from "../../../../actions/gdmActions";
import { getEvidenceByPKFromActiveAnnotation } from "../../../../utilities/gdmEvidenceUtilities";
import { gdmParticipantReducer } from '../../../../utilities/gdmUtilities';

import { useAmplifyAPIRequestRecycler } from "../../../../utilities/fetchUtilities";

export const DeleteCurationModal = ({
  gdm,
  parent,
  item,
  disabled
}) =>{
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);
  const [deleteRequestErrorMessage, setDeleteRequestErrorMessage] = useState();

  const history = useHistory();
  const dispatch = useDispatch();
  const requestRecycler = useAmplifyAPIRequestRecycler();

  // redux 
  const annotations = useSelector(state => state.annotations);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  });
  const auth = useSelector((state) => state.auth);


  const onDeleteClick = () => {
    setIsModalOpen(true);
  };

  const onModalCancel = () => {
    requestRecycler.cancelAll();
    setIsModalOpen(false);
    setIsDeleteInProgress(false);
    setDeleteRequestErrorMessage(null);
  };

  const handleDeleteFailureCleanUp = (errorMessage) => {
    setDeleteRequestErrorMessage(errorMessage);
    setIsDeleteInProgress(false);
    setIsModalOpen(false);
  };

  const getUpdateType = (type) => {
    switch (type) {
      case 'group':
        return 'groups';
      case 'family':
        return 'families';
      case 'individual':
        return 'individuals';
      case 'caseControl':
        return 'casecontrol';
      case 'experimental':
        return 'experimental';
      case 'variantScore':
        return 'variantscore';
      case 'evidenceScore':
        return 'evidencescore';
      default:
        return '';
    }
  };

  const updateObjectAsDeleted = async (object) => {
    if (object && object.PK) {
      const objectType = lodashGet(object, "item_type", null);
      const updateType = getUpdateType(objectType);
      const updateObject = cloneDeep(object);
      updateObject.status = 'deleted';
      updateObject.modified_by = lodashGet(auth, "PK", null);

      let objectResult = null;
      const putRequestArgs = [
        API_NAME,
        `/${updateType}/${lodashGet(updateObject, "PK", '')}`,
        { body: { updateObject } }
      ];
      try {
        objectResult = await requestRecycler.capture(API.put(...putRequestArgs));
      } catch (error) {
        throw new Error(
          "Failed to update deleted object"
        );
      }
      if (!objectResult || !objectResult.PK) {
        console.log("no objectResult");
        throw new Error("Empty response from server when saving object");
      } else {
        // console.log(objectResult.PK);
      }
    }
  };

  const updateAnnotationObject = async () => {
    // successfully added individual to group --
    // GET annotation so that backend can auto-collect the added individual (on group)
    // for us when embedding related objects
    let latestAnnotation;
    try {
      latestAnnotation = await requestRecycler.capture(API.get(API_NAME, `/annotations/${lodashGet(annotation, "PK", '')}`));
      if (!latestAnnotation) {
        throw new Error(`Server returned empty response when GET /annotations/${lodashGet(annotation, "PK", '')}`);
      }
    } catch (error) {
      if (!API.isCancel(error)) {
        throw error;
      }
      // when request canceled (e.g. page navigated away which cause unmounting)
      // still try to proceed to update redux, since the db changes are already made
    }

    if (latestAnnotation) {
      dispatch(updateAnnotationAction(latestAnnotation));
    }
  };

  const updateGDMObject = async () => {
    if (lodashGet(gdm, "PK", null) && lodashGet(auth, "PK", null)) {
      let gdmResult = null;
      const updateGdm = {
        ...gdm,
        ...gdmParticipantReducer(gdm, auth)
      };
      // PUT gdm
      try {
        gdmResult = await requestRecycler.capture(
          API.put(API_NAME, `/gdms/${gdm.PK}`, { body: { updateGdm } })
        );
      } catch (error) {
        throw new Error(
          "Failed to append contributor to GDM"
        );
      }
      if (!gdmResult) {
        throw new Error("Empty response from server when updating contributors in gdm");
      } else {
        // update redux for gdm
        dispatch(setGdmAction(gdmResult));
      }
    }
  };

  const deleteEvidence = async () => {
    const itemPK = lodashGet(item, "PK", null);
    const parentType = lodashGet(parent, "item_type", null);
    const deletedItemType = lodashGet(item, "item_type", null);

    // get up-to-date target object, then get the promises for deleting it and
    // all its children, along with the promises for any related history items
    // Delete all object in parent
    const deletedItem = getEvidenceByPKFromActiveAnnotation(annotations, itemPK);
    const deletePromises = recurseItem(deletedItem, 0, 'delete');
    // wait for ALL promises to resolve
    return Promise.all(deletePromises)
    .then(rawData => {
      if (parent && parent.PK && parentType) {
        let parentUpdate = '';
        let deletedParent = cloneDeep(parent);
        if (parentType === 'annotation') {
          parentUpdate = 'annotations';
          if (deletedItemType === 'group') {
            deletedParent.groups = (deletedParent.groups).filter(obj => obj.PK !== itemPK);
          } else if (deletedItemType === 'family') {
            deletedParent.families = (deletedParent.families).filter(obj => obj.PK !== itemPK);
          } else if (deletedItemType === 'individual') {
            deletedParent.individuals = (deletedParent.individuals).filter(obj => obj.PK !== itemPK);
          } else if (deletedItemType === 'experimental') {
            deletedParent.experimentalData = (deletedParent.experimentalData).filter(obj => obj.PK !== itemPK);
          } else if (deletedItemType === 'caseControl') {
            deletedParent.caseControlStudies = (deletedParent.caseControlStudies).filter(obj => obj.PK !== itemPK);
          }
        } else {
          if (deletedItemType === 'family') {
            parentUpdate = 'groups';
            deletedParent.familyIncluded = (deletedParent.familyIncluded).filter(objPK => objPK !== itemPK);
          } else if (deletedItemType === 'individual') {
            parentUpdate = 'groups';
            deletedParent.individualIncluded = (deletedParent.individualIncluded).filter(objPK => objPK !== itemPK);
            if (parentType === 'family') {
              parentUpdate = 'families';
              // Empty variants of parent object if target item is individual and parent is family
              deletedParent.segregation.variants = [];
            }
          }
        }
        deletedParent.modified_by = lodashGet(auth, "PK", null);
        // PUT updated parent object w/ removed link to deleted item
        // PUT parent
        return requestRecycler.capture(
          API.put(API_NAME, `/${parentUpdate}/${parent.PK}`, { body: { deletedParent } }))
        .then(parentResult => {
          return Promise.resolve(parentResult);
        });
      }
      return Promise.resolve(null);
    }).then(data => {
      // successfully deleted selected evidence --
      // GET annotation so that backend can auto-collect the annotation
      // for us when embedding related objects
      return updateAnnotationObject();
    }).then(res => {
      // update gdm
      return updateGDMObject();
    }).then(res => {
      // forward user to curation central
      let redirectUrl = `/curation-central/${gdm.PK}/annotation/${annotation.PK}`;
      history.push(redirectUrl);
    }).catch(err => {
      handleDeleteFailureCleanUp(err.message);
      console.log('DELETE ERROR: %o', err);
    });
  };

  const onModalConfirmed = async (e) => {
    e.preventDefault(); e.stopPropagation();
    setDeleteRequestErrorMessage();
    setIsDeleteInProgress(true);

    if (item) {
      await deleteEvidence();
    } else {
      setIsDeleteInProgress(false);
      setIsModalOpen(false);
    }
  };

  // main recursive function that finds any child items, and generates and returns either the promises
  // for delete and history recording, the display strings, or the @ids of the items and its children,
  // depending on the mode (delete, display, id, respectively). The depth specifies the 'depth' of the
  // loop; should always be called at 0 when called outside of the function.
  const recurseItem = (item, depth, mode) => {
    let returnPayload = [];

    // check possible child objects
    if (lodashGet(item, "group", null)) {
      returnPayload = returnPayload.concat(recurseItemLoop(item.group, depth, mode, 'group'));
    }
    if (lodashGet(item, "family", null)) {
      returnPayload = returnPayload.concat(recurseItemLoop(item.family, depth, mode, 'family'));
    }
    if (lodashGet(item, "individual", null)) {
      returnPayload = returnPayload.concat(recurseItemLoop(item.individual, depth, mode, 'individual'));
    }
    if (lodashGet(item, "familyIncluded", null)) {
      returnPayload = returnPayload.concat(recurseItemLoop(item.familyIncluded, depth, mode, 'family'));
    }
    if (lodashGet(item, "individualIncluded", null)) {
      returnPayload = returnPayload.concat(recurseItemLoop(item.individualIncluded, depth, mode, 'individual'));
    }
    if (lodashGet(item, "experimentalData", null)) {
      returnPayload = returnPayload.concat(recurseItemLoop(item.experimentalData, depth, mode, 'experimental data'));
    }

    if (lodashGet(item, "caseControlStudies", null)) {
      returnPayload = returnPayload.concat(recurseItemLoop(item.caseControlStudies, depth, mode, 'case control'));
    }
    if (lodashGet(item, "caseCohort", null)) {
      returnPayload = returnPayload.concat(recurseItemLoop(item.caseCohort, depth, mode, 'case cohort'));
    }
    if (lodashGet(item, "controlCohort", null)) {
      returnPayload = returnPayload.concat(recurseItemLoop(item.controlCohort, depth, mode, 'control cohort'));
    }

    // if the mode is 'delete', get the items' parents' info if needed, flatten the current item, set it as deleted
    // and inactive, and load the PUT and history record promises into the payload
    if (mode === 'delete') {
      // When delete case control, delete its caseCohort and controlCohort groups first
      if (lodashGet(item, "item_type", null) === 'caseControl') {
        // Set status 'deleted' to case cohort
        updateObjectAsDeleted(lodashGet(item, "caseCohort", null));

        // Set status 'deleted' to control cohort
        updateObjectAsDeleted(lodashGet(item, "controlCohort", null));
      }

      // When delete individual, experimental data and case control evidences, delete scores first if exists
      if ((lodashGet(item, "item_type", null) === 'individual' ||
        lodashGet(item, "item_type", null) === 'experimental' ||
        lodashGet(item, "item_type", null) === 'caseControl') &&
        item.scores && item.scores.length) {
        item.scores.map(score => {
          updateObjectAsDeleted(score);
        });
      }

      // SOP8
      // When delete individual, delete variantScores first if exists
      if (lodashGet(item, "item_type", null) === 'individual' && item.variantScores && item.variantScores.length) {
        item.variantScores.map(score => {
          updateObjectAsDeleted(score);
        });
      }

      // push promises to payload
      returnPayload.push(updateObjectAsDeleted(item));
    }

    // return the payload, whether it's promises, display texts, or @ids
    return returnPayload;
  };

  // function for looping through a parent item's list of child items
  // of a specific type
  const recurseItemLoop = (tempSubItem, depth, mode, type) => {
    let tempDisplayString;
    let returnPayload = [];
    if (tempSubItem) {
      if (tempSubItem.length > 0) {
        for (var i = 0; i < tempSubItem.length; i++) {
          const childItem = getEvidenceByPKFromActiveAnnotation(annotations, tempSubItem[i]);
          if (mode === 'display') {
            const childItemLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null) && lodashGet(childItem, "PK", null))
              ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/${type}-curation/${childItem.PK}/view`
              : '';
            // if the mode is 'display', generate the display string
            tempDisplayString = null;
            if (childItem) {
              tempDisplayString = <span>{Array.apply(null, Array(depth)).map((e, i) => {return <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;})}&#8627; <a href={childItemLink} onClick={onModalCancel}>{lodashGet(childItem, 'item_type', '')} {lodashGet(childItem, 'label', '')}</a></span>;
            }
            returnPayload.push(tempDisplayString);
          } else if (mode === 'id') {
            // if the mode is 'id', grab the @ids of the child items
            returnPayload.push(childItem['PK']);
          }
          // call recurseItem on child item
          returnPayload = returnPayload.concat(recurseItem(childItem, depth + 1, mode));
        }
      } else {
        if (mode === 'display') {
          // if childspace is empty, add a display line indicating the fact
          tempDisplayString = <span>{Array.apply(null, Array(depth)).map((e, i) => {return <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;})}&#8627; no associated {type}</span>;
          returnPayload.push(tempDisplayString);
        }
      }
    }
    return returnPayload;
  };

  const renderDisabledButton = () => {
    const PopoverOverlay = (
      <BSPopover className="notice-div">
        <BSPopover.Content>
          This item cannot be deleted because it has been assessed by another user.
        </BSPopover.Content>
      </BSPopover>
    );

    return (
      <BSOverlayTrigger overlay={PopoverOverlay}>
        <span className="d-inline-block float-right align-self-end">
          <Button variant="danger" disabled style={{ pointerEvents: 'none' }}>
            Delete
          </Button>
        </span>
      </BSOverlayTrigger>
    );
  };

  const renderDeleteForm = () => {
    let message = null;
    let tree = null;
    let itemLabel = null;
    const itemType = lodashGet(item, "item_type", '');
    // generate custom messages and generate display tree for group and family delete confirm modals.
    // generic message for everything else.
    if (itemType === 'group') {
      message = <p><strong>Warning</strong>: Deleting this Group will also delete any associated families and individuals (see any Families or Individuals associated with the Group under its name, bolded below).</p>;
      tree = recurseItem(item, 0, 'display');
    } else if (itemType === 'family') {
      message = <p><strong>Warning</strong>: Deleting this Family will also delete any associated individuals (see any Individuals associated with the Family under its name, bolded below).</p>;
      tree = recurseItem(item, 0, 'display');
    } else if (itemType === 'individual') {
      let individual = item;
      if (lodashGet(individual, "variants", null) && lodashGet(individual, "associatedFamilies", null)) {
        message = <p><strong>Warning</strong>: Deleting this individual will remove the association between its variants and the Family with which the Individual is associated.</p>;
      }
    } else if (itemType === 'caseControl') {
      itemLabel = lodashGet(item, "label", null);
    }

    return (
      <>
      {message}

      <p>Are you sure you want to delete {itemLabel ? <span>Case-Control <strong>{itemLabel}</strong></span> : <span>this item</span>}?</p>

      {tree ?
        <div><strong>{item['item_type']} {item.label}</strong><br />
        {tree.map(function(treeItem, i) {
          return <span key={i}>&nbsp;&nbsp;{treeItem}<br /></span>;
        })}
        <br /></div>
      : null}
      </>
    );
  };

  return (
    <>
      <Modal
        show={isModalOpen}
        title="Confirm evidence deletion"
        className="confirm-gdm-delete-evidence"
        onHide={onModalCancel}
        onSave={onModalConfirmed}
        isLoadingSave={isDeleteInProgress}
        saveError={deleteRequestErrorMessage}
        saveButtonText="Delete"
        saveButtonInProgressText="Deleting"
        hideButtonText="Cancel"
        type="danger"
      >
        {renderDeleteForm()}
      </Modal>
      {disabled ?
        renderDisabledButton()
        :
        <Button variant="danger" className="float-right align-self-end mb-2 ml-2" onClick={onDeleteClick}>
          Delete
        </Button>
      }
    </>
  );
};
