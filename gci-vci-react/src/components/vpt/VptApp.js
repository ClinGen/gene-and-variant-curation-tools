// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { inject, observer } from 'mobx-react';
import { Route, Switch, Redirect, withRouter } from 'react-router-dom';
import { Message, Icon, Container } from 'semantic-ui-react';

import { isStoreLoading, isStoreReady, isStoreError } from './models/base';
import MainLayout from './parts/MainLayout';
import Search from './parts/search/index';
import ExportsListing from './parts/exporting/index';
import ExportDetail from './parts/exporting/ExportDetail';
import SavesListing from './parts/saving-loading/index';

// expected props
// - app (via injection)
// - location (from react router)
class VptApp extends Component {

  render() {
    const { app } = this.props;
    let content = null;

    if (isStoreError(app.startup)) {
      content = this.renderError()
    } else if (isStoreLoading(app.startup)) {
      content = this.renderProgress();
    } else if (isStoreReady(app.startup)) {      
      content = this.renderApp();
    } else {
      content = ''; // TODO, what should we display if we hit this scenario?
    }

    return content;
  }

  renderApp() {
    // see https://reacttraining.com/react-router/web/api/withRouter
    const { location } = this.props;
    const defaultLocation = {
      pathname: '/vp/search',
      search: location.search, // we want to keep any query parameters
      hash: location.hash,
      state: location.state
    };

    return (
      <MainLayout>
        <Switch>
          <Redirect exact from="/vp/" to={defaultLocation}/>
          <Route path="/vp/search" component={Search}/>
          <Route path="/vp/exports/detail" component={ExportDetail}/>
          <Route path="/vp/exports" component={ExportsListing}/>
          <Route path="/vp/saves" component={SavesListing}/>
        </Switch>
      </MainLayout>
    );
  }

  renderProgress() {
    return (
      <Container text className="pt4">
        <Message icon>
          <Icon name="circle notched" loading />
          <Message.Content>
            <Message.Header>Just one second</Message.Header>
            Great things are now happening, please wait!
          </Message.Content>
        </Message>
      </Container>
    );
  }

  renderError() {
    const { app } = this.props;
    const message = `Something went wrong and the error message is ${app.startup.errorMessage}.  Please refresh your browser.`;
    return (
      <Container text className="pt4">
        <Message negative className="clearfix">
          <Message.Header>Oops!</Message.Header>
          <p>{message}</p>
        </Message>
      </Container>
    );
  }
}

const mapStateToProps = state => ({
  auth: state.auth
});

export default connect(mapStateToProps)(inject('app')(withRouter(observer(VptApp))));
