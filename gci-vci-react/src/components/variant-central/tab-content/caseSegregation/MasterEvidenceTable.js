import React, { useContext } from "react";
import { get as lodashGet } from "lodash";

import Popover from "../../../common/Popover";
import { masterTable, evidenceResources } from "./segregationData";
import { EvidenceModalManager } from "./EvidenceModalManager";
import { DeleteEvidenceModal } from "./DeleteEvidenceModal";
import { canCurrUserModifyEvidence } from "../CaseSegregation";
import { ExternalLink } from "../../../common/ExternalLink";
import { EXTERNAL_API_MAP } from "../../../../constants/externalApis";
import { AffilsContext, getAffiliationName } from "../../../../helpers/affiliationsHelpers";
import { getUserName } from "../../../../helpers/getUserName";
import WarningIcon from "../../../common/WarningIcon";

/**
 * Data from the same PMID can be counted more than once. We want a way to
 * tell a user this has happened. This function returns an object that can be
 * used to determine whether data in the table has been counted more than once.
 *
 * For more background on this, see:
 * https://github.com/ClinGen/gene-and-variant-curation-tools/issues/125
 *
 * @author Liam Mulhall
 * @param {Array.<Object>} allCaseSegEvidences - each evidence object contains
 *                                               a PMID and data, which we count
 *                                               to see if there are duplicates
 *                                               (or triplicates, etc.)
 * @return {Object} - keys are PMIDs, values are objects where the keys are data
 *                    keys and the values are objects containing the count (the
 *                    number of times we've seen the data key for the PMID) and
 *                    the value of the data key
 */
const getDuplicateInfo = allCaseSegEvidences => {
  const duplicateInfo = {};
  for(const caseSegEvidence of allCaseSegEvidences) {
    const data = lodashGet(caseSegEvidence, 'sourceInfo.data', null);
    const metadata = lodashGet(caseSegEvidence, 'sourceInfo.metadata', null);
    if(data && metadata && metadata.pmid) {
      if(!Object.keys(duplicateInfo).includes(metadata.pmid)) {
        duplicateInfo[metadata.pmid] = {};
      }
      // Map each data key to a count. If the count is greater than 1, we know
      // the data key is being counted more than once.
      for(const key of Object.keys(data)) {
        if(key.startsWith('num_') && !key.endsWith('_comment')) {
          if(!duplicateInfo[metadata.pmid][key]) {
            duplicateInfo[metadata.pmid][key] = {
              count: 1,
              value: parseInt(data[key])
            };
          }
          else {
            duplicateInfo[metadata.pmid][key].count++;
          }
        }
      }
    }
  }
  return duplicateInfo;
};

/**
 * Tell whether we should show the double-counted data warning to the user.
 *
 * @author Liam Mulhall
 * @param {String} pmid - Pubmed ID as string of numbers
 * @param {Object} duplicateInfo - maps Pubmed IDs to count of occurrences
 * @return {Boolean} - whether to show the warning to the user
 */
const shouldShowWarning = (pmid, duplicateInfo) => {
  if(Object.keys(duplicateInfo).includes(pmid)) {
    const keys = Object.keys(duplicateInfo[pmid]);
    for(const key of keys) {
      const duplicateDataPresent = duplicateInfo[pmid][key].count > 1;
      if(duplicateDataPresent) {
        return true;
      }
    }
  }
  return false;
};

const duplicateWarningStyle = {
  backgroundColor: 'rgba(255, 165, 0, 0.3)',
};

