import lodashGet from "lodash/get";
  
/**
 * Method to return the earliestPublication article PK and Year given the annotation or article object
 * @param {object} article  - article object
 */
export function getArticlePmidAndYear (article) {
  const articlePK = lodashGet(article, "PK", null);
  const articleDate = lodashGet(article, "date", null);
  const pubDate = articleDate && (/^([\d]{4})(.*?)$/).exec(articleDate);
  const articleYear = pubDate && pubDate[1];

  return ({articlePK, articleYear});
}
