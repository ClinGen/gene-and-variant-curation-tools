// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Table, Checkbox, Header, Dimmer, Grid } from 'semantic-ui-react';

import StringOptionEditor from './StringOptionEditor';
import FloatInputEditor from './FloatInputEditor';

const groupTypeToAs = {
  'oneOf': 'radio',
  'or': 'checkbox',
  'and': 'checkbox'
};

// expected props
// - model (filterModel)
// - inputModel (InputGroup model)
// - disabled
// - as (either "radio", "checkbox", "none")
// - radioGroup (if 'as' = 'radio')
// - parentLayout (optional)
// - onChange
// - className (optional)
class InputGroupEditor extends React.Component {

  getModel() {
    // this is the filterModel
    return this.props.model;
  }
  
  getInputModel() {
    return this.props.inputModel;
  }

  getParentLayout() {
    return this.props.parentLayout || { type: 'table', columns: 3 };
  }

  getLayout() {
    const inputModel = this.getInputModel();
    return inputModel.layout;
  }

  handleRadioChange = (childId) => action(() => {
    const inputModel = this.getInputModel();
    inputModel.selectChildById(childId);
  });

  handleCheckboxChange = (childId) => action((event, { checked }) => {
    const inputModel = this.getInputModel();
    if (checked) inputModel.selectChildById(childId);
    else inputModel.unselectChildById(childId);
  });

  render() {
    const model = this.getModel();
    const inputModel = this.getInputModel();
    const layout = this.getLayout();
    const isGrid = layout.type === 'grid';
    const disabled = this.props.disabled;
    const childDisabled = disabled || !inputModel.selected;
    const childAs = groupTypeToAs[inputModel.groupType];
    const childRadioGroup = `rg-${inputModel.id}`;
    const handler = (childId) => {
      if (childAs === 'radio') return this.handleRadioChange(childId);
      return this.handleCheckboxChange(childId);
    }
    const props = (child) => ({ model, inputModel: child, disabled: childDisabled, radioGroup: childRadioGroup, as: childAs, onChange: handler(child.id), parentLayout: layout });

    const children = _.map(inputModel.children, (child, index) => {
      const type = child.type;
      if (type === 'StringOption') return <StringOptionEditor className="block" {...props(child)}/>;
      if (type === 'FloatInput') return <FloatInputEditor className="block" {...props(child)}/>;
      if (type === 'InputGroup') return <InputGroupEditor className="block" {...props(child)}/>;
    });

    if (isGrid) return this.renderAsGrid(children);
    return this.renderAsTable(children);
  }

  renderAsGrid(children) {
    const inputModel = this.getInputModel();
    const columns = inputModel.layout.columns || 2;
    const display = inputModel.display;
    const displayIsInput = display === 'input';
    const displayIsLabel = display === 'label';
    const parentLayout = this.getParentLayout();
    const className = (value) => `${value? value: ''}${this.props.className? ` ${this.props.className}`: ''}`;
    const content = (
      <React.Fragment>
        { displayIsInput && this.renderSelfAsInput() }
        { displayIsLabel && this.renderSelfAsLabel() }
        <Grid columns={columns} className={className((displayIsInput || displayIsLabel)? 'mt1' : '')}>
          {_.map(children, (child, index) => <Grid.Column key={index}>{child}</Grid.Column>)}
        </Grid>
      </React.Fragment>);

    if (parentLayout.type === 'grid') return <div>{content}</div>;    
    return (
      <Table.Cell colSpan="3">
      {content}
      </Table.Cell>
    );
  }

  renderAsTable(children) {
    const inputModel = this.getInputModel();
    const display = inputModel.display;
    const displayIsInput = display === 'input';
    const displayIsLabel = display === 'label';
    const className = (value) => `${value? value: ''}${this.props.className? ` ${this.props.className}`: ''}`;
    const parentLayout = this.getParentLayout();
    const content = (
      <React.Fragment>
        { displayIsInput && this.renderSelfAsInput() }
        { displayIsLabel && this.renderSelfAsLabel() }
        <Table basic="very" className={className((displayIsInput || displayIsLabel)? 'ml3' : '')}>
          <Table.Body>
            {_.map(children, (child, index) => <Table.Row key={index}>{child}</Table.Row>)}
          </Table.Body>
        </Table>
      </React.Fragment>
    );

    if (parentLayout.type === 'grid') return <div>{content}</div>;    
    return (
      <Table.Cell colSpan="3">
      {content}
      </Table.Cell>
    );
  }

  renderSelfAsInput() {
    const as = this.props.as;
    const inputModel = this.getInputModel();
    const disabled = this.props.disabled;
    const radioGroup = this.props.radioGroup;
    const firstComponentProps = { disabled, label: inputModel.title, value: inputModel.value, checked: inputModel.selected, onChange: this.props.onChange };
    if (as === 'radio') {
      firstComponentProps.radio = true;
      firstComponentProps.name = radioGroup;
    }

    return <Checkbox {...firstComponentProps}/>;
  }

  renderSelfAsLabel() {
    const inputModel = this.getInputModel();
    const disabled = this.props.disabled;

    return (
      <Dimmer.Dimmable dimmed={disabled}>
        <Dimmer active={disabled} inverted />
        <Header as="h5" block className="center p1 m0">
          {inputModel.title}
        </Header>        
      </Dimmer.Dimmable>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(InputGroupEditor, {
  clearChangesApplied: action,
});

export default inject('filtersRegistry')(observer(InputGroupEditor));