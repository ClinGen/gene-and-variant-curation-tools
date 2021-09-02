// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Checkbox, Dropdown, Input, Table } from 'semantic-ui-react';

// expected props
// - model (filterModel)
// - inputModel (FloatInput model)
// - disabled
// - as (either "radio", "checkbox", "none")
// - radioGroup (if 'as' = 'radio')
// - onChange
class FloatInputEditor extends React.Component {

  getModel() {
    // this is the filterModel
    return this.props.model;
  }
  
  getInputModel() {
    return this.props.inputModel;
  }

  handleViewChange = (event, { value: id }) => {
    const inputModel = this.getInputModel();
    const selectedView = inputModel.selectedView || {};
    if (selectedView.id !== 'between' && id !== 'between') {
      // what we are doing here, is copying the value of the current view to the view that the user switching to
      inputModel.getViewById(id).setValue(selectedView.value);
    }
    inputModel.selectViewById(id);
  };

  handleTextInput = (e, { value }) => {
    const inputModel = this.getInputModel();
    const selectedView = inputModel.selectedView || {};
    selectedView.setValue(value);
  };

  handleTextInputFrom = (e, { value }) => {
    const inputModel = this.getInputModel();
    const selectedView = inputModel.selectedView || {};
    selectedView.setFrom(value);
  };

  handleTextInputTo = (e, { value }) => {
    const inputModel = this.getInputModel();
    const selectedView = inputModel.selectedView || {};
    selectedView.setTo(value);
  };

  render() {
    const as = this.props.as;
    const inputModel = this.getInputModel();
    const disabled = this.props.disabled;
    const childDisabled = disabled || !inputModel.selected;
    const radioGroup = this.props.radioGroup;
    const firstComponentProps = { disabled, label: inputModel.title, value: inputModel.value, checked: inputModel.selected, onChange: this.props.onChange };
    const options = _.map(inputModel.views, (view) => ({
      key: view.id,
      value: view.id,
      text: view.title,
    }));
    const selectedView = inputModel.selectedView || {};

    if (as === 'radio') {
      firstComponentProps.radio = true;
      firstComponentProps.name = radioGroup;
    }

    return (<React.Fragment>
      <Table.Cell>
        <Checkbox {...firstComponentProps}/>
      </Table.Cell>
      <Table.Cell>
        <Dropdown selection disabled={childDisabled} options={options} value={selectedView.id} onChange={this.handleViewChange}/>
      </Table.Cell>
      <Table.Cell>
      { selectedView.id === 'between' && this.renderBetween() }
      { selectedView.id !== 'between' && this.renderSingleInput() }
      </Table.Cell>
    </React.Fragment>);
  }

  renderSingleInput() {
    const inputModel = this.getInputModel();
    const disabled = this.props.disabled;
    const childDisabled = disabled || !inputModel.selected;
    const selectedView = inputModel.selectedView || {};

    return (<Input disabled={childDisabled} type="text" value={selectedView.value} onChange={this.handleTextInput}/>);
  }

  renderBetween() {
    const inputModel = this.getInputModel();
    const disabled = this.props.disabled;
    const childDisabled = disabled || !inputModel.selected;
    const selectedView = inputModel.selectedView || {};

    return (<React.Fragment>
      <Input disabled={childDisabled} type="text" value={selectedView.from} onChange={this.handleTextInputFrom} className="mr2"/>
      <span className="mr2">and</span>
      <Input disabled={childDisabled} type="text" value={selectedView.to} onChange={this.handleTextInputTo}/>
      </React.Fragment>);
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(FloatInputEditor, {
  handleViewChange: action,
  handleTextInput: action,
  handleTextInputFrom: action,
  handleTextInputTo: action,
  clearChangesApplied: action,
});

export default inject()(observer(FloatInputEditor));