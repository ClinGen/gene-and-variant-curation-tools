import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'react-bootstrap';
import lodashGet from "lodash/get";
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../../utils';

import ClinVarBatchVariantsTable from './ClinVarBatchVariantsTable';
import { useAmplifyAPIRequestRecycler } from '../../../utilities/fetchUtilities';


const ClinVarBatchView = (props) => {
    let { auth, batchData, batchPK, updateBatch } = props

    const requestRecycler = useAmplifyAPIRequestRecycler();
    const [currentBatch, setCurrentBatch] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Retrieve the batch data by PK
    useEffect(() => {
        async function fetch() {
            // Get batch data by PK
            try {
                const url = `/clinvar-submission-batch/fetch/${batchPK}`
                let result = await requestRecycler.capture(API.get(API_NAME, url));

                if (result) {
                    setCurrentBatch(result);
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
        // If there's no active current batch, empty batch
        if (batchPK === "none") {
            setCurrentBatch(
                {
                    PK: "none",
                    batch_name: "Current Batch",
                    batch_status: "open",
                    affiliationn: auth.currentAffiliation.affiliation_id,
                    batch_members: []
                }
            );
            setIsLoading(false);
        } else {
            if (batchPK) {
                fetch();
            }
        }
    }, [batchData, batchPK, requestRecycler])

    return (
        <>
        {currentBatch &&
            <>
            <div className="container">
                <h3>ClinVar Submission Current Batch "{lodashGet(currentBatch, "batch_name")}"</h3>
            </div>
            <div className="container mt-5 pl-3">
                <Row noGutters>
                    <Col xs={12} className="pl-3">
                        <div className="card" style={{ marginBottom: '10px' }}>
                            <div className="card-body p-0">
                                <ClinVarBatchVariantsTable
                                    batch={currentBatch}
                                    isCurrent={lodashGet(currentBatch, "batch_status") === "open"}
                                    isLoading={isLoading}
                                    updateBatch={updateBatch}
                                />
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
            </>
        }
        </>
    )
}

// Keeping Auth up to date
const mapStateToProps = (state) => ({
    auth: state.auth
});


export default connect(mapStateToProps)(ClinVarBatchView);
