import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useTable, useFilters, useGlobalFilter, useSortBy, usePagination } from 'react-table';
import { API } from 'aws-amplify';
import moment from 'moment';
import { API_NAME } from '../../utils';
import { getUserName } from "../../helpers/getUserName";
import { convertDiseasePKToMondoId } from '../../utilities/diseaseUtilities';
import { useAmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';
import { TableFilters, TableContent, Pagination } from '../common/TableComponents';
import Popover from '../common/Popover';
import LoadingSpinner from '../common/LoadingSpinner';

function AuditTrail(props) {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const [itemType, setItemType] = useState(props.itemType);
  const [itemPK, setItemPK] = useState(props.itemPK);
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (historyData === null && !isLoading) {
      setIsLoading(true);

      const historyResults = getHistoryData(itemPK);

      historyResults.then(results => {
        setHistoryData(generateTableData(results));
        setIsLoading(false);
      }).catch(error => {
        setHistoryData({});
        setIsLoading(false);
        console.log('History request failed');
      });

      requestRecycler.cancelAll();
    }
  });

  /**
   * Method to retrieve data from history table for the specified item (plus other linked-to items of related types)
   * @param {string} itemPK - PK of the item of interest
   */
  async function getHistoryData(itemPK) {
    try {
      const url = '/history/' + itemPK + '?related=curated_evidence_list,evaluations';
      const history = await API.get(API_NAME, url);

      return (history);
    } catch(error) {
      if (API.isCancel(error)) {
        console.log('History request cancelled');
      }

      console.log(error);
      return ({});
    }
  }

  // React Table configuration
  const dataHistory = React.useMemo(() => historyData ? historyData : [], [historyData]);

  const columnsHistory = React.useMemo(() => [
    {
      Header: 'User',
      accessor: 'user_filter',
      style: { width: '20%' },
      Cell: cell => { return cell.row && cell.row.original ? cell.row.original.user_display : cell.value }
    },
    {
      Header: 'Event',
      accessor: 'event_filter',
      Cell: cell => { return cell.row && cell.row.original ? cell.row.original.event_display : cell.value }
    },
    {
      Header: 'Date',
      accessor: 'date_sort',
      style: { width: '20%' },
      Cell: cell => { return cell.row && cell.row.original ? cell.row.original.date_display : cell.value }
    },
    {
      accessor: 'date_filter'
    }], []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    state: { globalFilter },
    preGlobalFilteredRows,
    setGlobalFilter,
    rows,
    pageOptions,
    page,
    pageCount,
    state: { pageIndex, pageSize },
    gotoPage,
    previousPage,
    nextPage,
    setPageSize,
    canPreviousPage,
    canNextPage
  } = useTable(
    {
      columns: columnsHistory,
      data: dataHistory,
      initialState: {
        hiddenColumns: ['date_filter'],
        pageIndex: 0,
        sortBy: [
          { id: 'date_sort', desc: true }
        ]
      },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const pageSizeOptions = [10, 20, 30, 50, 100];

  /**
   * Method to generate audit trail display data
   * @param {object} historyRequestData - data returned by /history request
   */
  function generateTableData(historyRequestData) {
    return processRawData(historyRequestData).map(eventElement => {
      if (eventElement) {
        let tableDataElement = {};
        const userData = renderUser(eventElement.user_name, eventElement.user_family_name, eventElement.user_email, eventElement.user_pk);
        const dateData = renderDate(eventElement.last_modified);
        const eventData = renderEvent(eventElement);

        if (userData) {
          tableDataElement['user_display'] = userData.display;
          tableDataElement['user_filter'] = userData.filter;
        } else {
          tableDataElement['user_display'] = '';
          tableDataElement['user_filter'] = '';
        }

        if (dateData) {
          tableDataElement['date_display'] = dateData.display;
          tableDataElement['date_filter'] = dateData.filter;
          tableDataElement['date_sort'] = dateData.sort;
        } else {
          tableDataElement['date_display'] = '';
          tableDataElement['date_filter'] = '';
          tableDataElement['date_sort'] = '';
        }

        if (eventData && Array.isArray(eventData)) {
          const lastIndex = eventData.length - 1;

          eventData.forEach((eventDataElement, eventDataIndex) => {
            if (eventDataElement) {
              if (eventDataIndex === 0) {
                tableDataElement['event_display'] = eventDataElement.display;
                tableDataElement['event_filter'] = eventDataElement.filter;
              } else {
                tableDataElement['event_display'] = (<>{tableDataElement['event_display']}<br />{eventDataElement.display}</>);
                tableDataElement['event_filter'] = tableDataElement['event_filter'] + ' ' + eventDataElement.filter;
              }
            }
          });
        } else {
          tableDataElement['event_display'] = '';
          tableDataElement['event_filter'] = '';
        }

        return (tableDataElement);
      }
    });
  }

  /**
   * Method to find and retrieve action data (i.e. changed by user) at the specified key or array of keys (for nested data)
   * If data is found via an array of keys, the returned key is a concatenation of those keys
   * @param {object} sourceData - data that was added/updated/deleted
   * @param {array or string} searchKey - key or array of keys to locate data of interest
   */
  function findActionData(sourceData, searchKey) {
    if (Array.isArray(searchKey)) {
      let flatKey = '';
      let dataNotFound = false;

      for (let currentKey of searchKey) {
        if (sourceData[currentKey]) {
          sourceData = sourceData[currentKey];
          flatKey = flatKey ? flatKey + '_' + currentKey : currentKey;
        } else {
          dataNotFound = true;
          break;
        }
      }

      if (!dataNotFound) {
        return ({
          'save_key': flatKey,
          'save_value': sourceData,
          'found': true
        });
      }
    } else if (sourceData[searchKey]) {
      return ({
        'save_key': searchKey,
        'save_value': sourceData[searchKey],
        'found': true
      });
    }

    return ({
      'found': false
    });
  }

  /**
   * Method to extract data of interest for audit trail display from /history request results
   * @param {object} historyRawData - data returned by /history request
   */
  function processRawData(historyRawData) {
    // Arrays of keys referencing data to save, grouped by item type
    const actionDataToSave = {
      'curated-evidence': ['evidenceCriteria', 'evidenceDescription',
        ['articles', 0, 'pmid'],
        ['sourceInfo', 'metadata', '_kind_key'],
        ['sourceInfo', 'metadata', '_kind_title'],
        ['sourceInfo', 'metadata', 'clinvar_gtr_labid'],
        ['sourceInfo', 'metadata', 'clinvar_scv'],
        ['sourceInfo', 'metadata', 'department_affiliation'],
        ['sourceInfo', 'metadata', 'institutional_affiliation'],
        ['sourceInfo', 'metadata', 'lab_name'],
        ['sourceInfo', 'metadata', 'name'],
        ['sourceInfo', 'metadata', 'pmid'],
        ['sourceInfo', 'metadata', 'source'],
        ['sourceInfo', 'metadata', 'url'],
        ['sourceInfo', 'metadata', 'variant_id'],
        ['sourceInfo', 'data', 'comments'],
        ['sourceInfo', 'data', 'hpoData'],
        ['sourceInfo', 'data', 'is_disease_associated_with_probands'],
        ['sourceInfo', 'data', 'label'],
        ['sourceInfo', 'data', 'num_control_with_variant'],
        ['sourceInfo', 'data', 'num_control_with_variant_comment'],
        ['sourceInfo', 'data', 'num_de_novo_confirmed'],
        ['sourceInfo', 'data', 'num_de_novo_confirmed_comment'],
        ['sourceInfo', 'data', 'num_de_novo_unconfirmed'],
        ['sourceInfo', 'data', 'num_de_novo_unconfirmed_comment'],
        ['sourceInfo', 'data', 'num_non_segregations'],
        ['sourceInfo', 'data', 'num_non_segregations_comment'],
        ['sourceInfo', 'data', 'num_proband_double_het'],
        ['sourceInfo', 'data', 'num_proband_double_het_comment'],
        ['sourceInfo', 'data', 'num_proband_hom'],
        ['sourceInfo', 'data', 'num_proband_hom_comment'],
        ['sourceInfo', 'data', 'num_probands_compound_het'],
        ['sourceInfo', 'data', 'num_probands_compound_het_comment'],
        ['sourceInfo', 'data', 'num_probands_relevant_phenotype'],
        ['sourceInfo', 'data', 'num_probands_relevant_phenotype_comment'],
        ['sourceInfo', 'data', 'num_probands_with_alt_genetic_cause'],
        ['sourceInfo', 'data', 'num_probands_with_alt_genetic_cause_comment'],
        ['sourceInfo', 'data', 'num_segregations'],
        ['sourceInfo', 'data', 'num_segregations_comment'],
        ['sourceInfo', 'data', 'num_total_controls'],
        ['sourceInfo', 'data', 'num_unaffected_family_with_variant'],
        ['sourceInfo', 'data', 'num_unaffected_family_with_variant_comment'],
        ['sourceInfo', 'data', 'proband_free_text'],
        ['sourceInfo', 'data', 'proband_hpo_comment'],
        ['sourceInfo', 'data', 'proband_hpo_ids']],
      'evaluation': ['criteria', 'criteriaStatus', 'explanation'],
      'interpretation': ['cspec', 'disease', 'diseaseTerm', 'modeInheritance', 'modeInheritanceAdjective', 'variant',
        ['provisionalVariant', 'alteredClassification'],
        ['provisionalVariant', 'reason'],
        ['provisionalVariant', 'evidenceSummary'],
        ['provisionalVariant', 'classificationStatus']]
    };
    let allTypesArray = [];

    Object.keys(historyRawData).forEach(historyPK => {
      if (historyRawData[historyPK].history) {
        let caseSegEvidenceKey = '';
        let caseSegEvidenceType = '';
        let caseSegEvidenceID = '';

        historyRawData[historyPK].history.forEach(historyElement => {
          if (historyElement && historyElement.item_type && actionDataToSave[historyElement.item_type]) {
            // Save reference data
            let auditTrailElement = {
              'item_type': historyElement.item_type,
              'user_pk': historyElement.modified_by,
              'user_name': historyElement.user_name,
              'user_family_name': historyElement.user_family_name,
              'user_email': historyElement.user_email,
              'affiliation_id': historyElement.affiliation,
              'last_modified': historyElement.last_modified,
              'criteria': historyElement.criteria,
              'evidenceCriteria': historyElement.evidenceCriteria
            };

            // Process item creation
            if (historyElement.change_type === 'INSERT') {
              if (historyElement.add) {
                let dataFound = false;
                let addData = {};

                actionDataToSave[historyElement.item_type].forEach(dataElement => {
                  const findResult = findActionData(historyElement.add, dataElement);

                  if (findResult.found) {
                    // Don't save auto-created "Not Evaluated" evaluations
                    if ((historyElement.item_type !== 'evaluation') ||
                      ((findResult.save_key === 'criteriaStatus' || findResult.save_key === 'explanation') && findResult.save_value)) {
                      addData[findResult.save_key] = findResult.save_value;
                      dataFound = true;
                    }
                  }
                });

                if (dataFound) {
                  // Save case seg evidence reference data (key and type, which most likely won't change, and ID) for subsequent item events
                  if (addData.sourceInfo_metadata__kind_key) {
                    caseSegEvidenceKey = addData.sourceInfo_metadata__kind_key;
                    auditTrailElement['case_seg_evidence_key'] = caseSegEvidenceKey;

                    caseSegEvidenceType = addData.sourceInfo_metadata__kind_title;
                    auditTrailElement['case_seg_evidence_type'] = caseSegEvidenceType;

                    caseSegEvidenceID = addData.sourceInfo_metadata_pmid ? 'PMID ' + addData.sourceInfo_metadata_pmid
                      : addData.sourceInfo_metadata_lab_name ? addData.sourceInfo_metadata_lab_name
                      : addData.sourceInfo_metadata_institutional_affiliation ? addData.sourceInfo_metadata_institutional_affiliation
                      : addData.sourceInfo_metadata_name ? addData.sourceInfo_metadata_name
                      : addData.sourceInfo_metadata_source ? addData.sourceInfo_metadata_source
                      : '';

                    if (caseSegEvidenceID) {
                      auditTrailElement['case_seg_evidence_id'] = caseSegEvidenceID;
                    }
                  }

                  auditTrailElement['events'] = [{'action': 'create', 'data': addData}];
                  allTypesArray.push(auditTrailElement);
                }
              }
            } else {
              // If present for the current item, add case seg evidence reference data
              if (caseSegEvidenceKey) {
                auditTrailElement['case_seg_evidence_key'] = caseSegEvidenceKey;
                auditTrailElement['case_seg_evidence_type'] = caseSegEvidenceType;

                if (caseSegEvidenceID) {
                  auditTrailElement['case_seg_evidence_id'] = caseSegEvidenceID;
                }
              }

              // Process data added to item
              if (historyElement.add) {
                let dataFound = false;
                let addData = {};

                actionDataToSave[historyElement.item_type].forEach(dataElement => {
                  const findResult = findActionData(historyElement.add, dataElement);

                  if (findResult.found) {
                    addData[findResult.save_key] = findResult.save_value;
                    dataFound = true;
                  }
                });

                if (dataFound) {
                  auditTrailElement['events'] = [{'action': 'add', 'data': addData}];
                }
              }

              // Process data updated within item
              if (historyElement.update) {
                let dataFound = false;
                let updateData = {};

                actionDataToSave[historyElement.item_type].forEach(dataElement => {
                  const findResult = findActionData(historyElement.update, dataElement);

                  if (findResult.found) {
                    updateData[findResult.save_key] = findResult.save_value;
                    dataFound = true;
                  }
                });

                if (dataFound) {
                  // Save case seg evidence reference data (type, in case it's changed system-wide, and ID) for subsequent item events
                  if (updateData.sourceInfo_metadata__kind_title) {
                    caseSegEvidenceType = updateData.sourceInfo_metadata__kind_title;
                    auditTrailElement['case_seg_evidence_type'] = caseSegEvidenceType;
                  }

                  caseSegEvidenceID = updateData.sourceInfo_metadata_pmid ? 'PMID ' + updateData.sourceInfo_metadata_pmid
                  : updateData.sourceInfo_metadata_lab_name ? updateData.sourceInfo_metadata_lab_name
                  : updateData.sourceInfo_metadata_institutional_affiliation ? updateData.sourceInfo_metadata_institutional_affiliation
                  : updateData.sourceInfo_metadata_name ? updateData.sourceInfo_metadata_name
                  : updateData.sourceInfo_metadata_source ? updateData.sourceInfo_metadata_source
                  : '';

                  if (caseSegEvidenceID) {
                    auditTrailElement['case_seg_evidence_id'] = caseSegEvidenceID;
                  }

                  if (auditTrailElement['events']) {
                    auditTrailElement['events'].push({'action': 'update', 'data': updateData});
                  } else {
                    auditTrailElement['events'] = [{'action': 'update', 'data': updateData}];
                  }
                }
              }

              // Process data deleted from item
              if (historyElement.delete) {
                let dataFound = false;
                let deleteData = {};

                actionDataToSave[historyElement.item_type].forEach(dataElement => {
                  const findResult = findActionData(historyElement.delete, dataElement);

                  if (findResult.found) {
                    deleteData[findResult.save_key] = findResult.save_value;
                    dataFound = true;
                  }
                });

                if (dataFound) {
                  if (auditTrailElement['events']) {
                    auditTrailElement['events'].push({'action': 'delete', 'data': deleteData});
                  } else {
                    auditTrailElement['events'] = [{'action': 'delete', 'data': deleteData}];
                  }
                }
              }

              if (auditTrailElement['events']) {
                allTypesArray.push(auditTrailElement);
              }
            }
          }
        });
      }
    });

    return (allTypesArray);
  }

  /**
   * Method to generate display/filter data for a user
   * @param {string} userName - first name of user
   * @param {string} userFamilyName - last name of user
   * @param {string} userEmail - email address for user
   * @param {string} userPK - PK of item containing user data
   */
  function renderUser(userName, userFamilyName, userEmail, userPK) {
    const textUserName = userName && userFamilyName ? getUserName({'name': userName, 'family_name': userFamilyName})
      : userPK && props.auth && userPK === props.auth.PK ? getUserName(props.auth)
      : 'Curator';
    const textEmail = userEmail ? userEmail
      : userPK && props.auth && userPK === props.auth.PK ? props.auth.email
      : null;

    if (textEmail) {
      return ({
        display: (<a href={'mailto:' + textEmail} className="audit-trail-data user">{textUserName}</a>),
        filter: textUserName
      });
    } else {
      return ({
        display: (<span className="audit-trail-data user">{textUserName}</span>),
        filter: textUserName
      });
    }
  }

  /**
   * Method to generate display/filter data for a date
   * @param {string} dateTimestamp - date and time (of event)
   */
  function renderDate(dateTimestamp) {
    const textDate = dateTimestamp ? moment(dateTimestamp).format('YYYY MMM DD, h:mm a') : 'Unrecognized date';

    return ({
      display: (<span className="audit-trail-data timestamp">{textDate}</span>),
      filter: textDate,
      sort: dateTimestamp
    });
  }

  /**
   * Method to generate display/filter data for a variant
   * @param {string} variantPK - PK of item containing variant data
   */
  function renderVariant(variantPK) {
    if (variantPK && props.variant && variantPK === props.variant.PK) {
      const textVariantTitle = props.variant.preferredTitle ? props.variant.preferredTitle + ', ' : '';
      const textVariantClinVarID = props.variant.clinvarVariantId ? 'ClinVar ID: ' + props.variant.clinvarVariantId : '';
      const textVariantCARID = props.variant.carId ? 'CAR ID: ' + props.variant.carId : '';
      const textSeparator = textVariantClinVarID && textVariantCARID ? ', ' : '';

      return ({
        display: (<>variant <span className="audit-trail-data variant">{textVariantTitle}{textVariantClinVarID}{
          textSeparator}{textVariantCARID}</span></>),
        filter: 'variant ' + textVariantTitle + textVariantClinVarID + textSeparator + textVariantCARID
      });
    } else {
      return ({
        display: (<span className="audit-trail-data variant">an unrecognized variant</span>),
        filter: 'an unrecognized variant'
      });
    }
  }

  /**
   * Method to generate display/filter data for a saved cspec doc
   * @param {*} cspec
   */
  function renderCspec(cspec) {
    if (cspec) {
      const documentName = cspec.documentName;
      return ({
        display: (<>specification document <span className="audit-trail-data cspec">{documentName}</span></>),
        filter: 'specification document ' + documentName
      });
    } else {
      return ({
        display: (<span className="audit-trail-data cspec">an unrecognized specification document</span>),
        filter: 'an unrecognized specification document'
      });
    }
  }

  /**
   * Method to generate display/filter data for a disease
   * @param {string} diseasePK - PK of item containing disease data
   * @param {string} diseaseTerm - name of disease
   */
  function renderDisease(diseasePK, diseaseTerm) {
    if (diseasePK || diseaseTerm) {
      const diseaseMondoID = convertDiseasePKToMondoId(diseasePK);
      const textDisease = diseaseTerm && diseaseMondoID ? diseaseTerm + ' (' + diseaseMondoID + ')'
        : diseaseTerm ? diseaseTerm
        : diseaseMondoID;

      return ({
        display: (<>disease <span className="audit-trail-data disease">{textDisease}</span></>),
        filter: 'disease ' + textDisease
      });
    } else {
      return ({
        display: (<span className="audit-trail-data disease">an unrecognized disease</span>),
        filter: 'an unrecognized disease'
      });
    }
  }

  /**
   * Method to generate display/filter data for a mode of inheritance
   * @param {string} modeOfInheritance - mode of inheritance
   * @param {string} modeOfInheritanceAdjective - adjective to the mode of inheritance
   */
  function renderMOI(modeOfInheritance, modeOfInheritanceAdjective) {
    if (modeOfInheritance || modeOfInheritanceAdjective) {
      const adjectiveText = !modeOfInheritance && modeOfInheritanceAdjective ? 'adjective ' : '';
      const textMOI = modeOfInheritance && modeOfInheritanceAdjective ? modeOfInheritance + ' (' + modeOfInheritanceAdjective + ')'
        : modeOfInheritance ? modeOfInheritance
        : modeOfInheritanceAdjective;

      return ({
        display: (<>mode of inheritance {adjectiveText}<span className="audit-trail-data moi">{textMOI}</span></>),
        filter: 'mode of inheritance ' + adjectiveText + textMOI
      });
    } else {
      return ({
        display: (<span className="audit-trail-data moi">an unrecognized mode of inheritance</span>),
        filter: 'an unrecognized mode of inheritance'
      });
    }
  }

  /**
   * Method to generate display/filter data for an interpretation's classification/summary
   * @param {object} classificationData - data related to classification/summary of interpretation
   */
  function renderClassification(classificationData) {
    let displayPathogenicity = '';
    let filterPathogenicity = '';
    let andText = '';
    let displaySummary = '';
    let filterSummary = '';

    if (classificationData.provisionalVariant_alteredClassification && classificationData.provisionalVariant_reason) {
      displayPathogenicity = (<>modified pathogenicity <span className="audit-trail-data pathogenicity">{
        classificationData.provisionalVariant_alteredClassification}</span> with reason <span className="audit-trail-data reason">{
        classificationData.provisionalVariant_reason}</span></>);
      filterPathogenicity = 'modified pathogenicity ' + classificationData.provisionalVariant_alteredClassification + ' with reason ' +
        classificationData.provisionalVariant_reason;
    } else if (classificationData.provisionalVariant_alteredClassification) {
      displayPathogenicity = (<>modified pathogenicity <span className="audit-trail-data pathogenicity">{
        classificationData.provisionalVariant_alteredClassification}</span></>);
      filterPathogenicity = 'modified pathogenicity ' + classificationData.provisionalVariant_alteredClassification;
    } else if (classificationData.provisionalVariant_reason) {
      displayPathogenicity = (<>modified pathogenicity reason <span className="audit-trail-data reason">{
        classificationData.provisionalVariant_reason}</span></>);
      filterPathogenicity = 'modified pathogenicity reason ' + classificationData.provisionalVariant_reason;
    }

    if (classificationData.provisionalVariant_evidenceSummary) {
      if (filterPathogenicity) {
        andText = ' and '
      }

      displaySummary = (<>evidence summary <span className="audit-trail-data summary">{
        classificationData.provisionalVariant_evidenceSummary}</span></>);
      filterSummary = 'evidence summary ' + classificationData.provisionalVariant_evidenceSummary;
    }

    return ({
      display: (<>{displayPathogenicity}{andText}{displaySummary}</>),
      filter: filterPathogenicity + andText + filterSummary
    });
  }

  /**
   * Method to generate display/filter data for evidence
   * @param {object} evidenceData - data related to evidence
   * @param {string} evidenceCriteria - target criteria of non-case seg evidence
   * @param {string} caseSegEvidenceKey - system key for source of case seg evidence
   * @param {string} caseSegEvidenceType - system label for source of case seg evidence
   * @param {string} caseSegEvidenceID - user-supplied name for source of case seg evidence
   */
  function renderEvidence(evidenceData, evidenceCriteria, caseSegEvidenceKey, caseSegEvidenceType, caseSegEvidenceID) {
    if (evidenceData && evidenceData.data) {
      const evidenceSourceKeys = ['sourceInfo_metadata_lab_name', 'sourceInfo_metadata_institutional_affiliation',
        'sourceInfo_metadata_department_affiliation', 'sourceInfo_metadata_name', 'sourceInfo_metadata_url', 'sourceInfo_metadata_variant_id',
        'sourceInfo_metadata_source', 'sourceInfo_metadata_clinvar_gtr_labid', 'sourceInfo_metadata_clinvar_scv'];
      const evidenceSourceLabels = {
        'sourceInfo_metadata_lab_name': 'Laboratory Name',
        'sourceInfo_metadata_institutional_affiliation': 'Institutional Affiliation',
        'sourceInfo_metadata_department_affiliation': 'Department Affiliation',
        'sourceInfo_metadata_name': 'Name of Database',
        'sourceInfo_metadata_url': 'Database URL',
        'sourceInfo_metadata_variant_id': 'Database Variant ID',
        'sourceInfo_metadata_source': 'Describe Source',
        'sourceInfo_metadata_clinvar_gtr_labid': 'ClinVar/GTR LabID',
        'sourceInfo_metadata_clinvar_scv': 'ClinVar Submission Accession (SCV)'
      };

      const evidenceDataKeys = ['articles_0_pmid', 'evidenceDescription', 'sourceInfo_data_label', 'sourceInfo_data_is_disease_associated_with_probands',
        'sourceInfo_data_proband_hpo_ids', 'sourceInfo_data_hpoData', 'sourceInfo_data_proband_free_text', 'sourceInfo_data_proband_hpo_comment',
        'sourceInfo_data_num_probands_relevant_phenotype', 'sourceInfo_data_num_probands_relevant_phenotype_comment',
        'sourceInfo_data_num_unaffected_family_with_variant', 'sourceInfo_data_num_unaffected_family_with_variant_comment',
        'sourceInfo_data_num_control_with_variant', 'sourceInfo_data_num_total_controls', 'sourceInfo_data_num_control_with_variant_comment',
        'sourceInfo_data_num_segregations', 'sourceInfo_data_num_segregations_comment', 'sourceInfo_data_num_non_segregations',
        'sourceInfo_data_num_non_segregations_comment', 'sourceInfo_data_num_de_novo_unconfirmed', 'sourceInfo_data_num_de_novo_unconfirmed_comment',
        'sourceInfo_data_num_de_novo_confirmed', 'sourceInfo_data_num_de_novo_confirmed_comment', 'sourceInfo_data_num_proband_hom',
        'sourceInfo_data_num_proband_hom_comment', 'sourceInfo_data_num_proband_double_het', 'sourceInfo_data_num_proband_double_het_comment',
        'sourceInfo_data_num_probands_with_alt_genetic_cause', 'sourceInfo_data_num_probands_with_alt_genetic_cause_comment',
        'sourceInfo_data_num_probands_compound_het', 'sourceInfo_data_num_probands_compound_het_comment', 'sourceInfo_data_comments'];
      const evidenceDataLabels = {
        'articles_0_pmid': 'PMID',
        'evidenceDescription': 'Evidence',
        'sourceInfo_data_label': 'Label for case information',
        'sourceInfo_data_is_disease_associated_with_probands': 'Disease associated with proband(s) (HPO) (Check here if unaffected)',
        'sourceInfo_data_proband_hpo_ids': 'Phenotypic feature(s) associated with proband(s) (HPO) (PP4)',
        'sourceInfo_data_hpoData': 'Terms for phenotypic feature(s) associated with proband(s):',
        'sourceInfo_data_proband_free_text': 'Phenotypic feature(s) associated with proband(s) (free text) (PP4)',
        'sourceInfo_data_proband_hpo_comment': 'Comment for Phenotypic feature(s) associated with proband(s)',
        'sourceInfo_data_num_probands_relevant_phenotype': '# probands with relevant phenotype (PS4)',
        'sourceInfo_data_num_probands_relevant_phenotype_comment': 'Comment for # probands with relevant phenotype (PS4)',
        'sourceInfo_data_num_unaffected_family_with_variant': '# unaffected family members with variant (BS2)',
        'sourceInfo_data_num_unaffected_family_with_variant_comment': 'Comment for # unaffected family members with variant (BS2)',
        'sourceInfo_data_num_control_with_variant': '# control individuals with variant (BS2)',
        'sourceInfo_data_num_total_controls': 'Total control individuals tested',
        'sourceInfo_data_num_control_with_variant_comment': 'Comment for # control individuals with variant (BS2)',
        'sourceInfo_data_num_segregations': '# segregations (PP1)',
        'sourceInfo_data_num_segregations_comment': 'Comment for # segregations (PP1)',
        'sourceInfo_data_num_non_segregations': '# non-segregations (BS4)',
        'sourceInfo_data_num_non_segregations_comment': 'Comment for # non-segregations (BS4)',
        'sourceInfo_data_num_de_novo_unconfirmed': '# proband de novo occurrences (with unknown or no parental identity confirmation) (PM6)',
        'sourceInfo_data_num_de_novo_unconfirmed_comment': 'Comment for # proband de novo occurrences (with unknown or no parental identity confirmation) (PM6)',
        'sourceInfo_data_num_de_novo_confirmed': '# proband de novo occurrences (with parental identity confirmation) (PS2)',
        'sourceInfo_data_num_de_novo_confirmed_comment': 'Comment for # proband de novo occurrences (with parental identity confirmation) (PS2)',
        'sourceInfo_data_num_proband_hom': '# proband homozygous occurrences (PM3)',
        'sourceInfo_data_num_proband_hom_comment': 'Comment for # proband homozygous occurrences (PM3)',
        'sourceInfo_data_num_proband_double_het': '# proband double het occurrences (BP2)',
        'sourceInfo_data_num_proband_double_het_comment': 'Comment for # proband double het occurrences (BP2)',
        'sourceInfo_data_num_probands_with_alt_genetic_cause': '# probands with alternative genetic cause (BP5)',
        'sourceInfo_data_num_probands_with_alt_genetic_cause_comment': 'Comment for # probands with alternative genetic cause (BP5)',
        'sourceInfo_data_num_probands_compound_het': '# proband compound het occurrences (PM3)',
        'sourceInfo_data_num_probands_compound_het_comment': 'Comment for # proband compound het occurrences (PM3)',
        'sourceInfo_data_comments': 'Additional comments'
      };

      const startText = evidenceData.action === 'create' ? 'Created'
        : evidenceData.action === 'add' ? 'Added to'
        : evidenceData.action === 'update' ? 'Updated'
        : evidenceData.action === 'delete' ? 'Removed from'
        : '';

      const displayType = caseSegEvidenceType ? (<> <span className="audit-trail-data evidence-type">{caseSegEvidenceType}</span> evidence</>)
        : evidenceData.data.evidenceCriteria || evidenceCriteria ? (<> <span className="audit-trail-data evidence-type">PMID</span> evidence for</>)
        : ' evidence';
      const filterType = caseSegEvidenceType ? ' ' + caseSegEvidenceType + ' evidence'
        : evidenceData.data.evidenceCriteria || evidenceCriteria ? ' PMID evidence for'
        : ' evidence';

      const displayID = caseSegEvidenceID ? (<> <span className="audit-trail-data evidence-id">{caseSegEvidenceID}</span></>)
        : evidenceData.data.evidenceCriteria ? (<> <span className="audit-trail-data evidence-id">{evidenceData.data.evidenceCriteria}</span></>)
        : evidenceCriteria ? (<> <span className="audit-trail-data evidence-id">{evidenceCriteria}</span></>)
        : '';
      const filterID = caseSegEvidenceID ? ' ' + caseSegEvidenceID
        : evidenceData.data.evidenceCriteria ? ' ' + evidenceData.data.evidenceCriteria
        : evidenceCriteria ? ' ' + evidenceCriteria
        : '';

      const phraseText = evidenceData.action === 'create' ? ' with'
        : evidenceData.action === 'update' ? ' to'
        : '';

      let displayTable = '';
      let filterTable = '';

      // Add evidence source information to table
      evidenceSourceKeys.forEach(evidenceSourceKey => {
        if (evidenceData.data[evidenceSourceKey]) {
          // Alternate source label for Research Lab evidence
          const labelText = caseSegEvidenceKey === 'research_lab' && evidenceSourceKey === 'sourceInfo_metadata_department_affiliation'
            ? 'Department Affiliation/Principal Investigator' : evidenceSourceLabels[evidenceSourceKey];

          displayTable = (<>{displayTable}<div className="audit-trail-table-row"><div className="audit-trail-table-cell label">{
            labelText}</div><div className="audit-trail-table-cell audit-trail-data">{evidenceData.data[evidenceSourceKey]}</div></div></>);
          filterTable = filterTable + ' ' + labelText + ' ' + evidenceData.data[evidenceSourceKey];
        }
      });

      // Add evidence data to table
      evidenceDataKeys.forEach(evidenceDataKey => {
        if (evidenceData.data[evidenceDataKey]) {
          // Special handling for HPO terms array
          if (evidenceDataKey === 'sourceInfo_data_hpoData') {
            let hpoDataText = '';

            if (Array.isArray(evidenceData.data[evidenceDataKey])) {
              evidenceData.data[evidenceDataKey].forEach((hpoDataElement, hpoDataIndex) => {
                if (hpoDataElement) {
                  const commaText = hpoDataIndex > 0 ? ', ' : '';

                  if (hpoDataElement.hpoTerm && hpoDataElement.hpoId) {
                    hpoDataText = hpoDataText + commaText + hpoDataElement.hpoTerm + ' (' + hpoDataElement.hpoId + ')';
                  } else if (hpoDataElement.hpoTerm) {
                    hpoDataText = hpoDataText + commaText + hpoDataElement.hpoTerm;
                  } else if (hpoDataElement.hpoId) {
                    hpoDataText = hpoDataText + commaText + hpoDataElement.hpoId;
                  }
                }
              });
            }

            if (hpoDataText) {
              displayTable = (<>{displayTable}<div className="audit-trail-table-row"><div className="audit-trail-table-cell label">{
                evidenceDataLabels[evidenceDataKey]}</div><div className="audit-trail-table-cell audit-trail-data">{hpoDataText}</div></div></>);
              filterTable = filterTable + ' ' + evidenceDataLabels[evidenceDataKey] + ' ' + hpoDataText;
            }

          // Special handling for checkbox boolean
          } else if (evidenceDataKey === 'sourceInfo_data_is_disease_associated_with_probands') {
            const checkedText = evidenceData.data[evidenceDataKey] ? 'Checked' : 'Not Checked';

            displayTable = (<>{displayTable}<div className="audit-trail-table-row"><div className="audit-trail-table-cell label">{
              evidenceDataLabels[evidenceDataKey]}</div><div className="audit-trail-table-cell audit-trail-data">{checkedText}</div></div></>);
            filterTable = filterTable + ' ' + evidenceDataLabels[evidenceDataKey] + ' ' + checkedText;
          } else {
            displayTable = (<>{displayTable}<div className="audit-trail-table-row"><div className="audit-trail-table-cell label">{
              evidenceDataLabels[evidenceDataKey]}</div><div className="audit-trail-table-cell audit-trail-data">{evidenceData.data[evidenceDataKey]}</div></div></>);
            filterTable = filterTable + ' ' + evidenceDataLabels[evidenceDataKey] + ' ' + evidenceData.data[evidenceDataKey];
          }
        }
      });

      if (displayTable) {
        displayTable = (<div className="audit-trail-table">{displayTable}</div>);
      }

      return ({
        display: (<><span>{startText}{displayType}{displayID}{phraseText}:</span>{displayTable}</>),
        filter: startText + filterType + filterID + phraseText + ':' + filterTable
      });
    }
  }

  /**
   * Method to generate display/filter data for an evaluation
   * @param {object} evaluationData - data related to an evaluation
   * @param {string} evaluationCriteria - target criteria of an evaluation
   */
  function renderEvaluation(evaluationData, evaluationCriteria) {
    if (evaluationData && evaluationData.data && (evaluationData.data.criteria || evaluationCriteria)) {
      const textCriteria = evaluationData.data.criteria ? evaluationData.data.criteria : evaluationCriteria;

      if (evaluationData.action === 'create') {
        const statusText = evaluationData.data.criteriaStatus ? ' as ' : '';
        const displayStatus = evaluationData.data.criteriaStatus ? (<span className="audit-trail-data status">{
          evaluationData.data.criteriaStatus}</span>) : '';
        const filterStatus = evaluationData.data.criteriaStatus ? evaluationData.data.criteriaStatus : '';
        const explanationText = evaluationData.data.explanation ? ' with explanation ' : '';
        const displayExplanation = evaluationData.data.explanation ? (<span className="audit-trail-data explanation">{
          evaluationData.data.explanation}</span>) : '';
        const filterExplanation = evaluationData.data.explanation ? evaluationData.data.explanation : '';

        return ({
          display : (<>Created <span className="audit-trail-data criteria">{textCriteria}</span> evaluation{
            statusText}{displayStatus}{explanationText}{displayExplanation}</>),
          filter: 'Created ' + textCriteria + ' evaluation' + statusText + filterStatus + explanationText + filterExplanation
        });
      } else {
        const startText = evaluationData.action === 'add' ? 'Added to '
          : evaluationData.action === 'update' ? 'Updated '
          : evaluationData.action === 'delete' ? 'Removed from '
          : '';
        const toText = evaluationData.action === 'update' ? ' to' : '';

        if (evaluationData.data.criteriaStatus && evaluationData.data.explanation) {
          return ({
            display : (<>{startText}<span className="audit-trail-data criteria">{textCriteria}</span>{toText} evaluation <span
              className="audit-trail-data status">{evaluationData.data.criteriaStatus}</span> and explanation <span
              className="audit-trail-data explanation">{evaluationData.data.explanation}</span></>),
            filter: startText + textCriteria + toText + ' evaluation ' + evaluationData.data.criteriaStatus + ' and explanation ' + evaluationData.data.explanation
          });
        } else if (evaluationData.data.criteriaStatus) {
          return ({
            display : (<>{startText}<span className="audit-trail-data criteria">{textCriteria}</span>{toText} evaluation <span
              className="audit-trail-data status">{evaluationData.data.criteriaStatus}</span></>),
            filter: startText + textCriteria + toText + ' evaluation ' + evaluationData.data.criteriaStatus
          });
        } else if (evaluationData.data.explanation) {
          return ({
            display : (<>{startText}<span className="audit-trail-data criteria">{textCriteria}</span>{toText} explanation <span
              className="audit-trail-data explanation">{evaluationData.data.explanation}</span></>),
            filter: startText + textCriteria + toText + ' explanation ' + evaluationData.data.explanation
          });
        }
      }
    }

    return ({
      display: '',
      filter: ''
    });
  }

  /**
   * Method to generate display/filter data for an interpretation
   * @param {object} interpretationData - data related to an interpretation
   */
  function renderInterpretation(interpretationData) {
    if (interpretationData && interpretationData.data) {
      if (interpretationData.action === 'create') {
        const variantData = renderVariant(interpretationData.data.variant);

        return ({
          display: (<span>Created interpretation for {variantData.display}</span>),
          filter: 'Created interpretation for ' + variantData.filter
        });
      } else {
        let displayCombined = '';
        let filterCombined = '';
        const startText = interpretationData.action === 'add' ? 'Added to interpretation '
          : interpretationData.action === 'update' ? 'Updated interpretation '
          : interpretationData.action === 'delete' ? 'Removed from interpretation '
          : '';

        if (interpretationData.data.disease || interpretationData.data.diseaseTerm) {
          const diseaseData = renderDisease(interpretationData.data.disease, interpretationData.data.diseaseTerm);

          displayCombined = (<>{startText}{diseaseData.display}</>);
          filterCombined = startText + diseaseData.filter;
        }

        if (interpretationData.data.cspec) {
          const cspecData = renderCspec(interpretationData.data.cspec);

          displayCombined = (<>{startText}{cspecData.display}</>);
          filterCombined = startText + cspecData.filter;
        }

        if (interpretationData.data.modeInheritance || interpretationData.data.modeInheritanceAdjective) {
          const moiData = renderMOI(interpretationData.data.modeInheritance, interpretationData.data.modeInheritanceAdjective);

          if (filterCombined || displayCombined) {
            displayCombined = (<>{displayCombined}<br />{startText}{moiData.display}</>);
            filterCombined = filterCombined + ' ' + startText + moiData.filter;
          } else {
            displayCombined = (<>{startText}{moiData.display}</>);
            filterCombined = startText + moiData.filter;
          }
        }

        if (interpretationData.data.provisionalVariant_alteredClassification || interpretationData.data.provisionalVariant_reason || interpretationData.data.provisionalVariant_evidenceSummary) {
          const classificationData = renderClassification(interpretationData.data);

          if (filterCombined || displayCombined) {
            displayCombined = (<>{displayCombined}<br />{startText}{classificationData.display}</>);
            filterCombined = filterCombined + ' ' + startText + classificationData.filter;
          } else {
            displayCombined = (<>{startText}{classificationData.display}</>);
            filterCombined = startText + classificationData.filter;
          }
        } else if (interpretationData.action === 'update' && interpretationData.data.provisionalVariant_classificationStatus) {
          if (filterCombined || displayCombined) {
            displayCombined = (<>{displayCombined}<br />{startText}to status <span className="audit-trail-data status">{interpretationData.data.provisionalVariant_classificationStatus}</span></>);
            filterCombined = filterCombined + ' ' + startText + 'to status ' + interpretationData.data.provisionalVariant_classificationStatus;
          } else {
            displayCombined = (<>{startText}to status <span className="audit-trail-data status">{interpretationData.data.provisionalVariant_classificationStatus}</span></>);
            filterCombined = startText + 'to status ' + interpretationData.data.provisionalVariant_classificationStatus;
          }
        }

        if (displayCombined) {
          displayCombined = (<span>{displayCombined}</span>);
        }

        return ({
          display: displayCombined,
          filter: filterCombined
        });
      }
    }

    return ({
      display: '',
      filter: ''
    });
  }

  /**
   * Method to generate display/filter data for an event
   * @param {object} eventData - data related to an event
   */
  function renderEvent(eventData) {
    if (eventData.item_type && eventData.events) {
      return eventData.events.map(actionElement => {
        switch (eventData.item_type) {
          case 'curated-evidence':
            return (renderEvidence(actionElement, eventData.evidenceCriteria, eventData.case_seg_evidence_key,
              eventData.case_seg_evidence_type, eventData.case_seg_evidence_id));
            break;

          case 'evaluation':
            return (renderEvaluation(actionElement, eventData.criteria));
            break;

          case 'interpretation':
            return (renderInterpretation(actionElement));
            break;

          default:
            return ({
              display: '',
              filter: ''
            });
            break;
        }
      });
    }

    return ([{
      display: '',
      filter: ''
    }]);
  }

  return (
    <div className="audit-trail">
      <h3 className="audit-trail-title">Variant Interpretation Audit Trail
        <Popover
          className="audit-trail-tooltip ml-1"
          placement="top"
          popoverClassName="popover-bg-black"
          trigger={['hover', 'focus']}
          triggerComponent={<i className="icon icon-info-circle" />}
          content={
            <span className="text-light">
              This table contains the complete history of curation actions for this interpretation record.
              It will not include actions from other interpretations for this same variant.
            </span>
          }
        />
      </h3>
      {historyData && historyData.length > 0
        ? <>
          <div className="audit-trail-filter">
            <TableFilters
              preGlobalFilteredRows={preGlobalFilteredRows}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              hideStatusFilters={true}
            />
          </div>
          <TableContent
            getTableProps={getTableProps}
            headerGroups={headerGroups}
            getTableBodyProps={getTableBodyProps}
            page={page}
            prepareRow={prepareRow}
          />
          <Pagination
            pageIndex={pageIndex}
            pageOptions={pageOptions}
            gotoPage={gotoPage}
            canPreviousPage={canPreviousPage}
            previousPage={previousPage}
            nextPage={nextPage}
            canNextPage={canNextPage}
            pageCount={pageCount}
            pageSize={pageSize}
            setPageSize={setPageSize}
            pageSizeOptions={pageSizeOptions}
          />
        </>
        : !isLoading
          ? <p className="audit-trail-clear">No historical data found.</p>
          : <div className="audit-trail-clear text-center pt-3"><LoadingSpinner /></div>
      }
    </div>
  )
}

const mapStateToProps = state => ({
    auth: state.auth,
    variant: state.variant,
});

export default connect(mapStateToProps)(AuditTrail);
