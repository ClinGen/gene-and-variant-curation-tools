// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { runInAction } from 'mobx';

import { forgetIdToken } from '../helpers/api';

// An object that captures all the clean up logic when the app is done or no jwt token
// is found.
class Cleaner {
  constructor(globals) {
    this.globals = globals;
  }

  cleanup() {
    const { disposers, intervalIds } = this.globals;

    // it is important that we start with cleaning the disposers, otherwise snapshots events will be fired
    // for cleaned stores
    let keys = _.keys(disposers);
    _.forEach(keys, (key) => {
      const fn = disposers[key];
      if (_.isFunction(fn)) {
        fn();
      }
      delete disposers[key];
    });

    keys = _.keys(intervalIds);
    _.forEach(keys, (key) => {
      const id = intervalIds[key];
      if (!_.isNil(id)) {
        clearInterval(id);
      }
      delete intervalIds[key];
    });

    runInAction(() => {
      forgetIdToken();
  
      _.forEach(this.globals, (obj, key) => {
        if (_.isFunction(obj.clear)) {
          // console.log(`Cleaner.cleanup() : calling ${key}.clear()`);
          obj.clear();
        }
      });  
    });
  }
}

function register(globals) {
  globals.cleaner = new Cleaner(globals);
}

export { Cleaner, register };
