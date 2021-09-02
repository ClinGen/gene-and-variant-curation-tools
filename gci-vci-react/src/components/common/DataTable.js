import React from "react";
import propTypes from "prop-types";


/**
 * Renders table for displaying a list of data.
 * 
 * @component
 * @example
 * const header = ['nucleotide', 'exon']
 * const data = [{ nucleotide: 'NM00123', exon: '3/3' }, { nucleotide: 'NM00311', exon: '8/9' }]
 * return (
 *    <DataTable headers={headers} data={data}>
 *      {(d) => d.nucleotide}
 *      {(d) => d.exon}
 *    </DataTable>
 * )
 */
export const DataTable = ({ headers = [], data = [], children = [], rowClassName = '' }) => {
  return (
    <>
      <table className="table">
        <thead>
          <tr>
            {headers && headers.map((column, i) => <th key={i}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(data) && Array.isArray(children) &&
            data.map((d, rowIndex) => {
              return (
                <tr key={rowIndex} className={rowClassName}>
                  {children.map((renderCell, cellIndex) => {
                    return (
                      <td key={cellIndex}>{renderCell(d)}</td>
                    );
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </>
  );
};

DataTable.propTypes = {
  data: propTypes.array,
  headers: propTypes.array,
  children: propTypes.arrayOf(propTypes.func),
  rowClassName: propTypes.string,
}
