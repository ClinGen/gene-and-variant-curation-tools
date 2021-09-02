import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'react-bootstrap';
import Table from '../components/InterpretationsTable';
import { get_interpretations } from '../helpers/get_interpretations';
import TableNavBar from '../components/common/TableNavBar';
import { useAmplifyAPIRequestRecycler, AmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';


function InterpretationAll(props) {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  // Columns for data table.
  // updatedData must have matching key name to display that column's data. Hidden data for filtering doesn't have a column name
  const headersValue = [
    { key: 'variant', text: 'Variant', sort: true },
    { key: 'disease_modeInheritance', text: 'Disease/Mode of Inheritance', sort: true },
    // { key: 'status', text: 'Status', sort: true }, // Leaving this commented out as we want to reimplement this in the future
    { key: 'date_created', text: 'Date Created', sort: true },
    // { key: 'last_modified', text: 'Last Modified', sort: true },
    { key: 'variant_fullname', text: 'Full Variant Name', sort: true }, // For testing purposes. This column is hidden in table, but searchable.
    // { key: 'created_by', text: 'Created By', sort: true }
    // Remember to add to initialState.hiddenColumns to add more.
    //{ key: 'modeInheritanceAdjective', text: 'Mode of Inheritance', sort: true }
  ]
  const [tableTitle, setTableTitle] = useState('');
  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [isAllTable] = useState(true);
  const [InheritanceCount, setInheritanceCount] = useState(0);

  // Retrieve the data using get_interpretations.
  useEffect(() => {
    setTableLoading(true);
    async function fetch() {

      let variants = await get_interpretations('variant', true, '', requestRecycler);
      if (variants) {
        setTableTitle('All Variant Interpretations')
        setTableData(variants);
        setInheritanceCount(variants.length);
      }
      setTableLoading(false);
    }
    fetch().catch(AmplifyAPIRequestRecycler.defaultCatch);
  }, [requestRecycler])

  return (
    <>
      <div className="jumbotron jumbotron-fluid">
        <div className="container">
          <h1 className="display-4">Welcome,             
            {props.auth && props.auth.name && props.auth.family_name
              ? ` ${props.auth.name} ${props.auth.family_name}`
              : ` ${props.auth && props.auth.email ? `${props.auth.email}` : ''}`
            }
            {props.auth && props.auth.currentAffiliation 
              ? ` (${props.auth.currentAffiliation.affiliation_fullname})`
              : ` (No Affiliation)`
            }
          </h1>
        </div>
      </div>
      <TableNavBar />
      <div className="container mt-5 pl-3">
        <Row noGutters>
          <Col xs={12} className="pl-3">
            <div className="card" style={{ marginBottom: '10px' }}>
              <div className="card-body p-0">
                <Table
                  headers={headersValue}
                  tableTitle={tableTitle}
                  isAllTable={isAllTable}
                  data={tableData}
                  isLoading={tableLoading}
                  inheritanceCount={InheritanceCount}
                />
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </>
  )
}

// Keeping Auth up to date, only used for welcome email here though.
const mapStateToProps = (state) => ({
  auth: state.auth
});


export default connect(mapStateToProps)(InterpretationAll);
