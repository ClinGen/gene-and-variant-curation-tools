import React from 'react';

import PmidSummary from '../common/article/PmidSummary';
import ClinVarSummary from '../common/article/ClinVarSummary';
import CardPanel from '../common/CardPanel';
import EarliestPubIcon from './EarliestPubIcon';

const GeneDiseaseEvidenceSummaryNonscorableEvidence = ({
  nonscorableEvidenceList,
}) => {

  const renderArticleEvidence = (evidence, index) => {
    return (
      <div key={evidence.article.pmid}>
        <span>
          <strong>{ `PMID: ${evidence.article.pmid}` } </strong>
            {evidence.earliestPub ? <EarliestPubIcon /> : null}
            {evidence.annoLink ? <a href={evidence.annoLink} target="_blank" rel="noopener noreferrer">View</a> : null}
        </span>
        <PmidSummary
          article={evidence.article}
          displayJournal
          displayAllAuthors
        />
        <span>
          <strong>Explanation: </strong>
          {
            evidence.articleNotes?.nonscorable?.text
              ? <span className="text-pre-wrap">{ evidence.articleNotes.nonscorable.text }</span>
              : <span>None</span>
          }
        </span>
        {(index < nonscorableEvidenceList.length - 1) && <hr />}
      </div>
    );
  }

  const renderSCVEvidence = (evidence, index) => {
    return (
      <div key={evidence.scv.scvId}>
        <span>
          <strong>{ `${evidence.scv.scvId} (${evidence.scv.vcvId})` } </strong>
            {evidence.earliestPub ? <EarliestPubIcon /> : null}
            {evidence.annoLink ? <a href={evidence.annoLink} target="_blank" rel="noopener noreferrer">View</a> : null}
        </span>
        <ClinVarSummary scv={evidence.scv} linkout={false} />
        <span>
          <strong>Explanation: </strong>
          {
            evidence.articleNotes?.nonscorable?.text
              ? <span className="text-pre-wrap">{ evidence.articleNotes.nonscorable.text }</span>
              : <span>None</span>
          }
        </span>
        {(index < nonscorableEvidenceList.length - 1) && <hr />}
      </div>
    );
  }

  const renderEvidence = (evidence, index) => {
    if (evidence?.article) {
      return (renderArticleEvidence(evidence, index));
    } else if (evidence?.scv) {
      return (renderSCVEvidence(evidence, index));
    }
  };


 return(
  <CardPanel
    title="Non-scorable Evidence" 
    panelMarginClass="mb-3"
    className="bg-transparent"
  >
    {
      nonscorableEvidenceList && nonscorableEvidenceList.length
        ? (
          <>
            {
              nonscorableEvidenceList.map((evidence, i) => (
                renderEvidence(evidence, i)
              ))
            }
          </>
        ) : (
          <span>No non-scorable evidence was found.</span>
        )
    }
  </CardPanel>
 );
};


export default GeneDiseaseEvidenceSummaryNonscorableEvidence;
