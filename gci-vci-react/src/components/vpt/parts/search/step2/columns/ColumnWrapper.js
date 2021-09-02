// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { decorate } from 'mobx';
import { observer } from 'mobx-react';
import { Draggable } from 'react-beautiful-dnd';

import Column from './Column';

// NOTE: the ColumnWrapper is needed so that state changes will result in rendering (via mobx) with drag and drop

// expected props
// - model (the columnModel)
// - index (important)
// - onDelete
// - provided (drag and drop provided object from react-beautiful-dnd)
// - snapshot (drag and drop provided object from react-beautiful-dnd)
class ColumnWrapper extends React.Component {

  render() {
    const { index, model, onDelete } = this.props;

    return (
      <Draggable draggableId={model.columnId} index={index}>
      { (provided, snapshot) => (
        <Column provided={provided} snapshot={snapshot} model={model} onDelete={onDelete} className="mb1"/>
      ) }
      </Draggable>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(ColumnWrapper, {
});

export default observer(ColumnWrapper);