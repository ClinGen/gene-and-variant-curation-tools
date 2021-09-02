import lodashGet from "lodash/get";

/**
 * Check if Create New Gene Curation is allowed for logged in user.
 * Only user curating as part of an affiliation that has a GCEP should be able to create new GDMs.
 * Or Demo user on test sites.
 * @param {object} user - Logged in user object
*/
export function isUserAllowedToCreateGdm(user) {
  const allow = user && (user.email === 'clingen.demo.curator@genome.stanford.edu' ||
    lodashGet(user, "currentAffiliation.subgroups.gcep.id", null)) ? true : false;

  return allow;
}
