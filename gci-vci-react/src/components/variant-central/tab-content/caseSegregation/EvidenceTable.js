import React from "react";
import Row from "react-bootstrap/Row";
import { get as lodashGet } from "lodash";
import moment from "moment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

import { evidenceResources } from "./segregationData";
import { EvidenceModalManager } from "./EvidenceModalManager";
import { DeleteEvidenceModal } from "./DeleteEvidenceModal";
import PmidSummary from "../../../common/article/PmidSummary";
import Popover from "../../../common/Popover";
import { ExternalLink } from "../../../common/ExternalLink";
import { EXTERNAL_API_MAP } from "../../../../constants/externalApis";
import { getAffiliationName } from "../../../../helpers/get_affiliation_name";
import { getUserName } from "../../../../helpers/getUserName";

export const EvidenceTable = ({
  allCaseSegEvidences,             // All case segregation evidences added to current variant
  subcategory,                     // subcategory (usually the panel) the evidence is part of
  criteriaList,                    // ACMG criteria
  auth,                            // Logged in user's auth data
  readOnly,                        // If the page is in read-only mode
  canCurrUserModifyEvidence,       // Function to check if current logged in user can modify the given evidence
  interpretationCaseSegEvidences,  // Case segregation evidences added to current interpretation
}) => {

  /**
   * Check if current user can edit/delete the given evidence
   *
   * @param {object} row   The evidence row
   */
  const canModify = (row) => {
    if (readOnly === true) {
      return false;
    }
    return canCurrUserModifyEvidence(auth, row);
  };

  /**
   * Return the criteria codes that are mapped with given column
   * 
   * @param {string} colKey  The column key
   */
  const getCriteriaCodes = (colKey) => {
    const mapList = lodashGet(evidenceResources, "fieldToCriteriaCodeMapping", []);
    const criteriaCodes = mapList.filter(o => o.key === colKey);
    return criteriaCodes;
  };

  /**
   * Return the number of criteria that has value in this evidence
   * 
   * @param {object} source  The evidence source
   */
  const getSubRowCount = (source) => {
    let count = 0;
    // The criteria under Specificity of phenotype panel has only one corresponding comment so display them on same row.
    // SubRowCount is 1.
    if (subcategory === 'specificity-of-phenotype') {
      count = 1;
    } else {
      if (source && source['relevant_criteria']) {
        const mapList = lodashGet(evidenceResources, "sheetToTableMapping", []);
        const relevantData = mapList.filter(o => o.subcategory === subcategory);
        const cols = relevantData && relevantData[0] && relevantData[0].cols ? relevantData[0].cols.map(o => o.key) : [];
        cols.forEach(col => {
          const colComment = col + '_comment';
          if ((source[col] && source[col] !== '') || (source[colComment] && source[colComment] !== '')) {
            count++;
          }
        });
      }
    }
    return count;
  };

  /**
   * Return the number of criteria that has value in this evidence
   * 
   * Return the formatted source title for given article evidence row
   * 
   * @param {object} row  The evidence row data 
   */
  const getArticleColContent = (row) => {
    const metadata = lodashGet(row, "sourceInfo.metadata", null);
    let colContent = null;
    if (lodashGet(row, "articles[0]", null)) {
      colContent = <PmidSummary
        article = {row.articles[0]}
        pmidLinkout
      />
    } else if (metadata && metadata.pmid) {
      colContent = <ExternalLink
        href={`${EXTERNAL_API_MAP['PubMed']}${metadata.pmid}`}
        title={`PubMed Article ID: ${metadata.pmid}`}
        >
          PMID {metadata.pmid}
        </ExternalLink>
    }
    return colContent;
  };

  /*
   * Return the formatted source title for given evidence (not article)
   * 
   * @param {object} metadata  The evidence source metadata 
   */
  const getOtherSourceColContent = (metadata) => {
    const separator = ', ';
    let label = '';
    let additionalInfo = '';

    // if the evidence type is found in evidenceResources table
    if (metadata && metadata['_kind_key'] && evidenceResources && metadata['_kind_key'] in evidenceResources.typeMapping) {
      evidenceResources.typeMapping[metadata['_kind_key']].fields.forEach(field => {
        if (field && field.name in metadata && metadata[field.name]) {
          if (field.identifier === true) {
            label = metadata[field.name];
          }
          else {
            additionalInfo += additionalInfo ? separator : '';
            additionalInfo += `${field.description}: ${metadata[field.name]}`;
          }
        }
      });
    } else {
      label = Object.keys(metadata)
        .filter(k => !k.startsWith('_'))
        .map(k => metadata[k])
        .join(', ');
    }

    return (
      <>
      { additionalInfo && additionalInfo.length
        ? <span>
            <span className="mr-1">{label}</span>
            <span>
              <Popover
                triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
                content={`${additionalInfo}`}
                placement="top"
              />
            </span>
          </span>
        : <span>{label}</span>
      }
      </>
    );
  };

  /**
   * Return the formatted source title for given evidence
   * 
   * @param {object} row  The evidence row data 
   */
  const getSourceColumnContent = (row) => {
    let nodeContent = null;

    if (lodashGet(row, "sourceInfo.metadata['_kind_key']", '') === 'PMID') {
      nodeContent = getArticleColContent(row);
    } else {
      nodeContent = getOtherSourceColContent(lodashGet(row, "sourceInfo.metadata", null));
    }

    return nodeContent;
  };

  /**
   * Return the edit evidence button for this row
   * 
   * @param {object} row       Evidence in this row
   */
  const renderEditButton = (row) => {
    return (
      <Row>
        <EvidenceModalManager
          evidenceData={row}
          selectedCriteriaList={lodashGet(row, "sourceInfo['relevant_criteria']", null)}
          selectedEvidenceType={lodashGet(row, "sourceInfo.metadata['_kind_key']", '')}
          selectedSubcategory={subcategory}
          isNewEvidence={false}
          useIcon={false}
          auth={auth}
          canCurrUserModifyEvidence={canCurrUserModifyEvidence}
          interpretationCaseSegEvidences={interpretationCaseSegEvidences}
        >
        </EvidenceModalManager>
      </Row>
    );
  };

  /**
   * Return the delete evidence button for this row
   * 
   * @param {object} row       Evidence in this row
   */
  const renderDeleteButton = (row) => {
    return (
      <Row className="mt-1">
        <DeleteEvidenceModal
          evidence={row}
          useIcon={false}
        >
        </DeleteEvidenceModal>
      </Row>
    );
  };

  /**
   * Return the add/edit buttons for given row if current user can modify this evidence.
   * If not, return empty column.
   * 
   * @param {string} id        Table Column unique key
   * @param {object} row       Evidence in this row
   * @param {array}  rowTDs    The table row columns content
   * @param {number} rowspan   Number of rows to span in this button column
   */
  const addButtons = (id, row, rowTDs, rowspan=1) => {
    if (id && rowTDs && canModify(row)) {
      const buttons = <td key={`editDelete_${id}`} rowSpan={rowspan}>
          {renderEditButton(row)} {renderDeleteButton(row)}
        </td>
      rowTDs.push(buttons);
    } else {
      rowTDs.push(<td key={`noEditDelete_${id}`}></td>);
    }
  };

  /**
   * Add the given criteria row data to table
   *
   * @param {string} criteria  The criteria name to be added
   * @param {object} colNames  The table columns 
   * @param {object} source    The evidence source
   * @param {number} key       Table column unique key
   */
  const addAnotherCriteriaRow = (criteria, colNames, source, key) => {
    let i = 0; // Hack for table key
    let rowTDs = [];
    let rowTR = [];
    let criteriaName = '';

    colNames.forEach(col => {
      let node = null;
      let nodeContent = null;
      const criteriaCodes = getCriteriaCodes(col);
      if (col in source) {
        nodeContent = source[col];
      }
      if (criteriaCodes.length > 0) {
        // If this column is for given criteria, display its value
        if (col === criteria) {
          node = <td key={`cell_${key++}`} style={{borderTop: 'none'}}>
              {nodeContent}
            </td>
          criteriaName = col;
        }
        else {
          // Other criteria, output blank column
          rowTDs.push(<td key={`empty_cell_${key++}_${i++}`} style={{borderTop: 'none'}}></td>);
        }
      } else if (col === 'comments') {
        // Display the comment for given criteria
        const commentCol = criteriaName + '_comment';
        nodeContent = null;
        if (commentCol in source) {
          nodeContent = source[commentCol];
        }
        node = <td className='word-break-all' key={`cell_${key++}`} style={{borderTop: 'none'}}>
            {nodeContent}
          </td>
      }
      // Add column
      if (node) {
        rowTDs.push(node);
      }
    });
    rowTR = <tr key={`row_${key++}`}>{rowTDs}</tr>

    return rowTR;
  };

  /**
   * Display the evidences in the table for this panel
   */
  const renderTableEvidenceRows = (tableFormat) => {
    let i = 0;  // Hack for unique key
    let rows = [];

    let colNames = tableFormat && tableFormat.cols ? tableFormat.cols.map(col => col.key) : [];
    // Don't read the kind_title property so we can handle each case separately.
    colNames.splice(colNames.indexOf('_kind_title'), 1);
    const tableData = allCaseSegEvidences.filter(item => item.status !== 'deleted');

    tableData.forEach(row => {
      if (showRow(row)) {
        let sourceData = lodashGet(row, "sourceInfo.data", null);
        let metadata = lodashGet(row, "sourceInfo.metadata", null);
        if (sourceData && metadata) {
          sourceData['_kind_title'] = metadata['_kind_title']
          sourceData['relevant_criteria'] = criteriaList.join(', ');
          sourceData['_last_modified'] = moment(row['last_modified']).format('YYYY MMM DD, h:mm a');
          sourceData['_submitted_by'] = "";
          if (row.submitted_by) {
            const affiliation = row.affiliation ? getAffiliationName(row.affiliation) : null;
            sourceData['_submitted_by'] = affiliation ? `${affiliation} (${getUserName(row.submitted_by)})` : `${getUserName(row.submitted_by)}`;
          }

          // Get number of criteria that has value which determines the number of rows for this evidence
          let subRows = getSubRowCount(sourceData);
          let rowTDs = [];
          let otherCriteria = [];
          let criteriaName = '';

          // Add source column for this evidence
          rowTDs.push(<td key={`cell_${i++}`} rowSpan={subRows}>{getSourceColumnContent(row)}</td>);

          // The criteria under Specificity of phenotype panel has only one corresponding comment so display them on same row.
          if (subcategory === 'specificity-of-phenotype') {
            colNames.forEach(col => {
              let node = <td key={`empty_cell_${i++}`}></td>;
              if (col in sourceData) {
                if (sourceData.hpoData && sourceData.hpoData.length && col === 'proband_hpo_ids') {
                  let hpoData = sourceData.hpoData.map((hpo, i) => {
                    return <p key={i}>{hpo.hpoTerm} ({hpo.hpoId})</p>
                  });
                  node = <td key={`cell_${i++}`}>
                    {hpoData}
                  </td>
                } else {
                  node = <td key={`cell_${i++}`}>
                      {sourceData[col]}
                    </td>
                }
              }
              if (col === 'comments') {
                // Display the HPO comment
                let nodeContent = null;
                if ('proband_hpo_comment' in sourceData) {
                  nodeContent = sourceData['proband_hpo_comment'];
                }
                node = <td className='word-break-all' key={`cell_${i++}`}>
                    {nodeContent}
                  </td>
              }
              rowTDs.push(node);
            });
          } else {
            // For other panels, put each criteria on separate row.
            // Add first available criteria in this evidence to the first row
            colNames.forEach(col => {
              const colComment = col + '_comment';
              let node = null;
              let nodeContent = null;
              const criteriaCodes = getCriteriaCodes(col);
              // If this is a criteria column, display the first criteria only
              if (criteriaCodes.length > 0) {
                // If this criteria column or its comment has value
                if ((col in sourceData) || (colComment in sourceData)) {
                  // If this is the first criteria column that has value, display in first row
                  if (criteriaName === '') {
                    // Display the criteria value if exists
                    if (col in sourceData) {
                      nodeContent = sourceData[col];
                      node = <td key={`cell_${i++}`}>
                          {nodeContent}
                        </td>
                    }
                    else {
                      node = <td key={`empty_cell_${i++}`}></td>;
                    }
                    // Set the criteria name which is used to get its comment later
                    criteriaName = col;
                  } else {
                    // If first row criteria has been set, display empty column
                    // And add this criteria to the list that will be added later
                    node = <td key={`empty_cell_${i++}`}></td>;
                    otherCriteria.push(col);
                  }
                } else {
                  // If criteria or its comment has no value, display empty column
                  node = <td key={`empty_cell_${i++}`}></td>;
                }
              } else if (col === 'comments') {
                // Display the comment for current criteria in this column
                const commentCol = criteriaName + '_comment';
                if (commentCol in sourceData) {
                  nodeContent = sourceData[commentCol];
                }
                node = <td className='word-break-all' key={`cell_${i++}`}>
                    {nodeContent}
                  </td>
              } else {
                // Display value for other columns
                if (col in sourceData) {
                  nodeContent = sourceData[col];
                }
                node = <td key={`cell_${i++}`} rowSpan={subRows}>
                    {nodeContent}
                  </td>
              }
              rowTDs.push(node);
            });
          }
          // Add the edit/delete buttons if user can modify this evidence
          addButtons(i++, row, rowTDs, subRows);
          let rowTR = <tr key={`row_${i++}`}>{rowTDs}</tr>
          rows.push(rowTR);

          // Add other criteria rows if more is available for this evidence row.
          otherCriteria.forEach(criteria => {
            rowTR = addAnotherCriteriaRow(criteria, colNames, sourceData, i);
            rows.push(rowTR);
            // Hack for unique key
            i = i + 10;
          });
        }
      }
    });
    return rows;
  };

  /**
   * Set the evidence table headers
   */
  const renderTableHeader = (tableFormat) => {    
    let cols = tableFormat && tableFormat.cols ? tableFormat.cols.map(col => {
      let criteriaCodes = getCriteriaCodes(col.key);
      if (criteriaCodes.length > 0) {
        criteriaCodes = criteriaCodes[0].codes;
        return <th key={col.key}>{`${col.title} [${criteriaCodes.join(',')}]`}</th>
      }
      return <th key={col.key}>{col.title}</th>;
    }) : [];
    cols.push(<th key="editDelete"></th>)
    return cols;
  };

  /**
   * Get the columns that are avaiable for this subcategory including their comment columns
   */
  const getSubcategoryPanelColumns = () => {
    const relevantData = evidenceResources.sheetToTableMapping.filter(o => o.subcategory === subcategory);
    let cols = relevantData && relevantData[0] && relevantData[0].cols ? relevantData[0].cols.map(o => o.key) : [];
    let commentCols = [];
    cols.forEach(o => {
      commentCols.push(o + '_comment');
    });
    cols = cols.concat(commentCols);

    return cols;
  };

  /**
   * Check if there is evidence to be displayed for this panel.
   */
  const hasTableData = () => {
    // relevant columns non empty -> return true
    // relevant columns empty -> return False
    const foundData = allCaseSegEvidences.some(row => {
      // Check if this row's columns have data to show
      if (showRow(row)) {
        return true;
      }
      return false;
    });
    return foundData;
  };

  /**
   * Check if any of the columns in given row has value to be displayed
   * 
   * @param {object} row The evidence row
   */
  const showRow = (row) => {
    const cols = getSubcategoryPanelColumns();
    const show = cols.some(col => {
      if (lodashGet(row, `sourceInfo.data[${col}]`, null)) {
        return true;
      }
      return false;
    });
    return show;
  };

  const tableFormat = evidenceResources.tableCols().filter(o => o.subcategory === subcategory);
  if (!allCaseSegEvidences || allCaseSegEvidences.length === 0 || !hasTableData()) {
    return (
      <>No evidence added.</>
    )
  } else {
    return (
      <table className="evidenceTable table">
        <thead>
          <tr>
            {renderTableHeader(tableFormat[0])}
          </tr>
        </thead>
        <tbody>
          {renderTableEvidenceRows(tableFormat[0])}
        </tbody>
      </table>
    );
  }
};
