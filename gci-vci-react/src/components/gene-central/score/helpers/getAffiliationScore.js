// Return the score from the given array of scores that's associated with the curator's
// affiliation given the affiliation ID. The returned score is a clone of the original object,
// so it can be modified without side effects.

import _ from 'lodash';

export function getAffiliationScore(scores, affiliationId) {
  if (affiliationId) {
    return _.chain(scores).find(score => {
      if (score.affiliation && score.affiliation.length) {
        return score.affiliation === affiliationId;
      }
    }).clone().value();
  }
  return null;
}
