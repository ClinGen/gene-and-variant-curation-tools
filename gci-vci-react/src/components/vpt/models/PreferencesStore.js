// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, getSnapshot } from 'mobx-state-tree';

import { FourState } from './base';
import { getPreferences, putPreferences } from '../helpers/api';

const PreferencesStore = FourState
  .named('PreferencesStore')
  .props({
    preferences: types.optional(types.map(types.string), {}),
  })

  .actions(self => {
    // save the base implementation of clear
    const superClear = self.clear;

    return {
      doLoad: async function() {
        const result = await getPreferences();
        if (PreferencesStore.is(result)) {
          self.runInAction(() => { self.preferences = result.preferences; });
        }
      },
      save: async function(input) {
        const preferences = _.isNil(input)? getSnapshot(self) : input;
        await putPreferences(preferences);
      },
      set: (key, value) => {
        self.preferences.set(key, value);
      },
      setBoolean: (key, value) => {
        self.preferences.set(key, String(value));
      },
      setObject: (key, value) => {
        self.preferences.set(key, JSON.stringify(value));
      },
      delete: (key) => {
        self.preferences.delete(key);
      },
      clear: () => {
        self.preferences.clear();
        superClear();
      }
    };
  })

  .views(self => ({
    getBoolean: (key, defaultValue ) => {
      const value = self.preferences.get(key);
      if (_.isUndefined(value)) return defaultValue;
      return value === 'true';
    },
    get: (key, defaultValue ) => {
      const value = self.preferences.get(key);
      if (_.isUndefined(value)) return defaultValue;
      return value;
    },
    getObject: (key, defaultValue) => {
      const value = JSON.parse(self.preferences.get(key));
      if (_.isUndefined(value)) return defaultValue;
      return value;
    },
    get empty() {
      return self.preferences.size === 0;
    },
    get size() {
      return self.preferences.size;
    }
  }));

function register(globals) {
  globals.preferencesStore = PreferencesStore.create();
}

export { PreferencesStore, register };
