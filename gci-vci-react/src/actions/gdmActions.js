export const GdmActionTypes = {
  set: 'SET_GDM',
  reset: 'RESET_GDM',
  isLoading: 'SET_GDM_IS_LOADING',
  fetchSuccess: 'FETCH_GDM_SUCCESS',
  fetchFailure: 'FETCH_GDM_FAILURE'
}

export const setGdmAction = (gdm) => ({
  type: GdmActionTypes.set,
  gdm
});

/**
 * Note that `resetGdmAction` will clean up all fields in gdm redux store, including `gdm.isLoading` and `gdm.fetchErrorMessage`,
 * while `setGdmAction` only sets the `gdm.entity` data.
 */
export const resetGdmAction = () => ({
  type: GdmActionTypes.reset
});

export const setGdmIsLoadingAction = (isLoading) => ({
  type: GdmActionTypes.isLoading,
  isLoading
});

export const fetchGdmSucceesAction = (gdm) => ({
  type: GdmActionTypes.fetchSuccess,
  gdm
})

export const fetchGdmFailureAction = (errorMessage) => ({
  type: GdmActionTypes.fetchFailure,
  errorMessage
})
