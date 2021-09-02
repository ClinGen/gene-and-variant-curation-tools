// export of Redux reducers, combine reducers here prior to export
import { combineReducers } from "redux";
import auth from "./Auth";
import variant from "./Variant";
import interpretation from "./Interpretation";
import gdm from "./Gdm";
import curatedEvidences from "./CuratedEvidences";
import annotations from "./Annotations";

const ClinGenReducer = combineReducers({
  auth,
  variant,
  interpretation,
  gdm,
  annotations,
  curatedEvidences,
});

export default (state, action) => {
  if (action.type === 'LOGOUT') {
    // let each reducer reset to their `initialState`
    // https://stackoverflow.com/a/35641992/9814131
    state = undefined;
  }

  return ClinGenReducer(state, action);
};
