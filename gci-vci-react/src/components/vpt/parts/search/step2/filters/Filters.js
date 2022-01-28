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

import FilterWrapper from './FilterWrapper';
import AddFilter from './AddFilter';

// expected props
// - filtersRegistry (via injection)
// - searchSession (via injection)
// - filtersManager
// - filtersStats
class Filters extends React.Component {

  getFiltersRegistry() {
    return this.props.filtersRegistry;
  }

  getFiltersManager() {
    return this.props.filtersManager;
  }

  getSearchSession() {
    return this.props.searchSession;
  }

  handleDelete = action((model) => {
    const manager = this.getFiltersManager();
    manager.removeFilter(model.filterId);
  });

  handleAdd = action((templateIds = []) => {
    const filtersRegistry = this.getFiltersRegistry();
    const manager = this.getFiltersManager();
    _.forEach(_.concat(templateIds), (id) => {
      // adding a new filter
      const template = filtersRegistry.templates[id];
      if (!template) return;
      const filter = manager.createFilter(template);
      manager.addFilter(filter);
    });

    this.getSearchSession().tableModel.setViewName('matched');
  });

  onDragEnd = action((result) => {
    // see https://egghead.io/lessons/react-persist-list-reordering-with-react-beautiful-dnd-using-the-ondragend-callback
    const { draggableId, destination, source } = result;
    const manager = this.getFiltersManager();
    const filtersRegistry = this.getFiltersRegistry();
    const isFilter = !!manager.getFilter(draggableId); // are we looking at a filter or a template that is being dragged and dropped
    const isTemplate = !isFilter;
    const isFilterSource = source.droppableId === 'selected-filters';
    const isTemplateSource = source.droppableId === 'all-filters';
    const isFilterDestination = destination && destination.droppableId === 'selected-filters';

    if (!destination) {
      // we don't support removal of a filter by dragging it out of its container
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      // we don't need to do anything here
      return;
    }

    if (isFilterSource && isFilterDestination && isFilter) {
      // we are dealing with reordering of the filters
      manager.reinsertFilter(source.index, destination.index);
      return;
    }

    if (isTemplateSource && isFilterDestination && isTemplate) {
      // adding a new filter
      const template = filtersRegistry.templates[draggableId];
      if (!template) return;
      const filter = manager.createFilter(template);
      manager.insertFilter(filter, destination.index);
      return;
    }
  });

  render() {
    console.log('src/parts/search/step2/Filters.js - render()');
    const filtersManager = this.getFiltersManager();
    const filters = filtersManager.filters;
    const size = _.size(filters);

    return (
      <div className="p1">
        { size > 1 && <Message ><i className="icon icon-arrows-v"></i> Drag and drop to reorder the filters</Message>}
        <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="selected-filters">
          { (provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className={`${snapshot.isDraggingOver? 'bg-lightgreen': ''}`}>
              { this.renderSelectedFilters() }
              { provided.placeholder }
            </div>
          )}
        </Droppable>
        </DragDropContext>
        <AddFilter filtersManager={filtersManager} onAdd={this.handleAdd} />
      </div>
    );
  }

  renderSelectedFilters() {
    // console.log('src/parts/search/step2/Columns.js - renderSelectedFilters()');
    const filtersManager = this.getFiltersManager();
    const filters = filtersManager.filters;
    const filtersStats = this.props.filtersStats;
    const getStats = (filterId) => filtersStats[filterId] || {};

    if (_.size(filters) === 0) {
      return null;
    }

    return (<div className="mb2">
      { _.map(filters, (filterModel, index) => <FilterWrapper
          key={filterModel.filterId}
          stats={getStats(filterModel.filterId)}
          index={index}
          model={filterModel}
          onApply={this.handleFiltersApply}
          onDelete={this.handleDelete}/>)
      }
    </div>);
  }
  
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Filters, {
});

export default inject('filtersRegistry', 'searchSession')(withRouter(observer(Filters)));