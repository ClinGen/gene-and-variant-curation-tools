// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types } from 'mobx-state-tree';

// ==================================================================
// TableViews
// ==================================================================
const TableViews = {
  views: {
    'all': {
      title: 'All',
      pass: (tableModel, passedFilter, row) => { return true; },
      isFiltersBased: false, // this indicates if this view should be disabled if there are no filters, in this case it is not
    },
    'matched': {
      title: 'Matched',
      pass: (tableModel, passedFilter, row) => { return passedFilter; },
      isFiltersBased: true, // this indicates if this view should be disabled if there are no filters
    },
    'notMatched': {
      title: 'Not Matched',
      pass: (tableModel, passedFilter, row) => { return !passedFilter; },
      isFiltersBased: true, // this indicates if this view should be disabled if there are no filters
    },
    'selected': {
      title: 'Selected',
      pass: (tableModel, passedFilter, row) => { return !!tableModel.selectionAsMap[`select-${row[tableModel.rowIdName]}`]; },
      isFiltersBased: false, // this indicates if this view should be disabled if there are no filters
    },
  },
  defaultView: 'all',
  ordered: ['selected', 'matched', 'notMatched', 'all'],
};

// ==================================================================
// TableModel
// ==================================================================
const TableModel = types.model('TableModel', {
  rowIdName: 'caid',
  viewName: types.optional(types.string, TableViews.defaultView), // the view name such as 'selected', 'all', 'matched', 'not-matched'
})

.volatile(self => ({
  sorter: undefined,
  searchResult: undefined,
  selectionModel: undefined,
  filtersManager: undefined,
}))

.actions(self => ({
  setViewName(name) {
    self.viewName = name;
  },
  setSorter(sorter) {
    self.sorter = sorter;
  },
  setSearchResult(searchResult) {
    self.searchResult = searchResult;
  },
  setFiltersManager(filtersManager) {
    self.filtersManager = filtersManager;
  },
  setSelectionModel(selectionModel) {
    self.selectionModel = selectionModel;
  },
  select(rowId) {
    self.selectionModel.select(rowId);
  },
  unselect(rowId) {
    self.selectionModel.unselect(rowId);
  },
  toggle(rowId) {
    self.selectionModel.toggle(rowId);
  },
  selectAll() {
    const selectionModel = self.selectionModel;
    const data = self.sortedData.rows;
    for(let index in data) {
      const item = data[index];
      selectionModel.select(`select-${item._id}`);
    }
  },
  unselectAll() {
    const selectionModel = self.selectionModel;
    const data = self.sortedData.rows;
    for(let index in data) {
      const item = data[index];
      selectionModel.unselect(`select-${item._id}`);
    }
  },
}))

.views(self => ({

  isSelected(rowId) {
    return self.selectionModel.isSelected(rowId);
  },

  get selectionSize() {
    return self.selectionModel.size;
  },

  get selectionAsMap() {
    console.log('src/models/table/Table.js - selectionAsMap()');
    const selectionModel = self.selectionModel;
    // turn an array to a map such that the map key and map value is the array element
    // example: [ 'caid0000', 'caid3333' ] => { 'caid0000': 'caid0000', 'caid3333':'caid3333' }
    return _.keyBy(selectionModel.selection, (id) => id);
  },

  get hasFilters() {
    return _.size(self.filtersManager.enabledFilters) > 0;
  },

  get sortedData() {
    // console.log('src/models/table/Table.js - sortedData()');
    const start = Date.now();

    const data = _.get(self.searchResult, 'data', []);
    const hasFilters = self.hasFilters;
    const selectionModel = self.selectionModel;
    let matchCount = hasFilters? 0: undefined;
    let notMatchCount = hasFilters? 0: undefined;
    const filtersStats = {}; // a map of filterId and match, total properties, example:{'<filterId>': { match: 1, total: 10 }}
    const output = [];

    for(let index in data) {
      let passedFilter = false;
      const item = data[index];
      if (hasFilters) {
        const filters = self.filtersManager.enabledFilters;
        _.forEach(filters, (filter) => {
          passedFilter = filter.pass(item);
          const entry = filtersStats[filter.filterId] || { match: 0, total: 0};
          filtersStats[filter.filterId] = entry;
          entry.total += 1;
          if (passedFilter) entry.match += 1;

          return passedFilter; // will stop the _.forEach if the value is false
        });
        item.passed = passedFilter;
        if (passedFilter) {
          matchCount += 1;
        } else {
          notMatchCount += 1;
        }  
      } else {
        delete item.passed;
      }

      const passedView = TableViews.views[self.viewName].pass(self, passedFilter, item);
      if (passedView) output.push(item);
    }

    console.log(`src/models/table/Table.js - sortedData() - time [${(Date.now() - start)/1000}] seconds`);

    return {
      totals: {
        all: _.size(data),
        selected: selectionModel.size,
        matched: matchCount,
        notMatched: notMatchCount,
      },
      rows: output,
      filtersStats,
    };
  },

  get selectedRows() {
    const rows = self.sortedData.rows;
    const selectionMap = self.selectionAsMap;
    const result = _.filter(rows, (row) => !!selectionMap[`select-${row._id}`]);

    return result;
  },
}));

export { TableModel, TableViews };
