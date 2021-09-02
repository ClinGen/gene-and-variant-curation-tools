// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, getEnv, getSnapshot } from 'mobx-state-tree';

function createFilterManagerType(filtersRegistry) {

  const filterTypes = _.values(filtersRegistry.types);

  // type dispatcher to use with types.union, we basically need to return
  // the correct filter type given a snapshot of the filter type instance
  const filterTypeDispatcher = (snapshot) => {
    const type = snapshot.type;
    return filtersRegistry.types[type];
  };

  // ==================================================================
  // FiltersManager
  // ==================================================================
  const FiltersManager = types.model('FiltersManager', {
    filters: types.optional(types.array(types.union({ dispatcher: filterTypeDispatcher }, ...filterTypes)), []),
  })

  .actions(self => ({
    afterCreate() {
      if (self.filters.length !== 0) return;
      const registry = getEnv(self).filtersRegistry;
      const templates = _.map(registry.defaults, (id) => registry.templates[id]);
      const filters = _.map(templates, (template) => self.createFilter(template));
      self.filters = filters;
    },
    createFilter(template) {
      return template.type.create({ templateId: template.id });
    },
    removeFilter(filterId) {
      const filter = self.getFilter(filterId);
      if (filter) return self.filters.remove(filter);
    },
    reinsertFilter(currentIndex, targetIndex) {
      const current = self.filters[currentIndex];
      const currentSnapshot = getSnapshot(current);
      const template = current.template;
      const newCurrent = template.type.create(currentSnapshot);
      self.filters.splice(currentIndex, 1);
      self.filters.splice(targetIndex, 0, newCurrent);
    },
    insertFilter(filter, index) {
      self.filters.splice(index, 0, filter);
    },
    addFilter(filter) {
      self.filters.push(filter);
    }
  }))

  .views(self => ({
    get enabledFilters() {
      return _.filter(self.filters, (filter) => filter.enabled === true);
    },
    getFilter(filterId) {
      return _.find(self.filters, (filter) => filter.filterId === filterId);
    },
    get sortedTemplates() {
      const registry = getEnv(self).filtersRegistry;
      const templates = Object.assign({}, registry.templates);
      return _.sortBy(templates, ['title']);
    }
  }));

  return FiltersManager;
}


export { createFilterManagerType };
