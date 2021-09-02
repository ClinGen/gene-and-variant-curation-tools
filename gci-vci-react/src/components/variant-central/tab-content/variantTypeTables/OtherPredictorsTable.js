import React from 'react';
import Table from 'react-bootstrap/Table';

import Popover from '../../../common/Popover';
import LoadingSpinner from '../../../common/LoadingSpinner';
import OtherPredictorsInfoTable from './OtherPredictorsInfoTable';

const OtherPredictorsTable = ({
  otherPred,
  otherPredStatic,
  isSingleNucleotide,
  isLoadingMyVariantInfo
}) => (
  <div className="card mb-3">
    <div className="card-header">
      <h4 className="m-0">
        Other Predictors
        <a href="#credit-myvariant-variant-type" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
      </h4>
    </div>
    {isLoadingMyVariantInfo
      ? <LoadingSpinner className="my-4" />
      : (
        <>
        {isSingleNucleotide && otherPred
          ? (
            <Table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Score Range</th>
                  <th>Score</th>
                  <th>Impact Threshold</th>
                  <th>
                    Prediction
                    <Popover
                      className="ml-1 popover-trigger-line-height-80"
                      trigger="focus"
                      triggerComponent={<i className="icon icon-info-circle" />}
                      content={<OtherPredictorsInfoTable />}
                      placement="left"
                      popoverClassName="popover-computational-pred"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {otherPredStatic._order.map((method) => (
                  <tr key={method}>
                    <td>
                        {otherPredStatic._url[method]
                          ? (
                            <span>
                              <a
                                href={otherPredStatic._url[method]}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {otherPredStatic._labels[method]}
                              </a>{otherPredStatic._type[method]}</span>
                          ) : (
                            <span>{otherPredStatic._labels[method] + otherPredStatic._type[method]}</span>
                          )
                        }
                    </td>
                    <td>{otherPred[method].score_range}</td>
                    <td>
                      {otherPred[method].score
                        ? (Array.isArray(otherPred[method].score)
                          ? otherPred[method].score.join(', ')
                          : otherPred[method].score)
                        : '--'
                      }
                    </td>
                    <td>{otherPredStatic._pathoThreshold[method]}</td>
                    <td>{otherPred[method].prediction ? otherPred[method].prediction : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="card-body"><span>Data is currently only returned for single nucleotide variants.</span></div>
          )
        }
        </>
      )
    }
  </div>
);

export default OtherPredictorsTable;