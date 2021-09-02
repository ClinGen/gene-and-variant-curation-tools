// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types } from 'mobx-state-tree';

import { toInternal } from '../../helpers/transformers';
import { QueryHelper } from '../../helpers/query-helper';
import { boom } from '../../helpers/errors';

// given a text that can contain spaces, commas and new lines, return a parsed list of strings where commas and/or spaces are removed and
// the list is split by spaces and/or commas and/or new lines
const parseList = (text = '') => {
  return _.filter(_.split(_.trim(text), /\r\n|\r|\n|\s|,/g), (item) => !_.isEmpty(item));
};

// ==================================================================
// CaSearch
// ==================================================================
const CaSearch = types.model('CaSearch', {
  type: 'caids',
  input: '', // this value is the caids as the user enters them
  searched: types.optional(types.array(types.string), []), // the list is the parsed caids once the search button is clicked
  processing: false,
  review: types.maybe(types.frozen()), // is an object that gets populated if the returned result has a mix result, for
  // example, it could be that we have a few caids that are not found or with errors, or we have caids belonging to
  // different genes.  However, this object will be undefined, if we get a generic overall error such as 'timeout'/'database errors', etc.
  // the shape of this object is:
  // {
  //   hasGroups: true/false,
  //   hasErrors: true/false,
  //   groups: {
  //     "gene name": {
  //       gene: "gene name"
  //       input: [ caid, caid ], the list of caid that belong to this group
  //       result: { errors: [], data: [ {},  ]} as produced by the transformer function
  //     },
  //     ...
  //   }
  //   errors: [{
  //     caid: "caid", status: "notFound"/ "error" / "notSearched", message: "the message"
  //   }, ... ]
  //   isReview: true,
  // }
  error: types.maybe(types.frozen()), // is populated if an overall error is encountered
})

.actions(() => ({
  // I had issues using runInAction from mobx
  // the issue is discussed here https://github.com/mobxjs/mobx-state-tree/issues/915
  runInAction(fn) {
    return fn();
  }
}))

.actions(self => ({

  // output shape is:
  // {
  //   status: 'success'/ 'mixed',
  //   result: { errors: [], data: [] }  // only available if status 'success'
  //   for the case of 'mixed', this model will have a property named 'review' populated accordingly
  //   if there is any overall error, this function will throw an exception
  // }
  doSearch: async() => {
    self.searched = [];
    self.input = _.trim(self.input);
    const parsedList = _.uniq(parseList(self.input));
    if (_.isEmpty(parsedList)) {
      self.error = boom.badRequest('Please provide at least one Canonical Allele Identifier (CAid)');
      throw self.error;
    }

    self.processing = true;
    self.error = undefined;
    self.review = undefined;

    try {
      const queryHelper = new QueryHelper();
      const rawResult = await queryHelper.getVariantsByCaids({ caids: parsedList });
      self.runInAction(() => {
        if (_.isEmpty(rawResult)) {
          self.error = boom.badRequest('No matching CAid is found');
          throw self.error;
        }
        if (rawResult.length === 1 && rawResult[0].status !== 'found') {
          self.error = boom.badRequest(rawResult[0].message || 'Something went wrong - no search result found in /ui/src/models/search/CaSearch.js');
          throw self.error;
        }  
      });

      const result = self.processRawResult(rawResult);

      self.runInAction(() => {
        self.processing = false;
        if (!result.isReview) self.searched = parsedList;
        else self.review = result;
      });

      return result;
    } catch (error) {
      self.runInAction(() => {
        self.processing = false;
        self.error = error;
      });
      throw error;
    }
  },

  setInput: (text) => {
    self.input = text;
    self.error = undefined;
  },

  isSame: (search = {}) => {
    if (_.size(search.searched) !== _.size(self.searched)) return false;
    const diff = _.difference(_.slice(search.searched), _.slice(self.searched));
    return  search.type === self.type && (_.isEmpty(diff));
  },

  processRawResult: (input = {}) => {
    const messages = input.messages;
    const raw = input.rows;
    // Logic
    // - we start by grouping everything into gene groups
    // - a 'review' object is only returned if we have more than one gene groups or we have items in the errors array
    //   otherwise the 'result' object is returned
    let groups = {}; // the key is a gene, the value is an object of the shape { input: [...], result: { errors: [], data: {} }}
    const errors = []; // an array of { "caid": <..>, "status": ..., "message": ... }
  
    _.forEach(raw, (item) => {
      const status = item.status;
      if (status === 'found') {
        const gene = item.gene;
        if (!gene) { 
          errors.push({ caid: item.caid, status: 'error', message: 'This entry was returned by the sever without a gene name'});
          return;
        }
        const entry = groups[gene] || { input: [], rawResult: [] };
        groups[gene] = entry;
        entry.gene = gene;
        entry.input.push(item.caid);
        entry.rawResult.push(item.result);
      } else {
        errors.push({ caid: item.caid, status: item.status, message: item.message });
      }
    });

    // for each group send the raw result through the transformer function
    _.forEach(groups, (entry, gene) => {
      entry.result = toInternal({ messages, rows: entry.rawResult }, gene);
      delete entry.rawResult;
    });

    // time to determine if we need to return a review object or the standard result object
    if (errors.length === 0 && _.size(groups) === 1) {
      return groups[_.keys(groups)[0]].result;
    }

    return {
      hasGroups: _.size(groups) > 0,
      hasErrors: _.size(errors) > 0,
      groups,
      errors,
      isReview: true,
    };
  },

  selectGroup(gene) {
    self.searched = _.slice(self.review.groups[gene].input);
    self.review = undefined;
  },

  cancelReview() {
    self.review = undefined;
  },

  clear: () => {
    self.input = '';
    self.searched = [];
    self.processing = false;
    self.error = undefined;
    self.review = undefined;
  }

}))

.views(self => ({

  get errorMessage() {
    if (!self.error) return '';
    return (_.get(self.error, 'friendly') || _.get(self.error, 'message') || 'Something went wrong while contacting the server when search by CAids, please try again later');
  },

  get searchInput() {
    return {
      type: self.type,
      searched: _.slice(self.searched) || []
    };
  },

}));

export { CaSearch };
