import React, { Component } from 'react';
import { API } from 'aws-amplify';
import { API_NAME } from '../../../utils';

import { Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import LoadingSpinner from '../../common/LoadingSpinner';


class ClinVarBatchSubmissionData extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      isClinVarSubmissionActive: false,
      generatedClinVarSubmissionData: null,
      failureMessage: null,
      elementIDToCopy: null
    };
  }

  /**
   * Method to set state to show/hide modal
   * @param {boolean} value - Data to determine new state value
   */
  setShowModal = (value) => {
    if (value === true) {
      this.setState({ showModal: true });
    } else {
      this.setState({ showModal: false });
    }
  };

  /**
   * Method to fetch batch data
   */
  fetchBatch = (batchPK) => {
    return new Promise((resolve, reject) => {
      if (batchPK) {
        const url = `/clinvar-submission-batch/fetch/${batchPK}`

        API.get(API_NAME, url).then(result => {
          if (result) {
            resolve(result);
          } else {
            console.log('Fetch batch data failure: no result');
            reject(null);
          }
        }).catch(error => {
          console.log('Internal batch retrieval error: %o', error);
          if (error && !error.message) {
            error.message = 'Internal batch retrieval error';
          }
          reject(error);
        });
      } else {
        reject({'message': 'Missing expected parameters'});
      }
    });
  };

  /**
   * Method to handle copying ClinVar submission data
   */
  handleCopy = () => {
    try {
      const dataElement = document.getElementById(this.state.elementIDToCopy);

      // Highlight and copy (to clipboard) ClinVar submission data
      dataElement.contentEditable = 'true';
      window.getSelection().selectAllChildren(dataElement);
      document.execCommand('RemoveFormat', false, null);
      document.execCommand('copy');
    } catch (error) {
      console.log('Copying data to clipboard failed');
    }

    this.setShowModal();
  };

  /**
   * Method to generate ClinVar submission data (for a submission spreadsheet)
   * @param {string} batchPK - The PK of the data's source object
   */
  generateClinVarSubmissionData = (batchPK) => {
    return new Promise((resolve, reject) => {
      if (batchPK) {
        const url = `/clinvar-submission-batch/generate/${batchPK}`;

        API.get(API_NAME, url).then(result => {
          if (result.status.successCount > 0) {
            resolve(result);
          } else {
            console.log('Data generation failure: %s', result.message);
            reject(result);
          }
        }).catch(error => {
          console.log('Internal data retrieval error: %o', error);
          if (error && !error.message) {
            error.message = 'Internal data retrieval error';
          }
          reject(error);
        });
      } else {
        reject({'message': 'Missing expected parameters'});
      }
    });
  };

  /**
   * Method to generate one ClinVar submission data to warm up Lambda
   * @param {object} batch - The batch source object
   */
  warmUpGenerate = (batch) => {
    return new Promise((resolve, reject) => {
      const url = `/clinvar-submission-batch/generate/${batch.PK}`;
      const batchMembers = batch && batch.batch_members ? batch.batch_members : [] ;
      if (batchMembers.length) {
        let snapshots = [];
        snapshots.push(batchMembers[0].snapshot);
        const params = { body: {snapshots} };
        API.post(API_NAME, url, params).then(result => {
          if (result.status.successCount > 0) {
            resolve(result);
          } else {
            console.log('warmUpGenerate - Data generation failure: %s', result.message);
            return reject(result);
          }
        }).catch(error => {
          console.log('warmUpGenerate - Internal data retrieval error: %o', error);
          if (error && !error.message) {
            error.message = 'warmUpGenerate - Internal data retrieval error';
          }
          return reject(error);
        });
      } else {
        return resolve();
      }
    })
  };

  /**
   * Method to generate ClinVar submission data (for a submission spreadsheet)
   * @param {object} batch - The batch source object
   */
  generateClinVarSubmissionDataByGroups = (batch) => {
    const batchMembers = batch && batch.batch_members ? batch.batch_members : [] ;
    let groups = [];
    let i = 0;
    const len = 10;
    const n = batchMembers.length;

    while (i < n) {
      groups.push(batchMembers.slice(i, i += len));
    }

    if (groups && groups.length) {
      const promises = groups.map(group => {
        const url = `/clinvar-submission-batch/generate/${batch.PK}`;
        let snapshots = [];
        group.map(member => {
          snapshots.push(member.snapshot);
        });
        const params = { body: {snapshots} };
        return API.post(API_NAME, url, params);
      });

      return Promise.all(promises);
    } else {
      return Promise.reject({'message': 'Missing expected batch interpretations'});
    }
  };

  /**
   * Method to construct the final generated ClinVar Submission data
   * @param {array} results - The returned results array
   */
  setFinalResult = (results) => {
    const resultData = {
      status: {
        totalRecords: 0,
        successCount: 0,
        errorCount: 0
      },
      variants: []
    };
    results.forEach((result) => {
      if (result && result.status && result.status.successCount > 0) {
        resultData.status.totalRecords = resultData.status.totalRecords + result.status.totalRecords;
        resultData.status.successCount = resultData.status.successCount + result.status.successCount;
        resultData.status.errorCount = resultData.status.errorCount + result.status.errorCount;
        resultData.variants = resultData.variants.concat(result.variants);
      }
    });
    const elementIDToCopy = resultData.status && resultData.status.successCount === 0 ?
      '' : 'generated-clinvar-submission-data';

    this.setState({isClinVarSubmissionActive: false, generatedClinVarSubmissionData: resultData,
      failureMessage: null, elementIDToCopy: elementIDToCopy});
  };

  /**
   * Method to store (as state) ClinVar submission data
   * @param {string} batchPK - The PK of the data's source object
   */
  storeClinVarSubmissionData = (batchPK) => {
    if (!this.state.isClinVarSubmissionActive && batchPK) {
      this.setState({isClinVarSubmissionActive: true}, () => {
        this.fetchBatch(batchPK).then(batch => {
          // send out the first memeber to warm up
          this.warmUpGenerate(batch).then(result => {
            this.generateClinVarSubmissionDataByGroups(batch).then(results => {
              if (results && results.length) {
                this.setFinalResult(results);
              }
            }).catch(error => {
              console.log('Get from generate by group error: %o', error);
              if (error && error.response && error.response.status === 504) {
                console.log('Get 504 error so call to generate again: %o', error);
                this.generateClinVarSubmissionDataByGroups(batch).then(results => {
                  if (results && results.length) {
                    this.setFinalResult(results);
                  } else {
                    this.setState({isClinVarSubmissionActive: false, failureMessage: 'Error generating data- no data returned.'});
                  }
                }).catch(error => {
                  const failureMessage = 'Error generating data' + (error && error.message ? ': ' + error.message : '.');
                  console.log('Data generation error: %o', error);
                  this.setState({isClinVarSubmissionActive: false, failureMessage: failureMessage});
                });
              } else {
                const failureMessage = 'Error generating data' + (error && error.message ? ': ' + error.message : '.');
                console.log('Data generation error: %o', error);
                this.setState({isClinVarSubmissionActive: false, failureMessage: failureMessage});
              }
            });
          }).catch(error => {
            const failureMessage = 'Error generating data' + (error && error.message ? ': ' + error.message : '.');
            console.log('Data generation error in warmUp: %o', error);
            this.setState({isClinVarSubmissionActive: false, failureMessage: failureMessage});
          });
        }).catch(error => {
          const failureMessage = 'Error fetching batch data' + (error && error.message ? ': ' + error.message : '.');
          console.log('Fetching batch error: %o', error);
          this.setState({isClinVarSubmissionActive: false, failureMessage: failureMessage});
        });
      });
    }
  };

  /**
   * Method to render ClinVar submission data
   */
  renderClinVarSubmissionData = () => {
    const generatedClinVarSubmissionData = this.state.generatedClinVarSubmissionData ? this.state.generatedClinVarSubmissionData : {};

    if (generatedClinVarSubmissionData.status && generatedClinVarSubmissionData.status.totalRecords > 0 &&
      generatedClinVarSubmissionData.variants && Array.isArray(generatedClinVarSubmissionData.variants)) {
      return (
        <table>
          <tbody>
            {generatedClinVarSubmissionData.variants.map((variant, variantIndex) => {
              let submissionErrors = {};

              // If record/variant has errors, save them (at a key that corresponds to the matching index within the data)
              if (variant.errors && Array.isArray(variant.errors) && variant.errors.length > 0 &&
                variant.submission && Array.isArray(variant.submission) && variant.submission.length > 0) {
                variant.errors.forEach(error => {
                  if (error.errorCode && typeof error.errorCode === 'string' &&
                    error.errorMessage && typeof error.errorMessage === 'string') {
                    variant.submission.forEach((data, dataIndex) => {
                      if (typeof data === 'string' && data.indexOf(error.errorCode) > -1) {
                        submissionErrors[dataIndex] = error.errorMessage;
                      }
                    });
                  }
                });
              }

              const columnSpacing = Object.keys(submissionErrors).length > 0 ? 'text-nowrap p-2 pt-5' : 'text-nowrap p-2';

              return (
                <tr key={'submission-data-row-' + variantIndex}>
                  {variant.submission && Array.isArray(variant.submission) ?
                    variant.submission.map((column, columnIndex) => {
                      if (submissionErrors[columnIndex]) {
                        return (
                          <td key={'submission-data-row-' + variantIndex + '-column-' + columnIndex}
                            className={'error-column text-danger ' + columnSpacing}>{column}
                            <span data-toggle="tooltip" data-placement="top" data-container="body"
                              data-tooltip={submissionErrors[columnIndex]}>
                              <i className="icon icon-info-circle ml-1"></i>
                            </span>
                          </td>
                        );
                      } else {
                        return (<td key={'submission-data-row-' + variantIndex + '-column-' + columnIndex}
                          className={columnSpacing}>{column}</td>);
                      }
                    })
                    :
                    <td colSpan="96"></td>
                  }
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    } else {
      return null;
    }
  };

  /**
   * Method to render component
   */
  render = () => {
    const disableCopyButton = this.state.elementIDToCopy ? false : true;
    const tooltipText = this.props.isLargeBatch
      ? <>At this time, to generate ClinVar Submission Data for a batch with 250 or more interpretations, please email our help desk (<a href="mailto:vci@clinicalgenome.org">vci@clinicalgenome.org</a>).</>
      : "Currently ClinVar Submission Data is in a format you can copy to your clipboard and then paste into a spreadsheet.";

    return (
      <>
        <button className="btn btn-primary mx-2 mb-2" disabled={this.props.batchPK ? false : true} onClick={() => this.setShowModal(true)}>
            Generate Submission Data
            <OverlayTrigger
              overlay={
                <Tooltip>
                  {tooltipText}
                </Tooltip>
              }
            >
            <FontAwesomeIcon icon={faInfoCircle} color="#ffffff" className="ml-2" />
          </OverlayTrigger>
        </button>
        <Modal className="clinvar-submission-modal" scrollable="true" show={this.state.showModal} onHide={this.setShowModal}>
          <Modal.Header className="bg-warning">
            <Modal.Title>ClinVar Submission Data</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            <div id="generated-clinvar-submission-data">
              {this.state.generatedClinVarSubmissionData ?
                this.renderClinVarSubmissionData()
                : this.state.isClinVarSubmissionActive ?
                  <LoadingSpinner text="Generating..." />
                  :
                  <button className="btn bg-secondary text-white"
                    onClick={() => this.storeClinVarSubmissionData(this.props.batchPK)}>Generate</button>
              }{this.state.failureMessage ?
                <div className="clinvar-submission-failure mt-3">{this.state.failureMessage}</div>
                : null
              }
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button className="btn bg-secondary text-white" onClick={this.handleCopy} disabled={disableCopyButton}>Copy (to clipboard)</button>
            <button className="btn bg-secondary text-white ml-2" onClick={this.setShowModal}>Close</button>
          </Modal.Footer>
        </Modal>
      </>
    );
  };
}

export default ClinVarBatchSubmissionData;
