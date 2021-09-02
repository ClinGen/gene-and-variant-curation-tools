// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action, observable, runInAction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Header, Dropdown } from 'semantic-ui-react';

const defaultPlaceHolderId = 'choose-a-column-to-add';

// expected props
// - columnsManager
class AddColumn extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.selectedTemplateId = defaultPlaceHolderId;
    });
  }

  handleSelection = action((event, data = {}) => {
    this.selectedTemplateId = data.value || defaultPlaceHolderId;
    if (this.selectedTemplateId === defaultPlaceHolderId) return;
    this.props.onAdd([this.selectedTemplateId]);
    this.selectedTemplateId = defaultPlaceHolderId;
  });

  getManager() {
    return this.props.columnsManager;
  }

  render() {
    const manager = this.getManager();
    const selectedTemplateId = this.selectedTemplateId;
    const templates = manager.sortedTemplates;
    const options = _.map(templates, (template) => ({
      key: template.id,
      value: template.id,
      text: template.title,
      content: <div className="mb2">
          <Header as="h5" className="mb1">{ template.title }</Header>
          {/* <div className="fs-9 mt1">{ template.description }</div> */}
        </div>,
    }));

    options.unshift({
      key: defaultPlaceHolderId,
      value: defaultPlaceHolderId,
      text: 'Add Column'
    });

    return (
      <Dropdown
        className="icon"
        icon="plus"
        fluid
        // upward
        scrolling
        labeled
        button
        options={options}
        placeholder="Add Column"
        value={selectedTemplateId}
        onChange={this.handleSelection}
      />
    );

  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(AddColumn, {
  selectedTemplateId: observable,
});

export default inject()(withRouter(observer(AddColumn)));