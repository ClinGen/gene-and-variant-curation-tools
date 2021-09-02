import React from 'react';
import { useSelector } from "react-redux";
import { getAffiliationName } from "../helpers/get_affiliation_name";
import { getUserName } from "../helpers/getUserName";


export const isActiveUser = (auth) => {
    return auth && auth.user_status === 'active';
}

export const OwnerTextDisplay = ({ object }) => {
    return (
        <>
            {/* TODO: change to use embed affiliation and remove use hard-coded affiliation json */}
            {object.affiliation ?
                <span>{getAffiliationName(object.affiliation)}</span>
                :
                object.submitted_by ?
                <a href={'mailto:' + object.submitted_by.email}>{getUserName(object.submitted_by)}</a>
                :
                <>None</>
            }
        </>
    )
}

/**
 * A hook you can use to tell if current interpretation is mine
 */
export const useIsMyInterpretation = () => {
    const interpretation = useSelector(state => state.interpretation);
    const auth = useSelector(state => state.auth);
    return isOwnedByCurrentCuratingEntity(interpretation, auth);
}


/**
 * This method checks whether an object belongs to current affiliation, or current individual if current affiliation is not set.
 * Uses the fields `affiliation` and `submitted_by` on `objectToCheckOwnership` to carry out the check.
 * @param {any} objectToCheckOwnership - the object to check for ownership.
 * @param {any} currentAuthInRedux - use `useSelector(state => state.auth)` to obtain the current logged in user auth object in redux.
 * @returns {boolean} - is owned by current entity or not
 */
export const isOwnedByCurrentCuratingEntity = (objectToCheckOwnership, currentAuthInRedux) => {
  // user curate as an affiliation
  if (currentAuthInRedux.currentAffiliation) {
      if (
          // make sure object belongs to an affiliation (not individual),
          objectToCheckOwnership && objectToCheckOwnership.affiliation &&
          // check object belongs to current affiliation
          objectToCheckOwnership.affiliation === currentAuthInRedux.currentAffiliation.affiliation_id
      ) {
          return true;
      }
  } 
  // user curate as an individual
  else {
      if (
          // make sure object does not belong to affiliation (belongs to individual)
          objectToCheckOwnership && !objectToCheckOwnership.affiliation &&
          // check object is submitted by current login user
          objectToCheckOwnership.submitted_by && (
              (typeof objectToCheckOwnership.submitted_by === 'string' && objectToCheckOwnership.submitted_by === currentAuthInRedux.PK) ||
              (typeof objectToCheckOwnership.submitted_by === 'object' && objectToCheckOwnership.submitted_by.PK === currentAuthInRedux.PK)
          )
      ) {
          return true;
      }
  }

  return false;
}
