import React from 'react';
import Select from 'react-select';
import { useAsyncDebounce } from 'react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';

export const GlobalFilter = ({ preGlobalFilteredRows, globalFilter, setGlobalFilter }) => {
  const count = preGlobalFilteredRows.length;
  const [value, setValue] = React.useState(globalFilter);
  const onChange = useAsyncDebounce(value => {
    setGlobalFilter(value || undefined);
  }, 200)

  return (
    <span style={{ flexGrow: 2 }}>
      <input
        className="input-group form-control"
        type="text"
        placeholder={`Search ${count} records...`}
        aria-label="Search"
        value={value || ""}
        onChange={e => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
      />
    </span>
  );
}

export const TableHeader = ({
  tableTitle,
  isLoading,
  numberOfRecords,
  handleDownload
}) => (
  <h5 className="card-header">
    <div className="row no-gutter align-items-center">
      <div className="col-sm-6"><h3 className="mb-0"> {tableTitle} {!isLoading && (<strong style={{fontWeight: 500}}>({numberOfRecords})</strong>)}</h3></div>
      <div className="col-sm-6 text-right"><button onClick={handleDownload} className="btn btn-primary">Download (.CSV)</button></div>
    </div>
  </h5>
);

export const TableFilters = ({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter,
  statusFilterOptions,
  handleStatusChange,
  hideStatusFilters,
}) => (
  <div
    className="card-body p-0"
    style={{
      margin: '10px',
      display: 'flex',
      alignItems: 'center'
    }}
  >
    <GlobalFilter
      preGlobalFilteredRows={preGlobalFilteredRows}
      globalFilter={globalFilter}
      setGlobalFilter={setGlobalFilter}
    />
    {!hideStatusFilters &&
      <div
        className="input-group"
        style={{
          flexGrow: 1,
          display:'flex',
          alignItems: 'center',
          width: 'initial',
          marginLeft:'10px'
        }}
      >
        <div className="input-group-prepend" style={{ margin: '5px 0 5px 0' }}>
          <label className="input-group-text" htmlFor="filterByStatus">Filter By Status</label>
        </div>
        <div style={{ flexGrow: 1 }}>
          <Select
            isMulti
            name="colors"
            options={statusFilterOptions}
            onChange={(e) => handleStatusChange(e)}
          />
        </div>
      </div>
    }
  </div>
);

export const TableContent = ({
  getTableProps,
  headerGroups,
  getTableBodyProps,
  page,
  rows,
  rowSpanHeaders = [],
  prepareRow,
  isStriped = true,
  isBordered = false,
  isCenterAligned = false,
}) => (
  <table {...getTableProps()} className={`table ${isBordered ? 'bordered' : ''} ${isStriped ? 'table-striped' : ''}`}>
    <thead>
      {headerGroups.map((headerGroup, i) => (
        <tr key={i} {...headerGroup.getHeaderGroupProps()}>
          {headerGroup.headers.map(column => (
            <th key={column.id} {...column.getHeaderProps(column.getSortByToggleProps())} style={column.style}>
              {column.render('Header')}
              <span>
                {column.isSorted
                  ? column.isSortedDesc
                    ? <FontAwesomeIcon className="ml-1" icon={faSortDown} />
                    : <FontAwesomeIcon className="ml-1" icon={faSortUp} />
                  : column.canSort
                    ? <FontAwesomeIcon className="ml-1" icon={faSort} />
                    : ''
                }
              </span>
            </th>
          ))}
        </tr>
      ))}
    </thead>
    <tbody {...getTableBodyProps()}>
      {page
        ? (
          page.map(row => {
            prepareRow(row);
            return (
              <tr key={row.id} {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return (
                    <td style={cell.column.style} key={cell.value} {...cell.getCellProps()}>
                      {cell.render('Cell')}
                    </td>
                  )
                })}
              </tr>
            );
          })
        ) : null }
      {rows
        ? (
          rows.map((row, i) => {
            prepareRow(row);

            // Go through each row and set rowspan for columns that has enabled rowspan
            // rowSpanHeader contains the necessary data
            // id = column id
            // topCellValue = value that the first row has in this column
            // topCellIndex = the first row index that has topCellValue
            // limitBy = if the rowspan has to be limited by a column that has same value
            // e.g. in GCI Preview Evidence Scored table, rowspan for columns is limited by each proband label
            // limitByValue = current limitBy value
            for (let j = 0; j < row.cells.length; j++) {
              let cell = row.cells[j];
              let rowSpanHeader = rowSpanHeaders.find(
                x => x.id === cell.column.id
              );

              if (rowSpanHeader !== undefined) {
                if (rowSpanHeader.topCellValue === null || rowSpanHeader.topCellValue !== cell.value ||
                  (rowSpanHeader.limitByValue !== row.values[rowSpanHeader.limitBy])) {
                  cell.isRowSpanned = false;
                  rowSpanHeader.topCellValue = cell.value;
                  rowSpanHeader.topCellIndex = i;
                  cell.rowSpan = 1;
                  if (rowSpanHeader.limitBy) {
                    rowSpanHeader.limitByValue = row.values[rowSpanHeader.limitBy];
                  }
                } else {
                  rows[rowSpanHeader.topCellIndex].cells[j].rowSpan++;
                  cell.isRowSpanned = true;
                }
              }
            }
            return null;
          })
         ) : null }
       {rows
         ? (
          rows.map((row) => {
            return (
              <tr key={row.id} {...row.getRowProps()}>
                {row.cells.map(cell => {
                  if (cell.isRowSpanned) {
                    return null;
                  } else {
                    return (
                      <td
                        rowSpan={cell.rowSpan}
                        key={cell.value}
                        style={cell.column.style}
                        className={`${isCenterAligned
                          ? 'vertical-align-center'
                          : ''}`
                        }
                        {...cell.getCellProps()}
                      >
                        {cell.render('Cell')}
                      </td>
                    );
                  }
                })}
              </tr>
            )
          })
        ) : null }
    </tbody>
  </table>
);

