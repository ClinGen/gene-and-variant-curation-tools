
/**
 * GDM reducer Redux
 * returns GDM object
 */

import { GdmActionTypes } from "../actions/gdmActions"

const initialState = {
  entity: null,
  isLoading: false,
  fetchErrorMessage: null
};

const gdmReducer = (state = initialState, action) => {
  switch (action.type) {
    case GdmActionTypes.reset:
      return initialState;
    case GdmActionTypes.set:
      return {
        ...state,
        // if gdm is undefined, cast to null to avoid redux error
        entity: action.gdm || null
      };
    case GdmActionTypes.isLoading:
      return {
        ...state,
        isLoading: !!action.isLoading
      }
    case GdmActionTypes.fetchSuccess:
      return {
        entity: action.gdm || null,
        isLoading: false,
        fetchErrorMessage: null
      };
    case GdmActionTypes.fetchFailure:
      return {
        entity: null,
        isLoading: false,
        fetchErrorMessage: action.errorMessage || ''
      };
    default:
      return state;
  }
}

export default gdmReducer
