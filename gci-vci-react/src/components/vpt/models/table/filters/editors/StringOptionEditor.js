// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { decorate } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Checkbox, Table } from 'semantic-ui-react';

// expected props
// - model (filterModel)
// - inputModel (StringOption model)
// - disabled
// - as (either "radio", "checkbox", "none")
// - radioGroup (if 'as' = 'radio')
// - parentLayout (optional)
// - onChange
class StringOptionEditor extends React.Component {

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

  render() {
    const as = this.props.as;
    const inputModel = this.getInputModel();
    const disabled = this.props.disabled || inputModel.disabled;
    const radioGroup = this.props.radioGroup;
    const parentLayout = this.getParentLayout();
    const firstComponentProps = { disabled, fitted: false,label: inputModel.title, value: inputModel.value, checked: inputModel.selected, onChange: this.props.onChange };
    if (as === 'radio') {
      firstComponentProps.radio = true;
      firstComponentProps.name = radioGroup;
    }

    if (parentLayout.type === 'grid') return <Checkbox {...firstComponentProps}/>;
    return <React.Fragment><Table.Cell><Checkbox {...firstComponentProps}/></Table.Cell><Table.Cell></Table.Cell><Table.Cell></Table.Cell></React.Fragment>;
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(StringOptionEditor, {
});

export default inject()(observer(StringOptionEditor));