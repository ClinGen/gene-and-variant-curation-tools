// Return the score from the given array of scores that's associated with the curator's
// affiliation given the curator data. The returned score is a clone of the original object,
// so it can be modified without side effects.

import lodashGet from "lodash/get";
import { getAffiliationScore } from './getAffiliationScore';

export function getUserAffiliatedScore(scores, user) {
  let affiliatedScore = null;
  if (scores && scores.length) {
    const affiliationId = lodashGet(user, "currentAffiliation.affiliation_id", null);
    if (affiliationId) {
      affiliatedScore = getAffiliationScore(scores, affiliationId);
    }
  }
  return affiliatedScore;
}
