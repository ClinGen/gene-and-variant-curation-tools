// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, applySnapshot, getSnapshot } from 'mobx-state-tree';
import { RestAPI as API } from '@aws-amplify/api-rest';

import { API_NAME } from '../../../../utils';
import { AmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';
import { SelectionModel } from '../table/Selection';
import { TableModel } from '../table/Table';
import { CaSearch } from './CaSearch';
import { GeneSearch } from './GeneSearch';
import { SearchInput } from './SearchInput';
import { SearchSessionResponse } from './SearchSessionResponse';

function createSearchSession(globals) {

  const filtersRegistry = globals.filtersRegistry;
  const columnsRegistry = globals.columnsRegistry;

  // ==================================================================
  // SearchSession
  // ==================================================================
  const SearchSession = types.model('SearchSession', {
    title: '', // title of the search session if it is saved or loaded
    description: '', // description of the search session if it is saved or loaded
    // id: '',

    // allowed values are: 'search', 'filters', 'columns', 'selection'
    includeFilters: true,
    includeColumns: true,
    includeSearch: true,
    includeSelection: true,

    searchInput: types.maybe(SearchInput),
    columnsManager: types.maybe(columnsRegistry.managerType),
    filtersManager: types.maybe(filtersRegistry.managerType),
    selectionModel: types.maybe(SelectionModel),
    tableModel: types.maybe(TableModel)
  })

  .volatile(self => ({
    searchResult: undefined,
  }))

  .actions(() => ({
    // I had issues using runInAction from mobx
    // the issue is discussed here https://github.com/mobxjs/mobx-state-tree/issues/915
    runInAction(fn) {
      return fn();
    }
  }))

  .actions(self => ({
    afterCreate() {
      if (!self.columnsManager) {
        self.columnsManager = columnsRegistry.managerType.create({}, globals);
      }

      if (!self.filtersManager) {
        self.filtersManager = filtersRegistry.managerType.create({}, globals);
      }

      if (!self.selectionModel) {
        self.selectionModel = SelectionModel.create({}, globals);
      }

      if (!self.tableModel) {
        self.tableModel = TableModel.create({}, globals);
        self.tableModel.setSelectionModel(self.selectionModel);
        self.tableModel.setSearchResult(self.searchResult);
        self.tableModel.setFiltersManager(self.filtersManager);
      }

    },

    setTitle(title) {
      self.title = title;
    },

    setDescription(desc) {
      self.description = desc;
    },

    setId(id) {
      self.id = id;
    },

    setSearchResult(result) {
      self.searchResult = result;
      self.tableModel.setSearchResult(self.searchResult);
    },

    setSearchInput(searchInput) {
      if (self.searchInput) {
        applySnapshot(self.searchInput, searchInput);
      } else {
        self.searchInput = SearchInput.create(searchInput, globals);
      }
    },

    setColumnsManager(columnsManager) {
      if (self.columnsManager) {
        applySnapshot(self.columnsManager, columnsManager);
      } else {
        self.columnsManager = columnsRegistry.managerType.create(columnsManager, globals);
      }
    },

    setFiltersManager(filtersManager) {
      if (self.filtersManager) {
        applySnapshot(self.filtersManager, filtersManager);
      } else {
        self.filtersManager = filtersRegistry.managerType.create(filtersManager, globals);
        self.tableModel.setFiltersManager(self.filtersManager);
      }
    },

    setSelectionModel(selectionModel) {
      if (self.selectionModel) {
        applySnapshot(self.selectionModel, selectionModel);
      } else {
        self.selectionModel = SelectionModel.create(selectionModel, globals);
        self.tableModel.setSelectionModel(self.selectionModel);
      }
    },

    setIncludes(includes = []) {
      self.resetIncludes();
      const map = {};
      _.forEach(includes, item => {
        map[item] = true;
      });

      // 'search', 'filters', 'columns', 'selection'
      if (map['search']) self.includeSearch = true;
      if (map['filters']) self.includeFilters = true;
      if (map['columns']) self.includeColumns = true;
      if (map['selection']) self.includeSelection = true;
    },

    resetIncludes() {
      self.includeFilters = true;
      self.includeColumns = true;
      self.includeSearch = true;
      self.includeSelection = true;
    },

    save: async({ id, title, description, s3_archive_key, affiliation, auth, includes = [] }) => {
      const map = {};
      const payload = {};
      _.forEach(includes, (item) => { map[item] = true; });

      const data = {
        PK: id,
        title, 
        description,
        s3_archive_key,
        includes,
        payload,
        geneName: _.get(self.searchResult, 'data[0].gene'),
      };


      if (affiliation) data.affiliation = affiliation;
      

      data.email = auth.email;
      data.userTitle = `${_.get(auth, 'name')} ${_.get(auth, 'family_name')}`;
      if (map['filters']) {
        payload.filtersManager = getSnapshot(self.filtersManager);
      }
      if (map['columns']) {
        payload.columnsManager = getSnapshot(self.columnsManager);
      }
      if (map['search']) {
        data.termsType = self.searchInput.type;
        data.termsCount = self.searchInput.searched.length;
        data.terms = _.slice(self.searchInput.searched, 0, 30);
        payload.searchInput = getSnapshot(self.searchInput);
      }
      if (map['selection']) {
        payload.selectionModel = getSnapshot(self.selectionModel);
      }

      try {
        const requestRecycler = new AmplifyAPIRequestRecycler();
        const isNew = _.isEmpty(id);
        const url = isNew
          ? '/vpt/saves'
          : `/vpt/saves/${id}`;
        const params = { body: { data } };
        let response;
        if (isNew) {
          response = await requestRecycler.capture(API.post(API_NAME, url, params));
        } else {
          response = await requestRecycler.capture(API.put(API_NAME, url, params))
        }
        return response;
      } catch (error) {
        if (API.isCancel(error)) {
          console.log('Cancel');
        }
        throw error;
      } finally {
        self.runInAction(() => {
          self.title = title;
          self.description = description;
          self.id = id;
          self.setIncludes(includes);
        });
      }

      // if (id) {
      //   await putSaves(id, data);
      // } else {
      //   await postSaves(data);
      // }

      // copy values to session data
    },

    load: async({ id, includes }) => {
      const map = _.keyBy(includes, (key) => key);
      const is = (key) => !!map[key];
      try {
        const requestRecycler = new AmplifyAPIRequestRecycler();
        const url = `/vpt/saves/${id}/complete`;
        const save = await requestRecycler.capture(API.get(API_NAME, url));
        const payload = save && save.payload ? save.payload : null;
        const s3_archive_key = save && save.s3_archive_key ? save.s3_archive_key : null;
        const response = SearchSessionResponse.create({ includes, payload });
        response.setSearchSession(self);

        if (is('search')) {
          let search;
          const input = payload.searchInput;
          if (input.type === 'gene') {
            search = GeneSearch.create({ input: input.searched.join('') }, globals);
          } else if (input.type === 'caids') {
            search = CaSearch.create({ input: input.searched.join(',') }, globals);
          }
          response.setSearch(search);
          const result = await search.doSearch();
          
          if (result && !result.isReview) {
            response.setSearchResult(result);
            const { invalid } = response.selections;
            if (_.isEmpty(invalid)) response.conclude();
          }
        } else {
          response.conclude();
        }

        return response;
      } catch (error) {
        if (API.isCancel(error)) {
          console.log('Cancel');
        }
        throw error;
      } finally {
        self.runInAction(() => {
          self.id = id;
        });
      }
    }
  }))

  .views(self => ({
    get includes() {
      const result = [];
      const add = (key) => result.push(key);
  
      if (self.includeFilters) add('filters');
      if (self.includeColumns) add('columns');
      if (self.includeSearch) add('search');
      if (self.includeSelection) add('selection');
  
      return result;
    },
    get geneName() {
      const data = _.get(self.searchResult, 'data', []);
      return _.get(data, '[0].gene', '');
    }
  }));

  return SearchSession.create({}, globals);
}

function postRegister(globals) {
  globals.searchSession = createSearchSession(globals) || {};
}

export { createSearchSession, postRegister };
