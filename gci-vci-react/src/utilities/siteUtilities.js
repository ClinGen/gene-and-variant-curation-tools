
/**
 * Check if site is the production site (by hostname)
 *
 * @returns {boolean} - True if user is on production site
 */
export const isProdSite = () => {
  if (typeof window !== 'undefined' && window && window.location && window.location.hostname === 'curation.clinicalgenome.org') {
    return true;
  } else {
    return false;
  }
}
