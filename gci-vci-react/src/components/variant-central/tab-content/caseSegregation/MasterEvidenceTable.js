import React from "react";
import { get as lodashGet } from "lodash";

import Popover from "../../../common/Popover";
import { masterTable, evidenceResources } from "./segregationData";
import { EvidenceModalManager } from "./EvidenceModalManager";
import { DeleteEvidenceModal } from "./DeleteEvidenceModal";
import { ExternalLink } from "../../../common/ExternalLink";
import { EXTERNAL_API_MAP } from "../../../../constants/externalApis";
import { getAffiliationName } from "../../../../helpers/get_affiliation_name";
import { getUserName } from "../../../../helpers/getUserName";

export const MasterEvidenceTable = ({
  allCaseSegEvidences,             // All case segregation evidences added to current variant
  interpretationCaseSegEvidences,  // Case segregation evidences added to current interpretation
  auth,                            // Logged in user auth data
  readOnly,                        // If the page is in read-only mode
  canCurrUserModifyEvidence,       // Function to check if current logged in user can modify the given evidence
}) => {

  // The order to display the source types in the master/tally table
  const tableOrder = ['PMID', 'clinical_lab', 'clinic', 'research_lab', 'public_database', 'other'];

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
        canCurrUserModifyEvidence={canCurrUserModifyEvidence}
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
   */
  const renderHeader = (evidence_types) => {
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
                second_row.push(<th key={`header_${row.PK}.${pmid}`} style={{borderBottom: 'none'}}>
                    <div>
                      <div className='evidence-detail'>{authorYear}&nbsp;{evidence_detail}</div>
                      <div className='evidence-links'>{editButton}{deleteButton}</div>
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
                const affiliation = row.affiliation ? getAffiliationName(row.affiliation) : null;
                const submittedBy = affiliation ? `${affiliation} (${getUserName(row.submitted_by)})` : `${getUserName(row.submitted_by)}`;
                third_row.push(<th key={`header_${evidence_type}_${rowNum}.${row.PK}`}>
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
   */
  const renderRows = (evidence_types) => {
    let tds = [];
    let cell_num = 0;  // Used to set a key
    const sums = getSums();

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
      if (row.key in sums) {
        sum_td = <td key={`cell_${cell_num++}`}>
            <div>{sums[row.key]}</div>
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
            let rowNum = 0;
            masterTable().forEach(masterRow => {
              let key = masterRow.key;
              let val = lodashGet(row, `sourceInfo.data[${key}]`, null);
              const hpoData = row.sourceInfo.data.hpoData ? row.sourceInfo.data.hpoData : [];
              const formattedHpo = hpoData.length ? formatHpoData(hpoData) : [];
              if (formattedHpo.length && key === 'proband_hpo_ids') {
                val = formattedHpo.join(', ');
              }
              let entry = '';
              // For text column, limit to 25 characters and show full text when mouseover 'more' text.
              if (key.endsWith('_comment') || key.startsWith('proband') || key === 'comments' || key === 'label') {
                const comment = val && val.length > 25
                  ? <div>{val.substr(0,25) + ' ... '}
                      <Popover
                        triggerComponent={<span className='more-text'>more</span>}
                        content={`${val}`}
                        placement="top"
                        className="more-text-div"
                      />
                    </div>
                  : <div>{val}</div>
                entry = <td key={`cell_${cell_num++}`}>{comment}</td>
              } else if (key === 'is_disease_associated_with_probands') {
                // Set checkmark for  "Disease associated with proband(s) (HPO) (Check here if unaffected)" if checked
                let iconClass = val === true ? 'icon icon-check' : '';
                entry = <td key={`cell_${cell_num++}`}>
                    <div className={iconClass}></div>
                  </td>
              } else {
                entry = <td key={`cell_${cell_num++}`}>
                    <div>{val}</div>
                  </td>
              }
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
  const getSums = () => {
    let sums = {};
    allCaseSegEvidences.forEach(row => {
      if (lodashGet(row, "sourceInfo.data")) {
        const data = lodashGet(row, "sourceInfo.data");
        Object.keys(data).forEach(name => {
          if (name.startsWith('num_') && !name.endsWith('_comment')) {
            let val = parseInt(data[name]);
            if (Object.keys(sums).indexOf(name) === -1) {
              if (isNaN(val)) {
                sums[name] = 0;
              } else {
                sums[name] = val;
              }
            } else {
              if (!isNaN(val)) {
                sums[name] += val;
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

    return(
      <table className="table masterTable table-bordered">
        <thead>
          {renderHeader(evidenceTypes)}
        </thead>
        <tbody>
          {renderRows(evidenceTypes)}
        </tbody>
      </table>
    );
  }
  else {
    return null;
  }
};
