// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { observer } from 'mobx-react';
import { Message, Statistic } from 'semantic-ui-react';

import { isStoreLoading, isStoreReady, isStoreError, isStoreNew } from '../../models/base';
import Progress from '../helpers/Progress';
import { niceNumber } from '../../helpers/utils';

// expected props
// - exportOperationStore
// - suppressError
class ExportProgress extends React.Component {
  getStore() {
    return this.props.exportOperationStore;
  }

  getStatus() {
    const store = this.getStore();
    if (isStoreReady(store) && store.exportOperation) return store.exportOperation.status;
    return '';
  }

  getStats() {
    const store = this.getStore();
    if (!isStoreReady(store) || !store.exportOperation) return;
    return store.exportOperation.stats;
  }

  isBusy() {
    const store = this.getStore();
    const busy = isStoreLoading(store);
    const status = this.getStatus();

    return busy || status === 'not_started' || status === 'in_progress';
  }

  isSuccess() {
    const status = this.getStatus();
    if (status !== 'completed') return false;
    const store = this.getStore();
    return store.exportOperation.success;
  }

  getErrorMessage() {
    if (this.props.suppressError) return;
    const store = this.getStore();
    const defaultMessage = 'Something went wrong with export - in /ui/src/parts/exporting/ExportProgress.js';
    const status = this.getStatus();
    let message;
    if (isStoreError(store)) {
      message = store.errorMessage || defaultMessage;
    } else if (status === 'failed') {
      message = _.get(store.exportOperation, 'errorMessage') || defaultMessage;
    }

    return message;
  }

  render() {
    const store = this.getStore();
    if (isStoreNew(store)) return null;
    const errorMessage = this.getErrorMessage();
    const busy = this.isBusy() && !errorMessage;
    const status = this.getStatus();
    const progressMessage = status === 'not_started' ? 'Waiting to be processed, this might take a few minutes' : 'Being processed, this might take a few minutes';
    const success = this.isSuccess();

    return (
      <React.Fragment>
        { busy && !this.props.suppressError &&  <Progress message={progressMessage} />}
        { errorMessage && 
          <Message negative className="mt2 mb2 clearfix">
            <Message.Header>A problem was encountered</Message.Header>
            <p>{errorMessage}</p>
          </Message>
        }
        { success &&
          <Message positive className="mt2 mb2 clearfix">
            <Message.Header>Success</Message.Header>
          </Message>
        }
        { this.renderStats() }
      </React.Fragment>
    );
  }

  renderStats() {
    const stats = this.getStats();
    const nice = (num) => niceNumber(num);
    if (!stats) return null;
    return (
      <Statistic.Group widths="five" className="mt4">
        <Statistic label="Completed" value={nice(stats.completed)} color="green"/>
        <Statistic label="Pending" value={nice(stats.pending)} color="orange"/>
        <Statistic label="Skipped" value={nice(stats.skipped)} color="brown"/>
        <Statistic label="Error" value={nice(stats.errored)} color="red"/>
        <Statistic label="Total" value={nice(stats.total)}/>
      </Statistic.Group>
    );
  }
}

export default observer(ExportProgress);
