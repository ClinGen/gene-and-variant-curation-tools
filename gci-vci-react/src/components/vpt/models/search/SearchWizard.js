// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import { types, getEnv } from 'mobx-state-tree';

import { GeneSearch } from './GeneSearch';
import { CaSearch } from './CaSearch';
import { HgvsSearch } from './HgvsSearch';

import geneSampleData from '../../sample-data/gene-sample-data'; // TODO - remove me before going to production
import { allowSampleData } from '../../helpers/settings';
import { toInternal } from '../../helpers/transformers';

const SearchWizard = types.model('SearchWizard', {
  currentStep: 1,
  status: 'inactive',
  geneSearch: types.optional(GeneSearch, {}),
  caSearch: types.optional(CaSearch, {}),
  hgvsSearch: types.optional(HgvsSearch, {}),
})

.actions(() => ({
  // I had issues using runInAction from mobx
  // the issue is discussed here https://github.com/mobxjs/mobx-state-tree/issues/915
  runInAction(fn) {
    return fn();
  }
}))

.actions(self => ({

  afterCreate: () => {
    if (allowSampleData) self.start();
  },

  enableGeneSampleData: () => {
    if (self.status !== 'active') self.start();
    const type = 'gene';
    const input = 'pah';
    const searched = [input];
    self.geneSearch = GeneSearch.create({
      input,
      searched,
    });
    self.searchSession.setSearchInput({ type, searched });
    const data = {
      // messages: ['WARN||||Not all VCI variants interpretation statuses are accounted for in the search result.'],
      rows: geneSampleData,
    };
    self.searchSession.setSearchResult(toInternal(data, 'pah'));
  },

  enableCaidsSampleData: () => {
    if (self.status !== 'active') self.start();
    const type = 'caids';
    const searched = ['CA607426712', 'CA22225718', 'CA22225719', 'CA22225000', 'CA22225002'];
    self.caSearch = CaSearch.create({
      input: searched.join(','),
      searched,
    });
    self.searchSession.setSearchInput({ type, searched: searched.slice() });
    const data = {
      // messages: ['WARN||||Not all VCI variants interpretation statuses are accounted for in the search result.'],
      rows: geneSampleData,
    };
    self.searchSession.setSearchResult(toInternal(data, 'pah'));
  },

  start: () => {
    self.status = 'active';
    self.clear();
  },

  stop: () => {
    self.status = 'inactive';
    self.clear();
  },

  setStatus: (status) => {
    self.status = status;
  },
  setCurrentStep: (step) => {
    self.currentStep = step;
  },

  clear: () => {
    self.currentStep = 1;
    self.geneSearch.clear();
    self.caSearch.clear();
    self.hgvsSearch.clear();
  }
}))

.views(self => ({
  get searchSession() {
    return getEnv(self).searchSession;
  },

  get processing() {
    return self.geneSearch.processing || self.caSearch.processing || self.hgvsSearch.processing;
  },

  get affiliationIds() {
    const user = self.user;
    if (!user) return [];
    return user.affiliation;
  }
}))

function register(globals) {
  globals.searchWizard = SearchWizard.create({}, globals);
}

export { SearchWizard, register };