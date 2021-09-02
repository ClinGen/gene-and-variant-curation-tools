// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { connect } from 'react-redux';
import { decorate, action, runInAction, observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Breadcrumb, Message, Segment, Button } from 'semantic-ui-react';
import TimeAgo from 'react-timeago';

import { isStoreLoading, isStoreReady, isStoreError, isStoreEmpty, isStoreNotEmpty } from '../../models/base';
import { createLink } from '../../helpers/routing';
import { swallowError } from '../../helpers/errors';
import { isTokenExpired, isForbidden } from '../../helpers/errors';
import Progress from '../helpers/Progress';
import ErrorBox from '../helpers/ErrorBox';
import ExportProgress from './ExportProgress';
import ExportTable from './ExportTable';

// expected props
// - exportOperationsStore (via injection)
class Details extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.submitting = false;
      this.submissionError = '';
    });
  }

  goto(pathname) {
    const location = this.props.location;
    const link = createLink({ location, pathname });
    this.props.history.push(link);
  }

  componentDidMount() {
    window.scrollTo(0, 0);
    const store = this.getStore();
    if (!store) return this.goto('/vp/exports');
    swallowError(store.load());
  }

  getExportId() {
    const query = new URLSearchParams(this.props.location.search);
    return query.get('exportId');
  }
 
  getStore() {
    const id = this.getExportId();
    if (!id) return;
    return this.props.exportOperationsStore.getExportOperationStore(id);
  }

  getUser() {
    return (this.props.userStore && this.props.userStore.user) || {};
  }

  getAffiliation() {
    const store = this.getStore();
    if (store && store.exportOperation) return store.exportOperation.affiliationName;
    return '';
  }

  getRequestStatus() {
    const store = this.getStore();
    if (!store) return '';
    if (!store.exportOperation) return '';
    return store.exportOperation.status;
  }

  isProcessing() {
    if (this.submitting) return true;
    const store = this.getStore();
    if (!store) return false;
    if (isStoreLoading(store)) return true;
    if (isStoreError(store)) return false;
    const status = this.getRequestStatus();
    return ((status === 'not_started') || (status === 'in_progress'));
  }

  isSuccess() {
    const status = this.getRequestStatus();
    if (status !== 'completed') return false;
    const store = this.getStore();
    return store.exportOperation.success;
  }

  handleResubmit = async () => {
    this.submissionError = '';
    this.submitting = true;
    const store = this.getStore();

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
          this.submissionError = error.message || 'Something went wrong - authentication issue in /ui/src/parts/exporting/ExportDetail.js';
        }
      });
    }
  };

  render() {
    const store = this.getStore();
    if (!store) return null;
    const exportId = this.getExportId();
    let content = null;

    if (isStoreError(store)) {
      content = <ErrorBox error={ store.error }/>;
    } else if (isStoreLoading(store)) {
      content = <Progress/>;
    } else if (isStoreReady(store) && isStoreEmpty(store)) {
      content = this.renderEmpty();
    } else if (isStoreReady(store) && isStoreNotEmpty((store))) {
      content = this.renderMain();
    } else {
      content = null;
    }

    return (
      <div className="animated fadeIn ml3 mr3">
        <Breadcrumb size="mini">
          <Breadcrumb.Section link onClick={() => this.goto('/vp/search')}>Home</Breadcrumb.Section>
          <Breadcrumb.Divider />
          <Breadcrumb.Section link onClick={() => this.goto('/vp/exports')}>My Exports</Breadcrumb.Section>
          <Breadcrumb.Divider />
          <Breadcrumb.Section active>{exportId}</Breadcrumb.Section>
        </Breadcrumb>
        <div className="mt2">
          { content }
        </div>
      </div>
    );
  }

  renderEmpty() {
    const affiliation = this.getAffiliation();
    const hasAffiliation = affiliation && affiliation !== 'SELF';
    return <Message visible>There is no export to list {hasAffiliation? 'for this affiliation': ''}</Message>
  }

  renderMain() {
    const email = this.props.auth && this.props.auth.email;
    const store = this.getStore();
    const affiliation = this.props.auth && this.props.auth.currentAffiliation && this.props.auth.currentAffiliation.affiliation_fullname;
    const hasAffiliation = Boolean(affiliation);
    const operation = store.exportOperation;
    const geneName = operation.geneName;
    const submissionError = this.submissionError;
    const success = this.isSuccess();
    const isProcessing = this.isProcessing();

    return (
      <Segment placeholder className="center">
        <Message className="mt2">
        <div>Exports <b><TimeAgo  date={operation.date_created}/></b></div>
        <div>By <b className={operation.email === email? 'color-blue': 'color-orange'}>{operation.title}</b></div>
        { hasAffiliation && <div>Affiliation <b>{affiliation}</b></div> }
        { geneName && <div>Gene <b>{geneName}</b></div> }
        </Message>

        { submissionError && <ErrorBox error={submissionError} /> }
        <ExportProgress exportOperationStore={store} suppressError={!!submissionError}/>
        <ExportTable exportOperationStore={store}/>
        <Segment.Inline className="mt3">
          { !success && <Button primary disabled={isProcessing} loading={isProcessing} onClick={this.handleResubmit}>Retry</Button> }
        </Segment.Inline>

      </Segment>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Details, {
  handleResubmit: action,
  submitting: observable,
  submissionError: observable,
});

const mapStateToProps = (state) => ({
  auth: state.auth
});

export default connect(mapStateToProps)(inject('app', 'exportOperationsStore')(withRouter(observer(Details))));
