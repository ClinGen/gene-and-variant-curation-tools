
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

  /**
 * Check if using the production site, returns appropriate Affiliations 
 * API endpoint URL.
 * @returns {string|undefined}
 */
export const REACT_APP_AFFILS_ENDPOINT = isProdSite()
  ? process.env.REACT_APP_AFFILS_ENDPOINT_PROD
  : process.env.REACT_APP_AFFILS_ENDPOINT_TEST;


  /**
 * Check if using the production site, returns appropriate Affiliations 
 * API key.
 * @returns {string|undefined}
 */
export const REACT_APP_AFFILS_API_KEY = isProdSite()
  ? process.env.REACT_APP_AFFILS_API_KEY_PROD
  : process.env.REACT_APP_AFFILS_API_KEY_TEST;
  