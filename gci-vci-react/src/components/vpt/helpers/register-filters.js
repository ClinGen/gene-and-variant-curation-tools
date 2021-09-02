// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

// We can only do this trick thanks to Webpack
// see https://github.com/webpack/docs/wiki/context

function requireAll(requireContext) {
  return requireContext.keys().map(requireContext);
}

function register(filtersRegistry) {
  // requires and returns all modules that match
  const modules = requireAll(require.context("../models", true, /^\.\/.*\.js$/));

  // is an array containing all the matching modules
  _.forEach(modules, (model) => {
    if (_.isFunction(model.registerFilters)) model.registerFilters(filtersRegistry);
  });
}

export default register;
