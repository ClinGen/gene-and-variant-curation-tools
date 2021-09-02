/**
 * Method to assemble the authors list for the given evidence
 * @param {object} evidence - scored evidence and its associated case-control evidence
 */
const getEvidenceAuthors = (evidence) => {
  let authors;
  if (evidence.authors && evidence.authors.length) {
      if (evidence.authors.length > 1) {
          authors = evidence.authors[0] + ', et al.';
      } else {
          authors = evidence.authors[0];
      }
  }
  return authors;
};

export { getEvidenceAuthors };