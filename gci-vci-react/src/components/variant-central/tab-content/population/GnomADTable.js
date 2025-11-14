import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useTable, useExpanded, useSortBy } from 'react-table';
import { TableContent } from '../../../common/TableComponents';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons';

function GnomADTable(props) {
  const [gnomADv4Data, setgnomADv4Data] = useState(props.gnomADv4Data);
  const [gnomADv4Totals, setgnomADv4Totals] = useState(props.gnomADv4Totals);

  useEffect(() => {
    setgnomADv4Data(props.gnomADv4Data);
    setgnomADv4Totals(props.gnomADv4Totals);
  }, [props.gnomADv4Data, props.gnomADv4Totals]);

  const gnomADv4TableData = React.useMemo(() => gnomADv4Data ? gnomADv4Data : [], [gnomADv4Data]);

  const gnomADv4Columns = React.useMemo(() => [
    {
      Header: 'Genetic Ancestry Group',
      accessor: 'Name',
      // Support expansion with indentation
      Cell: cell => { return cell.row
        ? (cell.row.canExpand
          ? <span onClick={() => cell.row.toggleRowExpanded()} style={{cursor: "pointer"}}>{cell.row.isExpanded
            ? <FontAwesomeIcon className="mr-1" icon={faCaretDown} />
            : <FontAwesomeIcon className="mr-1" icon={faCaretRight} />
            }{cell.value}</span>
          : <span className={cell.row.depth && cell.row.depth > 0 ? "ml-" + (cell.row.depth + 2) : "ml-2"}>{cell.value}</span>)
        : null }
    },
    {
      Header: 'Allele Count',
      accessor: 'AC'
    },
    {
      Header: 'Allele Number',
      accessor: 'AN'
    },
    {
      Header: 'Number of Homozygotes',
      accessor: 'HOM'
    },
    {
      Header: 'Allele Frequency',
      accessor: 'AF'
    }], []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow
  } = useTable(
    {
      columns: gnomADv4Columns,
      data: gnomADv4TableData,
      initialState: {
        hiddenColumns: ['GMFAF', 'ID', 'JGMFAF'],
        sortBy: [
          { id: 'AF', desc: true }
        ]
      }
    },
    useSortBy,
    useExpanded
  );

  const gnomADv4Footer = Array.isArray(gnomADv4Totals) ? (
    <tfoot>
      {gnomADv4Totals.map((totalRow, i) => (
        <tr key={totalRow.ID} className={i === (gnomADv4Totals.length - 1) ? "count final" : "count"}>
          <td>{totalRow.Name}</td>
          <td>{totalRow.AC}</td>
          <td>{totalRow.AN}</td>
          <td>{totalRow.HOM}</td>
          <td>{totalRow.AF}</td>
        </tr>
      ))}
    </tfoot>
  ) : null;

  return (
    <TableContent
      getTableProps={getTableProps}
      headerGroups={headerGroups}
      getTableBodyProps={getTableBodyProps}
      rows={rows}
      prepareRow={prepareRow}
      isStriped={false}
      footer={gnomADv4Footer}
    />
  );
}

export default GnomADTable;
