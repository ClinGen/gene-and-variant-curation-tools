import React from 'react';
import 'react-table';
import { useTable, useFilters, useGlobalFilter, usePagination, useSortBy } from 'react-table';
import LoadingSpinner from '../../common/LoadingSpinner';
import { TableFilters, TableContent, Pagination } from '../../common/TableComponents';
import { getFormattedDateTime } from '../../../utilities/dateTimeUtilities';
import { ClinVarBatchModal } from './ClinVarBatchModal';
import ClinVarBatchSubmissionData from './ClinVarBatchSubmissionData';


const ClinVarBatchesTable = (props) => {
    let { batches, isLoading, selectBatch, updateBatch } = props

    const headers = [
        { key: 'name', text: 'Batch name', sort: true },
        { key: 'status', text: 'Status', sort: false },
        { key: 'date_submitted', text: 'Date Submitted', sort: true },
        { key: 'edit_link', text: ' ', sort: false },
        { key: 'view_link', text: ' ', sort: false },
    ]

    // assign table columns based on headers
    let columns = headers.map((item) => {
        if (item.key === 'name') {
            return {
                Header: item.text,
                accessor: item.key, // accessor is the "key" in the data
                Cell: e => {
                    if (e.row.original && e.row.original.batch_name && e.row.original.PK) {
                        return ( 
                            <button onClick={e=>handleSelect(e)} name={e.row.original.PK} className="btn btn-link ml-3">{e.row.original.batch_name}</button>
                        );
                    }
                    return null;
                }
            }
        }
        else if (item.key === 'status') {
            return {
                Header: item.text,
                accessor: item.key,
                disableSortBy: true,
                Cell: e => {
                    if (e.row.original && e.row.original.batch_status) {
                        return <>{e.row.original.batch_status === "open" ? "In progress" : "Submitted to ClinVar"}</>;
                    }
                    return null;
                }
            };
        }
        else if (item.key === 'date_submitted') {
            return {
                Header: item.text,
                accessor: item.key,
                Cell: e => {
                    if (e.row.original && e.row.original.submit_date) {
                        return <>{getFormattedDateTime(e.row.original.submit_date, 'LL', true)}</>;
                    }
                    return "";
                }
            };
        }
        else if (item.key === 'edit_link') {
            return {
                Header: item.text,
                accessor: item.key,
                disableSortBy: true,
                Cell: e => {
                    if (e.row.original) {
                        return ( 
                            <ClinVarBatchModal
                                batch={e.row.original}
                                isCurrent={false}
                                updateBatch={updateBatch}
                            />
                        );
                    }
                    return null;
                }
            };
        }
        else if (item.key === 'view_link') {
            return {
                Header: item.text,
                accessor: item.key,
                disableSortBy: true,
                Cell: e => {
                    if (e.row.original) {
                        const batchMemberCount = e.row.original.batch_members && e.row.original.batch_members.length;
                        const isLargeBatch = batchMemberCount >= 250 ? true : false;
                        const batchPK = batchMemberCount > 0 && !isLargeBatch ? e.row.original.PK : null;

                        return (
                            <ClinVarBatchSubmissionData batchPK={batchPK} isLargeBatch={isLargeBatch} />
                        );
                    }
                    return null;
                }
            };
        }
    })

    // eslint-disable-next-line
    // Add updateBatch as a dependency
    columns = React.useMemo(() => columns, [updateBatch])

    let pageSizeOptions = [10, 20, 30, 50, 100]

    // react-table hooks and props
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        prepareRow,
        state: { globalFilter },
        // visibleColumns,
        // rows,
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
            data: batches,
            initialState: {
                pageIndex: 0,
                sortBy: [
                    { id: 'date_submitted', desc: true }
                ],
            },
        },
        useFilters,
        useGlobalFilter,
        useSortBy,
        usePagination
    )

    // Select a closed batch to view
    const handleSelect = (e) => {
      const batchPK = e.target.name;
      selectBatch(batchPK);
    }

    // if done loading and data exists, display. Else, display loading spinner or "no data" warning.
    if (!isLoading && columns) {
        return (
            <>
            <h5 className="card-header">
                <div className="row no-gutter align-items-center">
                    <div className="col-sm-8">
                         Closed Batches ({batches && batches.length} total)
                    </div>
                </div>
            </h5>
            <TableFilters
                preGlobalFilteredRows={preGlobalFilteredRows}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                hideStatusFilters={true}
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
        return <p className="text-center">No Data yet!</p>
    }
}

export default ClinVarBatchesTable;
