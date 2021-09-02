/**
 * Redux store actions
 *  
 */
export const resetAuth = (auth) => ({
    type: 'RESET_AUTH',
    auth
})

export const updateAuth = (auth) => ({
  type: 'UPDATE_AUTH',
  auth
})

/**
 * A special action that will trigger at the root reducer `ClinGenReducer` and clear out redux data
 */
export const logoutAction = () => ({
    type: 'LOGOUT',
})

export const updateCurrentAffiliation = (currentAffiliation) => ({
    type: 'UPDATE_CURRENT_AFFILIATION',
    currentAffiliation
});

export const setIsAuthenticating = (isAuthenticating) => ({
    type: 'SET_IS_AUTHENTICATING_AUTH',
    isAuthenticating
});

export const updateVariant = (variant) => ({
    type: 'SET_VARIANT',
    variant
})

export const updateInterpretation = (interpretation) => ({
    type: 'SET_INTERPRETATION',
    interpretation
})
