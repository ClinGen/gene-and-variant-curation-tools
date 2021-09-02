// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { decorate } from 'mobx';
import { observer } from 'mobx-react';
import { Draggable } from 'react-beautiful-dnd';

import Filter from './Filter';

// NOTE: the FilterWrapper is needed so that state changes will result in rendering (via mobx) with drag and drop

// expected props
// - model (the filterModel)
// - index (important)
// - stats
// - onDelete
// - provided (drag and drop provided object from react-beautiful-dnd)
// - snapshot (drag and drop provided object from react-beautiful-dnd)
class FilterWrapper extends React.Component {

  render() {
    const { index, model, stats, onDelete } = this.props;

    return (
      <Draggable draggableId={model.filterId} index={index}>
      { (provided, snapshot) => (
        <Filter provided={provided} snapshot={snapshot} model={model} stats={stats} onDelete={onDelete} className="mb1 h-100"/>
      ) }
      </Draggable>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(FilterWrapper, {
});

export default observer(FilterWrapper);