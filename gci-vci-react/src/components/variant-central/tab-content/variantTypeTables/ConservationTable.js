import React from 'react';
import Table from 'react-bootstrap/Table';

import LoadingSpinner from '../../../common/LoadingSpinner';

const OtherPredictorsTable = ({
  gRCh37Links,
  conservation,
  conservationStatic,
  isSingleNucleotide,
  isLoadingMyVariantInfo
}) => (
  <div className="card mb-3">
    <div className="card-header d-flex">
      <h4 className="m-0">
        Conservation Analysis
        <a href="#credit-myvariant-variant-type" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
      </h4>
      {gRCh37Links
        && (
          <a
            className="ml-2"
            href={gRCh37Links.ucsc_url_37}
            target="_blank"
            rel="noopener noreferrer"
            title={`UCSC Genome Browser for ${gRCh37Links} in a new window`}
          >
            View position in UCSC Genome Browser
          </a>
        )
      }
    </div>
    {isLoadingMyVariantInfo
      ? <LoadingSpinner className="my-4" />
      : (
        <>
        {isSingleNucleotide && conservation
          ? (
            <Table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {conservationStatic._order.map((method) => (
                  <tr key={method}>
                    <td>
                      {conservationStatic._url[method]
                        ? ( 
                          <a href={conservationStatic._url[method]}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {conservationStatic._labels[method]}
                          </a>
                        ) : conservationStatic._labels[method]
                      }
                    </td>
                    <td>{conservation[method] ? conservation[method] : '--'}</td>
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