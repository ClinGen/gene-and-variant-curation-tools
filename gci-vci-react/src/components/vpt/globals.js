// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import { observable } from 'mobx';

import registerModels from './helpers/register-globals';
import columnsRegistryProvider from './models/table/columns/registry-provider';
import filtersRegistryProvider from './models/table/filters/registry-provider';
import postRegister from './helpers/post-register';

let globals = observable({});

const initializeGlobals = () => {
  const globalsHolder = {
    disposers: {},
    intervalIds: {},
  };

  registerModels(globalsHolder);
  globalsHolder.columnsRegistry = columnsRegistryProvider(globalsHolder);
  globalsHolder.filtersRegistry = filtersRegistryProvider(globalsHolder);
  postRegister(globalsHolder);

  Object.assign(globals, globalsHolder); // this is to ensure that it is the same globals reference whether initializeGlobals is called or not
  return globalsHolder;
};

export  { globals, initializeGlobals }
