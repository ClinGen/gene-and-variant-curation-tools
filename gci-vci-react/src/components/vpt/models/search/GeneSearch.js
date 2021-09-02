// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types } from 'mobx-state-tree';
import { RestAPI as API } from '@aws-amplify/api-rest';

import { API_NAME } from '../../../../utils';
import { AmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';
// import { QueryHelper } from '../../helpers/query-helper';
import { toInternal } from '../../helpers/transformers';
import { boom } from '../../helpers/errors';

// ==================================================================
// GeneSearch
// ==================================================================
const GeneSearch = types.model('GeneSearch', {
  type: 'gene',
  input: '', // this value is the gene search term while the user is entering the value
  //searched: '', // this value is the gene search term after the search was successfully performed
  searched: types.optional(types.array(types.string), []), // this value is the gene search term after the search was successfully performed
  processing: false,
  error: types.maybe(types.frozen()),
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
    self.searched.clear();
    self.input = _.trim(self.input);
    if (_.isEmpty(self.input)) {
      self.error = boom.badRequest('The gene name can not be empty');
      throw self.error;
    }
    self.processing = true;
    self.error = undefined;
    try {
      const requestRecycler = new AmplifyAPIRequestRecycler();
      let hgncGroupList = [];
      let urlPartition1, urlPartition2, urlPartition3, urlPartition4, urlPartition5 = ""; // URLs are split by kafka partition number, iterate over set num of "pages"
      for (let page = 0; page < 20; page++) {
        urlPartition1 = `/vpt/search?hgnc_gr=${self.input}_${page}_0`;
        urlPartition2 = `/vpt/search?hgnc_gr=${self.input}_${page}_1`;
        urlPartition3 = `/vpt/search?hgnc_gr=${self.input}_${page}_2`;
        urlPartition4 = `/vpt/search?hgnc_gr=${self.input}_${page}_3`;
        urlPartition5 = `/vpt/search?hgnc_gr=${self.input}_${page}_4`;

        hgncGroupList.push(urlPartition1, urlPartition2, urlPartition3, urlPartition4, urlPartition5);
      }
      const newPromise = async (hgnc_group) => {
        const response = await requestRecycler.capture(API.get(API_NAME, hgnc_group));
        return response;
      };

      //const url = `/vpt/search?=${self.input}`;
      const promiseList = hgncGroupList.map(hgnc_group => newPromise(hgnc_group));
      return Promise.all(promiseList).then((result) => {
        const resultData = [];
        result.forEach((obj) => {
          resultData.push(obj.data);
        });
        let flatData = resultData.flat();
        flatData = _.uniqBy(flatData, 'caId');
        self.runInAction(() => {
          self.processing = false;
          self.searched.replace([self.input]);
        });
        return toInternal(flatData);
      });
      // const queryHelper = new QueryHelper();
      // const result = await queryHelper.getGeneVariants({ geneName: self.input });
      // self.runInAction(() => {
      //   self.processing = false;
      //   self.searched.replace([self.input]);
      // });
      // return result;
    } catch (error) {
      if (API.isCancel(error)) {
        console.log('Cancel');
      }
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
    if (_.size(search.searched) !== _.size(self.searched)) return false;
    const diff = _.difference(_.slice(search.searched), _.slice(self.searched));
    return  search.type === self.type && (_.isEmpty(diff));
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
    return (_.get(self.error, 'friendly') || _.get(self.error, 'message') || 'Something went wrong while contacting the server when search by gene, please try again later');
  },
  get searchInput() {
    return {
      type: self.type,
      searched: _.slice(self.searched) || [],
    };
  },
 
}));

export { GeneSearch };
