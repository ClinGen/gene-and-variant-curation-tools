import React from 'react';

import PmidSummary from '../common/article/PmidSummary';
import CardPanel from '../common/CardPanel';
import EarliestPubIcon from './EarliestPubIcon';

const GeneDiseaseEvidenceSummaryNonscorableEvidence = ({
  nonscorableEvidenceList,
}) => (
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
                <div key={evidence.article.pmid}>
                  <span>
                    <strong>{ `PMID: ${evidence.article.pmid}` } </strong>
                    {evidence.earliestPub ? <EarliestPubIcon /> : null}
                  </span>
                  <PmidSummary article={evidence.article} displayJournal />
                  <span>
                      <strong>Explanation: </strong>
                      {
                        evidence.articleNotes && evidence.articleNotes.nonscorable && evidence.articleNotes.nonscorable.text
                          ? <span className="text-pre-wrap">{ evidence.articleNotes.nonscorable.text }</span>
                          : <span>None</span>
                      }
                  </span>
                  {(i < nonscorableEvidenceList.length - 1) && <hr />}
                </div>
              ))
            }
          </>
        ) : (
          <span>No non-scorable evidence was found.</span>
        )
    }
  </CardPanel>
);


export default GeneDiseaseEvidenceSummaryNonscorableEvidence;
