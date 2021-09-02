// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, getEnv, getSnapshot } from 'mobx-state-tree';

function createColumnManagerType(columnsRegistry) {

  const columnTypes = _.values(columnsRegistry.types);

  // type dispatcher to use with types.union, we basically need to return
  // the correct column type given a snapshot of the column type instance
  const columnTypeDispatcher = (snapshot) => {
    const type = snapshot.type;
    return columnsRegistry.types[type];
  };

  // ==================================================================
  // ColumnsManager
  // ==================================================================
  const ColumnsManager = types.model('ColumnsManager', {
    columns: types.optional(types.array(types.union({ dispatcher: columnTypeDispatcher }, ...columnTypes)), []),
  })

  .actions(self => ({
    afterCreate() {
      if (self.columns.length !== 0) return;
      const registry = getEnv(self).columnsRegistry;
      const templates = _.map(registry.defaults, (id) => registry.templates[id]);
      const columns = _.map(templates, (template) => self.createColumn(template));
      self.columns = columns;
    },
    createColumn(template) {
      return template.type.create({ templateId: template.id });
    },
    removeColumn(colId) {
      const col = self.getColumn(colId);
      if (col) return self.columns.remove(col);
    },
    reinsertColumn(currentIndex, targetIndex) {
      const current = self.columns[currentIndex];
      const currentSnapshot = getSnapshot(current);
      const template = current.template;
      const newCurrent = template.type.create(currentSnapshot);
      self.columns.splice(currentIndex, 1);
      self.columns.splice(targetIndex, 0, newCurrent);
    },
    insertColumn(column, index) {
      self.columns.splice(index, 0, column);
    },
    addColumn(column) {
      self.columns.push(column);
    }
  }))

  .views(self => ({
    get enabledColumns() {
      return _.filter(self.columns, (col) => col.enabled === true);
    },
    getColumn(colId) {
      return _.find(self.columns, (col) => col.columnId === colId);
    },
    get sortedTemplates() {
      const registry = getEnv(self).columnsRegistry;
      const templates = Object.assign({}, registry.templates);
      return _.sortBy(templates, ['title']);
    }
  }));

  return ColumnsManager;
}


export { createColumnManagerType };
