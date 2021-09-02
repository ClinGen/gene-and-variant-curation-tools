import { useAmplifyAPIRequestRecycler, getDetailErrorMessageFromServerless } from "./fetchUtilities";
import { useDispatch, useSelector } from "react-redux";
import { useRouteMatch } from "react-router-dom";
import { useEffect } from "react";
import {
  setAnnotationsIsLoadingAction,
  activateAnnotationAction,
  fetchAnnotationsSuccessAction,
  fetchAnnotationsFailureAction,
  resetAnnotationsAction,
} from "../actions/annotationActions";
import { setGdmIsLoadingAction, fetchGdmSucceesAction, fetchGdmFailureAction, resetGdmAction } from "../actions/gdmActions";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { API_NAME } from "../utils";
import isEmpty from 'lodash/isEmpty';
import lodashGet from 'lodash/get';

export const useFetchGdmAndAnnotations = () => {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  
  const dispatch = useDispatch();
  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading  = useSelector(state => state.gdm.isLoading);
  const gdmFetchErrorMessage  = useSelector(state => state.gdm.fetchErrorMessage);

  const activeAnnotationPK = useSelector((state) => state.annotations.activePK);
  const annotationAllPKs = useSelector((state) => state.annotations.allPKs);
  const annotationsIsLoading = useSelector(state => state.annotations.isLoading);
  const annotationsFetchErrorMessage = useSelector(state => state.annotations.fetchErrorMessage);

  // get path parameter from url
  const match = useRouteMatch();
  const { gdmPK: gdmPKFromRouter, annotationPK: annotationPKFromRouter } = (match || {}).params || {};
    
  // dealing with first time mounting / unmounting logic
  useEffect(() => {
    // firts-time mount logic ---
    // when user first navigated into GCI curation routes
    // `GCICurationRouterSwitch` is mounted, and we should clean up gdm/annotations redux store
    // to prevent any previous state leftover (cases where user left the app without navigating 
    // away from GCI routes such that the useEffect-returned-clean-up-logic below is not run, 
    // e.g. user opened another tab where fetch was ongoing but user closed the tab before fetch finishes, 
    // leaving the `isLoading` state = true) from affecting current session
    //
    // note that as long as user navigates among routes in `GCICurationRouterSwitch`,
    // will not trigger mount/unmount logic here
    dispatch(resetGdmAction());
    dispatch(resetAnnotationsAction());

    // unmounting logic --
    // if user navigated away from GCI curation routes, `GCICurationRouterSwitch` is unmounted 
    // and we clean up gdm/annotations redux store
    return () => {
      dispatch(resetGdmAction());
      dispatch(resetAnnotationsAction());
    }
  }, [dispatch])

  // fetch gdm & annotations
  useEffect(() => {
    // run when navigating to and among /curation-central/* routes
    if (
      (
        // try to re-fetch gdm & annotations when gdm not available in redux,
        !gdm ||
        // or when navigating to another gdm
        (gdmPKFromRouter && gdm.PK !== gdmPKFromRouter) ||
        // or when annotations on gdm redux does not match annotations redux
        !annotationListMatch(gdm, annotationAllPKs)
      ) && (
        // prevent from re-fetching when ongoing fetch not yet finished
        !gdmIsLoading && !annotationsIsLoading &&
        !gdmFetchErrorMessage && !annotationsFetchErrorMessage
      )
    ) {
      // include request for gdm
      const requests = [];
      dispatch(setGdmIsLoadingAction(true));
      requests.push(
        requestRecycler
          .capture(API.get(API_NAME, `/gdms/${gdmPKFromRouter}`))
          .then((gdm) => {
            // should always return non-empty gdm object; otherwise if empty or null response, there's an issue on the server side
            // (if gdm not in db, server will respond 404 which will raise error in frontend and handled by catch() block below)
            if (isEmpty(gdm)) {
              dispatch(fetchGdmFailureAction(`Empty response from server at GET /gdms/${gdmPKFromRouter}`))
              return;
            }
            dispatch(fetchGdmSucceesAction(gdm));
          })
          .catch(error => {
            if (API.isCancel(error)) {
              throw error;
            }
            const gdmFAiledMessage = getDetailErrorMessageFromServerless('FetchGdmError', error, `GET /gdms/${gdmPKFromRouter}`);
            dispatch(fetchGdmFailureAction(
              gdmFAiledMessage
            ))
          })
      );

      // include request for annotations
      dispatch(setAnnotationsIsLoadingAction(true));
      requests.push(
        requestRecycler
          .capture(
            API.get(API_NAME, `/annotations?associatedGdm=${gdmPKFromRouter}`)
          )
          .then((fetchedAnnotations) => {
            // if `fetchedAnnotations` is null or undefined, there's an issue on the server side;
            // otherwise if it's an array, even if it's empty array (no annotation yet for this gdm), 
            // it means the server does return the annotations result and is ok
            if (!Array.isArray(fetchedAnnotations) && isEmpty(fetchedAnnotations)) {
              dispatch(fetchAnnotationsFailureAction(`Empty response from server at GET /annotations?associatedGdm=${gdmPKFromRouter}`));
              return;
            }
            dispatch(fetchAnnotationsSuccessAction(fetchedAnnotations, annotationPKFromRouter))
          })
          .catch(error => {
            if (API.isCancel(error)) {
              throw error;
            }
            dispatch(fetchAnnotationsFailureAction(
              getDetailErrorMessageFromServerless('FetchAnnotationsError', error, `GET /annotations?associatedGdm=${gdmPKFromRouter}`)
            ));
          })
      );

      Promise.all(requests).catch((error) => {
        // if canceled, it means `GCICurationRouterSwitch` is unmounted (user navigated away from GCI routes),
        // the other `useEffect` will clean up gdm and annotation redux, so no need to update anything.
        // Otherwise, if we update gdm/annotations redux here, it will update redux after gdm/annotation is cleaned up which is not desired
        if (API.isCancel(error)) {
          return;
        }
      });
    }
  }, [dispatch, requestRecycler, gdm, gdmPKFromRouter, annotationPKFromRouter, annotationAllPKs, gdmFetchErrorMessage, annotationsFetchErrorMessage, gdmIsLoading, annotationsIsLoading]);

  // let redux's active annotation be consistent with the annotation specified in url
  // favor `annotation PK` in url over `active annotation PK` in redux
  useEffect(() => {
    if (!annotationsIsLoading && !annotationsFetchErrorMessage) {
      // when url has annotation PK, use it to override redux active annotation
      if (annotationPKFromRouter && (annotationPKFromRouter !== activeAnnotationPK)) {
        dispatch(activateAnnotationAction(annotationPKFromRouter));
      }
      // otherwise if not in url, try to de-activate any active annotation in redux
      else if (!annotationPKFromRouter && gdm && gdm.PK && activeAnnotationPK) {
        dispatch(activateAnnotationAction(null));
      }
    }
  }, [dispatch, activeAnnotationPK, annotationPKFromRouter, gdm, annotationsIsLoading, annotationsFetchErrorMessage]);
};

