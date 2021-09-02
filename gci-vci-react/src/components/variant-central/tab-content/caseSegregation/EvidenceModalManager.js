/**
 * Manages the addition and editing of new evidence through two modals:
 * 
 * 1. Metadata about the new evidence type (e.g. name of PI, database location, clinical lab contact info, etc.)
 * 2. The evidence itself (e.g. number of unaffected variant carriers, associated phenotypes, etc.)
 * 
 * Saving the curated evidence steps are copied from gci-vci-react/src/components/common/article/AddArticleEvidenceForm.js
 */

import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { API_NAME } from "../../../../utils";
import { cloneDeep, isEmpty, get as lodashGet } from "lodash";

import { updateInterpretation } from "../../../../actions/actions";
import {
  updateCuratedEvidenceAction,
  addCuratedEvidenceAction,
} from "../../../../actions/curatedEvidenceActions";
import { useAmplifyAPIRequestRecycler } from "../../../../utilities/fetchUtilities";
import { evidenceResources } from "./segregationData";
import { EvidenceMetadataModal } from "./EvidenceMetadataModal";
import { EvidenceDetailsModal } from "./EvidenceDetailsModal";

export const EvidenceModalManager = ({
  evidenceData,                   // Evidence object if being editing.  Null if adding
  selectedCriteriaList,           // Array Criteria code(s) pertinent to the category/subcategory
  selectedEvidenceType,           // Evidence source type
  selectedSubcategory,            // Subcategory (usually the panel) the evidence is part of
  isNewEvidence,                  // If adding a new piece of evidence or editing an existing piece
  useIcon,                        // Use an icon instead of text as link text  
  auth,                           // The user's auth data
  canCurrUserModifyEvidence,      // Function to check if current logged in user can modify the given evidence
  interpretationCaseSegEvidences, // Case segregation evidences with sourceInfo added to current interpretation
}) => {
  const [sourceData, setSourceData] = useState({'metadata': {}, 'data': {}}); // Source data being added/edited
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [nextModal, setNextModal] = useState(false);   // Flag if able to go to next data form  
  const [isNew, setNew] = useState(isNewEvidence);  // This may change from T -> F if a matching identifier is found.  See submitMetaData() for details.
  const [isLoadingNext, setIsLoadingNext] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [loadNextErrorMessage, setLoadNextErrorMessage] = useState(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState(null);
  const [tempArticle, setTempArticle] = useState(null);

  const ongoingRequests = new Set();
  const requestRecycler = useAmplifyAPIRequestRecycler();

  // bring in interpretation from redux
  const dispatch = useDispatch();
  const interpretation = useSelector((state) => state.interpretation);
  const setInterpretation = useCallback(
    (i) => dispatch(updateInterpretation(i)),
    [dispatch]
  );
  const updateCuratedEvidence = useCallback(
    (curatedEvidence) => dispatch(updateCuratedEvidenceAction(curatedEvidence)),
    [dispatch]
  );
  const addCuratedEvidence = useCallback(
    (curatedEvidence) => dispatch(addCuratedEvidenceAction(curatedEvidence)),
    [dispatch]
  );

  const getSourceData = () => {
    let source = {};
    // If current evidence has sourceInfo data, set as default
    if (evidenceData && evidenceData.sourceInfo) {
      source = cloneDeep(evidenceData.sourceInfo);
      if (lodashGet(source, "metadata['_kind_key']", '') === 'PMID') {
        // If pmid is not set in sourceInfo metadata, use current evidence articles array if exists
        const selectedPmid = evidenceData.articles && evidenceData.articles.length > 0 ? evidenceData.articles[0].pmid : '';
        if (source.metadata.pmid === undefined) {
          source.metadata.pmid = selectedPmid;
        } else {
          // If pmid in metadata is not same as evidence articles[0], reset since that's the correct pmid
          if (source.metadata.pmid !== selectedPmid) {
            source.metadata.pmid = selectedPmid;
          }
        }
      }
    }
    else {
      source = { 'metadata': {}, 'data': {} };
      const sourceEvidenceType = getEvidenceType();
      if (sourceEvidenceType) {
        source.metadata['_kind_key'] = sourceEvidenceType;
        source.metadata['_kind_title'] = lodashGet(evidenceResources, `typeMapping[${sourceEvidenceType}]['name']`, '');
      }
    }
    return source;
  };

  const getCriteriaList = () => {
    if (selectedCriteriaList) {
      return selectedCriteriaList;
    }
    else {
      if (evidenceData && evidenceData.sourceInfo && evidenceData.sourceInfo.metadata && '_relevant_criteria' in evidenceData.sourceInfo.metadata) {
        return evidenceData.sourceInfo.metadata['_relevant_criteria'];
      } else {
        return null;
      }
    }
  };

  const getEvidenceType = () => {
    if (selectedEvidenceType) {
      return selectedEvidenceType;
    }
    else {
      return lodashGet(evidenceData, "sourceInfo.metadata['_kind_key']", null);
    }
  };

  const getSubcategory = () => {
    if (selectedSubcategory) {
      return selectedSubcategory;
    }
    else {
      return lodashGet(evidenceData, "subcategory", null);
    }
  };

  /**
   * If editing current evidence, return its id.
   * If adding new one, return null.
   */
  const getCurrentEvidenceId = () => {
    // If existing evidence has id, return its id.
    if (evidenceData && evidenceData['PK']) {
      return (evidenceData['PK']);
    } else {
      // If adding evidence but same evidence exits, return existing evidence id.
      if (sourceData && sourceData.metadata) {
        let foundEvidence = matchExistingEvidence(sourceData.metadata);
        if (foundEvidence) {
          return (foundEvidence['PK']);
        }
      }
    }
    // If adding new evidence, return null;
    return null;
  };

  /**
   * Check if an existing evidence has same data as given metadata.
   * If yes, return that evidence; else null.
   * 
   * @param {object} metadata  The metadata object
   */
  const matchExistingEvidence = (metadata) => {
    let result = null;
    // Only match pmid source, not other non-published sources which are just free text
    if (metadata['_kind_key'] === 'PMID') {
      /* commented out for now since only need for PMID
      const sourceEvidenceType = getEvidenceType();
      const identifierCol = evidenceResources.typeMapping[sourceEvidenceType].fields
        .filter(o => o.identifier === true)
        .map(o => o.name);
      */
      // pmid field is the identifier field for PMID source
      const identifierCol = "pmid";

      // Determine if this is meant to be linked to an existing piece of evidence that current user can modify
      const candidates = (
        interpretationCaseSegEvidences || []
      )
        .filter(o => identifierCol in o.sourceInfo.metadata &&
          o.sourceInfo.metadata[identifierCol] === metadata[identifierCol]);

      if (candidates.length > 0) {
        candidates.forEach(candidate => {
          if (canCurrUserModifyEvidence(auth, candidate)) {
            result = candidate;
          }
        });
      }
    }

    return result;
  };

  const saveArticle = async (article) => {
    // POST the article to get the pk
    const createArticleRequest = API.post(API_NAME, `/articles/`, {
      body: { article },
    });
    ongoingRequests.add(createArticleRequest);
    try {
      article = await createArticleRequest;
    } catch (error) {
      if (!API.isCancel(error)) {
        handleLoadNextError(error);
        console.error("Failed to save article to database", error);
      }
    } finally {
      ongoingRequests.delete(createArticleRequest);
    }
  };

  /**
   * Here, we need to check the identifier field against all other known identifier fields.  If we get a match,
   * then we know that even if we were told this is a new entry, it's really an edit of an existing entry that
   * was initially entered in a separate panel.
   *
   * @param {bool} next           True -> Move to next screen, False -> Cancel was clicked
   * @param {object} metadata     The metadata object returned from the modal
  */
  const submitMetadata = async (next, metadata) => {
    setIsLoadingNext(true);
    setSubmitErrorMessage(null);
    if (next && metadata) {
      const candidate = matchExistingEvidence(metadata);
      let newData = cloneDeep(getSourceData());
      if (isNewEvidence) {
        if (candidate) {
          // Editing a piece of evidence initially input in a different panel
          Object.assign(candidate.sourceInfo.metadata, metadata);
          Object.assign(newData, candidate.sourceInfo);
          setNew(false);
        } else {
          // Totally new piece of evidence
          Object.assign(newData.metadata, metadata);
          setNew(true);
        }
      } else {
        // Editing existing evidence
        Object.assign(newData.metadata, metadata);
      }

      // If source is PMID and new evidence, check if Pubmed article needs to be added to DB.
      if (metadata._kind_key === 'PMID' && metadata.pmid) {
        if (isNewEvidence) {
          if (candidate) {
            setTempArticle(candidate.articles[0]);
          } else {
            const retrieveArticleRequest = API.get(API_NAME, "/articles/" + metadata.pmid);
            ongoingRequests.add(retrieveArticleRequest);
            try {
              const article = await retrieveArticleRequest;
              setTempArticle(article);
              if (!article.PK) {
                // PubMed article not in our DB so post to DB
                saveArticle(article);
              }
            } catch (error) {
              if (!API.isCancel(error)) {
                console.error('Faied to retrieve article from database' + metadata.pmid);
                handleLoadNextError(error);
              } else {
                // ignore error if it's a cancel error
                // return immediately, since when request is canceled, it's likely the modal is closed & unmounted, so does formik unmounted.
                // Therefore, don't fire setSubmitting() because it will try to update formik's isSubmitting state and we'll get
                // React warning: `Can't perform a React state update on an unmounted component.`
                return;
              }
            }
            ongoingRequests.delete(retrieveArticleRequest);
          }
        } else {
          // If not new, save article object for saving existing evidence
          const article = evidenceData.articles && evidenceData.articles.length > 0 ? evidenceData.articles[0] : {};
          setTempArticle(article);
        }
      }

      if (loadNextErrorMessage) {
        setNextModal(false);
      } else {
        setSourceData(newData);
        setNextModal(true);
        setIsMetadataOpen(false);
      }
    } 
    setIsLoadingNext(false);
  };

  const handleLoadNextError = (error) => {
    let errorDetailMessage;

    // default get detail error reason from amplify's API request
    // https://stackoverflow.com/a/49778338/9814131
    const serverDetailMessage = lodashGet(error, "response.data.error");

    if (serverDetailMessage) {
      errorDetailMessage = serverDetailMessage;
    }
    else if (error instanceof Error) {
      errorDetailMessage = error.message;
    } else if (typeof error === "string") {
      errorDetailMessage = error;
    } else {
      errorDetailMessage = JSON.stringify(error);
    }
    setLoadNextErrorMessage(
      `Something went wrong while trying to save evidence source: ${errorDetailMessage}`
    );
    setNextModal(false);
    setIsLoadingNext(false);
  };

  const handleSubmitError = (error) => {
    let errorDetailMessage;

    // default get detail error reason from amplify's API request
    // https://stackoverflow.com/a/49778338/9814131
    const serverDetailMessage = lodashGet(error, "response.data.error");

    if (serverDetailMessage) {
      errorDetailMessage = serverDetailMessage;
    }
    else if (error instanceof Error) {
      errorDetailMessage = error.message;
    } else if (typeof error === "string") {
      errorDetailMessage = error;
    } else {
      errorDetailMessage = JSON.stringify(error);
    }
    setSubmitErrorMessage(
      `Something went wrong while trying to save this evidence! Detail: ${errorDetailMessage}`
    );
    setIsSubmitting(false);
  };

  /**
   * Save the evidence to DB
   * 
   * @param {object} data  The curated evidence data object returned from modal form
   */
  const submitCuratedEvidence = async (data) => {
    if (data === null) {
      // No change is needed
    } else {
      setIsSubmitting(true);
      setSubmitErrorMessage(null);

      // Remove empty fields and unnecessary fields - submitted_by, last_modified, _kind_title from source data
      let hasData = Object.keys(data).reduce((object, key) => { 
        if (data[key] !== '' && !key.startsWith('_') ) {
          object[key] = data[key]
        }
        return object
      }, {})

      // Combine the changes with existing data
      // need to use old sourceInfo with new metadata
      // or if new, new metadata
      let newData = Object.assign({}, sourceData);
      newData.data = {};
      Object.assign(newData.data, hasData);
      newData['relevant_criteria'] = getCriteriaList();
      // Save the evidence data
      const postOrPutArticleEvidence = {
        item_type: "curated-evidence",
        variant: interpretation.variant,
        category: 'case-segregation',
        subcategory: getSubcategory(),
        modified_by: lodashGet(auth, "PK", null),
        articles: [tempArticle],      
        evidenceCriteria: '',    // criteria has no value because it is not used for case segregation
        evidenceDescription: '', // has no value because it is not used for case segregation
        sourceInfo: newData      // data object for case segregation curated evidence
      };

      if (isNew) {
        // if new, set affiliation && submitted_by
        if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
          postOrPutArticleEvidence.affiliation = lodashGet(auth, "currentAffiliation.affiliation_id");
        }
        postOrPutArticleEvidence.submitted_by = lodashGet(auth, "PK", "");
      } else {
        const pk = getCurrentEvidenceId();
        if (!pk) {
          handleSubmitError(
            new Error("PK is missing on the existing article evidence"),
          );
          return;
        }
        else {
          postOrPutArticleEvidence.PK = pk;
        }
      }

      // submit curated evidence to DB

      let postOrPutResultArticleEvidence;
      const commonEndpoint = "/curated-evidences";
      const postOrPutRequestArgs = [
        API_NAME,
        isNew
          ? commonEndpoint
          : `${commonEndpoint}/${postOrPutArticleEvidence.PK}`,
        { body: { postOrPutArticleEvidence } },
      ];
      try {
        postOrPutResultArticleEvidence = await (isNew
          ? requestRecycler.capture(API.post(...postOrPutRequestArgs))
          : requestRecycler.capture(API.put(...postOrPutRequestArgs)));
      } catch (error) {
        if (API.isCancel(error)) {
          return;
        }
        handleSubmitError(error);
        return;
      }

      if (!postOrPutResultArticleEvidence || !postOrPutResultArticleEvidence.PK) {
        handleSubmitError(
          new Error("No pk in posted article evidence"),
        );
        return;
      }

      // submit updated interpretation to DB

      // handle when field `curated_evidence_list` is undefined
      let putInterpretation = interpretation;
      if (!Array.isArray(putInterpretation.curated_evidence_list)) {
        // putInterpretation.curated_evidence_list = [];
        // make sure we don't mutate redux state object `interpretation` directly
        putInterpretation = {
          ...interpretation,
          curated_evidence_list: [],
        };
      }

      // construct a new interpretation object to update interpretation.curated_evidence_list immutably
      // the list only stores PK of curated evidence
      let putResultInterpretation;
      if (isNew) {
        // when create new curated evidence, just add its PK to interpretation (but immutably, avoid modifying `putInterpretation` directly)
        putInterpretation = {
          ...putInterpretation,
          curated_evidence_list: [
            postOrPutResultArticleEvidence.PK,
            ...putInterpretation.curated_evidence_list,
          ],
        };

        try {
          putResultInterpretation = await requestRecycler.capture(API.put(
            API_NAME,
            `/interpretations/${interpretation.PK}`,
            { body: { putInterpretation } }
          ));
        } catch (error) {
          if (API.isCancel(error)) {
            return;
          }
          handleSubmitError(error);
          return;
        }
      } else {
        // when editing existing curated evidence, no need to update interpretation.curated_evidence_list
        // since the list stores just PKs, and modifying content of a curated evidence does not change PK
        // also no need to update DB interpretation
      }

      // update UI state: curated evidence, and optionally interpretation

      if (isNew) {
        // add evidence
        addCuratedEvidence(postOrPutResultArticleEvidence);
        // update interpretation
        if (isEmpty(putResultInterpretation)) {
          handleSubmitError(
            new Error(
              "Server responded empty result while trying to update interpretation for the submitted curated evidence"
            ),
          );
          return;
        }
        setInterpretation(putResultInterpretation);
      } else {
        // update evidence
        updateCuratedEvidence(postOrPutResultArticleEvidence);
      }
  
      setNextModal(false);
      setIsSubmitting(false);
    }
  };

  /**
   * Return the evidence data object
   */
  const getDetailsData = () => {
    return lodashGet(sourceData, "data", null);
  };

  /**
   * Return the evidence metadata object
   */
  const getMetadata = () => {
    const data = getSourceData();
    return lodashGet(data, "metadata", null);
  };

  // If adding new evidence, display "Add Evidence" button
  // If editing and displaying in master/tally table, use edit icon
  // else display "Edit" button
  const renderButton = () => {
    if (evidenceData) {
      if (useIcon) {
        return (
          <Button className="link-button" variant="link" onClick={onAddEditButtonClick}> 
            <FontAwesomeIcon icon={faEdit} />
          </Button>
        );
      }
      else {
        return (
          <Button variant="primary" onClick={onAddEditButtonClick}>
            Edit
          </Button>
        );
      }
    } else {
      return (
        <Button
          className="mt-2"
          variant="primary"
          disabled={selectedEvidenceType === null ? true : false}
          onClick={onAddEditButtonClick}
        >
          Add Evidence
        </Button>
      );
    }
  };

  const onAddEditButtonClick = () => {
    setIsMetadataOpen(true);
  };

  const onCancelMetadata = () => {
    for (const request of ongoingRequests) {
      API.cancel(request, "Request was canceled");
    }
    ongoingRequests.clear();

    setIsMetadataOpen(false);
    setNextModal(false);
  };

  if (nextModal) {
    return (
      <>
      <EvidenceDetailsModal
        submitCuratedEvidence={submitCuratedEvidence}
        detailsData={getDetailsData()}
        isNew={isNewEvidence}
        isFromMaster={useIcon}
        subcategory={getSubcategory()}
        evidenceType={getEvidenceType()}
        errorMsg={submitErrorMessage}
        isSubmitting={isSubmitting}
        show={nextModal}
        onHide={() => setNextModal(false)}
      >
      </EvidenceDetailsModal>
      </>
    );
  } else {
    return (
      <>
      <EvidenceMetadataModal
        evidenceType={getEvidenceType()}
        submitMetadata={submitMetadata}
        metadata={getMetadata()}
        isNew={isNewEvidence}
        errorMsg={submitErrorMessage}
        isLoadingNext={isLoadingNext}
        show={isMetadataOpen}
        onHide={onCancelMetadata}
      >
      </EvidenceMetadataModal>
      {renderButton()}
      </>
    );
  }
};
