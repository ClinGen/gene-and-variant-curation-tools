import React from 'react';
import PropTypes from 'prop-types';

const PmidSummary = ({
  article,
  displayJournal,
  pmidLinkout,
  pmidLinkoutOnNewLine,
  className,
}) => {
  let authors, authorsAll;
  if (article && Object.keys(article).length) {
    const date = (/^([\d]{4})(.*?)$/).exec(article.date);
    if (article.authors && article.authors.length) {
      authors = article.authors[0] + (article.authors.length > 1 ? ' et al. ' : '. ');
      authorsAll = article.authors.join(', ') + '. ';
    }

    return (
      <>
        <p className={className}>
            {displayJournal ? authorsAll : authors}
            {article.title + ' '}
            {displayJournal ? <i>{article.journal + '. '}</i> : null}
            {
              date && date.length > 2 ? <><strong>{date[1]}</strong>{date[2]}</> : null
            }
            {pmidLinkout && !pmidLinkoutOnNewLine && <span>&nbsp;<a href={`https://www.ncbi.nlm.nih.gov/pubmed/${article.pmid}`} title={`PubMed entry for PMID: ${article.pmid} in new tab`} target="_blank" rel="noopener noreferrer">PMID: {article.pmid}</a></span>}
        </p>
        {pmidLinkout && pmidLinkoutOnNewLine && <p className="mb-0">
          <strong><span>&nbsp;<a href={`https://www.ncbi.nlm.nih.gov/pubmed/${article.pmid}`} title={`PubMed entry for PMID: ${article.pmid} in new tab`} target="_blank" rel="noopener noreferrer">PMID: {article.pmid}</a></span></strong>
        </p>}
        </>
    );
  } else {
    return null;
  }
};
PmidSummary.propTypes = {
  // show a external link for the article
  pmidLinkout: PropTypes.bool,
  // let the article external link be in new line
  pmidLinkoutOnNewLine: PropTypes.bool
}

export default PmidSummary;