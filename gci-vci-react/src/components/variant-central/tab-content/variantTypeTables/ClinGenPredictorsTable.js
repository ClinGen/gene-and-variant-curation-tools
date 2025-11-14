import React from 'react';
import Table from 'react-bootstrap/Table';

import LoadingSpinner from '../../../common/LoadingSpinner';

const ClinGenPredictorsTable = ({
  clinGenPred,
  clinGenPredStatic,
  isSingleNucleotide,
  isLoadingLDHData,
  canExpand
}) => (
  <div className="card mb-3">
    <div className="card-header">
      <h4 className="m-0">ClinGen Predictors
        <a href="#credit-ldh-variant-type" className="credit-ldh" title="ClinGen Linked Data Hub">
          <span>ClinGen Linked Data Hub</span>
        </a>
      </h4>
    </div>
    {isLoadingLDHData
      ? <LoadingSpinner className="my-4" />
      : (
        <>
        {isSingleNucleotide && clinGenPred
          ? (
            <Table className="clingen-predictors">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Score Range</th>
                  <th>Score</th>
                  <th>Transcript</th>
                  <th>Impact Threshold</th>
                  <th>Prediction</th>
                </tr>
              </thead>
              <tbody>
                {
                  clinGenPredStatic._order.map((method) => (
                    clinGenPred[method].visible)
                      ? (
                        <tr key={method}>
                        <td>
                          {clinGenPredStatic._url[method]
                            ? (
                              <span>
                                <a
                                  href={clinGenPredStatic._url[method]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {clinGenPredStatic._labels[method]}
                                </a>
                                <span className="pred-source-type">{clinGenPredStatic._type[method]}</span>
                              </span>
                            ) : (
                              <span>{clinGenPredStatic._labels[method] + clinGenPredStatic._type[method]}</span>
                            )
                          }
                        </td>
                        <td>{clinGenPred[method].score_range}</td>
                        {clinGenPred[method].mane_scores.length > 0 || clinGenPred[method].non_mane_scores.length > 0
                          ? (
                            <td className="pred-scores-columns" colSpan="2">
                              <Table className="clingen-predictors">
                                {clinGenPred[method].mane_scores.length > 0
                                  ? (
                                    <tbody id="pred-scores-mane">
                                      {clinGenPred[method].mane_scores.map((transcriptScore, i) => (
                                        <tr key={`pred-score-mane-${i}`}>
                                          <td className="pred-score">{transcriptScore.score}</td>
                                          <td className="pred-transcript">
                                            <Table className="clingen-predictors">
                                              <tbody>
                                                <tr>
                                                  <td className="pred-transcript-id">{transcriptScore.transcript}</td>
                                                  <td className="pred-transcript-mane">
                                                    <span>{transcriptScore.mane}</span>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </Table>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  ) : null
                                }{clinGenPred[method].non_mane_scores.length > 0
                                  ? (
                                    <tbody id={`${method}-scores-non-mane`} className={canExpand ? 'collapse' : ''}>
                                      {clinGenPred[method].non_mane_scores.map((transcriptScore, i) => (
                                        <tr key={`pred-score-non-mane-${i}`}>
                                          <td className="pred-score">{transcriptScore.score}</td>
                                          <td className="pred-transcript">{transcriptScore.transcript}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  ) : null
                                }{canExpand
                                  ? (
                                    <tbody id="pred-scores-expand">
                                      <tr>
                                        <td className="pred-expand" colSpan="2">
                                          <a href={`#${method}-scores-non-mane`} role="button" data-toggle="collapse"
                                            aria-expanded="false" aria-controls={`${method}-scores-non-mane`} onClick={(e) => {
                                              if (e.target) {
                                                if (e.target.text.startsWith('Show non-MANE transcript scores')) {
                                                  e.target.text = 'Hide non-MANE transcript scores';
                                                } else {
                                                  e.target.text = `Show non-MANE transcript scores (${clinGenPred[method].non_mane_scores.length})`;
                                                }
                                              }
                                            }}>Show non-MANE transcript scores ({clinGenPred[method].non_mane_scores.length})</a>
                                        </td>
                                      </tr>
                                    </tbody>
                                  ) : null
                                }
                              </Table>
                            </td>
                          ) : (
                            <td colSpan="2">No data found</td>
                          )
                        }
                        <td>{clinGenPredStatic._pathoThreshold[method]}</td>
                        <td>{clinGenPred[method].prediction}</td>
                      </tr>
                    ) : null
                  )
                }
              </tbody>
            </Table>
          ) : (
            <div className="card-body"><span>These predictors only return data for missense variants.</span></div>
          )
        }
        </>
      )
    }
  </div>
);

export default ClinGenPredictorsTable;