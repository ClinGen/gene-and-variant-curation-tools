// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { Message } from 'semantic-ui-react';

import ColumnWrapper from './ColumnWrapper';
import AddColumn from './AddColumn';

// expected props
// - columnsRegistry (via injection)
// - columnsManager
class Columns extends React.Component {

  getColumnsRegistry() {
    return this.props.columnsRegistry;
  }

  getColumnsManager() {
    return this.props.columnsManager;
  }

  handleDelete = action((model) => {
    const manager = this.getColumnsManager();
    manager.removeColumn(model.columnId);
  });

  handleAdd = action((templateIds = []) => {
    const columnsRegistry = this.getColumnsRegistry();
    const manager = this.getColumnsManager();
    _.forEach(_.concat(templateIds), (id) => {
      // adding a new column
      const template = columnsRegistry.templates[id];
      if (!template) return;
      const column = manager.createColumn(template);
      manager.addColumn(column);
    });
  });

  onDragEnd = action((result) => {
    // see https://egghead.io/lessons/react-persist-list-reordering-with-react-beautiful-dnd-using-the-ondragend-callback
    const { draggableId, destination, source } = result;
    const manager = this.getColumnsManager();
    const columnsRegistry = this.getColumnsRegistry();
    const isColumn = !!manager.getColumn(draggableId); // are we looking at a column or a template that is being dragged and dropped
    const isTemplate = !isColumn;
    const isColumnSource = source.droppableId === 'selected-columns';
    const isTemplateSource = source.droppableId === 'all-columns';
    const isColumnDestination = destination && destination.droppableId === 'selected-columns';

    if (!destination) {
      // we don't support removal of a column by dragging it out of its container
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      // we don't need to do anything here
      return;
    }

    if (isColumnSource && isColumnDestination && isColumn) {
      // we are dealing with reordering of the columns
      manager.reinsertColumn(source.index, destination.index);
      return;
    }

    if (isTemplateSource && isColumnDestination && isTemplate) {
      // adding a new column
      const template = columnsRegistry.templates[draggableId];
      if (!template) return;
      const column = manager.createColumn(template);
      column.setShowDetail(template.observed.showDetail);
      manager.insertColumn(column, destination.index);
      return;
    }
  });

  render() {
    console.log('src/parts/search/step2/Columns.js - render()');
    const columnsManager = this.getColumnsManager();
    const columns = columnsManager.columns;
    const size = _.size(columns);

    return (
      <div className="p1">
        { size > 1 && <Message ><i className="icon icon-arrows-v"></i> Drag and drop to reorder the columns</Message>}
        <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="selected-columns">
          { (provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className={`${snapshot.isDraggingOver? 'bg-lightgreen': ''}`}>
              { this.renderSelectedColumns() }
              { provided.placeholder }
            </div>
          )}
        </Droppable>
        </DragDropContext>
        <AddColumn columnsManager={columnsManager} onAdd={this.handleAdd} />
      </div>
    );
  }

  renderSelectedColumns() {
    // console.log('src/parts/search/step2/Columns.js - renderSelectedColumns()');
    const columnsManager = this.getColumnsManager();
    const columns = columnsManager.columns;
    if (_.size(columns) === 0) {
      return null;
    }

    return (<div className="mb2">
      { _.map(columns, (colModel, index) => <ColumnWrapper key={colModel.columnId} index={index} model={colModel} onDelete={this.handleDelete}/>)}
    </div>);
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Columns, {
});

export default inject('columnsRegistry')(withRouter(observer(Columns)));