export const Pagination = ({
  pageIndex,
  pageOptions,
  gotoPage,
  canPreviousPage,
  previousPage,
  nextPage,
  canNextPage,
  pageCount,
  pageSize,
  setPageSize,
  pageSizeOptions
}) => (
  <div
    className="row pagination-controls"
    style={{
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: "0 3px 5px 0px"
    }}
  >
    <div className="col-sm-5">
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => gotoPage(0)}
        disabled={!canPreviousPage}
        style={{
          padding:'0rem 0.7rem',
          fontSize:'0.75rem'
        }}
      >
          {'<<'}
      </button>
      <button
        className="btn btn-secondary btn-sm ml-1 mr-2"
        onClick={() => previousPage()}
        disabled={!canPreviousPage}
        style={{
          padding:'0rem 0.9rem',
          fontSize:'0.75rem'
        }}
      >
        {'<'}
      </button>
      Page {' '}
      <em>
        {pageIndex + 1} of {pageOptions.length}
      </em>{' '}
      <button
        className="btn btn-secondary btn-sm ml-2"
        onClick={() => nextPage()}
        disabled={!canNextPage}
        style={{
          padding:'0rem 0.9rem',
          fontSize:'0.75rem'
        }}
      >
        {'>'}
      </button>
      <button
        className="btn btn-secondary btn-sm ml-1"
        onClick={() => gotoPage(pageCount - 1)}
        disabled={!canNextPage}
        style={{
          padding:'0rem 0.7rem',
          fontSize:'0.75rem'
        }}
      >
        {'>>'}
      </button>
    </div>
    <div className="col-sm-3" style={{ display:"inline-flex" }}>
      <label
        className="form-inline"
        style={{ marginRight: '5px', marginBottom: 0 }}
      >
        Go to page:
      </label>
      <input
        className="form-control"
        style={{ width:'25%', textAlign: 'center', padding: 0 }}
        type="number"
        defaultValue={pageIndex + 1 || 1}
        onChange={e => {
          const page = e.target.value ? Number(e.target.value) - 1 : 0
          gotoPage(page)
        }}
      />
      </div>
      <div className="col-sm-3">
      <select
        className="form-control"
        value={pageSize}
        onChange={e => {
          setPageSize(Number(e.target.value))
        }}
      >
        {pageSizeOptions.map(pageSize => (
          <option key={pageSize} value={pageSize}>
            Show {pageSize}
          </option>
        ))}
      </select>
    </div>
  </div>
);
