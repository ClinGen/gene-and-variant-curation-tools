// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import { types } from 'mobx-state-tree';
import { toErr, Err } from './Err';

// A four-state model that has the following states:
//  +---------+                   +-----------+
//  | initial |            +----> |   ready   |
//  +---------+            |      +-----------+
//                         |
//      + ^                |         + ^
//      | |                |         | | success
// load | | error          |    load | | or error
//      v +                |         v +
//                         |
//  +---------+            |      +-----------+
//  | loading +------------+      | reloading |
//  +---------+   success         +-----------+
// 
// state: <initial|loading|ready|reloading>
// error: <error object> if there is an error otherwise <undefined>
// empty: <true> if state is ready or reloading and the content is considered empty
const FourState = types.model('FourState', {
    state: 'initial',
    error: types.maybe(Err),
    tickPeriod: 7 * 1000, // 7 seconds
    heartbeatInterval: 0,
  })
  .actions(() => ({
    // I had issues using runInAction from mobx
    // the issue is discussed here https://github.com/mobxjs/mobx-state-tree/issues/915
    runInAction(fn) {
      return fn();
    }
  }))
  .actions(self => {
    let loadingPromise;

    return {
      load: (...args) => {
        if (loadingPromise) return loadingPromise;

        self.error = undefined;
        if (self.state === 'ready') self.state = 'reloading';
        else self.state = 'loading';

        loadingPromise = new Promise((resolve, reject) => {
          // if ((self.state === 'loading') || (self.state === 'reloading')) return;
          try {
            self.doLoad(...args)
              .then(() => {
                self.runInAction(() => { self.state = 'ready'; });
                loadingPromise = undefined;
                resolve();
              })
              .catch((err) => {
                self.runInAction(() => {
                  self.state = (self.state === 'loading')? 'initial': 'ready';
                  self.error = toErr(err);  
                });
                loadingPromise = undefined;
                reject(err);
              });
          } catch(err) {
            self.runInAction(() => {
              self.state = (self.state === 'loading')? 'initial': 'ready';
              self.error = toErr(err);  
            });
            loadingPromise = undefined;
            reject(err);
          }  
        });

        return loadingPromise;
      },

      startHeartbeat: () => {
        if (self.heartbeatInterval !== 0) return; // there is one running
        if (!self.shouldHeartbeat()) return;
        const id = setInterval(async () => {
          if (!self.shouldHeartbeat()) return;
          try {
            await self.load();
          } catch (err) { /* ignore */ };
        }, self.tickPeriod);
        self.heartbeatInterval = id;
      },
      shouldHeartbeat: () => {
        return true; // extender can override this method
      },
      stopHeartbeat: () => {
        const id = self.heartbeatInterval;
        if (id !== 0) {
          clearInterval(id);
          self.heartbeatInterval = undefined;
        }
      },
      clear: () => {
        self.stopHeartbeat();
        self.state = 'initial';
        self.error = undefined;
      }
    };
  })

  .views(self => ({
    get initial() {
      return self.state === 'initial';
    },
    get ready() {
      return self.state === 'ready';
    },
    get loading() {
      return self.state === 'loading';
    },
    get reloading() {
      return self.state === 'reloading';
    },
    get errorMessage() {
      return self.error? self.error.message || 'unknown error': '';
    }
  }));

const isStoreReady = (obj) => (obj.ready || obj.reloading);
const isStoreEmpty = (obj) => ((obj.ready || obj.reloading) && obj.empty);
const isStoreNotEmpty = (obj) => ((obj.ready || obj.reloading) && !obj.empty);
const isStoreLoading = (obj) => obj.loading;
const isStoreReloading = (obj) => obj.reloading;
const isStoreNew = (obj) => obj.initial;
const isStoreError = (obj) => !!obj.error;

export {
  FourState,
  isStoreReady,
  isStoreEmpty,
  isStoreNotEmpty,
  isStoreLoading,
  isStoreReloading,
  isStoreNew,
  isStoreError,
};
