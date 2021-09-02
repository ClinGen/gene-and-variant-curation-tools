import React, { Component } from 'react';
import { API } from 'aws-amplify';
import { API_NAME } from '../../utils';

import { Modal } from 'react-bootstrap';
import LoadingSpinner from '../common/LoadingSpinner';

class ClinVarSubmissionData extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      isClinVarSubmissionActive: false,
      generatedClinVarSubmissionData: null,
      failureMessage: null,
      elementIDToCopy: null
    };
  };

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
   * Method to handle copying ClinVar submission data
   */
  handleCopy = () => {
    try {
      const dataElement = document.getElementById(this.state.elementIDToCopy);

      // Highlight and copy (to clipboard) ClinVar submission data
      dataElement.contentEditable = 'true';
      window.getSelection().selectAllChildren(dataElement);
      document.execCommand('copy');
    } catch (error) {
      console.log('Copying data to clipboard failed');
    }

    this.setShowModal();
  };

  /**
   * Method to generate ClinVar submission data (for a submission spreadsheet)
   * @param {string} resourcePK - The PK of the data's source object
   */
  generateClinVarSubmissionData = (resourcePK) => {
    return new Promise((resolve, reject) => {
      if (resourcePK) {
        const url = '/messaging/generate-clinvar-data/' + resourcePK;

        API.get(API_NAME, url).then(result => {
          if (result.status === 'Success') {
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
   * Method to store (as state) ClinVar submission data
   * @param {string} resourcePK - The PK of the data's source object
   */
  storeClinVarSubmissionData = (resourcePK) => {
    if (!this.state.isClinVarSubmissionActive && resourcePK) {
      this.setState({isClinVarSubmissionActive: true}, () => {
        this.generateClinVarSubmissionData(resourcePK).then(response => {
          if (response && response.message) {
            const elementIDToCopy = response.message.status && response.message.status.errorCount > 0 ?
              '' : 'generated-clinvar-submission-data';

            this.setState({isClinVarSubmissionActive: false, generatedClinVarSubmissionData: response.message,
              failureMessage: null, elementIDToCopy: elementIDToCopy});
          } else {
            this.setState({isClinVarSubmissionActive: false, failureMessage: 'Error generating data.'});
          }
        }).catch(error => {
          const failureMessage = 'Error generating data' + (error && error.message ? ': ' + error.message : '.');
          console.log('Data generation error: %o', error);
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

    return (
      <>
        <button className="btn bg-warning text-white mx-2" onClick={() => this.setShowModal(true)}>ClinVar Submission Data</button>
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
                    onClick={() => this.storeClinVarSubmissionData(this.props.resourcePK)}>Generate</button>
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

export default ClinVarSubmissionData;
