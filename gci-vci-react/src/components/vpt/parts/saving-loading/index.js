// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { decorate, reaction, runInAction, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Breadcrumb, Header, Message, Segment } from 'semantic-ui-react';

import { isStoreLoading, isStoreReady, isStoreError } from '../../models/base';
import { createLink, createLinkWithSearch } from '../../helpers/routing';
import { swallowError } from '../../helpers/errors';
import { SavesStore } from '../../models/saving-loading/SavesStore';
import Progress from '../helpers/Progress';
import ErrorBox from '../helpers/ErrorBox';
import LoadDialogBase from './LoadDialogBase';

// expected props
// expected props
// - app (via injection)
// - userStore (via injection)
// - searchWizard (via injection)
class SavesListing extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.savesStore = SavesStore.create({});
    });
  }

  componentDidMount() {
    window.scrollTo(0, 0);
    const determineAffiliation = () => this.getAffiliationId();
    this.disposer = reaction(determineAffiliation, this.loadSavesStore);
    this.loadSavesStore(this.getAffiliationId());
  }

  componentWillUnmount() {
    runInAction(() => {
      if (this.savesStore) this.savesStore.clear();
      if (this.disposer) this.disposer();
    });
  }

  goto(pathname, search) {
    const location = this.props.location;
    let link
    if (search) link = createLinkWithSearch({ location, pathname, search });
    else link = createLink({ location, pathname });
    this.props.history.push(link);
  }

  getWizard() {
    return this.props.searchWizard;
  }

  getSavesStore() {
    return this.savesStore;
  }

  loadSavesStore = (affiliationId) => {
    const savesStore = this.getSavesStore();
    swallowError(savesStore.load(affiliationId));
  };

  handleDone = () => {
    const wizard = this.getWizard();
    if (wizard.status !== 'active') wizard.start();
    wizard.setCurrentStep(2);
    this.goto('/vp/search/prioritize');
  };

  handleCancel = () => {
    // nothing to do here
  };

  getUser() {
    return (this.props.userStore && this.props.userStore.user) || {};
  }

  getAffiliationId() {
    return _.get(this.props.auth, 'currentAffiliation.affiliation_id', null);
  }

  render() {
    const store = this.getSavesStore();
    const affiliation = this.getAffiliationId();
    const list = (store && isStoreReady(store) && store.getSearchableList(affiliation)) || [];

    let content = null;

    if (isStoreError(store)) {
      content = <ErrorBox error={ store.error }/>;
    } else if (isStoreLoading(store)) {
      content = <Progress/>;
    } else if (isStoreReady(store) && _.isEmpty(list)) {
      content = this.renderEmpty();
    } else if (isStoreReady(store)) {
      content = this.renderMain();
    } else {
      content = null;
    }

    return (
      <div className="animated fadeIn ml3 mr3">
        <Breadcrumb size="mini">
          <Breadcrumb.Section link onClick={() => this.goto('/vp/search')}>Home</Breadcrumb.Section>
          <Breadcrumb.Divider />
          <Breadcrumb.Section active>My Saved Searches</Breadcrumb.Section>
        </Breadcrumb>
        <div className="mt2">
          <Header as="h3" className="mb2">My Saved Searches</Header>
          { content }
        </div>
      </div>
    );
  }

  renderEmpty() {
    const affiliation = this.getAffiliationId();
    const hasAffiliation = affiliation && affiliation !== 'SELF';
    return <Message visible>There are no saved searches to list {hasAffiliation? 'for this affiliation': ''}</Message>
  }

  renderMain() {
    const store = this.getSavesStore();
    const affiliation = this.getAffiliationId();
    const list = store.getSearchableList(affiliation) || [];
  
    return (
      <div className="mt3">
        { _.map(list, (save) => <Segment clearing key={save.PK} className="mb4"><LoadDialogBase selectedSave={save} mode="searchOnly" onCancel={this.handleCancel} onDone={this.handleDone}/></Segment>)}
      </div>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(SavesListing, {
  handleCancel: action,
  handleDone: action,
});

const mapStateToProps = state => ({ auth: state.auth });

export default connect(mapStateToProps)(inject('app', 'searchWizard')(withRouter(observer(SavesListing))));