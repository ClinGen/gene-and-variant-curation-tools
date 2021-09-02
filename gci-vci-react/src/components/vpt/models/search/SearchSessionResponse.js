// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types } from 'mobx-state-tree';

import { localColumnStates, localFilterStates } from '../scope/browser-window';

// ==================================================================
// SearchSessionResponse
// ==================================================================
const SearchSessionResponse = types.model('SearchSessionResponse', {
  payload: types.frozen(),
  includes: types.optional(types.array(types.string), []),
  searchResult: types.maybe(types.frozen()),
  concluded: false,
})

.volatile(self => ({
  searchSession: undefined,
  search: undefined,  // this is the search model
}))

.actions(() => ({
  // I had issues using runInAction from mobx
  // the issue is discussed here https://github.com/mobxjs/mobx-state-tree/issues/915
  runInAction(fn) {
    return fn();
  }
}))

.actions(self => ({
  setSearch(search) {
    self.search = search;
  },

  setSearchResult(result) {
    self.searchResult = result;
  },

  setSearchSession(session) {
    self.searchSession = session;
  },

  conclude() {
    const payload = self.payload;
    const session = self.searchSession;

    session.setTitle(payload.title);
    session.setDescription(payload.description);
    session.setIncludes(self.includes);

    if (self.is('filters')) {
      localFilterStates.clear();
      session.setFiltersManager(payload.filtersManager);
    }
    if (self.is('columns')) {
      localColumnStates.clear();
      session.setColumnsManager(payload.columnsManager);
    }

    if (self.is('search')) {
      const searchType = payload.termsType;
      if (self.searchResult) session.setSearchResult(self.searchResult);
      if (searchType === 'gene') {
        session.setSearchInput(payload.searchInput);
      } else if (searchType === 'caids' && self.search) {
        session.setSearchInput({ type: self.search.type, searched: _.slice(self.search.searched) }); // we need this because the user might have accepted a different group
      } // TODO add the 'hgvs' here
    }

    if (self.is('search') && self.is('selection')) {
      const { valid } = self.selections;
      session.setSelectionModel({ selection: valid });
    } else if (self.is('search')) {
      session.setSelectionModel({ selection: [] });
    }

    self.concluded = true;
  }
}))

.views(self => ({
  is(key)  {
    return self.includes.includes(key);
  },

  // returns an object { valid: [,,], invalid: [] }
  get selections() {
    if (!self.is('search') || !self.is('selection') || self.searchResult === undefined) return { valid: [], invalid: [] };
    const existing = _.slice(_.get(self.payload.selectionModel, 'selection', []));
    const map = _.keyBy(existing, (key) => key);
    const valid = [];

    _.forEach(self.searchResult.data, (row) => {
      const caid = row.caid;
      if (_.isEmpty(map)) return false; // stop the loop
      if (map[caid]) {
        valid.push(caid);
        delete map[caid];
      }
    });

    return { valid, invalid: _.keys(map) };
  },

}));


export { SearchSessionResponse };
