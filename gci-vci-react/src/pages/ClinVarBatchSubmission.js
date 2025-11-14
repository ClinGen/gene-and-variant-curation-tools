import React, { useState, useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'react-bootstrap';
import { get as lodashGet, cloneDeep } from 'lodash';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';

import { getOpenBatch, getBatchesByStatus } from '../components/variant-central/clinvar-submission/helpers';
import ClinVarBatchesTable from '../components/variant-central/clinvar-submission/ClinVarBatchesTable';
import ClinVarBatchView from '../components/variant-central/clinvar-submission/ClinVarBatchView';

import { useAmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';


const ClinVarBatchSubmission = (props) => {
    let { auth } = props

    const requestRecycler = useAmplifyAPIRequestRecycler();
    const [isLoading, setIsLoading] = useState(false);
    const [closedBatches, setClosedBatches] = useState([]);
    const [openBatch, setOpenBatch] = useState(null);
    const [viewBatch, setViewBatch] = useState(null);

    // Default empty batch if no open batch is found
    const defaultBatch = {
        PK: "none",
        batch_name: "Current Batch",
        batch_status: "open",
        affiliationn: auth.currentAffiliation.affiliation_id,
        batch_members: []
    };

    useEffect(() => {
        // Retrieve the batches data.
        async function fetch() {
            // Get affiliation's ClinVar submission batches by auth.currentAffiliation
            try {
                const url = `/clinvar-submission-batch/find/${lodashGet(auth, "currentAffiliation.affiliation_id")}`

                let results = await requestRecycler.capture(API.get(API_NAME, url));
                if (results) {
                    // Find open batch and closed batches from returned result
                    const foundBatch = getOpenBatch(results);
                    if (foundBatch) {
                        setOpenBatch(foundBatch);
                    } else {
                        setOpenBatch(defaultBatch);
                    }
                    const foundBatches = getBatchesByStatus(results, "closed");
                    setClosedBatches(foundBatches) ;
                    setIsLoading(false);
                }
            } catch (error) {
                if (API.isCancel(error)) {
                    setIsLoading(false);
                    return;
                }
                console.log(JSON.parse(JSON.stringify(error)));
                setIsLoading(false);
            }
        }

        setIsLoading(true);
        if (!lodashGet(auth, "currentAffiliation.affiliation_id")) {
            setIsLoading(false);
        } else {
            fetch();
        }
    }, [])

    /**
     * Method to update the batches data with new batch object
     * @param {object} batch - new batch object to be updated in state
     * Use useCallback() to memoize the updateBatch function and have it only recreate
     * when batches changes
     */
    const updateBatch = useCallback((batch) => {
        setIsLoading(true);
        const newBatch = cloneDeep(batch);

        // If open batch is updated but still open, just update it
        if (batch.batch_status === "open") {
            setOpenBatch(newBatch);
        } else {
            let newBatches = cloneDeep(closedBatches);
            // If open batch has just been closed, set open batch to default empty batch
            if (lodashGet(batch, "PK") && lodashGet(openBatch, "PK") && lodashGet(batch, "PK") === lodashGet(openBatch, "PK")) {
                setOpenBatch(defaultBatch);
            } else {
                // Just updated a closed batch, remove to be updated batch from closed batch list
                newBatches = closedBatches.filter(b => {
                    return b.PK !== lodashGet(batch, "PK");
                });
            }
            // Add updated batch to batch list and reset
            newBatches.push(newBatch);
            setClosedBatches(newBatches);
        }
        setIsLoading(false);
    }, [openBatch, closedBatches]);

    /**
     * Method to change the batch to view
     * @param {string} batchPK - selected batch from closed batch list to view
     */
    const selectBatch = (batchPK) => {
        setViewBatch(batchPK);
    }

    return (
        <>
        {auth && auth.currentAffiliation && auth.currentAffiliation.affiliation_id ?
            <>
            <div className="jumbotron jumbotron-fluid">
                <div className="container">
                    <h1 className="display-4">ClinVar Submission Batches for 
                        {lodashGet(auth, "currentAffiliation.affiliation_fullname") 
                          ? ` (${lodashGet(auth, "currentAffiliation.affiliation_fullname")})`
                          : ` (No Affiliation)`} VCEP
                    </h1>
                </div>
            </div>
            <div className="container mt-5 pl-3">
                <Row noGutters>
                    <Col xs={12} className="pl-3">
                        <div className="card" style={{ marginBottom: '10px' }}>
                            <div className="card-body p-0">
                                <ClinVarBatchView
                                    batchData={openBatch}
                                    batchPK={lodashGet(openBatch, "PK")}
                                    updateBatch={updateBatch}
                                />
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
            <div className="container mt-5 pl-3">
                <Row noGutters>
                    <Col xs={12} className="pl-3">
                        <div className="card" style={{ marginBottom: '10px' }}>
                            <div className="card-body p-0">
                                <ClinVarBatchesTable
                                    batches={closedBatches}
                                    isLoading={isLoading}
                                    selectBatch={selectBatch}
                                    updateBatch={updateBatch}
                                />
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
            <div className="container mt-5 pl-3">
                <Row noGutters>
                    <Col xs={12} className="pl-3">
                        <div className="card" style={{ marginBottom: '10px' }}>
                            <div className="card-body p-0">
                                <ClinVarBatchView
                                    batchData={{}}
                                    batchPK={viewBatch}
                                    updateBatch={updateBatch}
                                />
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
            </>
        : 
            <div className="container mt-5 pl-3">
                <Row><Col xs={12} className="submit-err pl-3">
                    <span>Have no ClinVar Submission Batches if not associated with an affiliation.</span>
                </Col></Row>
            </div>
        }
        </>
    )
}

// Keeping Auth up to date
const mapStateToProps = (state) => ({
  auth: state.auth
});

export default connect(mapStateToProps)(ClinVarBatchSubmission);