export const MasterEvidenceTable = ({
  allCaseSegEvidences,             // All case segregation evidences added to current variant
  interpretationCaseSegEvidences,  // Case segregation evidences added to current interpretation
  auth,                            // Logged in user auth data
  readOnly,                        // If the page is in read-only mode
}) => {

  // The order to display the source types in the master/tally table
  const tableOrder = ['PMID', 'clinical_lab', 'clinic', 'research_lab', 'public_database', 'other'];
  const { affiliationsData } = useContext(AffilsContext);
  /**
   * Return list of evidence type that has curated evidences.
   *
   */
  const getEvidenceTypes = () => {
    let evidence_types = {};
    for (let row of allCaseSegEvidences) {
      const evidence_type = lodashGet(row, "sourceInfo.metadata['_kind_key']", '');
      if (!(evidence_type in evidence_types)) {
        evidence_types[evidence_type] = allCaseSegEvidences.filter(row => lodashGet(row, "sourceInfo.metadata['_kind_key']", '') === evidence_type);
      }
    }
    return evidence_types;
  };

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
  }

  /**
   * Return the edit evidence button
   * 
   * @param {object} row       Evidence in this row
   */
  const renderEditButton = (row) => {
    return (
      <>
      <EvidenceModalManager
        evidenceData={row}
        selectedCriteriaList={lodashGet(row, "sourceInfo['relevant_criteria']", null)}
        selectedEvidenceType={lodashGet(row, "sourceInfo.metadata['_kind_key']", '')}
        selectedSubcategory={lodashGet(row, "subcategory", '')}
        isNewEvidence={false}
        useIcon={true}
        auth={auth}
        interpretationCaseSegEvidences={interpretationCaseSegEvidences}
      >
      </EvidenceModalManager>
      </>
    );
  };

  /**
   * Return the delete evidence button
   *
   * @param {object} row       Evidence in this row
   */
  const renderDeleteButton = (row) => {
    return (
      <>
      <DeleteEvidenceModal
        evidence={row}
        useIcon={true}
      >
      </DeleteEvidenceModal>
      </>
    );
  };

  /**
   * Return HPO data in string format for table
   * @param {array} data 
   */
  const formatHpoData = (data) => {
    const hpoWithTerms = data.map((hpo, i) => {
      return `${hpo.hpoTerm} (${hpo.hpoId})`;
    });
    return hpoWithTerms;
  };

  /**
   * Return the three table header rows
   * First row - Evidence source type row
   * Second row - Evidence row with edit and delete buttons if user can modify the evidence
   * Third row - Submitted by row
   *
   * @param {array} evidence_types  All evidence source types
   * @param {Object} duplicateInfo - keys are PMIDs, values are objects with
   *                                 data keys mapped to counts
   */
  const renderHeader = (evidence_types, duplicateInfo) => {
    let header = [];
    let first_row = []; // Evidence source Type row
    let second_row = []; // Evidence main data row
    let third_row = []; // Submitted by row

    if (evidence_types && tableOrder) {
      first_row.push(<th key="header.codes_1" style={{borderTop: 'none', borderRight: 'none'}}></th>);
      first_row.push(<th key="header.number_1" style={{borderTop: 'none', borderLeft: 'none', borderRight: 'none'}} colSpan="2">Evidence Type</th>);
      tableOrder.forEach(evidence_type => {
        if (evidence_types[evidence_type]) {
          const num_items = evidence_types[evidence_type].length;
          first_row.push(<th colSpan={num_items} key={`header_category_${evidence_type}`} style={{textAlign: 'center'}}>
            {`${lodashGet(evidenceResources, `typeMapping[${evidence_type}].name`, '')} (${num_items})`}
            </th>);
        }
      });
      second_row.push(<td key="header_blank_row_1" style={{border: 'none'}} colSpan="3"></td>);
      third_row.push(<th key="header.codes_3" style={{borderBottom: 'none', borderTop: 'none', borderRight: 'none'}}></th>);
      third_row.push(<th key="header.user_3" style={{border: 'none'}}>Submitted by</th>);
      third_row.push(<th key="header.sums_3" style={{borderBottom: 'none', borderTop: 'none', borderLeft: 'none'}}>
        <div><span>Sum</span></div>
        </th>);
      tableOrder.forEach(evidence_type => {
        if (evidence_types[evidence_type]) {
          const rows = evidence_types[evidence_type];
          let rowNum = 0;
          rows.forEach(row => {
            if (lodashGet(row, "sourceInfo.metadata", null) && lodashGet(row, "sourceInfo.data", null)) {
              const pmid = row?.sourceInfo?.metadata?.pmid;
              const shouldWarnUserAboutDuplicates = shouldShowWarning(pmid, duplicateInfo);
              let editButton = null;
              let deleteButton = null;
              if (canModify(row)) {
                editButton = renderEditButton(row);
                deleteButton = renderDeleteButton(row);
              }
              if (lodashGet(row, "sourceInfo.metadata['_kind_key']", "") === 'PMID') {
                // Get pmid from evidence's artilces array or source metadata
                const pmid = lodashGet(row, "articles[0].pmid", null)
                  ? row.articles[0].pmid
                  : (lodashGet(row, "sourceInfo.metadata.pmid", null) ? row.sourceInfo.metadata.pmid : '');
                let authorYear = '';
                let evidence_detail = '';
                if (lodashGet(row, "articles[0]")) {
                  const article = lodashGet(row, "articles[0]", null);
                  const date = article && article.date ? (/^([\d]{4})/).exec(article.date) : [];
                  authorYear = date ? date[0] + '.' : '';
                  if (lodashGet(article, "authors[0]", null)) {
                    authorYear = lodashGet(article, "authors[0]") + ', ' + authorYear;
                  }
                }
                if (pmid) {
                  evidence_detail = <ExternalLink
                    href={`${EXTERNAL_API_MAP['PubMed']}${pmid}`}
                    title={`PubMed Article ID: ${pmid}`}
                  >
                    PMID {pmid}
                  </ExternalLink>
                }
                let secondRowStyle = {
                  borderBottom: 'none',
                };
                if(shouldWarnUserAboutDuplicates) {
                  secondRowStyle = {
                    ...secondRowStyle,
                    ...duplicateWarningStyle
                  };
                }
                const duplicatesTooltip = 'This PMID is associated multiple times with this variant.';
                const uniqueKey = `header_${row.PK}.${pmid}`;
                const duplicatesTooltipId = `${uniqueKey}_tooltip`;
                second_row.push(<th key={uniqueKey} style={secondRowStyle}>
                    <div>
                      <div className='evidence-detail'>{authorYear}&nbsp;{evidence_detail}</div>
                      <div className='evidence-links'>{editButton}{deleteButton}</div>
                      {
                        shouldWarnUserAboutDuplicates ?
                            <WarningIcon
                                tooltip={duplicatesTooltip}
                                tooltipId={duplicatesTooltipId}
                            /> :
                            <></>
                      }
                    </div>
                  </th>);
              } else {
                const typeMap = lodashGet(evidenceResources, `typeMapping[${row.sourceInfo.metadata['_kind_key']}].fields`, null);
                const identifier = typeMap ? typeMap.filter(o => o.identifier === true)[0] : null;
                const evidence_detail = identifier && identifier.name ? `${row.sourceInfo.metadata[identifier.name]}` : "";
                second_row.push(<th key={`header_${row.PK}.${evidence_detail}`} style={{borderBottom: 'none'}}>
                    <div>
                      <div className='evidence-detail'>{evidence_detail}</div>
                      <div className='evidence-detail'>{editButton}{deleteButton}</div>
                    </div>
                  </th>);
              }
              if (row.submitted_by) {
                const affiliation = row.affiliation ? getAffiliationName(row.affiliation, affiliationsData) : null;
                const submittedBy = affiliation ? `${affiliation} (${getUserName(row.submitted_by)})` : `${getUserName(row.submitted_by)}`;
                third_row.push(<th key={`header_${evidence_type}_${rowNum}.${row.PK}`} style={shouldWarnUserAboutDuplicates ? duplicateWarningStyle : null}>
                    <div style={{textAlign: 'center'}}>
                      <span>{submittedBy}</span>
                    </div>
                  </th>);
              }
              rowNum++;
            }
          });
        }
      });
      header.push(<tr key="header_row_1">{first_row}</tr>);
      header.push(<tr key="header_row_2">{second_row}</tr>);
      header.push(<tr key="header_row_3">{third_row}</tr>);
      return header;
    }
  };

  /**
   * Return the evidence rows to be displayed in the table
   * 
   * @param {array} evidence_types All evidence source types
   * @param {Object} duplicateInfo - keys are PMIDs, values are objects with
   *                                 data keys mapped to counts
   */
  const renderRows = (evidence_types, duplicateInfo) => {
    let tds = [];
    let cell_num = 0;  // Used to set a key
    const sums = getSums(duplicateInfo);

    // Initialize the left-hand columns
    masterTable().forEach(row => {
      let contents = `${row.label}`;
      let code_td = <td key={`cell_${cell_num++}`}></td>;

      if ('criteria_codes' in row && 'row_span' in row && row['row_span'] !== 0) {
        const codes = `${row['criteria_codes'].join(', ')}`;
        code_td = <td key={`cell_${cell_num++}`} style={{borderBottom: 'none'}}>
            <div className={`code ${row['code_color']}`}>
              <strong>{codes}</strong>
            </div>
          </td>
      }
      // No table cell border if same source type
      if ('row_span' in row && row['row_span'] === 0) {
        code_td = <td key={`cell_${cell_num++}`} style={{border: 'none'}}></td>;
      }
      let label_td = <td key={`cell_${cell_num++}`}>
          <div>
            <strong>{contents}</strong>
          </div>
        </td>
      let sum_td = null;
      const tooltipText = 'Duplicate publications identified, please calculate the sum manually.';
      if (row.key in sums) {
        sum_td = <td key={`cell_${cell_num++}`}>
            <div>
              {
                sums[row.key].isDuplicate ?
                  <WarningIcon
                      tooltip={tooltipText}
                      tooltipId={`sumWarningTooltip${cell_num}`}
                  /> :
                  <></>
              }
              {sums[row.key].value}
            </div>
          </td>;
      } else {
        sum_td = <td key={`cell_${cell_num++}`}>
            <div></div>
          </td>;
      }
      tds.push([code_td, label_td, sum_td]);  // Note we are pushing an array
    });

    // Middle columns
    // This needs to be the outer loop to ensure it lines up with our header
    tableOrder.forEach(evidence_type => {
      if (evidence_types && evidence_types[evidence_type]) {
        const rows = evidence_types[evidence_type];
        rows.forEach(row => {
          if (lodashGet(row, "sourceInfo.data", null)) {
            const pmidForRow = row?.sourceInfo?.metadata?.pmid;
            const shouldWarnUserAboutDuplicates = shouldShowWarning(pmidForRow, duplicateInfo);
            let rowNum = 0;
            masterTable().forEach(masterRow => {
              let key = masterRow.key;
              let val = lodashGet(row, `sourceInfo.data[${key}]`, null);
              const hpoData = row.sourceInfo.data.hpoData ? row.sourceInfo.data.hpoData : [];
              const formattedHpo = hpoData.length ? formatHpoData(hpoData) : [];
              if (formattedHpo.length && key === 'proband_hpo_ids') {
                val = formattedHpo.join(', ');
              }
              let entryContent;
              // For text column, limit to 25 characters and show full text when mouseover 'more' text.
              if (key.endsWith('_comment') || key.startsWith('proband') || key === 'comments' || key === 'label') {
                entryContent = val && val.length > 25
                  ? <div>{val.substr(0,25) + ' ... '}
                      <Popover
                        triggerComponent={<span className='more-text'>more</span>}
                        content={`${val}`}
                        placement="top"
                        className="more-text-div"
                      />
                    </div>
                  : <div>{val}</div>
              } else if (key === 'is_disease_associated_with_probands') {
                // Set checkmark for  "Disease associated with proband(s) (HPO) (Check here if unaffected)" if checked
                let iconClass = val === true ? 'icon icon-check' : '';
                entryContent =
                    <div className={iconClass}></div>
              } else {
                entryContent = <div>{val}</div>;
              }
              const entry =
                <td
                    style={shouldWarnUserAboutDuplicates ? duplicateWarningStyle : null}
                    key={`cell_${cell_num++}`}
                >
                  {entryContent}
                </td>;
              tds[rowNum].push(entry);
              rowNum++;
            });
          }
        });
      }
    });

    let result = [];
    let row_num = 0;
    tds.forEach(td_set => {
      result.push(<tr key={`row_${row_num++}`}>{td_set}</tr>);
    });
    return result;
  };

  // Return the sum of all evidence for each criteria
  const getSums = duplicateInfo => {
    let sums = {};
    allCaseSegEvidences.forEach(row => {
      if (lodashGet(row, "sourceInfo.data")) {
        const data = lodashGet(row, "sourceInfo.data");
        const pmidForRow = row?.sourceInfo?.metadata?.pmid;
        Object.keys(data).forEach(name => {
          if(sums[name] === undefined) {
            sums[name] = {
              value: null,
              isDuplicate: false
            };
          }
          if(duplicateInfo[pmidForRow] && duplicateInfo[pmidForRow][name]) {
            sums[name].isDuplicate =
                duplicateInfo[pmidForRow][name].count > 1 ||
                (shouldShowWarning(pmidForRow, duplicateInfo) &&
                    Number.isInteger(duplicateInfo[pmidForRow][name].value));
          }
          if (name.startsWith('num_') && !name.endsWith('_comment')) {
            let val = parseInt(data[name]);
            if (Object.keys(sums).indexOf(name) === -1) {
              if (isNaN(val)) {
                sums[name].value = 0;
              } else {
                sums[name].value = val;
              }
            } else {
              if (!isNaN(val)) {
                sums[name].value += val;
              }
            }
          }
        })
      }
    });
    return sums;
  };

  if (allCaseSegEvidences && allCaseSegEvidences.length > 0) {
    const evidenceTypes = getEvidenceTypes();
    const duplicateInfo = getDuplicateInfo(allCaseSegEvidences);

    return(
      <table className="table masterTable table-bordered">
        <thead>
          {renderHeader(evidenceTypes, duplicateInfo)}
        </thead>
        <tbody>
          {renderRows(evidenceTypes, duplicateInfo)}
        </tbody>
      </table>
    );
  }
  else {
    return null;
  }
};
