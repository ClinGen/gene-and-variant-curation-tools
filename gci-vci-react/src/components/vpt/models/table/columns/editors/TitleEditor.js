// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action } from 'mobx';
import { observer } from 'mobx-react';
import { Input , Form, Label, Breadcrumb, Dimmer } from 'semantic-ui-react';

// expected props
// - model (the columnModel)
// - className (optional)
class TitleEditor extends React.Component {

  getModel() {
    // this is the columnModel
    return this.props.model;
  }

  handleMultilineChange = (e, { checked }) => {
    this.getModel().setMultiline(checked);
  };

  handleInput = action((event, data) => {
    this.getModel().setTitle(data.value);
  });

  render() {
    const disabled = this.props.disabled;
    const model = this.getModel();
    const title = model.title;
    const templateTitle = model.template.title;
    const different = title !== templateTitle;
    const labels = model.labels;
    const configurableMultiline = model.template.configurableMultiline || false;

    return (
      <Form className={this.props.className}>
        <Form.Field>
          { this.renderLabels(labels) }
          <div className="flex">
            <Input disabled={disabled} type="text" placeholder="Please provide a custom header name" fluid={true} value={title} onChange={this.handleInput} />
            { configurableMultiline && <div className="mt1 mr2 ml2 width-120-px nowrap"><Form.Checkbox label="Multiple Lines" checked={model.multiline} onChange={this.handleMultilineChange}/></div> }
          </div>
          { different && <Label className="mt1" size="mini"><b>{templateTitle}</b></Label> }
        </Form.Field>
      </Form>
    );
  }

  renderLabels(labels) {
    const size = _.size(labels);
    if (size === 0) return null;
    const disabled = this.props.disabled;

    return (
      <Dimmer.Dimmable className="ml1 mb1">
      <Dimmer active={disabled} inverted/>
      <Breadcrumb size="mini">
        { _.map(labels, (label, index) => (
          <React.Fragment key={index}>
            { index !== 0 ? <Breadcrumb.Divider icon="right angle" /> : null }
            <Breadcrumb.Section >{label}</Breadcrumb.Section>
          </React.Fragment>))
        }
      </Breadcrumb>
      </Dimmer.Dimmable>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(TitleEditor, {
  handleMultilineChange: action,
});

export default observer(TitleEditor);