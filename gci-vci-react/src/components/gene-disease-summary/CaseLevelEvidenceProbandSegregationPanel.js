import React from 'react';
import {
  useTable,
  useGroupBy,
  useSortBy
} from 'react-table';

import CardPanel from '../common/CardPanel';
import { TableContent } from '../common/TableComponents';
import HpoTerms from '../../helpers/render_hpo_terms';
import { getEvidenceAuthors } from '../../helpers/getEvidenceAuthors';
import EarliestPubIcon from './EarliestPubIcon';

const CaseLevelEvidenceSegregationProbandPanel = ({
  hpoTerms,
  caseLevelEvidenceList
}) => {

  const columns = [
    {
      Header: ' ',
      columns: [
        {
          Header: 'Family (Proband) Label',
          accessor: 'segLabel',
          style: { minWidth: 80, wordBreak: 'normal' },
          disableSortBy: true,
          enableRowSpan: true
        },
        {
          Header: 'Reference (PMID)',
          accessor: d => {
            if (d.authors && d.authors.length) {
              return d.authors[0];
            }
            return 'reference';
          },
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            const authors = getEvidenceAuthors(evidence);
            return (
              <span>{authors}, <strong>{evidence.pubYear}</strong>, <a href={'https://www.ncbi.nlm.nih.gov/pubmed/' + evidence.pmid} target="_blank" rel="noopener noreferrer">PMID: {evidence.pmid}</a> {evidence.earliestPub ? <EarliestPubIcon /> : null}</span>
            );
          },
          enableRowSpan: true
        },
        { Header: 'Family Ethnicity', accessor: 'ethnicity', disableSortBy: true, enableRowSpan: true },
        {
          Header: 'Family Phenotypes',
          accessor: 'phenotype',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {Boolean(evidence.hpoIdInDiagnosis && evidence.hpoIdInDiagnosis.length)
                  && (
                    <span><strong>HPO term(s):</strong>
                      <HpoTerms hpoIds={evidence.hpoIdInDiagnosis} hpoTerms={hpoTerms} />
                    </span>
                  )
                }
                {evidence.termsInDiagnosis
                  && <span><strong>Free text:</strong><br />{evidence.termsInDiagnosis}</span>
                }
              </>
            );
          },
          style: { whiteSpace: 'pre-wrap' },
          enableRowSpan: true
        },
        {
          Header: 'Family MOI',
          accessor: 'moi'
        },
        {
          Header: '# Aff',
          accessor: 'segregationNumAffected',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              evidence.segregationNumAffected ? evidence.segregationNumAffected : '-'
            );
          }
        },
        {
          Header: '# Unaff',
          accessor: 'segregationNumUnaffected',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              evidence.segregationNumUnaffected ? evidence.segregationNumUnaffected : '-'
            );
          }
        },
        {
          Header: 'LOD Score',
          accessor: 'lodScore',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              evidence.segregationPublishedLodScore
                ? <span><strong>Published:</strong> {evidence.segregationPublishedLodScore}</span>
                : <span>{evidence.segregationEstimatedLodScore ? <span><strong>Calculated:</strong> {evidence.segregationEstimatedLodScore}</span> : '-'}</span>
            );
          }
        },
        {
          Header: 'LOD Score Counted',
          accessor: 'counted',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              evidence.segregationPublishedLodScore || evidence.segregationEstimatedLodScore
                ? evidence.includeLodScoreInAggregateCalculation
                  ? 'Yes'
                  : 'No' 
                : '-'
            );
          }
        },
        {
          Header: 'Sequencing Method',
          accessor: 'sequencing',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              (evidence.segregationPublishedLodScore || evidence.segregationEstimatedLodScore)
              && evidence.includeLodScoreInAggregateCalculation && evidence.sequencingMethod
                ? evidence.sequencingMethod : ''
            );
          }
        },
      ]
    }
  ];

  // eslint-disable-next-line
  const memoColumns = React.useMemo(() => columns, []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
  } = useTable(
    {
      columns: memoColumns,
      data: caseLevelEvidenceList,
      initialState: {
        sortBy: [{ id: 'label' }]
      }
    },
    useGroupBy,
    useSortBy,
  );

  return (
    <CardPanel
      title="Scored Genetic Evidence: Case Level (segregation)"
      panelMarginClass="mb-5"
      bodyClass="p-0"
      className="bg-transparent"
    >
      {caseLevelEvidenceList && caseLevelEvidenceList.length
        ? (
          <>
            <TableContent
              getTableProps={getTableProps}
              headerGroups={headerGroups}
              getTableBodyProps={getTableBodyProps}
              rows={rows}
              prepareRow={prepareRow}
              isStriped={false}
              isBordered
              isCenterAligned
            />
          </>
        ) : (
          <div className="card-body">No scored Case Level evidence was found.</div>
        ) 
      }
    </CardPanel>
  );

};

export default CaseLevelEvidenceSegregationProbandPanel;
