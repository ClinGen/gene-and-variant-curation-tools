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
import PointTotals from './PointsTotal';

const CaseLevelEvidencePanelSop7 = ({
  hpoTerms,
  caseLevelEvidenceList
}) => {

  const columns = [
    {
      Header: ' ',
      columns: [
        {
          Header: 'Label',
          accessor: 'label',
          style: { minWidth: 80, wordBreak: 'normal' },
          disableSortBy: true
        },
        { Header: 'Variant Type', accessor: 'variantType' },
        {
          Header: 'Variant',
          accessor: 'Variant',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {evidence.variants.map((variant, i) => {
                  return (
                    <div key={i} className="variant-info">
                      {variant.preferredTitle}
                    </div>
                  );
                })}
                <span><strong>{evidence.probandIs}</strong></span>
              </>
            );
          }
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
              <span>{authors}, <strong>{evidence.pubYear}</strong>, <a href={'https://www.ncbi.nlm.nih.gov/pubmed/' + evidence.pmid} target="_blank" rel="noopener noreferrer">PMID: {evidence.pmid}</a></span>
            );
          }
        },
        { Header: 'Proband Sex', accessor: 'sex', disableSortBy: true, style: { maxWidth: 80 } },
        {
          Header: 'Proband Age',
          accessor: 'age',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              evidence.ageValue
                ? <span>{evidence.ageType
                  ? <strong>Age of {evidence.ageType}: </strong>
                  : null}{evidence.ageValue} {evidence.ageUnit.length
                    ? evidence.ageUnit
                    : null}</span>
                : null
            );
          }
        },
        { Header: 'Proband Ethnicity', accessor: 'ethnicity', disableSortBy: true, },
        {
          Header: 'Proband Phenotypes',
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
          }
        },
      ]
    },
    {
      Header: 'Segregations',
      columns: [
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
          Header: 'Counted',
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
          Header: 'Sequencing',
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
        }
      ]
    },
    {
      Header: '  ',
      columns: [
        { Header: 'Proband Previous Testing', accessor: 'previousTestingDescription', disableSortBy: true },
        {
          Header: 'Proband Methods of Detection',
          accessor: 'detectionMethod',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {Boolean(evidence.genotypingMethods.length)
                  && evidence.genotypingMethods.map((method, i) => (
                      <span key={i}>{i > 0 ? '; ' : ''}<strong>Method {i+1}:</strong> {method}</span>
                    ))
                }
                {evidence.specificMutationsGenotypedMethod && evidence.specificMutationsGenotypedMethod.length &&
                  <>
                    <br />
                    <strong>Description of genotyping method: </strong>
                    {evidence.specificMutationsGenotypedMethod}
                  </>
                }
              </>
            );
          }

        },
        { Header: 'Score Status', accessor: 'scoreStatus', disableSortBy: true },
        {
          Header: 'Proband Points (default points)',
          accessor: 'score',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              evidence.variantType.length && evidence.scoreStatus !== 'Contradicts'
                ? <span><strong>{typeof evidence.modifiedScore === 'number' ? evidence.modifiedScore : evidence.defaultScore}</strong>  ({evidence.defaultScore})</span>
                : <span className={evidence.scoreStatus}>n/a</span>
            );
          }
        },
        {
          Header: 'Reason for Changed Score',
          accessor: 'scoreExplanation',
          disableSortBy: true,
          style: { maxWidth: 240 }
        }
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
        sortBy: [{ id: 'variantType' }]
      }
    },
    useGroupBy,
    useSortBy
  );

  /**
   * Method to get the total score of all scored evidence
   * @param {array} evidenceList - A list of evidence items
   */
  const getTotalScore = (evidenceList) => {
    let allScores = [];
    evidenceList.forEach(item => {
      let score;
      if (item.scoreStatus.indexOf('Score') > -1) {
        score = typeof item.modifiedScore === 'number' ? item.modifiedScore : item.defaultScore;
        allScores.push(score);
      }
    });
    const totalScore = allScores.reduce((a, b) => a + b, 0);
    return parseFloat(totalScore).toFixed(2);
  };

  return (
    <CardPanel
      title="Genetic Evidence: Case Level (variants, segregation)"
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
            <PointTotals label="Total points:" score={getTotalScore(caseLevelEvidenceList)} />
          </>
        ) : (
          <div className="card-body">No scored Case Level evidence was found.</div>
        ) 
      }
    </CardPanel>
  );

};

export default CaseLevelEvidencePanelSop7;
