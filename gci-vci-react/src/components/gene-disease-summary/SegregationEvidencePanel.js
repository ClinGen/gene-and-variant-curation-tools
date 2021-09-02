import React from 'react';

import {
  useTable,
  useSortBy,
} from 'react-table';

import CardPanel from '../common/CardPanel';
import { TableContent } from '../common/TableComponents';
import HpoTerms from '../../helpers/render_hpo_terms';
import { getEvidenceAuthors } from '../../helpers/getEvidenceAuthors';
import PointsTotal from './PointsTotal';
import EarliestPubIcon from './EarliestPubIcon';

const SegregationEvidencePanel = ({
  hpoTerms,
  segregationEvidenceList,
}) => {

  const headers = [
    { key: 'label', text: 'Label' },
    { key: 'authors', text: 'Reference' },
    { key: 'ethnicity', text: 'Family Ethnicity' },
    { key: 'phenotypes', text: 'Family Phenotypes' },
    { key: 'moiDisplayedForFamily', text: 'Family MOI' },
    { key: 'segregationNumAffected', text: 'Number of Affected Individuals' },
    { key: 'segregationNumUnaffected', text: 'Number of Unaffected Individuals' },
    { key: 'lodScore', text: 'LOD Score' },
    { key: 'lodScoreCounted', text: 'LOD Score Counted' },
    { key: 'sequencingMethod', text: 'Sequencing Method' }
  ];

  const columns = headers.map((item) => {
    if (item.key === 'authors') {
      return {
        Header: item.text,
        accessor: d => {
          if (d.authors && d.authors.length) {
            return d.authors[0];
          }
          return item.key;
        },
        // eslint-disable-next-line react/display-name
        Cell: ({ row }) => {
          const evidence = row.original;
          const authors = getEvidenceAuthors(evidence);
          return (
            <span>{authors}, <strong>{evidence.pubYear}</strong>, <a href={'https://www.ncbi.nlm.nih.gov/pubmed/' + evidence.pmid} target="_blank" rel="noopener noreferrer">PMID: {evidence.pmid}</a> {evidence.earliestPub ? <EarliestPubIcon /> : null}</span>
          );
        }
      };
    } else if (item.key === 'phenotypes') {
      return {
        Header: item.text,
        accessor: item.key,
        disableSortBy: true,
        // eslint-disable-next-line react/display-name
        Cell: ({ row }) => {
          const evidence = row.original;
          return (
            <>
              {Boolean(evidence.hpoIdInDiagnosis.length)
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
        }
      };
    } else if (item.key === 'moiDisplayedForFamily') {
      return {
        Header: item.text,
        accessor: item.key,
      }
    } else if (item.key === 'lodScore') {
      return {
        Header: item.text,
        accessor: item.key,
        sortType: (rowA, rowB) => {
          const scoreA = rowA.original && rowA.original.segregationPublishedLodScore
            ? rowA.original.segregationPublishedLodScore
            : rowA.original.segregationEstimatedLodScore;
          const scoreB = rowB.original && rowB.original.segregationPublishedLodScore
            ? rowB.original.segregationPublishedLodScore
            : rowB.original.segregationEstimatedLodScore;
          if (scoreA > scoreB) {
            return 1;
          }
          if (scoreA < scoreB) {
            return -1;
          }
        },
        // eslint-disable-next-line react/display-name
        Cell: ({ row }) => {
          const evidence = row.original;
          return (
            evidence.segregationPublishedLodScore
              ? <span><strong>Published:</strong> {evidence.segregationPublishedLodScore}</span>
              : evidence.segregationEstimatedLodScore
                ? <span><strong>Calculated:</strong> {evidence.segregationEstimatedLodScore}</span>
                : '-'
          );
        }
      };
    } else if (item.key === 'lodScoreCounted') {
      return {
        Header: item.text,
        accessor: item.key,
        disableSortBy: true,
        // eslint-disable-next-line react/display-name
        Cell: ({ row }) => {
          const evidence = row.original;
          return (
            evidence.segregationPublishedLodScore || evidence.segregationEstimatedLodScore
              ? <span>{evidence.includeLodScoreInAggregateCalculation ? 'Yes' : 'No'}</span>
              : '-'
          )
        }
      };
    } else if (item.key === 'sequencingMethod') {
      return {
        Header: item.text,
        accessor: item.key,
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
      };
    } else {
      return {
        Header: item.text,
        accessor: item.key,
        disableSortBy: true,
        style: { minWidth: 80, wordBreak: 'normal' }
      };
    }
  });

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
      data: segregationEvidenceList,
      initialState: {
        sortBy: [{ id: 'lodScore' }]
      }
    },
    useSortBy,
  );

  /**
   * Method to get the total score of all scored evidence
   * @param {array} evidenceList - A list of evidence items
   */
  const getTotalScore = (evidenceList) => {
    let allScores = [];
    evidenceList.forEach(item => {
      let score;
      if (item.includeLodScoreInAggregateCalculation) {
        if (typeof item.segregationPublishedLodScore === 'number') {
          score = item.segregationPublishedLodScore;
        } else if (typeof item.segregationEstimatedLodScore === 'number') {
          score = item.segregationEstimatedLodScore;
        }
        allScores.push(score);
      }
    });
    const totalScore = allScores.reduce((a, b) => a + b, 0);
    return parseFloat(totalScore).toFixed(2);
  };

  return (
    <CardPanel
      title="Genetic Evidence: Case Level (family segregation information without proband data or scored proband data)"
      panelMarginClass="mb-5"
      bodyClass="p-0"
      className="bg-transparent"
    >
      {segregationEvidenceList && segregationEvidenceList.length
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
            <PointsTotal label="Total LOD score:" score={getTotalScore(segregationEvidenceList)} />
          </>
        ) : (
          <div className="card-body">No segregation evidence for a Family without a proband was found.</div>
        )
      }
    </CardPanel>
  );
};

export default SegregationEvidencePanel;
