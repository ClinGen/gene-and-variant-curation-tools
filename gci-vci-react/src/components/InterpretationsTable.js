import React, { useState, useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import _ from "lodash";
import 'react-table';
import { Link } from "react-router-dom";
import { useTable, useFilters, useGlobalFilter, usePagination, useSortBy } from 'react-table';
import { updateVariant } from '../actions/actions';
import LoadingSpinner from './common/LoadingSpinner';
import { TableHeader, TableFilters, TableContent, Pagination } from './common/TableComponents';
import { renderInterpretationStatus } from './recordStatus/interpretationStatus';
import exportCSV from '../helpers/export_csv';
import StatusBadge from './common/StatusBadge';
import { getFormattedDateTime } from '../utilities/dateTimeUtilities';

function Table(props) {
    // table row data will be stored in filteredData state.
    // we can modify data variable on input to table.
    let { headers, data, isLoading } = props
    const [filteredData, setFilteredData] = useState([]);
    const [statusFilters, setstatusFilters] = useState([]);

    const statusFilterOptions = [
        { value: "in progress", label: "In Progress" },
        { value: "provisional", label: "Provisional" },
        { value: "approved", label: "Approved" },
        { value: "published", label: "Published"}
    ]

    // filters data based on currently selected interpretation filters. If no filter, just returns normal data.
    const filterData = useCallback(() => {
      // Checks if input value is equal to any value in a target list. Used for status filtering.
      const any = (input, targetList) => targetList.includes(input);
        
      let data = []
      if (statusFilters.length === 0) {
        setFilteredData(props.data);
        return;
      }

      data = props.data.filter((rootObj) => {
        if (rootObj && Array.isArray(rootObj.snapshot)) {
          // handles case where status filter contains 'provisional' but not 'approved'
          if (statusFilters.includes('provisional') && !statusFilters.includes('approved')) {
            let provisionalFound = false;
            let approvalFound = false;
            let newestProvisionalDate;
            let newestApprovedDate;
            let shouldInclude = false;
            rootObj.snapshot.forEach((snapshot) => {
              const classificationStatus = snapshot && snapshot.classificationStatus ? snapshot.classificationStatus.toLowerCase() : null;
              // handle case where both 'provisional' and 'published' filters are selected
              if (statusFilters.includes('published') && snapshot.publishClassification) {
                shouldInclude = true;
              }
              // check if this snapshot has a status that matches one in the statusFilters
              if (any(classificationStatus, statusFilters)) {
                // legacy code logic includes both 'provisional' and 'provisioned'
                // keep track of newest provisional snapshot date
                if (classificationStatus === 'provisional' || classificationStatus === 'provisioned') {
                  provisionalFound = true;
                  newestProvisionalDate = newestProvisionalDate
                    ? moment(snapshot.provisionalDate).isAfter(newestProvisionalDate)
                      ? snapshot.provisionalDate
                      : newestProvisionalDate
                    : snapshot.provisionalDate;
                } else {
                  // handle case where there are multiple selected filters
                  // @shouldInclude is used to include current snapshots with a status that
                  // matches one in the @statusFilters that is not 'provisional'
                  shouldInclude = true;
                }
              }
              // keep track of newest approved snapshot date
              if (classificationStatus === 'approved') {
                approvalFound = true;
                newestApprovedDate = newestApprovedDate
                  ? moment(snapshot.approvalDate).isAfter(newestApprovedDate)
                    ? snapshot.approvalDate
                    : newestApprovedDate
                  : snapshot.approvalDate;
              }
            });
            // Include this snapshot if there is a provisional snapshot but no approval snapshot
            // or include this snapshot if there exists a provisionalDate that is after
            // the most recent approvalDate
            if ((provisionalFound && !approvalFound) ||
            (newestProvisionalDate && newestApprovedDate && moment(newestProvisionalDate).isAfter(newestApprovedDate))) {
              return true;
            }
            return shouldInclude;
          }
          // All other cases for the status filter
          return rootObj.snapshot.some((snapshot) => {
            // if status filter is published, check 'publishClassification' instead of 'classificationStatus'
            if (statusFilters.includes('published') && snapshot.publishClassification) {
              return true
            }
            if (snapshot && snapshot.classificationStatus) {
              return any(snapshot.classificationStatus.toLowerCase(), statusFilters)
            }
          });
        } else if (rootObj && rootObj.snapshot && rootObj.snapshot.status) {
          return any(rootObj.snapshot.status.toLowerCase(), statusFilters)
        } else {
          return false
        }
      });
      setFilteredData(data)

    }, [statusFilters, props.data])

    // Re-filters data if filterData's dependencies change.
    useEffect(() => {filterData()}, [filterData])

    // assign table columns based on header prop.
    let columns = headers.map((item) => {
        if (item.key === 'variant') {
            return {
                Header: item.text,
                accessor: item.key, // accessor is the "key" in the data
                disableSortBy: true,
                Cell: e => <Link to={`/variant-central/${e.row.original.variantPK}/interpretation/${e.row.original.interpretationPK}`}>{e.value}</Link>
            }
        }
        else if (item.key === 'gene') {
            return {
                Header: item.text,
                accessor: item.key,
                style: { minWidth: 80 },
                disableSortBy: true,
                Cell: e => <Link to={`/curation-central/${e.row.original.gdmPK}`}>{e.value}</Link>
            }
        }
        else if (!props.isAllTable && item.key === 'status') {
            return {
                Header: item.text,
                accessor: item.key,
                disableSortBy: true,
                Cell: e => {
                    if (e.row.original.snapshot) {
                        return <>{renderInterpretationStatus(e.row.original.snapshot)}</>;
                    }
                    else if (e.row.original.status) {
                        return <StatusBadge label={e.row.original.status} />;
                    }

                    return;
                }
            };
        }
        else if (item.key === 'last_modified') {
          return {
            Header: item.text,
            accessor: item.key,
            Cell: e => {
              if (e.row.original) {
                if (e.row.original.snapshot) {
                  const { snapshot } = e.row.original;
                  let snapshotLastModified;
                  // snapshot can either be an array or an object
                  if (Array.isArray(snapshot) && snapshot.length) {
                    snapshot.forEach((record) => {
                      // find latest modified snapshot date
                      if (snapshotLastModified) {
                        snapshotLastModified = moment(record.last_modified).isAfter(snapshotLastModified)
                          ? record.last_modified
                          : snapshotLastModified;
                      } else {
                        snapshotLastModified = record.last_modified;
                      }
                    });
                  } else {
                    // account for snapshot being an empty array;
                    snapshotLastModified = snapshot.last_modified || e.row.original.last_modified;
                  }
                  const lastModified = snapshotLastModified && moment(snapshotLastModified).isAfter(e.row.original.last_modified)
                    ? snapshotLastModified
                    : e.row.original.last_modified;
                  return <>{getFormattedDateTime(lastModified, 'LLL', true)}</>;
                }
                return <>{getFormattedDateTime(e.row.original.last_modified, 'LLL', true)}</>;
              }
              return null;
            }
          };
        } else {
            return {
                Header: item.text,
                accessor: item.key,
                disableSortBy: true
            };
        }
    })

    // eslint-disable-next-line
    columns = React.useMemo(() => columns, [])

    data = filteredData;
    let pageSizeOptions = [10, 20, 30, 50, 100]

    // react-table hooks and props
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        // rows,
        prepareRow,
        state: { globalFilter },
        // visibleColumns,
        rows,
        preGlobalFilteredRows,
        setGlobalFilter,
        pageOptions,
        page,
        pageCount,
        state: { pageIndex, pageSize },
        gotoPage,
        previousPage,
        nextPage,
        setPageSize,
        canPreviousPage,
        canNextPage,
    } = useTable(
        {
          columns,
          data,             // Note that we're using the filteredData here, NOT the passed in props.data
          // defaultColumn,
          // filterTypes,
          initialState: {
            hiddenColumns: ['variant_fullname', 'gene_fullname'],
            pageIndex: 0,
            sortBy: [
              { id: 'last_modified', desc: true }
            ],
          },
        },
        useFilters,
        useGlobalFilter,
        useSortBy,
        usePagination
    )

    /**
     * Generates data format for CSV export based on filteredData and triggers a download of the CSV
     * This function is specific to exporting a CSV for interpretations/gdms
     */
    const handleDownload = () => {
      const formattedRecords = [];
      if (filteredData.length) {
        filteredData.forEach(row => {
          let snapshotStatuses = [];
          if (Array.isArray(row.snapshot)) {
            row.snapshot.forEach(item => {
              snapshotStatuses.push(item.classificationStatus);
              if (item.publishClassification === true) {
                snapshotStatuses.push('Published');
              }
            });
          }
          if (!props.isAllTable && row.variant) {
            formattedRecords.push({
              'Variant': row.variant ? row.variant : '',
              'Disease/Mode of Inheritance': row.disease_modeInheritance ? row.disease_modeInheritance : '--/--',
              'Status': snapshotStatuses && snapshotStatuses.length ? _.uniq(snapshotStatuses).join(' ') : row.snapshot.status,
              'Classification': row.pathogenicity ? row.pathogenicity : '--',
              'Criteria': row.criteria ? `"${row.criteria}"` : '',
              'Date Created': row.date_created ? moment(row.date_created).format('YYYY-MM-DD h:mm:ssa') : '',
              'Last Modified': row.last_modified ? moment(row.last_modified).format('YYYY-MM-DD h:mm:ssa') : ''
            });
          // Temporary differentiation between All and My Interp tables until we include statuses again in All table
          } else if (props.isAllTable && row.variant) {
            formattedRecords.push({
              'Variant': row.variant ? row.variant : '',
              'Disease/Mode of Inheritance': row.disease_modeInheritance ? row.disease_modeInheritance : '--/--',
              // 'Status': row.snapshot[0] ? row.snapshot[0].status : row.snapshot.status,
              'Date Created': row.date_created ? moment(row.date_created).format('YYYY-MM-DD h:mm:ssa') : ''
            });
          } else if (!props.isAllTable && row.gene) {
            formattedRecords.push({
              'Gene': row.gene ? row.gene : '',
              'Disease/Mode of Inheritance': row.disease_modeInheritance ? row.disease_modeInheritance : '',
              'Status': snapshotStatuses && snapshotStatuses.length ? _.uniq(snapshotStatuses).join(' ') : row.snapshot.status,
              'Classification': row.classification ? row.classification : '--',
              'Date Created': row.date_created ? moment(row.date_created).format('YYYY-MM-DD h:mm:ssa') : '',
              'Last Modified': row.last_modified ? moment(row.last_modified).format('YYYY-MM-DD h:mm:ssa') : ''
            });
          }
        });
        exportCSV(formattedRecords, { filename: 'dashboard-tables-export.csv' });
      }
    }

    // if done loading and data exists, display. Else, display loading spinner or "no data" warning.
    if (!isLoading && columns) {
        return (
        <>
            <TableHeader 
              tableTitle={props.tableTitle} 
              numberOfRecords={rows.length} 
              handleDownload={handleDownload}
            />
            <TableFilters
              preGlobalFilteredRows={preGlobalFilteredRows}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              statusFilterOptions={statusFilterOptions}
              handleStatusChange={handleStatusChange}
              hideStatusFilters={props.isAllTable}
            />
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
        )
    }
    if (isLoading){
        return <LoadingSpinner className="mt-5 mb-5" />
    }
    else {
        return <p className="text-center">No Interpretations yet!</p>
    }

    // linked to the statusFilter react-select component. Sets filters to selected values.
    function handleStatusChange(e) {
        let statuses = []
        for (let i in e) {
            let status = e[i]
            statuses.push(status.value)
        }
        setstatusFilters(statuses)
    }
}


const mapDispatchToProps = dispatch => ({
    updateVariant: variant => dispatch(updateVariant(variant))
})

export default connect(mapDispatchToProps)(Table);
// export default TestTable;
