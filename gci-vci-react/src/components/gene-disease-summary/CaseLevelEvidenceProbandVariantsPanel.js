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
import EarliestPubIcon from './EarliestPubIcon';

const CaseLevelEvidenceVariantsProbandPanel = ({
  hpoTerms,
  caseLevelEvidenceList
}) => {

  const columns = [
    {
      Header: ' ',
      columns: [
        {
          Header: 'Proband Label',
          accessor: 'label',
          style: { minWidth: 80, wordBreak: 'normal' },
          disableSortBy: true,
          enableRowSpan: true
        },
        { Header: 'Variant Type',
          accessor: 'variantType',
          disableSortBy: true
        },
        {
          Header: 'Variant',
          accessor: 'Variant',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {evidence.variant && evidence.variant.preferredTitle &&
                  <div>{evidence.variant.preferredTitle}</div>
                }
                {evidence.probandIs &&
                  <span><strong>{evidence.probandIs}</strong></span>
                }
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
              authors && evidence.pubYear && evidence.pmid &&
              <span>{authors}, <strong>{evidence.pubYear}</strong>, <a href={'https://www.ncbi.nlm.nih.gov/pubmed/' + evidence.pmid} target="_blank" rel="noopener noreferrer">PMID: {evidence.pmid}</a> {evidence.earliestPub ? <EarliestPubIcon /> : null}</span>
            );
          },
          enableRowSpan: true
        },
        { Header: 'Proband Sex', accessor: 'sex', disableSortBy: true, style: { maxWidth: 80 }, enableRowSpan: true },
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
          },
          enableRowSpan: true
        },
        { Header: 'Proband Ethnicity', accessor: 'ethnicity', disableSortBy: true, enableRowSpan: true },
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
          },
          enableRowSpan: true
        },
        { Header: 'Proband Previous Testing', accessor: 'previousTestingDescription', disableSortBy: true, enableRowSpan: true },
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
          },
          enableRowSpan: true
        },
        {
          Header: 'Functional Data (Explanation)',
          accessor: 'functionalDataSupport',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {evidence.functionalDataSupport || null}
                {evidence.functionalDataExplanation ? ` (${evidence.functionalDataExplanation})` : null}
              </>
            );
          }
        },
        {
          Header: 'De Novo (paternity/ maternity confirmed)',
          accessor: 'deNovoPatMatconfirmed',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {evidence.deNovo || null}
                {evidence.maternityPaternityConfirmed ? ` (${evidence.maternityPaternityConfirmed})` : null}
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
              evidence.variantType && evidence.scoreStatus !== 'Contradicts'
                ? <span><strong>{typeof evidence.modifiedScore === 'number' ? evidence.modifiedScore : evidence.defaultScore}</strong>  ({evidence.defaultScore})</span>
                : <span className={evidence.scoreStatus}>n/a</span>
            );
          }
        },
        {
          Header: 'Proband Counted Points',
          accessor: 'scoreCounted',
          disableSortBy: true,
          enableRowSpan: true
        },
        {
          Header: 'Explanation',
          accessor: 'scoreExplanation',
          disableSortBy: true,
          style: { minWidth: 150, maxWidth: 240 }
        }
      ]
    },
  ];

  function useInstance(instance) {
    const { allColumns } = instance;

    let rowSpanHeaders = [];

    allColumns.forEach((column, i) => {
      const { id, enableRowSpan } = column;

      if (enableRowSpan !== undefined) {
        rowSpanHeaders = [
          ...rowSpanHeaders,
          { id, topCellValue: null, topCellIndex: 0, limitBy: "label", limitByValue: null }
        ];
      }
    });

    Object.assign(instance, { rowSpanHeaders });
  }

  // eslint-disable-next-line
  const memoColumns = React.useMemo(() => columns, []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
    rowSpanHeaders,
  } = useTable(
    {
      columns: memoColumns,
      data: caseLevelEvidenceList,
    },
    useGroupBy,
    useSortBy,
    hooks => {
      hooks.useInstance.push(useInstance);
    }
  );

  /**
   * Method to get the total score of all scored evidence
   * @param {array} evidenceList - A list of evidence items
   */
  const getTotalScore = (evidenceList) => {
    let allScores = [];
    let lastLabel = null;
    // Only count the counted points for the same label once
    evidenceList.forEach(item => {
      let score;
      if (item.scoreStatus.indexOf('Score') > -1) {
        if (item.label !== lastLabel) {
          score = 'scoreCounted' in item && !isNaN(parseFloat(item.scoreCounted))
            ? parseFloat(item.scoreCounted)
            : ('modifiedScore' in item && !isNaN(parseFloat(item.modifiedScore)) ? parseFloat(item.modifiedScore) : parseFloat(item.defaultScore));
          allScores.push(score);
          lastLabel = item.label;
        }
      }
    });
    const totalScore = allScores.reduce((a, b) => a + b, 0);
    return parseFloat(totalScore).toFixed(2);
  };

  return (
    <CardPanel
      title="Scored Genetic Evidence: Case Level (variants)"
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
              rowSpanHeaders={rowSpanHeaders}
              prepareRow={prepareRow}
              isStriped={false}
              isBordered
              isCenterAligned
            />
            <PointTotals label="Total Variant points:" score={getTotalScore(caseLevelEvidenceList)} />
          </>
        ) : (
          <div className="card-body">No scored Case Level evidence was found.</div>
        ) 
      }
    </CardPanel>
  );

};

export default CaseLevelEvidenceVariantsProbandPanel;
