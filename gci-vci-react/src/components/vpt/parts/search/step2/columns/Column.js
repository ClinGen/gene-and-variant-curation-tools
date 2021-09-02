// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { decorate, action, computed } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Segment, Accordion, Icon, Checkbox } from 'semantic-ui-react';

import { localColumnStates } from '../../../../models/scope/browser-window';

// expected props
// - model (the columnModel)
// - onDelete
// - provided (drag and drop provided object from react-beautiful-dnd)
// - snapshot (drag and drop provided object from react-beautiful-dnd)
class Column extends React.Component {

  get showDetail() {
    const id = this.getModel().columnId;
    return localColumnStates.get(id).showDetail || false;
  }

  handleClick = action(() => {
    const id = this.getModel().columnId;
    localColumnStates.get(id).showDetail = !this.showDetail
  });

  handleEnable = action((event, data) => {
    const model = this.getModel();
    model.setEnabled(data.checked);
    event.stopPropagation();
  });

  handleDelete = action((event) => {
    event.stopPropagation(); // this was needed, otherwise, the handleClick was called after
                             // which resulted in mobx state tree warning about instance being accessed after being deleted
    const model = this.getModel();
    this.props.onDelete(model);
  });

  getModel() {
    // this is the columnModel
    return this.props.model;
  }

  render() {
    const model = this.getModel();
    const provided = this.props.provided;

    return (
      <div {...provided.dragHandleProps} ref={provided.innerRef} {...provided.draggableProps} className={this.props.className}>
        <Segment size="small" className="p0 pl1 flex">
          {this.renderColumn(model)}
        </Segment>
        { provided.placeholder }
      </div>
    );
  }

  renderColumn(model) {
    const opened = this.showDetail;
    const editor = model.editor;
    const disabled = !model.enabled;

    return (
      <Accordion className="flex-auto overflow-hidden pr1">
        <Accordion.Title active={opened} index={0} onClick={this.handleClick}>
          <div className="flex">
            <div className="ml1 mr1 mt-1 cursor-grab" ><Icon name="align justify" color="grey"/></div>
            <div className="mr1 mt-2"><Checkbox checked={model.enabled} onChange={this.handleEnable} /></div>
            <Icon name="dropdown" className="mt-3"/>
            <div className={`ellipsis flex-auto mt-1 ${disabled? 'opacity-45': ''}`}>{model.title}</div>
            <div className="pl1 pr1" onClick={ this.handleDelete }><Icon name="trash alternate outline" className="cursor-pointer" /></div>
          </div>
        </Accordion.Title>
        <Accordion.Content active={opened} className="p1 mb1">
          {editor}
        </Accordion.Content>
      </Accordion>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Column, {
  showDetail: computed,
});

export default inject()(withRouter(observer(Column)));