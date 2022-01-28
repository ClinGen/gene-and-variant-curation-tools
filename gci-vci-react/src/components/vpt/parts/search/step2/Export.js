// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { decorate, observable, runInAction, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Segment, Button, Header, Statistic, Message } from 'semantic-ui-react';

import { niceNumber } from '../../../helpers/utils';
import { isStoreLoading, isStoreError } from '../../../models/base';
import { isTokenExpired, isForbidden } from '../../../helpers/errors';
import { createLink } from '../../../helpers/routing';
import ExportProgress from '../../exporting/ExportProgress';
import ExportTable from '../../exporting/ExportTable';
import Progress from '../../helpers/Progress';
import ErrorBox from '../../helpers/ErrorBox';
import exportCSV from '../../../../../helpers/export_csv.js'

// expected props
// - app (via injection)
// - userStore (via injection)
// - exportOperationsStore (via injection)
// - authentication (via injection)
// - geneName
// - tableModel
// - columnsManager
class Export extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.submitting = false;
      this.submissionError = '';
      this.exportOperationStore = undefined;
    });
  }

  // TODO - remove me
  // componentDidMount() {
  //   runInAction(() => {
  //     this.exportOperationStore = this.props.exportOperationsStore.getExportOperationStore('f0141c7d-2fc2-43a9-8806-06abc433e869');
  //     try {
  //       this.exportOperationStore.load()
  //       .catch((err) => {
  //         console.log(err);
  //       });
  //     } catch(error) {
  //       console.log('outercatch');
  //       console.log(error);
  //     }  
  //   });
  // }

  componentWillUnmount() {
    runInAction(() => {
      this.submitting = false;
      this.submissionError = '';
      this.exportOperationStore = undefined;
    });
  }

  goto(pathname) {
    const location = this.props.location;
    const link = createLink({ location, pathname });
    this.props.history.push(link);
  }

  getTableModel() {
    return this.props.tableModel;
  }

  handleSubmit = async () => {
    console.log('submit');
    this.submissionError = '';
    this.submitting = true;
    const tableModel = this.getTableModel();
    const variants = tableModel.selectedRows;
    const geneName = _.get(variants, '[0].gene', '');
    const filters = tableModel.filtersManager;

    try {
      const exportOperationStore = await this.props.exportOperationsStore.submitRequest({ variants, geneName, filters });
      runInAction(() => {
        this.exportOperationStore = exportOperationStore;
        this.submitting = false;
      });
    } catch(error) {
      runInAction(() => {
        this.submitting = false;
        if (isForbidden(error) || isTokenExpired(error)) {
          this.submissionError = 'Your session has expired, please login again.';
          // this.props.authentication.clearTokens();
          // this.props.app.setUserAuthenticated(false);
        } else {
          this.submissionError = error.message || 'Something went wrong - authentication issue in /ui/src/parts/search/step2/Export.js handleSubmit';
        }
      });
    }
  };

  handleResubmit = async () => {
    console.log('resubmit')
    this.submissionError = '';
    this.submitting = true;
    const store = this.getOperationStore();

    try {
      await this.props.exportOperationsStore.resubmitRequest({ requestId: store.id });
      runInAction(() => {
        this.submitting = false;
      });
    } catch(error) {
      runInAction(() => {
        this.submitting = false;
        if (isForbidden(error) || isTokenExpired(error)) {
          this.submissionError = 'Your session has expired, please login again.';
          // this.props.authentication.clearTokens();
          // this.props.app.setUserAuthenticated(false);
        } else {
          this.submissionError = error.message || 'Something went wrong - authentication issue in /ui/src/parts/search/step2/Export.js handleResubmit';
        }
      });
    }
  };

  handleCancel = () => {
    this.submissionError = '';
    this.submitting = false;
    this.exportOperationStore = undefined;
    this.props.onCancel();
  };

  handleViewExports = () => {
    this.submissionError = '';
    this.submitting = false;
    this.exportOperationStore = undefined;
    this.props.onCancel();
    this.goto('/vp/exports');
  };

  handleDownload = () => {
    const formattedRecords = [];
    const tableModel = this.getTableModel();
    const variants = tableModel.selectedRows;

    if (variants.length) {
      variants.forEach(row => {
        formattedRecords.push({
          'caid': row.caid ? row.caid : '',
          'Standardized Nomenclature': row.clingenPreferredTitle ? row.clingenPreferredTitle : '',
          'Gene': row.gene ? row.gene : '',
          'GRCh37': row.grch37HGVS ? row.grch37HGVS : '',
          'GRCh38': row.grch38HGVS ? row.grch38HGVS : '',
          'HGVS Expressions': row.hgvsExp ? row.hgvsExp.join(' ') : '',
          'Protein Effects': row.proteinEffects ? row.proteinEffects.join(' ') : '',
          'Molecular Consequences': row.mc ? row.mc.join(' ') : '',
          'Predictions (REVEL)': row.predictions && row.predictions.REVEL ? row.predictions.REVEL : '',
          'VCI Status': row.vciStatus ? JSON.stringify(row.vciStatus).replace(/,/g, ' ') : ''
        });
      });
    }

    exportCSV(formattedRecords, { filename: 'vp-download-export.csv' });
  };

  selectedAffiliation() {
    // const isAuthenticated = this.props.app.userAuthenticated === true;
    // if (!isAuthenticated) return '';
    // const user = this.props.userStore.user;
    // const affiliation = user.selectedAffiliation;
    // if (affiliation) return affiliation;
    return '';
  }

  getOperationStore() {
    return this.exportOperationStore;
  }

  getRequestStatus() {
    const store = this.getOperationStore();
    if (!store) return '';
    if (!store.exportOperation) return '';
    return store.exportOperation.status;
  }

  isProcessing() {
    if (this.submitting) return true;
    const store = this.getOperationStore();
    if (!store) return false;
    if (isStoreLoading(store)) return true;
    if (isStoreError(store)) return false;
    const status = this.getRequestStatus();
    return ((status === 'not_started') || (status === 'in_progress'));
  }

  isSuccess() {
    const status = this.getRequestStatus();
    if (status !== 'completed') return false;
    const store = this.getOperationStore();
    return store.exportOperation.success;
  }

  render() {
    const tableModel = this.getTableModel();
    const selectedRows = tableModel.selectedRows;
    const selectionSize = tableModel.selectionSize;
    const nice = (num) => niceNumber(num);
    const niceSize = nice(selectionSize);
    const variants = `${selectionSize === 1? 'variant': 'variants'}`;
    // const affiliation = this.selectedAffiliation();
    const affiliation = _.get(this.props.auth, 'currentAffiliation', null);
    const geneName = _.get(selectedRows, '[0].gene', '');
    const isProcessing = this.isProcessing();
    const store = this.getOperationStore();
    const submissionError = this.submissionError;
    const requestStatus = this.getRequestStatus();
    const hasRequestError = (requestStatus === 'failed' || isStoreError(store || {}));
    const isRetry = (hasRequestError || submissionError);
    const buttonTitle = isRetry ? 'Retry' : 'Export';
    const success = this.isSuccess();
    const handler = (store)? this.handleResubmit : this.handleSubmit;

    const searchSession = this.props.searchSession;
    console.log(searchSession.id);

    return (
      <Segment placeholder className="center">
        <Header icon color="grey">
          <Statistic label={variants} value={niceSize} color="orange"/>
          <div>
            {/* You selected {niceSize} {variants} to export to the Variant Curation Interface (VCI). */}
            You selected {niceSize} {variants}. See below to download as a spreadsheet (CSV format).
          </div>
        </Header>
        <Message className="mt2">
          { affiliation && <div>Affiliation: <b>{affiliation.affiliation_fullname}</b></div> }
          { geneName && <div>Gene <b>{geneName}</b></div> }
        </Message>
        { !store && isProcessing && <Progress message="Submitting variants, this might take a few minutes"/> }
        { submissionError && <ErrorBox error={submissionError} /> }
        { store && <ExportProgress exportOperationStore={store} suppressError={!!submissionError}/> }
        { store && <ExportTable exportOperationStore={store}/> }
        <Segment.Inline className="mt3">
          { !success && <React.Fragment>
            <Button disabled={isProcessing} onClick={this.handleCancel}>Cancel</Button>
            <Button primary onClick={this.handleDownload}>Download to CSV</Button>
            {/* <Button primary disabled loading={isProcessing} onClick={handler}>{buttonTitle}</Button> */}
            </React.Fragment>
          }
          { success && <Button primary disabled={isProcessing} loading={isProcessing} onClick={this.handleCancel} className="mr2">Done</Button> }
          { success && <Button color="teal" disabled={isProcessing} loading={isProcessing} onClick={this.handleViewExports}>View My Exports</Button>}
        </Segment.Inline>
      </Segment>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Export, {
  exportOperationStore: observable,
  submitting: observable,
  submissionError: observable,
  handleSubmit: action,
  handleResubmit: action,
  handleCancel: action,
  handleViewExports: action,
});

const mapStateToProps = state => ({ auth: state.auth });

export default connect(mapStateToProps)(inject('exportOperationsStore', 'searchSession')(withRouter(observer(Export))));
