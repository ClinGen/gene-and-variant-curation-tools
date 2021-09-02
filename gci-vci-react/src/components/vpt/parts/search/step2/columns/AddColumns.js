// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action, observable, runInAction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Header, Dropdown, Button } from 'semantic-ui-react';

// expected props
// - columnsManager
class AddColumns extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.selectedTemplateIds = [];
    });
  }

  handleSelection = action((event, data = {}) => {
    this.selectedTemplateIds.replace(_.slice(data.value));
  });

  handleAdd = action(() => {
    this.props.onAdd(_.slice(this.selectedTemplateIds));
    this.selectedTemplateIds.clear();
  });

  getManager() {
    return this.props.columnsManager;
  }

  render() {
    const manager = this.getManager();
    const selectedTemplateIds = this.selectedTemplateIds;
    //const selectedTemplateId = _.first(this.selectedTemplateIds);
    const templates = manager.sortedTemplates;
    const buttonDisabled = this.selectedTemplateIds.length === 0;
    const className = (value) => `${value? value: ''}${this.props.className? ` ${this.props.className}`: ''}`;
    const options = _.map(templates, (template) => ({
      key: template.id,
      value: template.id,
      text: template.title,
      content: <div className="mb2">
          <Header as="h5" className="mb1">{ template.title }</Header>
          <div className="fs-9 mt1">{ template.description }</div>
        </div>,
    }));

    return (
      <div className={className('flex')}>
        {/* <Header as="h5" className="mr2 mt1" color="grey">Add Columns</Header> */}
        <Dropdown selection multiple options={options} value={selectedTemplateIds} placeholder="Choose columns" onChange={this.handleSelection} className="mr2 flex-auto"/>
        <div><Button size="tiny" disabled={buttonDisabled} onClick={this.handleAdd} primary className="width-100-px">Add</Button></div>
      </div>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(AddColumns, {
  selectedTemplateIds: observable,
});

export default inject()(withRouter(observer(AddColumns)));