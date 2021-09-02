import { CuratedActionTypes } from "../actions/curatedEvidenceActions";

/**
 * Curated Evidence reducer Redux
 * returns a Suite for Curated Evidence Objects
 *
 * state shape design referring to redux doc recommendation
 * https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape#designing-a-normalized-state
 */
const initialState = {
  byPK: {}, // stores a key-value table to lookup a curatedEvidence, e.g. { 'PK1': {...curatedEvidenceObject...}, 'PK2': {...curatedEvidenceObject...} }
  // below only stores PK
  byCategory: {
    // similar to `byPK` but group by curatedEvidence.category, e.g. below:
    // category1: ["PK1", "PK2", ...]
    // category2: ["PK4", "PK9", ...]
  },
  allPKs: [], // a list to reflect all PKs in byPK
};

const curatedEvidenceReducer = (state = initialState, action) => {
  switch (action.type) {
    case CuratedActionTypes.set: {
      const curatedEvidences = action.curatedEvidences;
      const byPK = {};
      const byCategory = {};
      const allPKs = [];
      for (const curatedEvidence of curatedEvidences) {
        // build actual object table
        byPK[curatedEvidence.PK] = curatedEvidence;
        // build group-by-category lookup table
        if (!byCategory[curatedEvidence.category]) {
          byCategory[curatedEvidence.category] = [];
        }
        byCategory[curatedEvidence.category].push(curatedEvidence.PK);
        // build all-PKs list
        allPKs.push(curatedEvidence.PK);
      }
      return {
        byPK,
        byCategory,
        allPKs,
      };
    }
    case CuratedActionTypes.add: {
      const curatedEvidence = action.curatedEvidence;
      const byPK = {
        ...state.byPK,
        [curatedEvidence.PK]: curatedEvidence,
      };
      // see if already having this category in state
      let byCategory;
      if (!state.byCategory[curatedEvidence.category]) {
        // if no category field yet, we'll have to create a key-list pair for it in `byCategory`
        byCategory = {
          ...state.byCategory,
          [curatedEvidence.category]: [curatedEvidence.PK],
        };
      } else {
        byCategory = {
          ...state.byCategory,
          [curatedEvidence.category]: [
            curatedEvidence.PK,
            ...state.byCategory[curatedEvidence.category],
          ],
        };
      }
      const allPKs = [curatedEvidence.PK, ...state.allPKs];
      return {
        byPK,
        byCategory,
        allPKs,
      };
    }
    case CuratedActionTypes.update: {
      // only needs to modify the object in byPK
      // no need to change list of allPKs or byCategory
      const curatedEvidence = action.curatedEvidence;
      const byPK = {
        ...state.byPK,
        [curatedEvidence.PK]: curatedEvidence,
      };
      return {
        byPK,
        byCategory: state.byCategory,
        allPKs: state.allPKs,
      };
    }
    case CuratedActionTypes.delete: {
      const curatedEvidence = action.curatedEvidence;
      // use ES6 destructure to remove property (the PK to delete) from state object immutably
      // see https://stackoverflow.com/questions/34401098/remove-a-property-in-an-object-immutably
      const { [curatedEvidence.PK]: _, ...byPK } = state.byPK;
      const byCategory = {
        ...state.byCategory,
        [curatedEvidence.category]: state.byCategory[
          curatedEvidence.category
        ].filter((PK) => PK !== curatedEvidence.PK),
      };
      const allPKs = state.allPKs.filter((PK) => PK !== curatedEvidence.PK);
      return {
        byPK,
        byCategory,
        allPKs,
      };
    }
    default:
      return state;
  }
};

export default curatedEvidenceReducer;
