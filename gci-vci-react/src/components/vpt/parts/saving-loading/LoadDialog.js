// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { decorate, observable, runInAction, action, reaction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Segment, Button, Header, Form, Dropdown, Message } from 'semantic-ui-react';
import TimeAgo from 'react-timeago';

import { isTokenExpired, isForbidden, swallowError } from '../../helpers/errors';
import { isStoreLoading, isStoreReady, isStoreError } from '../../models/base';
import { saveDialogInput } from '../../models/scope/browser-window';
import { SavesStore } from '../../models/saving-loading/SavesStore';
import ErrorBox from '../helpers/ErrorBox';
import Progress from '../helpers/Progress';
import LoadDialogBase from './LoadDialogBase';

// expected props
// - app (via injection)
// - searchSession (via injection)
// - userStore (via injection)
class LoadDialog extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.selectedSaveId = '';
      this.savesStore = SavesStore.create({});
    });
  }

  getSavesStore() {
    return this.savesStore;
  }

  loadSavesStore = (affiliationId) => {
    const savesStore = this.getSavesStore();
    this.selectedSaveId = '';
    swallowError(savesStore.load(affiliationId));
  };

  componentDidMount() {
    const determineAffiliation = () => this.getAffiliationId();
    this.disposer = reaction(determineAffiliation, this.loadSavesStore);
    this.loadSavesStore(this.getAffiliationId());
  }

  componentWillUnmount() {
    runInAction(() => {
      this.reset();
      if (this.savesStore) this.savesStore.clear();
      if (this.disposer) this.disposer();
    });
  }

  reset() {
    this.selectedSaveId = '';
  };

  getSearchSession() {
    return this.props.searchSession;
  }

  getUser() {
    return (this.props.userStore && this.props.userStore.user) || {};
  }

  getAffiliationId() {
    return _.get(this.props.auth, 'currentAffiliation.affiliation_id', null);
  }

  getSelectedSave() {
    const selectedSaveId = this.selectedSaveId;
    const store = this.getSavesStore();
    const selection = store.getById(selectedSaveId);

    return selection;
  }

  handelOverwriteDropDownChange = (e, { value }) => {
    const id = value || '';
    this.selectedSaveId = id;    
  };

  handleDone = () => {
    this.reset();
    saveDialogInput.changed = false; // not the best way of doing this, but this will let the user see this selection when they click save
    this.props.onDone();
  };

  handleCancel = () => {
    this.reset();
    this.props.onCancel();
  };

  handleSubmit = async (selectedSave) => {
    this.submissionError = '';
    this.submitting = true;
    const searchSession = this.getSearchSession();
    try {
      await searchSession.load({
        id: this.selectedSaveId,
        includes: selectedSave.includes,
      });
      runInAction(() => {
        this.submitting = false;
        this.handleDone();
      });
    } catch(error) {
      runInAction(() => {
        this.submitting = false;
        if (isForbidden(error) || isTokenExpired(error)) {
          this.submissionError = 'Your session has expired, please login again.';
        } else {
          this.submissionError = error.message || 'Something went wrong - authentication issue in /ui/src/parts/saving-loading/SaveDialog.js ';
        }
      });
    }
  };

  render() {
    const store = this.getSavesStore();
    if (!store) return null;
    let content = null;

    if (isStoreError(store)) {
      content = this.renderError();
    } else if (isStoreLoading(store)) {
      content = <Progress/>;
    } else if (isStoreReady(store)) {
      content = this.renderMain();
    } else {
      content = null;
    }

    return content;
  }

  renderError() {
    const store = this.getSavesStore();
    return (
      <Segment clearing className="animated fadeIn">
        <ErrorBox error={ store.error }/>
        <div>
          <Button floated="right" onClick={this.handleCancel}>Cancel</Button>
        </div>
      </Segment>
    );
  }

  renderMain() {
    const selectedSave = this.getSelectedSave();

    return (
      <div style={{marginBottom: '200px'}}>
      <Segment clearing className="animated fadeIn">
        <Form className="mb2">
          { this.renderOverwriteDropdown() }
        </Form>
        {/* <Divider/> */}
        { selectedSave && <LoadDialogBase selectedSave={selectedSave} mode="any" onDone={this.handleDone} onCancel={this.handleCancel}/> }
        { !selectedSave && <div className="flex">
            <div className="flex-auto mr2 right-align mt1"></div>
            <div>
              <Button className="mr2" onClick={this.handleCancel}>Cancel</Button>
              <Button color="red" onClick={() => this.handleSubmit(selectedSave)}>Load</Button>
            </div>
          </div>
        }
      </Segment>
      </div>
    );
  }

  renderOverwriteDropdown() {
    const store = this.getSavesStore();
    const affiliation = this.getAffiliationId();
    const savesList = store.getLoadableList(affiliation) || [];
    console.log(savesList)
    if (savesList.length === 0) return <Message info content="There are no saved searches to load" className="center"/>;
    const isProcessing = this.submitting;
    const options = _.map(savesList, (save) => ({
      key: save.PK,
      value: save.PK,
      text: save.title,
      content: <div className="mb3">
          <Header className="mb2">{ save.title }
            <Header.Subheader className="fs-9">created by { save.userTitle }  <span className="fs-7 ml2"><TimeAgo date={save.last_modified}/></span></Header.Subheader>
            <Header.Subheader className="fs-9">gene {save.geneName} </Header.Subheader>
          </Header>
          <span className="fs-9">{ save.description }</span>
        </div>,
    }));

    return (
      <div>
        <Dropdown fluid disabled={isProcessing} selection options={options} value={this.selectedSaveId} placeholder="Select an existing saved search" onChange={this.handelOverwriteDropDownChange}/>
      </div>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(LoadDialog, {
  handelOverwriteDropDownChange: action,
  handleDone: action,
  handleCancel: action,
  loadSavesStore: action,
  selectedSaveId: observable,
  reset: action,
});

const mapStateToProps = state => ({ auth: state.auth });

export default connect(mapStateToProps)(inject('searchSession')(observer(LoadDialog)));