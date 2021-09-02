// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, runInAction, observable, action, computed, reaction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { getSnapshot } from 'mobx-state-tree';
import { Button, Form, Table } from 'semantic-ui-react';

import { localFilterStates } from '../../../scope/browser-window';
import InputGroupEditor from './InputGroupEditor';

// expected props
// - filtersRegistry (via injection)
// - model (the filterModel)
class InputGroupsEditor extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      const determineScope = () => this.getScopedState().inputGroups;
      this.disposer = reaction(determineScope, this.prepare);
      this.prepare(determineScope());
    });
  }

  prepare = (scoped) => {
    if (scoped) {
      this.inputGroups = scoped;
    } else {
      this.copyInputGroups();
    }
  }

  componentWillUnmount() {
    runInAction(() => {
      if (this.disposer) {
        this.disposer();
      }
    });
  }

  getScopedState() {
    const id = this.getModel().filterId;
    return localFilterStates.get(id);
  }

  getFiltersRegistry() {
    return this.props.filtersRegistry;
  }

  getModel() {
    // this is the filterModel
    return this.props.model;
  }

  copyInputGroups() {
    const model = this.getModel();
    this.inputGroups = _.map(model.inputGroups, (inputGroup) => inputGroup.makeCopy())
    this.getScopedState().inputGroups = this.inputGroups;
  }
  
  handleApply = () => {
    const model = this.getModel();
    _.forEach(this.inputGroups, (inputGroup) => { inputGroup.normalizeInput(); });
    const snapshot = _.map(this.inputGroups, (inputGroup) => getSnapshot(inputGroup));
    model.setInputGroups(snapshot);
    this.copyInputGroups();
    this.getScopedState().changesApplied = true;
    // console.log(snapshot);
  };

  handleCancel = () => {
    this.copyInputGroups();
    this.getScopedState().changesApplied = false;
  };

  get changed() {
    const inputGroupsJson = JSON.stringify(_.map(this.inputGroups, (inputGroup) => getSnapshot(inputGroup)));
    const modelInputGroupJson = JSON.stringify(getSnapshot(this.getModel().inputGroups));
    return inputGroupsJson !== modelInputGroupJson;
  }

  render() {
    const model = this.getModel();
    const disabled = !model.enabled;
    const inputGroups = this.inputGroups;
    const changed = this.changed;
    const changesApplied = this.getScopedState().changesApplied;
    
    return (
      <Form className="mb2 pl2 pr2 clearfix">
        <Table basic="very">
          <Table.Body>
          { _.map(inputGroups, (inputGroup, index) => <Table.Row key={index}><InputGroupEditor as="none" model={model} inputModel={inputGroup} disabled={disabled} /></Table.Row>) }
          </Table.Body>
        </Table>

        <Button floated="right" size="tiny" disabled={!changed || disabled} onClick={this.handleApply} primary>Apply</Button>
        <Button floated="right" size="tiny" disabled={!changed || disabled} className="mr2" onClick={this.handleCancel}>Cancel</Button>
        { !changed && changesApplied && <div className="left-align mr2 color-green float-right mt1">All changes have been applied!</div> }
        { changed && <div className="right-align mr2 color-red float-right mt1">There are changes that are not applied!</div>}
      </Form>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(InputGroupsEditor, {
  inputGroups: observable,
  handleApply: action,
  handleCancel: action,
  changed: computed,
});

export default inject('filtersRegistry')(observer(InputGroupsEditor));