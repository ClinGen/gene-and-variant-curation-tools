import React from 'react';
import {
  useTable,
  useGroupBy,
  useSortBy
} from 'react-table';

import CardPanel from '../common/CardPanel';
import { TableContent } from '../common/TableComponents';
import HpoTerms from '../../helpers/render_hpo_terms';
import { EvidenceSourceDetail } from './EvidenceSourceDetail';
import PointTotals from './PointsTotal';

const CaseControlEvidencePanel = ({
  hpoTerms,
  caseControlEvidenceList
}) => {

  const columns = [
    {
      Header: ' ',
      columns: [
        {
          Header: 'Label',
          accessor: 'label',
          style: { width: 80, wordBreak: 'normal' },
          disableSortBy: true,
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
                <span>
                  {evidence.ccLink
                    ? <a href={evidence.ccLink} target="_blank" rel="noopener noreferrer">{evidence.label}</a>
                    : evidence.label}
                </span>
            );
          }
        },
        {
          Header: 'Evidence Source',
          accessor: 'pmid',
          style: { minWidth: 80, maxWidth: 100 },
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            if (row?.original) {
              return (
                <EvidenceSourceDetail
                  evidence={row.original}
                />
              );
            }
          }
        },
        {
          Header: 'Disease (Case)',
          accessor: 'disease',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {evidence.diseaseId && evidence.diseaseTerm
                  ? (
                    <span>{evidence.diseaseTerm}
                      <span> {!evidence.diseaseFreetext
                        ? (<span>({evidence.diseaseId.replace('_', ':')})</span>)
                        : (evidence.diseasePhenotypes && evidence.diseasePhenotypes.length
                          ? <span><br/><strong>HPO term(s): </strong><HpoTerms hpoIds={evidence.diseasePhenotypes} /></span>
                          : null)
                      }
                      </span>
                    </span>
                  ) : (
                    <span>
                      {Boolean(evidence.hpoIdInDiagnosis && evidence.hpoIdInDiagnosis.length)
                        && (
                          <span><strong>HPO term(s):</strong>
                            <HpoTerms hpoIds={evidence.hpoIdInDiagnosis} hpoTerms={hpoTerms} />
                          </span>
                        )
                      }
                      {evidence.termsInDiagnosis
                        && <span><strong>Free text:</strong><br />{evidence.termsInDiagnosis}</span>}
                    </span>
                  )
                }
              </>
            );
          }
        },
        { Header: 'Study Type', accessor: 'studyType', disableSortBy: true, },
        { Header: 'Detection Method (Case)',
          accessor: 'detectionMethod',
          disableSortBy: true,
          style: { whiteSpace: 'pre-wrap' }
        },
      ]
    },
    {
      Header: 'Power',
      columns: [
        {
          Header: '# of Cases Genotyped/ Sequenced',
          accessor: 'caseCohort_numberAllGenotypedSequenced',
          disableSortBy: true
        },
        {
          Header: '# of Controls Genotyped/ Sequenced',
          accessor: 'controlCohort_numberAllGenotypedSequenced',
          disableSortBy: true
        }
      ]
    },
    { Header: 'Bias Confounding', accessor: 'comments', disableSortBy: true, style: { whiteSpace: 'pre-wrap' } },
    {
      Header: 'Statistics',
      columns: [
        {
          Header: 'Cases with Variant in Gene / All Cases Genotyped/ Sequenced',
          accessor: 'caseCohort_numberWithVariant',
          style: { minWidth: 80, maxWidth: 120 },
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {typeof evidence.caseCohort_numberWithVariant === 'number' 
                  && evidence.caseCohort_numberWithVariant
                }
                {typeof evidence.caseCohort_numberWithVariant === 'number' && evidence.caseCohort_numberAllGenotypedSequenced
                  && <span>/</span>
                }
                {typeof evidence.caseCohort_numberAllGenotypedSequenced === 'number'
                  && evidence.caseCohort_numberAllGenotypedSequenced
                }
              </>
            );
          }
        },
        {
          Header: 'Controls with Variant in Gene / All Cases Genotyped/ Sequenced',
          accessor: 'controlCohort_numberWithVariant',
          style: { minWidth: 80, maxWidth: 120 },
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {typeof evidence.controlCohort_numberWithVariant === 'number'
                  && evidence.controlCohort_numberWithVariant
                }
                {typeof evidence.controlCohort_numberWithVariant === 'number'
                  && typeof evidence.controlCohort_numberAllGenotypedSequenced === 'number'
                  && <span>/</span>
                }
                {typeof evidence.controlCohort_numberAllGenotypedSequenced === 'number'
                  && evidence.controlCohort_numberAllGenotypedSequenced
                }
              </>
            );
          }
        },
        {
          Header: 'Test Statistic: Value',
          accessor: 'statisticValue',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              <>
                {evidence.statisticValueType
                  && <strong>{evidence.statisticValueType}: </strong>
                }
                {evidence.statisticValueTypeOther
                  && <span>{evidence.statisticValueTypeOther} - </span>
                }
                {evidence.statisticValue
                  && <span>{evidence.statisticValue}</span>
                }
              </>
            );
          }
        },
        { Header: 'P-value', accessor: 'pValue', disableSortBy: true },
        {
          Header: 'Confidence interval',
          accessor: 'confidenceIntervalFrom',
          disableSortBy: true,
          // eslint-disable-next-line react/display-name
          Cell: ({ row }) => {
            const evidence = row.original;
            return (
              evidence.confidenceIntervalFrom && evidence.confidenceIntervalTo
                && <span>{evidence.confidenceIntervalFrom}-{evidence.confidenceIntervalTo}</span>
            );
          }
        }
      ]
    },
    { Header: 'Score Status', accessor: 'scoreStatus', disableSortBy: true, },
    { Header: 'Points', accessor: 'score', disableSortBy: true,
      Cell: ({ row }) => {
        const evidence = row.original;
        return (
          evidence.scoreStatus === 'Contradicts'
            ? <span className={evidence.scoreStatus}>n/a</span>
            : <span>{evidence.score}</span>
        );
      }
    },
    { Header: 'Explanation', accessor: 'scoreExplanation', disableSortBy: true, }
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
      data: caseControlEvidenceList,
      initialState: {
        sortBy: [{ id: 'studyType' }]
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
      // caseControl scores has 2 versions
      // Old score object only has score point which by default has "Score" status
      // New score object has scoreStatus, ScoreExplanation, and score
      if ('scoreStatus' in item) {
        if (item.scoreStatus.indexOf('Score') > -1) {
          if (typeof item.score === 'number') {
            allScores.push(parseFloat(item.score));
          }
        }
      } else {
        if (typeof item.score === 'number') {
          allScores.push(parseFloat(item.score));
        }
      }
    });
    const totalScore = allScores.reduce((a, b) => a + b, 0);
    return parseFloat(totalScore).toFixed(2);
  };

  return (
    <CardPanel
      title="Genetic Evidence: Case-Control"
      panelMarginClass="mb-5"
      bodyClass="p-0"
      className="bg-transparent"
    >
      {caseControlEvidenceList && caseControlEvidenceList.length
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
            <PointTotals label="Total points:" score={getTotalScore(caseControlEvidenceList)} />
          </>
        ) : (
          <div className="card-body">No scored Case-Control evidence was found.</div>
        ) 
      }
    </CardPanel>
  );

};

export default CaseControlEvidencePanel;
