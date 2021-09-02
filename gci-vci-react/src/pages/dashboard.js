import React, { useState, useEffect } from 'react';
import Table from '../components/InterpretationsTable';
import { connect } from 'react-redux';
import { Row, Col } from 'react-bootstrap';
import { get_interpretations } from '../helpers/get_interpretations';
import TableNavBar from '../components/common/TableNavBar'
import { useAmplifyAPIRequestRecycler, AmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';

function Dashboard(props) {
  const requestRecycler = useAmplifyAPIRequestRecycler();

  // column names of variant and gene tables.
  const variantHeadersValue = [
      { key: 'variant', text: 'Variant', sort: true },
      { key: 'disease_modeInheritance', text: 'Disease/Mode of Inheritance', sort: true },
      { key: 'status', text: 'Status', sort: true },
      { key: 'pathogenicity', text: 'Classification', sort: true },
      { key: 'criteria', text: 'Met Criteria', sort: true },
      { key: 'date_created', text: 'Date Created', sort: true },
      { key: 'last_modified', text: 'Last Modified', sort: true },
      // { key: 'created_by', text: 'Created By', sort: true }
      //{ key: 'variant_fullname', text: 'Full Variant Name', sort: true } // For testing purposes. This column is hidden in table, but searchable.
      // Remember to add to initialState.hiddenColumns to add more.
      //{ key: 'modeInheritanceAdjective', text: 'Mode of Inheritance', sort: true }
  ]
  const geneHeadersValue = [
      { key: 'gene', text: 'Gene', sort: true },
      { key: 'disease_modeInheritance', text: 'Disease/Mode of Inheritance', sort: true },
      { key: 'status', text: 'Status', sort: true },
      { key: 'classification', text: 'Classification', sort: true },
      { key: 'date_created', text: 'Date Created', sort: true },
      { key: 'last_modified', text: 'Last Modified', sort: true }
  ]

  const [variantTableTitle, setVariantTableTitle] = useState('');
  const [geneTableTitle, setGeneTableTitle] = useState('');
  const [variantTableData, setVariantTableData] = useState([]);
  const [variantTableLoading, setVariantTableLoading] = useState(false);
  const [geneTableData, setGeneTableData] = useState([]);
  const [geneTableLoading, setGeneTableLoading] = useState(false);

// Gets the data for both tables.
  useEffect(() => {
    setVariantTableLoading(true);
    setGeneTableLoading(true);
    async function fetch() {
      let [variants, genes] = await Promise.all([
        get_interpretations('variant', false, props.auth, requestRecycler),
        get_interpretations('gene', false, props.auth, requestRecycler)
      ]);
      if (auth.currentAffiliation) {
        setVariantTableTitle('My Affiliation\'s Variant Interpretations');
        setGeneTableTitle('My Affiliation\'s Gene-Disease Records');
      } else {
        setVariantTableTitle('My Variant Interpretations');
        setGeneTableTitle('My Gene-Disease Records');
      }

      if (variants) {
        setVariantTableData(variants);
      }
      if (genes) {
        setGeneTableData(genes)
      }
      setVariantTableLoading(false);
      setGeneTableLoading(false)
    }
    fetch().catch(AmplifyAPIRequestRecycler.defaultCatch);
  }, [requestRecycler, props.auth])

  const { auth } = props;

  return (
    <>
      <div className="jumbotron jumbotron-fluid">
        <div className="container">
          <h1 className="display-4">
            Welcome,
            {auth && auth.name && auth.family_name
              ? ` ${auth.name} ${auth.family_name}`
              : ` ${auth && auth.email ? `${auth.email}` : ''}`
            }
            {auth && auth.currentAffiliation 
              ? ` (${auth.currentAffiliation.affiliation_fullname})`
              : ` (No Affiliation)`
            }
          </h1>
        </div>
      </div>
      <TableNavBar />
      <div className="container mt-5">
        <Row noGutters>
          <Col xs={12} className="pl-3">
            <div className="card">
              <div className="card-body p-0">
                <Table tableTitle={variantTableTitle} headers={variantHeadersValue} data={variantTableData} isLoading={variantTableLoading} />
              </div>
            </div>
          </Col>
        </Row>
      </div>
      <div className="container my-5">
        <Row noGutters>
          <Col xs={12} className="pl-3">
            <div className="card">
              <div className="card-body p-0">
                <Table tableTitle={geneTableTitle} headers={geneHeadersValue} data={geneTableData} isLoading={geneTableLoading} />
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </>
  )
}
const mapStateToProps = (state) => ({
  auth: state.auth,
})

export default connect(mapStateToProps)(Dashboard);
