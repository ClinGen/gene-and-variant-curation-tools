import React from 'react';
import { getArticlePmidAndYear } from './getArticlePmidAndYear';


/**
 * Method to display the article PMID and published year given the list of earliest publications
 * Applicable to: GCI Classification Matrix, GCI Evaluation Summary
 * @param {array} earliestArticles - The given list of earliest publications 
 */
export function renderEarliestPublications(earliestArticles) {
  // Show the articles' PMID and published year
  return (
    <div>
      {earliestArticles && earliestArticles.map((pub, i) => {
        const articleInfo = getArticlePmidAndYear(pub);
        return <span key={`earliestPub-${i}`}>{articleInfo ? `PMID: ${articleInfo.articlePK}, ${articleInfo.articleYear}` : null}<br/></span>
      })}
    </div>
  );
}
