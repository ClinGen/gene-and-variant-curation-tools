import React from 'react';
import {
  useTable,
  useSortBy,
} from 'react-table';

import CardPanel from '../common/CardPanel';
import { TableContent } from '../common/TableComponents';
import { getEvidenceAuthors } from '../../helpers/getEvidenceAuthors';
import PointsTotal from './PointsTotal';
import EarliestPubIcon from './EarliestPubIcon';

const ExperimentalEvidencePanel = ({
  sopv8,
  experimentalEvidenceList,
}) => {

  const scoreExpTitle = sopv8 ? 'Explanation' : 'Reason for Changed Score';
  const headers = [
    { key: 'label', text: 'Label', sort: true },
    { key: 'evidenceType', text: 'Experimental Category', sort: true },
    { key: 'reference', text: 'Reference', sort: true },
    { key: 'explanation', text: 'Explanation', sort: true },
    { key: 'scoreStatus', text: 'Score Status', sort: true },
    { key: 'score', text: 'Points (default points)', sort: true },
    { key: 'scoreExplanation', text: scoreExpTitle, sort: true }
  ];

  const columns = headers.map((item) => {
    if (item.key === 'evidenceType') {
      return {
        Header: item.text,
        accessor: d => d.evidenceType,
        // eslint-disable-next-line react/display-name
        Cell: ({ row }) => {
          const evidence = row.original;
          return (
            <>
              <strong>{evidence.evidenceType}</strong>
              {evidence.evidenceSubtype && evidence.evidenceSubtype.length ? <span> {evidence.evidenceSubtype}</span> : null}
            </>
          );
        }
      };
    } else if (item.key === 'reference') {
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
    } else if (item.key === 'explanation') {
      return {
        Header: item.text,
        accessor: item.key,
        disableSortBy: true,
        style: { whiteSpace: 'pre-wrap', maxWidth: 600 }
      }
    } else if (item.key === 'scoreStatus') {
      return {
        Header: item.text,
        accessor: item.key
      }
    } else if (item.key === 'score') {
      return {
        Header: item.text,
        acessor: item.key,
        disableSortBy: true,
        // eslint-disable-next-line react/display-name
        Cell: ({ row }) => {
          const evidence = row.original;
          return (
            evidence.scoreStatus !== 'Contradicts'
              ? <span><strong>{typeof evidence.modifiedScore === 'number' ? evidence.modifiedScore : evidence.defaultScore}</strong> ({evidence.defaultScore})</span>
              : <span className={evidence.scoreStatus}>n/a</span>
          );
        }
      };
    } else if (item.key === 'scoreExplanation') {
      return {
        Header: item.text,
        accessor: item.key,
        disableSortBy: true,
        style: { whiteSpace: 'pre-wrap', maxWidth: 600 }
      };
    } else {
      return {
        Header: item.text,
        accessor: item.key,
        style: { wordBreak: 'normal' },
        disableSortBy: true
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
      data: experimentalEvidenceList,
      initialState: {
        sortBy: [{ id: 'evidenceType' }],
      },
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
      if (item.scoreStatus.indexOf('Score') > -1) {
        score = typeof item.modifiedScore === 'number' ? item.modifiedScore : item.defaultScore;
        allScores.push(score);
      }
    });
    const totalScore = allScores.reduce((a, b) => a + b, 0);
    return parseFloat(totalScore).toFixed(2);
  };

  return (
    <>
      <CardPanel
        title="Experimental Evidence"
        panelMarginClass="mb-0"
        bodyClass="p-0"
        className="bg-transparent"
      >
        {experimentalEvidenceList && experimentalEvidenceList.length
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
              <PointsTotal label="Total points:" score={getTotalScore(experimentalEvidenceList)} />
            </>
          ) : (
            <div className="card-body">No Experimental evidence was found.</div>
          ) 
        }
      </CardPanel>
      <div className="panel-footer mb-5 p-3">
        <p><strong>Biochemical Function</strong>: The gene product performs a biochemical function shared with other known genes in the disease of interest (A), OR the gene product is consistent with the observed phenotype(s) (B)</p>
        <p><strong>Protein Interactions</strong>: The gene product interacts with proteins previously implicated (genetically or biochemically) in the disease of interest</p>
        <p><strong>Expression</strong>: The gene is expressed in tissues relevant to the disease of interest (A), OR the gene is altered in expression in patients who have the disease (B)</p>
        <p><strong>Functional Alteration of gene/gene product</strong>: The gene and/or gene product function is demonstrably altered in cultured patient or non-patient cells carrying candidate variant(s)</p>
        <p><strong>Model Systems</strong>: Non-human model organism OR cell culture model with a similarly disrupted copy of the affected gene shows a phenotype consistent with human disease state</p>
        <p><strong>Rescue</strong>: The phenotype in humans, non-human model organisms, cell culture models, or patient cells can be rescued by exogenous wild-type gene or gene product</p>
      </div>
    </>
  );
};

export default ExperimentalEvidencePanel;
