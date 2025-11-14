import React from 'react';
import { getArticlePmidAndYear } from './getArticlePmidAndYear';


/**
 * Method to display the reference given the list of earliest publications
 * If publication is article, display PMID and published year.
 * If publication is ClinVar record, display SCV id and created/updated year.
 * Applicable to: GCI Classification Matrix, GCI Evaluation Summary
 * @param {array} earliestPublications - The given list of earliest publications
 */
export function renderEarliestPublications(earliestPublications) {
  return (
    <div>
      {earliestPublications && earliestPublications.map((pub, i) => {
        // Show the article's PMID and published year
        if (pub.pmid) {
          const articleInfo = getArticlePmidAndYear(pub);
          return <span key={`earliestPub-${i}`}>{articleInfo ? `PMID: ${articleInfo.articlePK}, ${articleInfo.articleYear}` : null}<br/></span>
        } else if (pub.scvId) {
          // Show the ClinVar SCV id and year
          const pubYear = pub.date && pub.date.substring(0, 4);
          return <span key={`earliestPub-${i}`}>{pub.scvId ? `ClinVar: ${pub.scvId}, ${pubYear}` : null}<br/></span>
        }
      })}
    </div>
  );
}
