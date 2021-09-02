import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'react-bootstrap';
import Table from '../components/InterpretationsTable';
import { get_interpretations } from '../helpers/get_interpretations';
import TableNavBar from '../components/common/TableNavBar';
import { useAmplifyAPIRequestRecycler, AmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';


function GDMAll(props) {
    const requestRecycler = useAmplifyAPIRequestRecycler();

    // Columns for data table.
    // updatedData must have matching key name to display that column's data. Hidden data for filtering doesn't have a column name
    const headersValue = [
        { key: 'gene', text: 'Gene', sort: true },
        { key: 'disease_modeInheritance', text: 'Disease/Mode of Inheritance', sort: true },
        // { key: 'status', text: 'Status', sort: true },
        { key: 'date_created', text: 'Date Created', sort: true },
        // { key: 'last_modified', text: 'Last Modified', sort: true }
    ]

    const [tableTitle, setTableTitle] = useState('');
    const [tableData, setTableData] = useState([]);
    const [tableLoading, setTableLoading] = useState(false);
    const [InheritanceCount, setInheritanceCount] = useState(0);

    // Return Variant preferredTitle Value
    // async function getVariantFromPK(id, requestRecycler) {
    //     const url = '/variants/' + id
    //     const data = await requestRecycler.capture(API.get(API_NAME, url))
    //     if (data.preferredTitle){
    //         return data.preferredTitle;
    //     }
    // }

    // Retrieving data using get_interpretations.
    useEffect(() => {
      setTableLoading(true);
      async function fetch() {
        let genes = await get_interpretations('gene', true, '', requestRecycler);
        if (genes) {
          setTableTitle('All Gene-Disease Records');
          setTableData(genes);
          setInheritanceCount(genes.length);
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
                    <div className="card" style={{marginBottom:'10px'}}>
                        <div className="card-body p-0">
                          <Table
                            headers={headersValue}
                            data={tableData}
                            isAllTable={true}
                            tableTitle={tableTitle}
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

// Only used for welcome email.
const mapStateToProps = (state) => ({
    auth: state.auth
});


export default connect(mapStateToProps)(GDMAll);
