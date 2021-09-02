// Return the score from the given array of scores that's owned by the curator with the
// given UUID. The returned score is a clone of the original object, so it can be modified
// without side effects.

import _ from 'lodash';

export function getUserScore(scores, curatorPK) {
  if (curatorPK) {
    return _.chain(scores).find((score) => {
      return score && score.submitted_by && score.submitted_by.PK  === curatorPK;
    }).clone().value();
  }
  return null;
}
