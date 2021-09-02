/**
 * Auth reducer Redux
 * returns username
 */
const initialState = {
  phone_number: "",
  date_created: "",
  email: "",
  PK: "",
  name: "",
  family_name: "",
  user_status: "",
  last_modified: "",
  item_type: "",
  currentAffiliation: null,
  isAuthenticating: false
}

const auth = (state = initialState, action) => {
  switch (action.type) {
    case 'RESET_AUTH':
      return initialState;
    case 'UPDATE_AUTH':
      return { ...state, ...action.auth };
    case 'UPDATE_CURRENT_AFFILIATION':
      return { ...state, currentAffiliation: action.currentAffiliation };
    case 'SET_IS_AUTHENTICATING_AUTH':
      return { ...state, isAuthenticating: action.isAuthenticating };
    default:
      return state
  }
}

export default auth

