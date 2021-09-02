// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types } from 'mobx-state-tree';
import { RestAPI as API } from '@aws-amplify/api-rest';

import { API_NAME } from '../../../../utils';
import { AmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';
import { FourState } from '../base';
import { Saved } from './Saved';

// ==================================================================
// SavesStore
// ==================================================================
const SavesStore = FourState
  .named('SavesStore')
  .props({
    affiliation: '',
    saves: types.optional(types.array(Saved), []),
  })

  .actions(self => {
    // save the base implementation of clear
    const superClear = self.clear;

    return {
      doLoad: async function(affiliationId) {
        if (affiliationId) {
          self.affiliation = affiliationId;
          try {
            const requestRecycler = new AmplifyAPIRequestRecycler();
            const url = `/vpt/saves?affiliation=${affiliationId}`
            const saves = await requestRecycler.capture(API.get(API_NAME, url));
            self.runInAction(() => {
              self.saves.replace(saves);
            });
          } catch (error) {
            if (API.isCancel(error)) {
              console.log('Cancel');
            }
            throw error;
          }
        }
      },
    
      clear: () => {
        self.saves.clear();
        self.affiliation = '';
        superClear();
      }
    };
  })

  .views(self => ({

    getById(id) {
      return _.find(self.saves, ['PK', id]);
    },

    get empty() {
      return self.saves.length === 0;
    },

    // 'search' in the includes
    getSearchableList(affiliation) {
      const result = _.filter(self.saves, (item) => {
        if (!affiliation) return _.isEmpty(item.affiliation) && item.searchable;
        return item.affiliation === affiliation && item.searchable;
      });

      return _.reverse(_.sortBy(result, ['last_modified']));
    },

    getSaveableList(email, affiliation) {
      const result = _.filter(self.saves, (item) => {
        if (item.email !== email) return false;
        if (!affiliation) return _.isEmpty(item.affiliation);
        return item.affiliation === affiliation;
      });

      return _.reverse(_.sortBy(result, ['last_modified']));
    },

    getLoadableList(affiliation) {
      const result = _.filter(self.saves, (item) => {
        if (!affiliation) return _.isEmpty(item.affiliation);
        return item.affiliation === affiliation;
      });

      return _.reverse(_.sortBy(result, ['last_modified']));
    },
  }));


// IMPORTANT: SavesStore is not meant to be in the global context, you should create a new one every time you need to
//            retrieve a list of all saved searches. This is mainly driven because of the fact that the list of
//            saved searches is sensitive to the affiliation selection.
export { SavesStore };