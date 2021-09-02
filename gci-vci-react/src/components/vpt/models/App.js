// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import { types } from 'mobx-state-tree';
import { Startup } from './Startup';

const App = types.model('App', {
    startup: Startup,
    allowAffiliationChange: true,
  })
  .actions(self => ({
    start: async () => {
      await self.startup.load();
    },
    setAllowAffiliationChange(flag) {
      self.allowAffiliationChange = flag;
    }
  }));

function register(globals) {
  globals.app = App.create({ startup: {} }, globals);
}

export { App, register };