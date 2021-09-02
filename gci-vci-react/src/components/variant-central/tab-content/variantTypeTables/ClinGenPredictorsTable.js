import React from 'react';
import Table from 'react-bootstrap/Table';

import LoadingSpinner from '../../../common/LoadingSpinner';

const ClinGenPredictorsTable = ({
  clinGenPred,
  clinGenPredStatic,
  isSingleNucleotide,
  isLoadingMyVariantInfo
}) => (
  <div className="card mb-3">
    <div className="card-header">
      <h4 className="m-0">ClinGen Predictors</h4>
    </div>
    {isLoadingMyVariantInfo
      ? <LoadingSpinner className="my-4" />
      : (
        <>
        {isSingleNucleotide && clinGenPred
          ? (
            <Table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Score Range</th>
                  <th>Score</th>
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
                                {clinGenPredStatic._type[method]}
                              </span>
                            ) : (
                              <span>{clinGenPredStatic._type[method] + clinGenPredStatic._type[method]}</span>
                            )
                          }
                        </td>
                        <td>{clinGenPred[method].score_range}</td>
                        <td>{clinGenPred[method].score ? clinGenPred[method].score : 'No data found'}</td>
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