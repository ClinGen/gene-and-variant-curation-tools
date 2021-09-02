// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { decorate, observable, runInAction, action, reaction, computed } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Segment, Button, Header, Form, Divider, Dropdown, Checkbox } from 'semantic-ui-react';
import TimeAgo from 'react-timeago';

import { isTokenExpired, isForbidden } from '../../helpers/errors';
import { displaySuccess } from '../../helpers/notification';
import { isStoreLoading, isStoreReady, isStoreError } from '../../models/base';
import { createLink } from '../../helpers/routing';
import { saveDialogInput } from '../../models/scope/browser-window';
import { SavesStore } from '../../models/saving-loading/SavesStore';
import ErrorBox from '../helpers/ErrorBox';
import Progress from '../helpers/Progress';

// expected props
// - app (via injection)
// - searchSession (via injection)
// - userStore (via injection)
class SaveDialog extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.submitting = false;
      this.submissionError = '';
      this.selectedExistingSaveId = '';
      this.s3_archive_key = '';
      this.enableOverwrite = false;
      this.savesStore = SavesStore.create({});
      const searchSession = this.getSearchSession();
      if (!saveDialogInput.changed) {
        saveDialogInput.title = searchSession.title || '';
        saveDialogInput.description = searchSession.description || '';
        saveDialogInput.includeFilters = searchSession.includeFilters;
        saveDialogInput.includeColumns = searchSession.includeColumns;
        saveDialogInput.includeSearch = searchSession.includeSearch;
        saveDialogInput.includeSelection = searchSession.includeSelection;
      }
    });
  }

  getSavesStore() {
    return this.savesStore;
  }


  loadSavesStore = async(affiliationId) => {
    const savesStore = this.getSavesStore()
    try {
      await savesStore.load(affiliationId);
      runInAction(() => {
        const list = savesStore.saveableList;
        const title = saveDialogInput.title;
        _.forEach(list, (item) => {
          if (item.title === title) {
            this.selectedExistingSaveId = item.PK;
            this.enableOverwrite = true;
            return false; // stop the loop
          }
        });
        if (!this.selectedExistingSaveId && !_.isEmpty(list)) {
          this.selectedExistingSaveId = list[0].PK;
        }
      });
    } catch (error) {
      // we ignore it here, because are going to check it in render
    }
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
    this.submissionError = '';
    this.submitting = false;
    this.selectedExistingSaveId = '';
    this.enableOverwrite = false;
  }

  getSearchSession() {
    return this.props.searchSession;
  }

  getUser() {
    return (this.props.userStore && this.props.userStore.user) || {};
  }

  goto(pathname) {
    const location = this.props.location;
    const link = createLink({ location, pathname });
    this.props.history.push(link);
  }

  getAffiliationId() {
    return _.get(this.props.auth, 'currentAffiliation.affiliation_id', null);
  }

  handleEnable = (key) => action((event, data) => {
    saveDialogInput.changed = true;
    saveDialogInput[key] = data.checked;
    if (key === 'includeSelection' && data.checked) {
      saveDialogInput['includeSearch'] = true;
    }
    if (key === 'includeSearch' && !data.checked) {
      saveDialogInput['includeSelection'] = false;
    }

    event.stopPropagation();
  });

  handleOverwriteChecked = (event, { checked }) => {
    this.enableOverwrite = checked;
    event.stopPropagation();
  };

  handleTitleInput = (event, data) => {
    saveDialogInput.changed = true;
    saveDialogInput.title = data.value;
  };

  handleDescriptionInput = (event, data) => {
    saveDialogInput.changed = true;
    saveDialogInput.description = data.value;
  };

  handleSubmit = async () => {
    this.submissionError = '';
    this.submitting = true;
    const searchSession = this.getSearchSession();

    try {
      await searchSession.save({
        id: this.enableOverwrite && this.selectedExistingSaveId,
        title: saveDialogInput.title,
        description: saveDialogInput.description,
        s3_archive_key: this.s3_archive_key,
        includes: saveDialogInput.includes,
        affiliation: this.getAffiliationId(),
        auth: this.props.auth,
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

  handleOverwriteDropDownChange = (e, data) => {
    const { value } = data;
    const { s3_archive_key } = data.options.find(o => o.value === value);
    const id = value || '';
    const key = s3_archive_key || '';
    this.selectedExistingSaveId = id;
    this.s3_archive_key = key;
  };

  handleDone = () => {
    this.reset();
    displaySuccess('Save was completed successfully');
    this.props.onDone();
  };

  handleCancel = () => {
    this.reset();
    this.props.onCancel();
  };

  get valid() {
    const commonValid = !_.isEmpty(_.trim(saveDialogInput.title)) && saveDialogInput.hasIncludes;
    if (!this.enableOverwrite) return commonValid;

    return !_.isEmpty(this.selectedExistingSaveId) && commonValid;
  }

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
    const submissionError = this.submissionError;
    const isProcessing = this.submitting;
    const title = saveDialogInput.title;
    const description = saveDialogInput.description;
    const overwrite = this.enableOverwrite;
    const isValid = this.valid;
    return (
      <div style={{marginBottom: '200px'}}>
      <Segment clearing className="animated fadeIn">
        { submissionError && <ErrorBox error={submissionError}  /> }
        <Form className="flex mb2">
          <div className="flex-auto pr2 mr2 border-right border-grey">
            <Form.Input disabled={isProcessing} type="text" placeholder="Title" fluid={true} value={title} onChange={this.handleTitleInput} />
            <Form.TextArea disabled={isProcessing} style={{ minHeight: 100 }} placeholder="Description" value={description} onChange={this.handleDescriptionInput} />
            { this.renderOverwriteDropdown() }
          </div>
          <div className="mr2">
            <Header as="h4">Save the following items</Header>
            <Form.Checkbox disabled={isProcessing} label="Filters" checked={saveDialogInput.includeFilters} onChange={this.handleEnable('includeFilters')} />
            <Form.Checkbox disabled={isProcessing} label="Columns" checked={saveDialogInput.includeColumns} onChange={this.handleEnable('includeColumns')} />
            <Form.Checkbox disabled={isProcessing} label="Search terms" checked={saveDialogInput.includeSearch} onChange={this.handleEnable('includeSearch')} />
            <Form.Checkbox disabled={isProcessing} label="Selected Variants" checked={saveDialogInput.includeSelection} onChange={this.handleEnable('includeSelection')}/>
          </div>
        </Form>
        <Divider/>
        <div className="flex">
          <div className="flex-auto mr2"></div>
          <div>
            <Button className="mr2" disabled={isProcessing} onClick={this.handleCancel}>Cancel</Button>
            <Button disabled={isProcessing || !isValid} loading={isProcessing} color={overwrite? 'red': 'blue'} onClick={this.handleSubmit}>{overwrite? 'Overwrite': 'Save'}</Button>
          </div>
        </div>
      </Segment>
      </div>
    );
  }

  renderOverwriteDropdown() {
    const store = this.getSavesStore();
    const affiliation = this.getAffiliationId();
    const email = _.get(this.props.auth, 'email', null);
    const savesList = store.getSaveableList(email, affiliation) || [];
    if (savesList.length === 0) return null;
    const isProcessing = this.submitting;
    const enabled = this.enableOverwrite;
    const options = _.map(savesList, (save) => {
      return {
        key: save.PK,
        value: save.PK,
        text: save.title,
        s3_archive_key: save.s3_archive_key,
        content: (
          <div className="mb3">
            <Header className="mb2">{ save.title }
              <Header.Subheader className="fs-9">created by { save.userTitle }  <span className="fs-7 ml2"><TimeAgo date={save.date_created}/></span></Header.Subheader>
              <Header.Subheader className="fs-9">gene {save.geneName} </Header.Subheader>
            </Header>
            <span className="fs-9">{ save.description }</span>
          </div>
        ),
      };
    });

    return (
      <div className="flex">
        <div className="mr2 mt1 width-110-px"><Checkbox disabled={isProcessing} checked={enabled} label="Overwrite" onChange={this.handleOverwriteChecked} /></div>
        <Dropdown className="flex-auto" fluid disabled={isProcessing || !enabled} selection options={options} placeholder="Select an existing saved search" onChange={this.handleOverwriteDropDownChange}/>
      </div>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(SaveDialog, {
  submitting: observable,
  submissionError: observable,
  handleSubmit: action,
  handleOverwriteDropDownChange: action,
  handleOverwriteChecked: action,
  handleDone: action,
  handleCancel: action,
  handleTitleInput: action,
  handleDescriptionInput: action,
  loadSavesStore: action,
  selectedExistingSaveId: observable,
  enableOverwrite: observable,
  valid: computed,
  reset: action,
});

const mapStateToProps = state => ({ auth: state.auth });

export default connect(mapStateToProps)(inject('searchSession')(withRouter(observer(SaveDialog))));
