import React, { useState, useEffect } from 'react';
import moment from 'moment';
import * as momentTz from 'moment-timezone';
import 'react-table';
import { Link } from "react-router-dom";
import { useTable, useFilters, useGlobalFilter, usePagination, useSortBy } from 'react-table';
import lodashGet from "lodash/get";
import LoadingSpinner from '../../common/LoadingSpinner';
import { TableFilters, TableContent, Pagination } from '../../common/TableComponents';
import { convertDiseasePKToMondoId, displayObsoleteDiseaseIcon } from '../../../utilities/diseaseUtilities';
import { getFormattedDateTime } from "../../../utilities/dateTimeUtilities";
import { ClinVarBatchModal } from './ClinVarBatchModal';
import ClinVarBatchSubmissionData from './ClinVarBatchSubmissionData';
import { renderStatus } from './helpers';



const ClinVarBatchVariantsTable = (props) => {
    let { batch, isCurrent, isLoading, updateBatch } = props

    const [batchVariants, setBatchVariants] = useState([]);

    useEffect(() => {
        // Since batch is set before isLoading, this will be set on time
        setBatchVariants(lodashGet(batch, "batch_members") ? lodashGet(batch, "batch_members") : []);
    }, [batch]);

    const headers = [
        { key: 'variant', text: 'Variant', sort: true },
        { key: 'disease_modeInheritance', text: 'Disease/Mode of Inheritance', sort: true },
        { key: 'status', text: 'Status', sort: true },
        { key: 'classification', text: 'Classification', sort: true },
        { key: 'met_criteria', text: 'Met Criteria', sort: true },
        { key: 'add_date', text: 'Added to Batch', sort: true },
        // { key: 'submit_status', text: 'Submit Status', sort: true },
    ];

    // assign table columns based on headers
    let columns = headers.map((item) => {
        if (item.key === 'variant') {
            return {
                Header: item.text,
                accessor: item.key, // accessor is the "key" in the data
                disableSortBy: true,
                Cell: e => <Link to={`/variant-central/${e.value}/interpretation/${e.row.original.interpretation}`}>{e.row.original.variant_title}</Link>
            };
        }
        else if (item.key === 'status') {
            return {
                Header: item.text,
                accessor: item.key,
                disableSortBy: true,
                Cell: e => {
                    if (e.value) {
                        return <>{renderStatus(e.value)}</>;
                    } else {
                        return "--";
                    }
                }
            };
        }
        else if ( item.key === 'disease_modeInheritance') {
            return {
                Header: item.text,
                accessor: item.key,
                disableSortBy: true,
                Cell: e => {
                    let diseaseText = "--";
                    if (e.row.original.disease !== "") {
                        const mondoId = convertDiseasePKToMondoId(e.row.original.disease);
                        diseaseText = `${e.row.original.disease_term} (${mondoId})`
                    }
                    return (
                        <>
                        {displayObsoleteDiseaseIcon(e.row.original.disease_term, "interpretation")}
                        {diseaseText}
                        {e.row.original.moi === "" ? " / --" : ` / ${e.row.original.moi}`}
                        </>
                    );
                }
            };
        } else if (item.key === 'add_date') {
            return {
                Header: item.text,
                accessor: item.key,
                disableSortBy: true,
                Cell: e => {
                    if (e.value) {
                        return <>{getFormattedDateTime(e.value, 'LLL', true)}</>;
                    } else {
                        return "--";
                    }
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
            data: batchVariants,
            initialState: {
                hiddenColumns: ['variant_fullname'],
                pageIndex: 0,
                sortBy: [
                    { id: 'add_date', desc: true }
                ],
            },
        },
        useFilters,
        useGlobalFilter,
        useSortBy,
        usePagination
    )

    // if done loading and data exists, display. Else, display loading spinner or "no data" warning.
    if (!isLoading && columns) {
        const batchVariantCount = batchVariants && batchVariants.length;
        const isLargeBatch = batchVariantCount >= 250 ? true : false;
        const batchPK = batch && batchVariantCount > 0 && !isLargeBatch ? lodashGet(batch, "PK") : null;
        return (
            <>
            <h5 className="card-header">
                <div className="row no-gutter align-items-center">
                    <div className="col-sm-8">
                        <span className="mb-0">{lodashGet(batch, "batch_name")} ({batchVariantCount} variants)</span>
                        <span className="mb-0 ml-3">Status: {
                            lodashGet(batch, "batch_status") === "open" ? "In progress" : "Submitted to ClinVar"
                        }
                        </span>
                        <span className="mb-0 ml-3">Date Submitted: {lodashGet(batch, "submit_date") ? getFormattedDateTime(lodashGet(batch, "submit_date"), 'LLL', true) : "N/A"}</span>
                    </div>
                    <div className="col-sm-1 text-right">
                        <ClinVarBatchModal
                            batch={batch}
                            isCurrent={isCurrent}
                            updateBatch={updateBatch}
                        />
                    </div>
                    <ClinVarBatchSubmissionData batchPK={batchPK} isLargeBatch={isLargeBatch} />
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

    if (isLoading) {
        return <LoadingSpinner className="mt-5 mb-5" />
    } else {
        return <p className="text-center">No Data yet!</p>
    }
}

export default ClinVarBatchVariantsTable;