/**
 * Check if annotation list on gdm matches annotations in redux
 * @param {string[]|null|undefined} reduxGdm
 * @param {string[]} reduxAnnotationAllPKList
 */
const annotationListMatch = (reduxGdm, reduxAnnotationAllPKList = []) => {
  if (!reduxGdm) {
    return false;
  }

  // check for case if both list is empty, should be considered list matched
  const annotationPKListOnGdm = reduxGdm.annotations || [];
  if (annotationPKListOnGdm.length === 0 && reduxAnnotationAllPKList.length === 0) {
    return true;
  }

  const reduxAnnotationAllPKSet = new Set(reduxAnnotationAllPKList);
  return annotationPKListOnGdm.every((PK) => reduxAnnotationAllPKSet.has(PK));
};

export const gdmParticipantReducer = (gdm, authState) => {
  // add current logged in user to fields related to participants

  let contributors = null;
  let foundUser = null;
  if (lodashGet(gdm, "contributors", null) && Array.isArray(gdm.contributors)) {
      foundUser = gdm.contributors.find(contributor => authState.PK === contributor.PK);
  }
  if (!foundUser) {
      contributors = [...(gdm.contributors || []), authState.PK]
  } else {
      contributors = lodashGet(gdm, "contributors", []);
  }

  
  return {
      contributors,
      modified_by: authState.PK,
      // `last_modified` will be updated on the server side
  }
}

/**
 * This method includes the new provisional classification object into `gdm.provisionalClassifications`, 
 * by updating if such provision already exist; otherwise add it to the list.
 * @param {object} gdm - the existing gdm, may or may not include the latest provisional
 * @param {object} newProvisional - the latest provisional object
 * @returns {object} - an object that contains `provisionalClassifications`
 */
export const gdmProvisionalClassificationsReducer = (gdm, newProvisional) => {
  const foundProvisional = (gdm.provisionalClassifications || []).find(provisional => (provisional || {}).PK === newProvisional.PK);
  if (foundProvisional) {
    return {
      provisionalClassifications: (gdm.provisionalClassifications || []).map(provisional => {
        if (provisional.PK === newProvisional.PK) {
          return newProvisional;
        }
        return provisional;
      })
    };
  }

  return {
    provisionalClassifications: [...(gdm.provisionalClassifications || []), newProvisional]
  }
}

export const gdmPutParticipantsAndSetState = ({
  requestRecycler,
  gdm,
  auth,
  setGdm
}) => {
  // update gdm participants && also get the latest gdm data
  const updateGdm = {
    item_type: 'gdm',
    ...gdmParticipantReducer(gdm, auth)
  }
  return requestRecycler.capture(API.put(API_NAME, `/gdms/${gdm.PK}`, { body: { updateGdm } }))
  .then(putGdmResult => {
    setGdm(putGdmResult);
    return putGdmResult;
  })
  .catch(error => {
    if (API.isCancel(error)) {
      return;
    }
    throw error;
  })
}

export const gdmAnnotationIsEarliestPublication = (earliestPubList, annotationPK) => {
  if (earliestPubList && earliestPubList.length) {
    return earliestPubList.some((pub) => {
      if (annotationPK === pub) {
        return true;
      }
      return false;
    });
  } else {
    return false;
  }
}
