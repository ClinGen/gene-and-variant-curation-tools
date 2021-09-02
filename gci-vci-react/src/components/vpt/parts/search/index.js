// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Route, Switch, withRouter } from 'react-router-dom';

import { createLink } from '../../helpers/routing';
import Step1 from './step1';
import Step2 from './step2';

class SearchMainPage extends React.Component {

  getWizard() {
    return this.props.searchWizard;
  }

  goto(pathname) {
    const location = this.props.location;
    const link = createLink({ location, pathname });

    this.props.history.push(link);
  }

  componentDidMount() {
    const wizard = this.getWizard();
    const pathname = _.get(this.props.location, 'pathname', '');
    const isStrict = (value) => ((value === pathname) || (value === `${pathname}/`));

    window.scrollTo(0, 0);

    if (wizard.status === 'inactive') {
      wizard.start();
      if (!isStrict('/vp/search')) {
        this.goto('/vp/search/');
        return;
      }
    }
  }

  render() {
    const wizard = this.getWizard();
    if (wizard.status === 'inactive') return null;

    return (
      <div className="mt3 ml3 mr3 animated fadeIn">

        {/* <Step.Group widths={3} ordered>
          <Step active={wizard.currentStep === 1} completed={wizard.currentStep > 1}>
            <Step.Content>
              <Step.Title>Perform A Search</Step.Title>
              <Step.Description>Enter the search terms to retrieve variants</Step.Description>
            </Step.Content>
          </Step>
          <Step disabled={wizard.currentStep < 2} active={wizard.currentStep === 2} completed={wizard.currentStep > 2}>
            <Step.Content>
              <Step.Title>Prioritize The Variants &amp; Export</Step.Title>
              <Step.Description>Use filtering and sorting to prioritize then export your selection</Step.Description>
            </Step.Content>
          </Step>
        </Step.Group> */}

        { this.renderMain() }
      </div>
    );
  }

  renderMain() {
    return (
      <Switch>
        <Route path="/vp/search/prioritize" component={Step2}/>
        <Route path="/vp/search" component={Step1}/>
      </Switch>
    );
  }
}

export default inject('searchWizard')(withRouter(observer(SearchMainPage)));