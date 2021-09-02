// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, observable, runInAction, action, computed, reaction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Button, Form, Table, Label } from 'semantic-ui-react';
import TimeAgo from 'react-timeago';

import { isTokenExpired, isForbidden } from '../../helpers/errors';
import ErrorBox from '../helpers/ErrorBox';
import LoadResponseDialog from './LoadResponseDialog';

// expected props
// - selectedSave (the save object)
// - mode => either 'searchOnly' or 'any'
// - onDone
// - onCancel
// - disabled
// - app (via injection)
// - searchSession (via injection)
// - userStore (via injection)
class LoadDialogBase extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.submitting = false;
      this.submissionError = '';
      this.response = undefined;
      this.includes = _.slice(this.props.selectedSave.includes, 0);
    });
  }

  componentDidMount() {
    const determineSaveId = () => this.props.selectedSave && this.props.selectedSave.id;
    this.disposer = reaction(determineSaveId, this.handleSelectedSaveChanged);
    this.handleSelectedSaveChanged();
  }

  componentWillUnmount() {
    runInAction(() => {
      this.reset();
      if (this.disposer) this.disposer();
    });
  }

  handleSelectedSaveChanged = () => {
    const includes = (this.props.selectedSave && this.props.selectedSave.includes) || [];
    this.reset();
    this.includes = _.slice(includes || [], 0);
  };

  reset() {
    this.submissionError = '';
    this.submitting = false;
    this.response = undefined;
    // this.includes = [];
  };

  getSearchSession() {
    return this.props.searchSession;
  }

  getUser() {
    return (this.props.userStore && this.props.userStore.user) || {};
  }

  getAffiliationId() {
    return this.getUser().selectedAffiliationId || 'SELF';
  }

  getAffiliationName() {
    // const isAuthenticated = this.props.app.userAuthenticated === true;
    // if (!isAuthenticated) return '';
    // const user = this.props.userStore.user;
    // const affiliation = user.selectedAffiliation;
    // if (affiliation && affiliation.id !== 'SELF') return affiliation.name;
    // return '';
  }

  getMode() {
    return this.props.mode || 'any';
  }

  getSelectedSave() {
    return this.props.selectedSave;
  }

  getIncludes() {
    return this.includes;
  }

  getDisabled() {
    return this.props.disabled || false;
  }

  handleSubmit = async () => {
    this.submissionError = '';
    this.submitting = true;
    this.response = undefined;
    const searchSession = this.getSearchSession();
    const selected = this.getSelectedSave();
    const includes = this.getIncludes();
    try {
      const response = await searchSession.load({
        id: selected.PK,
        includes,
      });
      runInAction(() => {
        this.submitting = false;
        if (response.concluded) {
          this.handleDone();
        } else {
          this.response = response;
        }
      });
    } catch(error) {
      runInAction(() => {
        this.submitting = false;
        if (isForbidden(error) || isTokenExpired(error)) {
          this.submissionError = 'Your session has expired, please login again.';
          // this.props.authentication.clearTokens();
          // this.props.app.setUserAuthenticated(false);
        } else {
          this.submissionError = error.message || 'Something went wrong - authentication issue in /ui/src/parts/saving-loading/LoadDialogBase.js';
        }
      });
    }
  };

  handleDone = () => {
    this.reset();
    this.props.onDone();
  };

  handleCancel = () => {
    this.reset();
    this.props.onCancel();
  };

  handleEnable = (key) => action((event, data) => {
    const mode = this.getMode();
    const enabled = data.checked;
    if (enabled) this.addIncludeKey(key);
    else if (mode === 'searchOnly' && key !== 'search') this.removeIncludeKey(key);
    else if (mode === 'any') this.removeIncludeKey(key);

    if (key === 'selection' && enabled) {
      this.addIncludeKey('search');
    }
    if (key === 'search' && !enabled && mode === 'any') {
      this.removeIncludeKey('selection');
    }

    event.stopPropagation();
  });

  addIncludeKey(key) {
    const includes = this.getIncludes();
    const index = includes.indexOf(key);
    if (index === -1) includes.push(key);
  }

  removeIncludeKey(key) {
    const includes = this.getIncludes();
    const index = includes.indexOf(key);
    if (index !== -1) includes.splice(index, 1);
  }

  get valid() {
    const includes = this.getIncludes();
    const mode = this.getMode();

    if (mode === 'searchOnly' && !includes.includes('search')) return false;
    return includes.length > 0;
  }

  get isSearchOnly() {
    const mode = this.getMode();
    return mode === 'searchOnly';
  }

  render() {
    const submissionError = this.submissionError;
    const isProcessing = this.submitting;
    const isValid = this.valid;
    const isDisabled = this.getDisabled();
    const isSearchOnly = this.isSearchOnly;
    if (this.response && !submissionError) return <LoadResponseDialog response={this.response} onCancel={this.handleCancel} onDone={this.handleDone} />;

    return (
      <div className="animated fadeIn clearfix">
        { submissionError && <ErrorBox error={submissionError}  /> }
        <Form className="mb2" style={{minHeight: '100px'}}>
          { this.renderSelection() }
        </Form>
        {/* <Divider/> */}
        <div className="flex">
          <div className="flex-auto mr2 right-align mt1">{isProcessing && <span className="color-orange">This might take 10 to 300 seconds</span>}</div>
          <div>
            { !isSearchOnly && <Button className="mr2" disabled={isProcessing || isDisabled} onClick={this.handleCancel}>Cancel</Button> }
            <Button disabled={isProcessing || !isValid || isDisabled} loading={isProcessing} color="red" onClick={this.handleSubmit}>Load</Button>
          </div>
        </div>
      </div>
    );
  }

  renderSelection() {
    const selection = this.getSelectedSave();
    if (!selection) return null;
    const includes = this.getIncludes();
    const isProcessing = this.submitting;
    const isSelectable = (key) => selection.includes.includes(key);
    const isSelected = (key) => includes.includes(key);
    const isDisabled = this.getDisabled() || isProcessing;
    const isSearchOnly = this.isSearchOnly;
    const affiliationName = this.getAffiliationName();
    const renderAffiliation = () => {
      if (!affiliationName) return null;
      return (
        <Table.Row>
          <Table.Cell>Affiliation</Table.Cell>
          <Table.Cell>{affiliationName}</Table.Cell>
        </Table.Row>
      );
    };
    const renderSearchTerms = () => {
      const termsCount = selection.termsCount || 0;
      const terms = selection.terms; // remember the terms is a shortened list, where termsCount holds the total count
      if (termsCount === 0) return null;
      const max = terms.length;
      const remaining = termsCount - max;
      const hasRemaining = remaining > 0;
      return (
        <Table.Row>
          <Table.Cell>Search Terms</Table.Cell>
          <Table.Cell>
          { _.map(terms, (caid) => <Label key={caid} className="mr2 mb1">{caid}</Label>) }
          { hasRemaining && <span className="ml1">and {remaining} more not shown here</span> }
          </Table.Cell>
        </Table.Row>
      ); 
    };

    return (
      <div className="mt2">
        
        <Table definition size="small">
          <Table.Body>
            { renderSearchTerms() }
            <Table.Row>
              <Table.Cell className="width-160-px">Title</Table.Cell>
              <Table.Cell>{selection.title}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Description</Table.Cell>
              <Table.Cell>{selection.description}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Created By</Table.Cell>
              <Table.Cell>{selection.userTitle} <span className="fs-7 ml2"><TimeAgo date={selection.last_modified}/></span></Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Gene</Table.Cell>
              <Table.Cell>{selection.geneName}</Table.Cell>
            </Table.Row>
            { renderAffiliation() }
            <Table.Row>
              <Table.Cell>Available Items</Table.Cell>
              <Table.Cell>
                <Form.Checkbox inline disabled={!isSelectable('filters') || isDisabled} label="Filters" checked={isSelected('filters')} onChange={this.handleEnable('filters')} className="mr2" />
                <Form.Checkbox inline disabled={!isSelectable('columns') || isDisabled} label="Columns" checked={isSelected('columns')} onChange={this.handleEnable('columns')} className="mr2" />
                <Form.Checkbox inline disabled={!isSelectable('search') || isSearchOnly || isDisabled} label="Search terms" checked={isSelected('search')} onChange={this.handleEnable('search')} className="mr2" />
                <Form.Checkbox inline disabled={!isSelectable('selection') || isDisabled} label="Selected Variants" checked={isSelected('selection')} onChange={this.handleEnable('selection')} />
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </div>
    );

  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(LoadDialogBase, {
  submitting: observable,
  submissionError: observable,
  handleSubmit: action,
  handleDone: action,
  handleCancel: action,
  valid: computed,
  isSearchOnly: computed,
  reset: action,
  response: observable,
  includes: observable,
  addIncludeKey: action,
  removeIncludeKey: action,
  handleSelectedSaveChanged: action,
});

export default inject('app', 'searchSession')(observer(LoadDialogBase));
