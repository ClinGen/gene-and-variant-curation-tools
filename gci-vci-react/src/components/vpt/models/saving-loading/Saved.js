// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import { types } from 'mobx-state-tree';

// ==================================================================
// Saved
// ==================================================================
const Saved = types.model('Saved', {
  PK: '',
  email: '',
  affiliation: '',
  title: '',
  userTitle: '',
  description: '',
  date_created: '',
  last_modified: '',
  geneName: '',
  termsCount: 0,
  terms: types.optional(types.array(types.string), []),
  includes: types.optional(types.array(types.string), []),
})

.views(self => ({
  get searchable() {
    return self.includes.includes('search');
  }
}));

export { Saved };