// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import { types } from 'mobx-state-tree';

// ==================================================================
// SearchInput
// ==================================================================
const SearchInput = types.model('SearchInput', {
  type: '',
  searched: types.optional(types.array(types.string), []),
  // TODO - maybe we need the gene name?
});

export { SearchInput };