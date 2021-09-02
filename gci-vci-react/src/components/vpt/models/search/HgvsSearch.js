// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types } from 'mobx-state-tree';

// import { getVariationsByHgvs } from '../../helpers/api';
import { boom } from '../../helpers/errors';

// ==================================================================
// HgvsSearch
// ==================================================================
const HgvsSearch = types.model('HgvsSearch', {
  type: 'hgvs',
  input: '', // this value is the hgvs expressions as the user enters them
  searched: types.optional(types.array(types.string), []), // the list is the parsed hgvs expressions once the search button is clicked
  processing: false,
  error: types.maybe(types.frozen()), // TODO - the error scenarios in this case is more involved
})

.actions(() => ({
  // I had issues using runInAction from mobx
  // the issue is discussed here https://github.com/mobxjs/mobx-state-tree/issues/915
  runInAction(fn) {
    return fn();
  }
}))

.actions(self => ({

  doSearch: async() => {
    self.error = boom.badRequest('This search is not supported yet, but it is coming soon!');
    throw self.error;

    if (_.isEmpty(self.input)) {
      self.error = boom.badRequest('Please provide at least one HGVS expression');
      throw self.error;
    }
    self.processing = true;
    self.error = undefined;
    try {
      // TODO - parse the input into a list of HGVS expressions, remove duplicate and sort them
      // const result = await getVariationsByHgvs(parsedList);
      self.runInAction(() => {
        self.processing = false;
        // self.searched = parsedList
      });
      // return result;
    } catch (error) {
      self.runInAction(() => {
        self.processing = false;
        self.error = error;
      });
      throw error;
    }
  },

  setInput: (text) => {
    self.input = _.trim(text);
    self.error = undefined;
  },

  isSame: (search = {}) => {
    return search.type === self.type && (_.isEmpty(_.difference(search.searched, self.searched)));
  },

  clear: () => {
    self.input = '';
    self.searched = [];
    self.processing = false;
    self.error = undefined;
  }

}))

.views(self => ({
  get errorMessage() {
    if (!self.error) return '';
    return (_.get(self.error, 'friendly') || _.get(self.error, 'message') || 'Something went wrong while contacting the server when search by HGVS, please try again later');
  },
  get searchInput() {
    return {
      type: self.type,
      searched: _.slice(self.searched) || []
    };
  }
}));

export { HgvsSearch };
