/**
 * Converts camelCase string to dash-case string.
 * 
 * @param {string} camelCaseString 
 * @returns {string} - the dash-case string
 */
export const convertCamelCaseToDashCase = (camelCaseString) => {
  if (typeof camelCaseString !== 'string') {
    return camelCaseString;
  }

  return camelCaseString.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`);
}
