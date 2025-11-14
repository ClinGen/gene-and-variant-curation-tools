import React, { useState, useEffect } from 'react';
import Table from '../components/InterpretationsTable';
import { connect } from 'react-redux';
import { Row, Col } from 'react-bootstrap';
import { get_interpretations } from '../helpers/get_interpretations';
import TableNavBar from '../components/common/TableNavBar'
import { useAmplifyAPIRequestRecycler, AmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';

function Dashboard(props) {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const { auth } = props;

  // column names of variant and gene tables.
  const variantHeadersValue = [
      { key: 'variant', text: 'Variant', sort: true },
      { key: 'variantId', text: 'Variant ID(s)', sort: true },
      { key: 'disease_modeInheritance', text: 'Disease/Mode of Inheritance', sort: true },
      { key: 'status', text: 'Status', sort: true },
      { key: 'pathogenicity', text: 'Classification', sort: true },
      { key: 'criteria', text: 'Met Criteria', sort: true },
      { key: 'date_created', text: 'Date Created', sort: true },
      { key: 'last_modified', text: 'Last Modified', sort: true },
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

    async function fetchData() {
      try {
        const hasAffiliation = auth?.currentAffiliation;
        const isGCEP = hasAffiliation && auth.currentAffiliation.subgroups?.hasOwnProperty("gcep");
        
        /* Checking if user has an affiliation and if that affiliation is a GCEP.
        If GCEP, both tables will load. If unaffiliated, external working group, 
        or VCEP, only VCEP table will load.
        */
        if (hasAffiliation) {
          setVariantTableTitle("My Affiliation's Variant Interpretations");
          if (isGCEP) {
            setGeneTableTitle("My Affiliation's Gene-Disease Records");
          }
        } else {
          setVariantTableTitle('My Variant Interpretations');
        }

        const variantPromise = get_interpretations('variant', false, auth, requestRecycler);
        const genePromise = isGCEP
          ? get_interpretations('gene', false, auth, requestRecycler)
          : Promise.resolve([]); // Skip gene fetch if not GCEP

        const [variants, genes] = await Promise.all([variantPromise, genePromise]);

        setVariantTableData(variants || []);
        setGeneTableData(genes || []);
      } catch (error) {
        AmplifyAPIRequestRecycler.defaultCatch(error);
      } finally {
        setVariantTableLoading(false);
        setGeneTableLoading(false);
      }
    }
    fetchData();
  }, [requestRecycler, props.auth])
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
      {/* Gene Table (Only if GCEP) */}
      {auth?.currentAffiliation?.subgroups?.hasOwnProperty("gcep") && (
        <div className="container my-5">
          <Row noGutters>
            <Col xs={12} className="pl-3">
              <div className="card">
                <div className="card-body p-0">
                  <Table
                    tableTitle={geneTableTitle}
                    headers={geneHeadersValue}
                    data={geneTableData}
                    isLoading={geneTableLoading}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )}
      {/* Variant Table */}
      <div className="container mt-5">
        <Row noGutters>
          <Col xs={12} className="pl-3">
            <div className="card">
              <div className="card-body p-0">
                <Table
                  tableTitle={variantTableTitle}
                  headers={variantHeadersValue}
                  data={variantTableData}
                  isLoading={variantTableLoading}
                />
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
