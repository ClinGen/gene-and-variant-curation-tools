import React from 'react';

import LoadingSpinner from '../../../common/LoadingSpinner';

const ClinVarVariantsTable = ({
  codonCount,
  codonTerm,
  codonSymbol,
  isLoadingEsearch
}) => (
  <div className="card mb-3">
    <div className="card-header">
      <h4 className="m-0">ClinVar Variants</h4>
    </div>
    {isLoadingEsearch
      ? <LoadingSpinner className="my-4" />
      : (
        <div className="card-body d-flex">
          {codonTerm
            ? (
              <>
              {codonCount > 0
                ? (
                  <>
                  {codonCount > 1
                    ? (
                      <dl>
                        <b className="mr-3">{`Additional ClinVar variants found in the same codon: ${codonCount-1}`}</b>
                        (<a
                          href={`https://www.ncbi.nlm.nih.gov/clinvar/?term=${codonTerm}+%5Bvariant+name%5D+and+${codonSymbol}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Search ClinVar for variants in this codon
                        </a>)
                      </dl>
                    ) : (
                      <dd>The current variant is the only variant found in this codon in ClinVar.</dd>
                    )
                  }
                  </>
                ) : (
                  <dd>No variants have been found in this codon in ClinVar.</dd>
                )
              }
              </>
            ) : (
              <dd>The current variant is in a non-coding region.</dd>
            )

          }
        </div>
      )
    }
  </div>
);

export default ClinVarVariantsTable;